import { describe, expect, test } from "bun:test";
import { Effect } from "effect";
import type { Context as TelegrafContext, Telegraf } from "telegraf";

import { MEMBER_STATUS, type MemberModel } from "@/modules/member/member.model";
import type { PurchaseModel } from "@/modules/purchase/purchase.model";
import {
  BuyConversationStep,
  TelegramConversationFlow,
  TelegramConversationStatus,
  type TelegramConversationModel,
} from "@/modules/telegram-conversation/telegram-conversation.model";
import { registerBuyConversationEvents } from "./buy-conversation.event";

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

const createSession = (
  overrides: Partial<TelegramConversationModel.Entity> = {},
): TelegramConversationModel.Entity => ({
  id: 7,
  group_id: 10,
  member_id: 1,
  flow: TelegramConversationFlow.BUY,
  step: BuyConversationStep.AMOUNT,
  payload_json: "{}",
  status: TelegramConversationStatus.ACTIVE,
  expires_at: Date.now() + 1_000,
  created_at: Date.now(),
  updated_at: Date.now(),
  ...overrides,
});

const createTextContext = (
  text: string,
  replies: string[] = [],
  replyOptions: unknown[] = [],
): TelegrafContext =>
  ({
    chat: { id: -100123, type: "supergroup", title: "Kit Luy" },
    from: { id: 1001, first_name: "Payer", username: "payer" },
    message: { message_id: 55, text },
    update: { update_id: 99 },
    reply: (message: string, options?: unknown) => {
      replies.push(message);
      replyOptions.push(options);
      return Promise.resolve();
    },
  }) as unknown as TelegrafContext;

const createActionContext = (
  match: RegExpExecArray,
  actions: string[] = [],
): TelegrafContext =>
  ({
    chat: { id: -100123, type: "supergroup", title: "Kit Luy" },
    from: { id: 1001, first_name: "Payer", username: "payer" },
    callbackQuery: {
      message: { message_id: 88 },
    },
    match,
    update: { update_id: 99 },
    answerCbQuery: (message?: string) => {
      actions.push(`answer:${message ?? ""}`);
      return Promise.resolve();
    },
    editMessageReplyMarkup: (markup: unknown) => {
      actions.push(`markup:${JSON.stringify(markup)}`);
      return Promise.resolve();
    },
    editMessageText: (message: string) => {
      actions.push(`text:${message}`);
      return Promise.resolve();
    },
  }) as unknown as TelegrafContext;

describe("registerBuyConversationEvents", () => {
  const setup = (
    overrides: Partial<
      Parameters<typeof registerBuyConversationEvents>[1]
    > = {},
  ) => {
    let textHandler:
      | ((
          ctx: TelegrafContext,
          next?: () => Promise<unknown> | unknown,
        ) => Promise<unknown> | unknown)
      | undefined;
    let actionHandler:
      | ((ctx: TelegrafContext) => Promise<unknown> | unknown)
      | undefined;
    const bot = {
      command: () => {},
      on: (_filter: unknown, handler: typeof textHandler) => {
        textHandler = handler;
      },
      action: (_filter: unknown, handler: typeof actionHandler) => {
        actionHandler = handler;
      },
    } as unknown as Telegraf;
    const payer = createMember(1, { tg_user_id: "1001", alias: "payer" });
    const otherMember = createMember(2);
    const dependencies: Parameters<typeof registerBuyConversationEvents>[1] = {
      findTelegramMember: () => Effect.succeed(payer),
      findActiveByGroupId: () => Effect.succeed([payer, otherMember]),
      findGroupById: () => Effect.succeed(undefined),
      createPurchaseWithAllocations: (payload) =>
        Effect.succeed({
          purchase: { id: 9, ...payload.purchase, voided_at: null },
          allocations: payload.allocations.map((allocation, index) => ({
            id: index + 1,
            purchase_id: 9,
            ...allocation,
          })),
        }),
      findActiveSession: () => Effect.succeed(createSession()),
      findSessionById: () => Effect.succeed(createSession()),
      updateSession: (id, payload) =>
        Effect.succeed(
          createSession({
            id,
            step: payload.step,
            payload_json: JSON.stringify(payload.payload),
          }),
        ),
      completeSession: (id) => Effect.succeed(createSession({ id })),
      cancelSession: (id) =>
        Effect.succeed(
          createSession({ id, status: TelegramConversationStatus.CANCELLED }),
        ),
      cancelActiveSession: () => Effect.void,
      ...overrides,
    };

    registerBuyConversationEvents(bot, dependencies);
    expect(textHandler).toBeDefined();
    expect(actionHandler).toBeDefined();
    return { textHandler, actionHandler };
  };

  test("amount reply advances to member picker", async () => {
    const replies: string[] = [];
    const replyOptions: unknown[] = [];
    let updatePayload:
      | Parameters<
          Parameters<typeof registerBuyConversationEvents>[1]["updateSession"]
        >[1]
      | undefined;
    const { textHandler } = setup({
      updateSession: (id, payload) => {
        updatePayload = payload;
        return Effect.succeed(
          createSession({
            id,
            step: payload.step,
            payload_json: JSON.stringify(payload.payload),
          }),
        );
      },
    });

    await textHandler?.(createTextContext("12", replies, replyOptions));

    expect(updatePayload).toEqual({
      step: BuyConversationStep.MEMBERS,
      payload: { amount: 1200, selectedMemberIds: [1] },
    });
    expect(replies).toEqual(["Who shared this purchase?"]);
    const replyMarkupText = JSON.stringify(replyOptions[0]);
    expect(replyOptions[0]).toMatchObject({
      reply_markup: { inline_keyboard: expect.any(Array) },
    });
    expect(replyMarkupText).toContain("✓ Myself 👤");
  });

  test("invalid amount stays on amount step", async () => {
    const replies: string[] = [];
    let updated = false;
    const { textHandler } = setup({
      updateSession: () => {
        updated = true;
        return Effect.succeed(createSession());
      },
    });

    await textHandler?.(createTextContext("abc", replies));

    expect(updated).toBe(false);
    expect(replies).toEqual(["Please send a valid amount greater than 0."]);
  });

  test("non-command text without active session passes to next middleware", async () => {
    let nextCalled = false;
    const { textHandler } = setup({
      findActiveSession: () => Effect.succeed(undefined),
    });

    await textHandler?.(createTextContext("hello"), () => {
      nextCalled = true;
      return Promise.resolve();
    });

    expect(nextCalled).toBe(true);
  });

  test("command text passes to next middleware", async () => {
    let nextCalled = false;
    const { textHandler } = setup();

    await textHandler?.(createTextContext("/help"), () => {
      nextCalled = true;
      return Promise.resolve();
    });

    expect(nextCalled).toBe(true);
  });

  test("callback actions reject another member session", async () => {
    const actions: string[] = [];
    const { actionHandler } = setup({
      findSessionById: () => Effect.succeed(createSession({ member_id: 2 })),
    });

    await actionHandler?.(
      createActionContext(
        /^buy_flow:(toggle|everyone|done|confirm|cancel):(\d+)(?::(\d+))?$/.exec(
          "buy_flow:done:7",
        )!,
        actions,
      ),
    );

    expect(actions).toEqual([
      "answer:This buy flow is not yours or has expired.",
    ]);
  });

  test("confirm creates equal split purchase and completes session", async () => {
    const actions: string[] = [];
    let createdPayload: PurchaseModel.CreateWithAllocations | undefined;
    let completed = false;
    const { actionHandler } = setup({
      findSessionById: () =>
        Effect.succeed(
          createSession({
            step: BuyConversationStep.CONFIRM,
            payload_json: JSON.stringify({
              amount: 1200,
              selectedMemberIds: [1, 2],
            }),
          }),
        ),
      createPurchaseWithAllocations: (payload) => {
        createdPayload = payload;
        return Effect.succeed({
          purchase: { id: 9, ...payload.purchase, voided_at: null },
          allocations: payload.allocations.map((allocation, index) => ({
            id: index + 1,
            purchase_id: 9,
            ...allocation,
          })),
        });
      },
      completeSession: (id) => {
        completed = true;
        return Effect.succeed(createSession({ id }));
      },
    });

    await actionHandler?.(
      createActionContext(
        /^buy_flow:(toggle|everyone|done|confirm|cancel):(\d+)(?::(\d+))?$/.exec(
          "buy_flow:confirm:7",
        )!,
        actions,
      ),
    );

    expect(createdPayload?.purchase.amount).toBe(1200);
    expect(createdPayload?.allocations).toMatchObject([
      { beneficiary_member_id: 2, responsible_member_id: 2, amount: 600 },
    ]);
    expect(completed).toBe(true);
    expect(actions.at(-1)).toContain("Purchase #9 created");
  });

  test("confirm splits only selected members when sender is unselected", async () => {
    const actions: string[] = [];
    let createdPayload: PurchaseModel.CreateWithAllocations | undefined;
    const { actionHandler } = setup({
      findSessionById: () =>
        Effect.succeed(
          createSession({
            step: BuyConversationStep.CONFIRM,
            payload_json: JSON.stringify({
              amount: 1200,
              selectedMemberIds: [2],
            }),
          }),
        ),
      createPurchaseWithAllocations: (payload) => {
        createdPayload = payload;
        return Effect.succeed({
          purchase: { id: 10, ...payload.purchase, voided_at: null },
          allocations: payload.allocations.map((allocation, index) => ({
            id: index + 1,
            purchase_id: 10,
            ...allocation,
          })),
        });
      },
    });

    await actionHandler?.(
      createActionContext(
        /^buy_flow:(toggle|everyone|done|confirm|cancel):(\d+)(?::(\d+))?$/.exec(
          "buy_flow:confirm:7",
        )!,
        actions,
      ),
    );

    expect(createdPayload?.allocations).toMatchObject([
      { beneficiary_member_id: 2, responsible_member_id: 2, amount: 1200 },
    ]);
  });
});
