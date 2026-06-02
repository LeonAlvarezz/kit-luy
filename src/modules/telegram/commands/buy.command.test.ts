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
  test("splits /buy all across active members but only charges non-payers", async () => {
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

    const payer = createMember(1, { tg_user_id: "1001", alias: "payer" });
    const otherMember = createMember(2);
    let createdPayload: PurchaseModel.CreateWithAllocations | undefined;
    const replies: string[] = [];
    const replyOptions: unknown[] = [];

    registerBuyCommand(bot, {
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

    expect(buyHandler).toBeDefined();
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
});
