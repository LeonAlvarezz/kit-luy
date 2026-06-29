import { describe, expect, test } from "bun:test";
import { Effect } from "effect";
import type { Context as TelegrafContext, Telegraf } from "telegraf";

import { registerQrCommand } from "./qr.command";
import { getDefaultLocale } from "../../lang/group-locale";
import { createMockRuntime } from "../../test-utils";

describe("qr command", () => {
  const t = getDefaultLocale();

  // Helper mock setup
  const setupTest = ({
    findTelegramMember = () => Effect.succeed({ group_id: 1 } as any),
    findActiveByGroupId = () => Effect.succeed([] as any[]),
    findGroupById = () => Effect.succeed({ language: "en" } as any),
    findByTgUserId = (_tgUserId: string) => Effect.succeed(undefined as any),
    findByUsername = (_username: string) => Effect.succeed(undefined as any),
    startSession = () =>
      Effect.succeed({
        id: 7,
        group_id: 1,
        member_id: 1,
        flow: "qr",
        step: "members",
        payload_json: "{}",
        status: "active",
        expires_at: Date.now() + 1_000,
        created_at: Date.now(),
        updated_at: Date.now(),
      } as any),
  }: {
    findTelegramMember?: (payload: { tg_chat_id: string; tg_user_id: string }) => Effect.Effect<any, any, any>;
    findActiveByGroupId?: (group_id: number) => Effect.Effect<any, any, any>;
    findGroupById?: (id: number) => Effect.Effect<any, any, any>;
    findByTgUserId?: (tgUserId: string) => Effect.Effect<any, any, any>;
    findByUsername?: (username: string) => Effect.Effect<any, any, any>;
    startSession?: (payload: {
      group_id: number;
      flow: string;
      member_id: number;
    }) => Effect.Effect<any, any, any>;
  } = {}) => {
    let commandHandler:
      | ((ctx: TelegrafContext) => Promise<unknown> | unknown)
      | undefined;
    const bot = {
      command: (name: string, handler: typeof commandHandler) => {
        if (name === "qr") {
          commandHandler = handler;
        }
      },
    } as unknown as Telegraf;

    const runtime = createMockRuntime({
      memberService: {
        findTelegramMember,
        findActiveByGroupId,
      },
      groupService: {
        findById: findGroupById,
      },
      telegramUserService: {
        findByTgUserId,
        findByUsername,
      },
      telegramConversationService: {
        startSession,
      },
    });

    registerQrCommand(bot, runtime);

    return { commandHandler };
  };

  test("starts member picker in group chat when no QR target is provided", async () => {
    const mockUser = { payment_qr_file_id: "my_qr_id" };
    const { commandHandler } = setupTest({
      findByTgUserId: () => Effect.succeed(mockUser as any),
    });

    const replies: string[] = [];
    const replyOptions: unknown[] = [];
    const photoReplies: { photo: string; caption: string }[] = [];

    const ctx = {
      chat: { id: 123, type: "group" },
      from: { id: 456 },
      message: { text: "/qr" },
      reply: (msg: string, options?: unknown) => {
        replies.push(msg);
        replyOptions.push(options);
        return Promise.resolve();
      },
      replyWithPhoto: (photo: string, extra: any) => {
        photoReplies.push({ photo, caption: extra.caption });
        return Promise.resolve();
      },
      update: { update_id: 1 },
    } as unknown as TelegrafContext;

    await commandHandler?.(ctx);

    expect(replies).toEqual([t.qr.selectMember()]);
    expect(replyOptions[0]).toMatchObject({
      reply_markup: { inline_keyboard: expect.any(Array) },
    });
    expect(photoReplies).toEqual([]);
  });

  test("starts member picker in group chat even when own QR is not set", async () => {
    const { commandHandler } = setupTest({
      findByTgUserId: () => Effect.succeed(undefined as any),
    });

    const replies: string[] = [];
    const ctx = {
      chat: { id: 123, type: "group" },
      from: { id: 456 },
      message: { text: "/qr" },
      reply: (msg: string) => {
        replies.push(msg);
        return Promise.resolve();
      },
      update: { update_id: 1 },
    } as unknown as TelegrafContext;

    await commandHandler?.(ctx);

    expect(replies).toEqual([t.qr.selectMember()]);
  });

  test("gets other group member QR code by alias in group chat when set", async () => {
    const members = [
      { id: 10, tg_user_id: "888", alias: "bob", display_name: "Bob Builder" },
    ];
    const mockUser = { payment_qr_file_id: "bob_qr_id" };

    const { commandHandler } = setupTest({
      findActiveByGroupId: () => Effect.succeed(members as any),
      findByTgUserId: (tgUserId: string) => {
        if (tgUserId === "888") {
          return Effect.succeed(mockUser as any);
        }
        return Effect.succeed(undefined as any);
      },
    });

    const replies: string[] = [];
    const photoReplies: { photo: string; caption: string }[] = [];

    const ctx = {
      chat: { id: 123, type: "group" },
      from: { id: 456 },
      message: { text: "/qr @bob" },
      reply: (msg: string) => {
        replies.push(msg);
        return Promise.resolve();
      },
      replyWithPhoto: (photo: string, extra: any) => {
        photoReplies.push({ photo, caption: extra.caption });
        return Promise.resolve();
      },
      update: { update_id: 1 },
    } as unknown as TelegrafContext;

    await commandHandler?.(ctx);

    expect(replies).toEqual([]);
    expect(photoReplies).toEqual([
      { photo: "bob_qr_id", caption: t.qr.captionOther({ name: "Bob Builder" }) },
    ]);
  });

  test("tells sender when other member hasn't set their QR code in group chat", async () => {
    const members = [
      { id: 10, tg_user_id: "888", alias: "bob", display_name: "Bob Builder" },
    ];

    const { commandHandler } = setupTest({
      findActiveByGroupId: () => Effect.succeed(members as any),
      findByTgUserId: () => Effect.succeed(undefined as any),
    });

    const replies: string[] = [];
    const ctx = {
      chat: { id: 123, type: "group" },
      from: { id: 456 },
      message: { text: "/qr @bob" },
      reply: (msg: string) => {
        replies.push(msg);
        return Promise.resolve();
      },
      update: { update_id: 1 },
    } as unknown as TelegrafContext;

    await commandHandler?.(ctx);

    expect(replies).toEqual([t.qr.notSetOther({ name: "Bob Builder" })]);
  });

  test("returns not found when alias does not exist in group", async () => {
    const members = [
      { id: 10, tg_user_id: "888", alias: "bob", display_name: "Bob Builder" },
    ];

    const { commandHandler } = setupTest({
      findActiveByGroupId: () => Effect.succeed(members as any),
    });

    const replies: string[] = [];
    const ctx = {
      chat: { id: 123, type: "group" },
      from: { id: 456 },
      message: { text: "/qr @unknown" },
      reply: (msg: string) => {
        replies.push(msg);
        return Promise.resolve();
      },
      update: { update_id: 1 },
    } as unknown as TelegrafContext;

    await commandHandler?.(ctx);

    expect(replies).toEqual([
      t.buy.beneficiaryNotFound({ username: "unknown" }),
    ]);
  });

  test("gets own QR code in private chat when QR is set", async () => {
    const mockUser = { payment_qr_file_id: "private_qr_id" };
    const { commandHandler } = setupTest({
      findByTgUserId: () => Effect.succeed(mockUser as any),
    });

    const replies: string[] = [];
    const photoReplies: { photo: string; caption: string }[] = [];

    const ctx = {
      chat: { id: 123, type: "private" },
      from: { id: 456 },
      message: { text: "/qr" },
      reply: (msg: string) => {
        replies.push(msg);
        return Promise.resolve();
      },
      replyWithPhoto: (photo: string, extra: any) => {
        photoReplies.push({ photo, caption: extra.caption });
        return Promise.resolve();
      },
      update: { update_id: 1 },
    } as unknown as TelegrafContext;

    await commandHandler?.(ctx);

    expect(replies).toEqual([]);
    expect(photoReplies).toEqual([
      { photo: "private_qr_id", caption: t.qr.captionSelf() },
    ]);
  });

  test("gets another user's QR globally by username in private chat when set", async () => {
    const mockUser = {
      tg_user_id: "999",
      username: "alice",
      display_name: "Alice Wonderland",
      payment_qr_file_id: "alice_global_qr",
    };

    const { commandHandler } = setupTest({
      findByUsername: (username: string) => {
        if (username.toLowerCase() === "alice") {
          return Effect.succeed(mockUser as any);
        }
        return Effect.succeed(undefined as any);
      },
    });

    const replies: string[] = [];
    const photoReplies: { photo: string; caption: string }[] = [];

    const ctx = {
      chat: { id: 123, type: "private" },
      from: { id: 456 },
      message: { text: "/qr @alice" },
      reply: (msg: string) => {
        replies.push(msg);
        return Promise.resolve();
      },
      replyWithPhoto: (photo: string, extra: any) => {
        photoReplies.push({ photo, caption: extra.caption });
        return Promise.resolve();
      },
      update: { update_id: 1 },
    } as unknown as TelegrafContext;

    await commandHandler?.(ctx);

    expect(replies).toEqual([]);
    expect(photoReplies).toEqual([
      { photo: "alice_global_qr", caption: t.qr.captionOther({ name: "Alice Wonderland" }) },
    ]);
  });
});
