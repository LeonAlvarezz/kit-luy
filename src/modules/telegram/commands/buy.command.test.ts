import { describe, expect, test } from "bun:test";
import { Effect } from "effect";
import type { Context as TelegrafContext, Telegraf } from "telegraf";

import { MEMBER_STATUS, type MemberModel } from "@/modules/member/member.model";
import { AllocationKind } from "@/modules/purchase/purchase-allocation.model";
import type { PurchaseModel } from "@/modules/purchase/purchase.model";
import { PurchaseStatus } from "@/modules/purchase/purchase.model";
import { registerBuyCommand } from "./buy.command";

const createMember = (
  id: number,
  overrides: Partial<MemberModel.Entity> = {},
): MemberModel.Entity => ({
  id,
  created_at: "2026-06-02T00:00:00.000Z",
  updated_at: null,
  group_id: 10,
  tg_user_id: String(1000 + id),
  display_name: `Member ${id}`,
  alias: `member${id}`,
  status: MEMBER_STATUS.ACTIVE,
  registered_at: "2026-06-02T00:00:00.000Z",
  ...overrides,
});

const createBuyContext = (
  text: string,
  fromId: number,
  replies: string[] = [],
  replyOptions: unknown[] = [],
): TelegrafContext =>
  ({
    chat: {
      id: -100123,
      type: "supergroup",
      title: "Kit Luy",
    },
    from: {
      id: fromId,
      first_name: "Payer",
      username: "payer",
    },
    message: {
      message_id: 55,
      text,
    },
    update: {
      update_id: 99,
    },
    reply: (message: string, options?: unknown) => {
      replies.push(message);
      replyOptions.push(options);
      return Promise.resolve();
    },
  }) as unknown as TelegrafContext;

describe("registerBuyCommand", () => {
  type BuyCommandTestDependencies = Omit<
    Parameters<typeof registerBuyCommand>[1],
    "findGroupById" | "startBuySession"
  > &
    Partial<
      Pick<
        Parameters<typeof registerBuyCommand>[1],
        "findGroupById" | "startBuySession"
      >
    >;

  const setupBuyCommand = (
    dependencies: BuyCommandTestDependencies,
  ) => {
    let buyHandler:
      | ((ctx: TelegrafContext) => Promise<unknown> | unknown)
      | undefined;
    const bot = {
      command: (name: string, handler: typeof buyHandler) => {
        if (name === "buy") {
          buyHandler = handler;
        }
      },
    } as unknown as Telegraf;
    const defaultStartBuySession: Parameters<
      typeof registerBuyCommand
    >[1]["startBuySession"] = () =>
      Effect.succeed({
        id: 1,
        group_id: 10,
        member_id: 1,
        flow: "buy",
        step: "amount",
        payload_json: "{}",
        status: "active",
        expires_at: Date.now() + 1_000,
        created_at: Date.now(),
        updated_at: Date.now(),
      });
    const fullDependencies: Parameters<typeof registerBuyCommand>[1] = {
      findGroupById: () => Effect.succeed(undefined),
      startBuySession: () =>
        defaultStartBuySession({ group_id: 10, member_id: 1 }),
      ...dependencies,
    };

    registerBuyCommand(bot, fullDependencies);

    expect(buyHandler).toBeDefined();
    return buyHandler;
  };

  test("starts guided flow for bare /buy", async () => {
    const payer = createMember(1, { tg_user_id: "1001", alias: "payer" });
    const replies: string[] = [];
    const replyOptions: unknown[] = [];
    let started = false;

    const buyHandler = setupBuyCommand({
      findTelegramMember: () => Effect.succeed(payer),
      findActiveByGroupId: () => Effect.succeed([payer]),
      startBuySession: (payload) => {
        started = true;
        expect(payload).toEqual({ group_id: 10, member_id: 1 });
        return Effect.succeed({
          id: 1,
          group_id: payload.group_id,
          member_id: payload.member_id,
          flow: "buy",
          step: "amount",
          payload_json: "{}",
          status: "active",
          expires_at: Date.now() + 1_000,
          created_at: Date.now(),
          updated_at: Date.now(),
        });
      },
      createPurchaseWithAllocations: () => {
        throw new Error("should not create purchase");
      },
    });

    await buyHandler?.(createBuyContext("/buy", 1001, replies, replyOptions));

    expect(started).toBe(true);
    expect(replies).toEqual(["How much did you pay?"]);
    expect(replyOptions[0]).toMatchObject({
      reply_markup: { force_reply: true, selective: true },
    });
  });

  test("splits /buy all across active members but only charges non-payers", async () => {
    const payer = createMember(1, { tg_user_id: "1001", alias: "payer" });
    const otherMember = createMember(2);
    let createdPayload: PurchaseModel.CreateWithAllocations | undefined;
    const replies: string[] = [];
    const replyOptions: unknown[] = [];

    const buyHandler = setupBuyCommand({
      findTelegramMember: () => Effect.succeed(payer),
      findActiveByGroupId: () => Effect.succeed([payer, otherMember]),
      createPurchaseWithAllocations: (payload) => {
        createdPayload = payload;
        return Effect.succeed({
          purchase: {
            id: 1,
            ...payload.purchase,
            voided_at: null,
          },
          allocations: payload.allocations.map((allocation, index) => ({
            id: index + 1,
            purchase_id: 1,
            ...allocation,
          })),
        });
      },
    });

    await buyHandler?.(createBuyContext("/buy 4", 1001, replies, replyOptions));

    expect(createdPayload?.purchase).toMatchObject({
      payer_member_id: payer.id,
      amount: 400,
      status: PurchaseStatus.ACTIVE,
    });
    expect(createdPayload?.allocations).toEqual([
      {
        beneficiary_member_id: otherMember.id,
        responsible_member_id: otherMember.id,
        amount: 200,
        allocation_kind: AllocationKind.EQUAL,
      },
    ]);
    expect(replies).toEqual([
      "Purchase #1 created: <code>$4.00</code> paid by <b>Member 1</b>.\n\nBeneficiaries:\n   - Member 2\t\t\t\t\t<code>$2.00</code>",
    ]);
    expect(replyOptions).toEqual([{ parse_mode: "HTML" }]);
  });

  test("rejects an explicit split when any beneficiary is inactive or unknown", async () => {
    const payer = createMember(1, { tg_user_id: "1001", alias: "payer" });
    const john = createMember(2, { alias: "john" });
    let createWasCalled = false;
    const replies: string[] = [];

    const buyHandler = setupBuyCommand({
      findTelegramMember: () => Effect.succeed(payer),
      findActiveByGroupId: () => Effect.succeed([payer, john]),
      createPurchaseWithAllocations: (payload) => {
        createWasCalled = true;
        return Effect.succeed({
          purchase: {
            id: 1,
            ...payload.purchase,
            voided_at: null,
          },
          allocations: [],
        });
      },
    });

    await buyHandler?.(
      createBuyContext("/buy 2 @john=1 @peter=1", 1001, replies),
    );

    expect(createWasCalled).toBe(false);
    expect(replies).toEqual([
      "Could not find @peter in this settlement group.",
    ]);
  });

  test("creates explicit allocations for active beneficiaries only after counting payer share", async () => {
    const payer = createMember(1, { tg_user_id: "1001", alias: "payer" });
    const john = createMember(2, { alias: "john" });
    let createdPayload: PurchaseModel.CreateWithAllocations | undefined;
    const replies: string[] = [];
    const replyOptions: unknown[] = [];

    const buyHandler = setupBuyCommand({
      findTelegramMember: () => Effect.succeed(payer),
      findActiveByGroupId: () => Effect.succeed([payer, john]),
      createPurchaseWithAllocations: (payload) => {
        createdPayload = payload;
        return Effect.succeed({
          purchase: {
            id: 2,
            ...payload.purchase,
            voided_at: null,
          },
          allocations: payload.allocations.map((allocation, index) => ({
            id: index + 1,
            purchase_id: 2,
            ...allocation,
          })),
        });
      },
    });

    await buyHandler?.(
      createBuyContext("/buy 2 @payer=1 @john=1", 1001, replies, replyOptions),
    );

    expect(createdPayload?.purchase).toMatchObject({
      payer_member_id: payer.id,
      amount: 200,
      status: PurchaseStatus.ACTIVE,
    });
    expect(createdPayload?.allocations).toEqual([
      {
        beneficiary_member_id: john.id,
        responsible_member_id: john.id,
        amount: 100,
        allocation_kind: AllocationKind.EXPLICIT,
      },
    ]);
    expect(replies).toEqual([
      "Purchase #2 created: <code>$2.00</code> paid by <b>Member 1</b>.\n\nBeneficiaries:\n   - Member 2\t\t\t\t\t<code>$1.00</code>",
    ]);
    expect(replyOptions).toEqual([{ parse_mode: "HTML" }]);
  });

  test("splits bare user allocations with the sender", async () => {
    const payer = createMember(1, { tg_user_id: "1001", alias: "payer" });
    const john = createMember(2, { alias: "john" });
    let createdPayload: PurchaseModel.CreateWithAllocations | undefined;
    const replies: string[] = [];
    const replyOptions: unknown[] = [];

    const buyHandler = setupBuyCommand({
      findTelegramMember: () => Effect.succeed(payer),
      findActiveByGroupId: () => Effect.succeed([payer, john]),
      createPurchaseWithAllocations: (payload) => {
        createdPayload = payload;
        return Effect.succeed({
          purchase: {
            id: 6,
            ...payload.purchase,
            voided_at: null,
          },
          allocations: payload.allocations.map((allocation, index) => ({
            id: index + 1,
            purchase_id: 6,
            ...allocation,
          })),
        });
      },
    });

    await buyHandler?.(
      createBuyContext("/buy 4 @john", 1001, replies, replyOptions),
    );

    expect(createdPayload?.purchase).toMatchObject({
      payer_member_id: payer.id,
      amount: 400,
      status: PurchaseStatus.ACTIVE,
    });
    expect(createdPayload?.allocations).toEqual([
      {
        beneficiary_member_id: john.id,
        responsible_member_id: john.id,
        amount: 200,
        allocation_kind: AllocationKind.EQUAL,
      },
    ]);
    expect(replies).toEqual([
      "Purchase #6 created: <code>$4.00</code> paid by <b>Member 1</b>.\n\nBeneficiaries:\n   - Member 2\t\t\t\t\t<code>$2.00</code>",
    ]);
    expect(replyOptions).toEqual([{ parse_mode: "HTML" }]);
  });

  test("splits multiple bare user allocations with the sender", async () => {
    const payer = createMember(1, { tg_user_id: "1001", alias: "payer" });
    const john = createMember(2, { alias: "john" });
    const dara = createMember(3, { alias: "dara" });
    let createdPayload: PurchaseModel.CreateWithAllocations | undefined;

    const buyHandler = setupBuyCommand({
      findTelegramMember: () => Effect.succeed(payer),
      findActiveByGroupId: () => Effect.succeed([payer, john, dara]),
      createPurchaseWithAllocations: (payload) => {
        createdPayload = payload;
        return Effect.succeed({
          purchase: {
            id: 7,
            ...payload.purchase,
            voided_at: null,
          },
          allocations: payload.allocations.map((allocation, index) => ({
            id: index + 1,
            purchase_id: 7,
            ...allocation,
          })),
        });
      },
    });

    await buyHandler?.(createBuyContext("/buy 6 @john @dara", 1001));

    expect(createdPayload?.allocations).toEqual([
      {
        beneficiary_member_id: john.id,
        responsible_member_id: john.id,
        amount: 200,
        allocation_kind: AllocationKind.EQUAL,
      },
      {
        beneficiary_member_id: dara.id,
        responsible_member_id: dara.id,
        amount: 200,
        allocation_kind: AllocationKind.EQUAL,
      },
    ]);
  });

  test("allocates the explicit remainder to the sender", async () => {
    const payer = createMember(1, { tg_user_id: "1001", alias: "payer" });
    const john = createMember(2, { alias: "john" });
    let createdPayload: PurchaseModel.CreateWithAllocations | undefined;
    const replies: string[] = [];
    const replyOptions: unknown[] = [];

    const buyHandler = setupBuyCommand({
      findTelegramMember: () => Effect.succeed(payer),
      findActiveByGroupId: () => Effect.succeed([payer, john]),
      createPurchaseWithAllocations: (payload) => {
        createdPayload = payload;
        return Effect.succeed({
          purchase: {
            id: 3,
            ...payload.purchase,
            voided_at: null,
          },
          allocations: payload.allocations.map((allocation, index) => ({
            id: index + 1,
            purchase_id: 3,
            ...allocation,
          })),
        });
      },
    });

    await buyHandler?.(
      createBuyContext("/buy 4 @john=3", 1001, replies, replyOptions),
    );

    expect(createdPayload?.purchase).toMatchObject({
      payer_member_id: payer.id,
      amount: 400,
      status: PurchaseStatus.ACTIVE,
    });
    expect(createdPayload?.allocations).toEqual([
      {
        beneficiary_member_id: john.id,
        responsible_member_id: john.id,
        amount: 300,
        allocation_kind: AllocationKind.EXPLICIT,
      },
    ]);
    expect(replies).toEqual([
      "Purchase #3 created: <code>$4.00</code> paid by <b>Member 1</b>.\n\nBeneficiaries:\n   - Member 2\t\t\t\t\t<code>$3.00</code>",
    ]);
    expect(replyOptions).toEqual([{ parse_mode: "HTML" }]);
  });

  test("creates a fractional allocation and gives the remainder to the sender", async () => {
    const payer = createMember(1, { tg_user_id: "1001", alias: "payer" });
    const dara = createMember(2, { alias: "dara" });
    let createdPayload: PurchaseModel.CreateWithAllocations | undefined;
    const replies: string[] = [];
    const replyOptions: unknown[] = [];

    const buyHandler = setupBuyCommand({
      findTelegramMember: () => Effect.succeed(payer),
      findActiveByGroupId: () => Effect.succeed([payer, dara]),
      createPurchaseWithAllocations: (payload) => {
        createdPayload = payload;
        return Effect.succeed({
          purchase: {
            id: 4,
            ...payload.purchase,
            voided_at: null,
          },
          allocations: payload.allocations.map((allocation, index) => ({
            id: index + 1,
            purchase_id: 4,
            ...allocation,
          })),
        });
      },
    });

    await buyHandler?.(
      createBuyContext("/buy 5 @dara=1/4", 1001, replies, replyOptions),
    );

    expect(createdPayload?.purchase).toMatchObject({
      payer_member_id: payer.id,
      amount: 500,
      status: PurchaseStatus.ACTIVE,
    });
    expect(createdPayload?.allocations).toEqual([
      {
        beneficiary_member_id: dara.id,
        responsible_member_id: dara.id,
        amount: 125,
        allocation_kind: AllocationKind.EXPLICIT,
      },
    ]);
    expect(replies).toEqual([
      "Purchase #4 created: <code>$5.00</code> paid by <b>Member 1</b>.\n\nBeneficiaries:\n   - Member 2\t\t\t\t\t<code>$1.25</code>",
    ]);
    expect(replyOptions).toEqual([{ parse_mode: "HTML" }]);
  });

  test("rounds fractional allocations to cents", async () => {
    const payer = createMember(1, { tg_user_id: "1001", alias: "payer" });
    const dara = createMember(2, { alias: "dara" });
    let createdPayload: PurchaseModel.CreateWithAllocations | undefined;

    const buyHandler = setupBuyCommand({
      findTelegramMember: () => Effect.succeed(payer),
      findActiveByGroupId: () => Effect.succeed([payer, dara]),
      createPurchaseWithAllocations: (payload) => {
        createdPayload = payload;
        return Effect.succeed({
          purchase: {
            id: 5,
            ...payload.purchase,
            voided_at: null,
          },
          allocations: payload.allocations.map((allocation, index) => ({
            id: index + 1,
            purchase_id: 5,
            ...allocation,
          })),
        });
      },
    });

    await buyHandler?.(createBuyContext("/buy 5 @dara=1/3", 1001));

    expect(createdPayload?.allocations).toEqual([
      {
        beneficiary_member_id: dara.id,
        responsible_member_id: dara.id,
        amount: 167,
        allocation_kind: AllocationKind.EXPLICIT,
      },
    ]);
  });

  test("rejects explicit allocations that exceed the purchase total", async () => {
    const payer = createMember(1, { tg_user_id: "1001", alias: "payer" });
    const john = createMember(2, { alias: "john" });
    let createWasCalled = false;
    const replies: string[] = [];

    const buyHandler = setupBuyCommand({
      findTelegramMember: () => Effect.succeed(payer),
      findActiveByGroupId: () => Effect.succeed([payer, john]),
      createPurchaseWithAllocations: (payload) => {
        createWasCalled = true;
        return Effect.succeed({
          purchase: {
            id: 4,
            ...payload.purchase,
            voided_at: null,
          },
          allocations: [],
        });
      },
    });

    await buyHandler?.(createBuyContext("/buy 4 @john=5", 1001, replies));

    expect(createWasCalled).toBe(false);
    expect(replies).toEqual([
      "Explicit allocations cannot exceed the purchase total.",
    ]);
  });
});
