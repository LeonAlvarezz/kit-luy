import { describe, expect, test } from "bun:test";
import { Effect } from "effect";
import type { Context as TelegrafContext, Telegraf } from "telegraf";

import { MEMBER_STATUS, type MemberModel } from "@/modules/member/member.model";
import {
  PurchaseStatus,
  type PurchaseModel,
} from "@/modules/purchase/purchase.model";
import { registerListCommand } from "./list.command";

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

const createListContext = (
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
      id: 1001,
      first_name: "Payer",
      username: "payer",
    },
    message: {
      message_id: 55,
      text: "/list",
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

import { createMockRuntime } from "../test-utils";

const setupListCommand = (mocks: {
  findTelegramMember?: any;
  findGroupById?: any;
  findAllPurchaseByGroupId?: any;
  findActiveByGroupId?: any;
}) => {
  let listHandler:
    | ((ctx: TelegrafContext) => Promise<unknown> | unknown)
    | undefined;
  const bot = {
    command: (name: string, handler: typeof listHandler) => {
      if (name === "list") {
        listHandler = handler;
      }
    },
  } as unknown as Telegraf;

  const runtime = createMockRuntime({
    memberService: {
      findTelegramMember: mocks.findTelegramMember,
      findActiveByGroupId: mocks.findActiveByGroupId,
    },
    groupService: {
      findById: mocks.findGroupById ?? (() => Effect.succeed(undefined)),
    },
    purchaseService: {
      findAllByGroupId: mocks.findAllPurchaseByGroupId,
    },
  });

  registerListCommand(bot, runtime);

  expect(listHandler).toBeDefined();
  return listHandler;
};

describe("registerListCommand", () => {
  test("formats recent active purchases newest first", async () => {
    const sender = createMember(1, {
      tg_user_id: "1001",
      display_name: "John & Co",
    });
    const peter = createMember(2, { display_name: "Peter" });
    const replies: string[] = [];
    const replyOptions: unknown[] = [];

    const listHandler = setupListCommand({
      findTelegramMember: () => Effect.succeed(sender),
      findActiveByGroupId: () => Effect.succeed([sender, peter]),
      findAllPurchaseByGroupId: () =>
        Effect.succeed([
          createPurchase(1, {
            payer_member_id: peter.id,
            amount: 250,
            created_at: Date.UTC(2026, 5, 1),
          }),
          createPurchase(2, {
            payer_member_id: sender.id,
            amount: 125,
            created_at: Date.UTC(2026, 5, 3),
          }),
          createPurchase(3, {
            payer_member_id: peter.id,
            amount: 500,
            status: PurchaseStatus.VOIDED,
            created_at: Date.UTC(2026, 5, 4),
            voided_at: Date.UTC(2026, 5, 5),
          }),
        ]),
    });

    await listHandler?.(createListContext(replies, replyOptions));

    expect(replies).toEqual([
      "Recent purchases:\n   - #<code>2</code> <code>$1.25</code> paid by John &amp; Co on 2026-06-03 00:00\n   - #<code>1</code> <code>$2.50</code> paid by Peter on 2026-06-01 00:00",
    ]);
    expect(replyOptions).toEqual([{ parse_mode: "HTML" }]);
  });

  test("replies clearly when there are no active purchases", async () => {
    const sender = createMember(1, { tg_user_id: "1001" });
    const replies: string[] = [];
    const replyOptions: unknown[] = [];

    const listHandler = setupListCommand({
      findTelegramMember: () => Effect.succeed(sender),
      findActiveByGroupId: () => Effect.succeed([sender]),
      findAllPurchaseByGroupId: () => Effect.succeed([]),
    });

    await listHandler?.(createListContext(replies, replyOptions));

    expect(replies).toEqual(["No active purchases found."]);
    expect(replyOptions).toEqual([{ parse_mode: "HTML" }]);
  });
});
