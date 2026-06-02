import { describe, expect, test } from "bun:test";
import { Effect } from "effect";
import type { Context as TelegrafContext, Telegraf } from "telegraf";

import { MEMBER_STATUS, type MemberModel } from "@/modules/member/member.model";
import { registerSettleCommand } from "./settle.command";

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

const createSettleContext = (
  replies: string[],
  fromId = 1001,
): TelegrafContext =>
  ({
    chat: {
      id: -100123,
      type: "supergroup",
      title: "Kit Luy",
    },
    from: {
      id: fromId,
      first_name: "Member",
      username: "member1",
    },
    message: {
      message_id: 56,
      text: "/settle",
    },
    update: {
      update_id: 100,
    },
    reply: (message: string) => {
      replies.push(message);
      return Promise.resolve();
    },
  }) as unknown as TelegrafContext;

describe("registerSettleCommand", () => {
  test("replies with all-clear message when no repayments are needed", async () => {
    let settleHandler:
      | ((ctx: TelegrafContext) => Promise<unknown> | unknown)
      | undefined;
    const bot = {
      command: (name: string, handler: typeof settleHandler) => {
        if (name === "settle") {
          settleHandler = handler;
        }
      },
    } as unknown as Telegraf;

    const member = createMember(1, { tg_user_id: "1001" });
    const replies: string[] = [];

    registerSettleCommand(bot, {
      findTelegramMember: () => Effect.succeed(member),
      findActiveByGroupId: () => Effect.succeed([member]),
      findSettlementBalancesByGroupId: () => Effect.succeed([]),
    });

    expect(settleHandler).toBeDefined();
    await settleHandler?.(createSettleContext(replies));

    expect(replies).toEqual(["All clear. No repayments are needed."]);
  });

  test("replies with netted repayments grouped by debtor", async () => {
    let settleHandler:
      | ((ctx: TelegrafContext) => Promise<unknown> | unknown)
      | undefined;
    const bot = {
      command: (name: string, handler: typeof settleHandler) => {
        if (name === "settle") {
          settleHandler = handler;
        }
      },
    } as unknown as Telegraf;

    const sender = createMember(1, { tg_user_id: "1001" });
    const creditor = createMember(2, { alias: "alice" });
    const debtor = createMember(3, { alias: "bob" });
    const secondCreditor = createMember(4, { alias: "charlie" });
    const secondDebtor = createMember(5, { alias: "dara" });
    const replies: string[] = [];

    registerSettleCommand(bot, {
      findTelegramMember: () => Effect.succeed(sender),
      findActiveByGroupId: () =>
        Effect.succeed([
          sender,
          creditor,
          debtor,
          secondCreditor,
          secondDebtor,
        ]),
      findSettlementBalancesByGroupId: () =>
        Effect.succeed([
          { member_id: creditor.id, balance: 400 },
          { member_id: debtor.id, balance: -500 },
          { member_id: secondCreditor.id, balance: 400 },
          { member_id: secondDebtor.id, balance: -300 },
        ]),
    });

    expect(settleHandler).toBeDefined();
    await settleHandler?.(createSettleContext(replies));

    expect(replies).toEqual([
      "Repayments to settle:\n@bob\n  @alice 4.00\n  @charlie 1.00\n\n@dara\n  @charlie 3.00",
    ]);
  });
});
