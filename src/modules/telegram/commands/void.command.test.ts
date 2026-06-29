import { describe, expect, test } from "bun:test";
import { Effect } from "effect";
import type { Context as TelegrafContext, Telegraf } from "telegraf";

import { MEMBER_STATUS, type MemberModel } from "@/modules/member/member.model";
import {
  PurchaseStatus,
  type PurchaseModel,
} from "@/modules/purchase/purchase.model";
import { registerVoidCommand } from "./void.command";

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

const createPurchase = (
  id: number,
  overrides: Partial<PurchaseModel.Entity> = {},
): PurchaseModel.Entity => ({
  id,
  group_id: 10,
  payer_member_id: 1,
  tg_message_id: 100 + id,
  amount: 100,
  note: null,
  status: PurchaseStatus.ACTIVE,
  created_at: Date.UTC(2026, 5, id),
  voided_at: null,
  ...overrides,
});

const createVoidContext = (
  text: string,
  replies: string[] = [],
): TelegrafContext =>
  ({
    chat: {
      id: -100123,
      type: "supergroup",
      title: "Kit Luy",
    },
    from: {
      id: 1001,
      first_name: "Member",
      username: "member1",
    },
    message: {
      message_id: 55,
      text,
    },
    update: {
      update_id: 99,
    },
    reply: (message: string) => {
      replies.push(message);
      return Promise.resolve();
    },
  }) as unknown as TelegrafContext;

import { createMockRuntime } from "../test-utils";

const setupVoidCommand = (mocks: {
  findTelegramMember?: (payload: { tg_chat_id: string; tg_user_id: string }) => Effect.Effect<any, any, any>;
  findGroupById?: (id: number) => Effect.Effect<any, any, any>;
  findPurchaseById?: (id: number) => Effect.Effect<any, any, any>;
  updatePurchase?: (id: number, payload: any) => Effect.Effect<any, any, any>;
}) => {
  let voidHandler:
    | ((ctx: TelegrafContext) => Promise<unknown> | unknown)
    | undefined;
  const bot = {
    command: (name: string, handler: typeof voidHandler) => {
      if (name === "void") {
        voidHandler = handler;
      }
    },
  } as unknown as Telegraf;

  const runtime = createMockRuntime({
    memberService: {
      findTelegramMember: mocks.findTelegramMember,
    },
    groupService: {
      findById: mocks.findGroupById,
    },
    purchaseService: {
      findById: mocks.findPurchaseById,
      update: mocks.updatePurchase,
    },
  });

  registerVoidCommand(bot, runtime);

  expect(voidHandler).toBeDefined();
  return voidHandler;
};

describe("registerVoidCommand", () => {
  test("marks an active purchase as voided", async () => {
    const sender = createMember(1, { tg_user_id: "1001" });
    const purchase = createPurchase(7);
    const replies: string[] = [];
    let updatePayload: Partial<PurchaseModel.Entity> | undefined;

    const voidHandler = setupVoidCommand({
      findTelegramMember: () => Effect.succeed(sender),
      findPurchaseById: (id) => Effect.succeed(createPurchase(id)),
      updatePurchase: (id, payload) => {
        updatePayload = payload;
        return Effect.succeed(createPurchase(id, payload));
      },
    });

    await voidHandler?.(createVoidContext(`/void ${purchase.id}`, replies));

    expect(updatePayload).toMatchObject({
      status: PurchaseStatus.VOIDED,
    });
    expect(updatePayload?.voided_at).toBeNumber();
    expect(replies).toEqual(["Purchase #7 voided."]);
  });

  test("accepts a purchase id prefixed with #", async () => {
    const sender = createMember(1, { tg_user_id: "1001" });
    const replies: string[] = [];
    let updatedPurchaseId: number | undefined;

    const voidHandler = setupVoidCommand({
      findTelegramMember: () => Effect.succeed(sender),
      findPurchaseById: (id) => Effect.succeed(createPurchase(id)),
      updatePurchase: (id, payload) => {
        updatedPurchaseId = id;
        return Effect.succeed(createPurchase(id, payload));
      },
    });

    await voidHandler?.(createVoidContext("/void #12", replies));

    expect(updatedPurchaseId).toBe(12);
    expect(replies).toEqual(["Purchase #12 voided."]);
  });

  test("rejects missing purchase id", async () => {
    const sender = createMember(1, { tg_user_id: "1001" });
    const replies: string[] = [];

    const voidHandler = setupVoidCommand({
      findTelegramMember: () => Effect.succeed(sender),
      findPurchaseById: (id) => Effect.succeed(createPurchase(id)),
      updatePurchase: (id, payload) =>
        Effect.succeed(createPurchase(id, payload)),
    });

    await voidHandler?.(createVoidContext("/void", replies));

    expect(replies).toEqual(["Use /void <purchase-id>."]);
  });

  test("rejects purchases from another group", async () => {
    const sender = createMember(1, { tg_user_id: "1001", group_id: 10 });
    const replies: string[] = [];

    const voidHandler = setupVoidCommand({
      findTelegramMember: () => Effect.succeed(sender),
      findPurchaseById: (id) =>
        Effect.succeed(createPurchase(id, { group_id: 99 })),
      updatePurchase: (id, payload) =>
        Effect.succeed(createPurchase(id, payload)),
    });

    await voidHandler?.(createVoidContext("/void 7", replies));

    expect(replies).toEqual(["Purchase #7 does not belong to this group."]);
  });

  test("rejects purchases created by another member", async () => {
    const sender = createMember(1, { tg_user_id: "1001", group_id: 10 });
    const replies: string[] = [];
    let updateWasCalled = false;

    const voidHandler = setupVoidCommand({
      findTelegramMember: () => Effect.succeed(sender),
      findPurchaseById: (id) =>
        Effect.succeed(
          createPurchase(id, {
            group_id: sender.group_id,
            payer_member_id: 2,
          }),
        ),
      updatePurchase: (id, payload) => {
        updateWasCalled = true;
        return Effect.succeed(createPurchase(id, payload));
      },
    });

    await voidHandler?.(createVoidContext("/void 7", replies));

    expect(updateWasCalled).toBe(false);
    expect(replies).toEqual([
      "Only the member who created purchase #7 can void it.",
    ]);
  });

  test("rejects already voided purchases", async () => {
    const sender = createMember(1, { tg_user_id: "1001" });
    const replies: string[] = [];

    const voidHandler = setupVoidCommand({
      findTelegramMember: () => Effect.succeed(sender),
      findPurchaseById: (id) =>
        Effect.succeed(
          createPurchase(id, {
            status: PurchaseStatus.VOIDED,
            voided_at: Date.UTC(2026, 5, 3),
          }),
        ),
      updatePurchase: (id, payload) =>
        Effect.succeed(createPurchase(id, payload)),
    });

    await voidHandler?.(createVoidContext("/void 7", replies));

    expect(replies).toEqual(["Purchase #7 is already voided."]);
  });
});
