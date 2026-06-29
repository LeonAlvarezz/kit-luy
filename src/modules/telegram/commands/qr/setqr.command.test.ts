import { describe, expect, test } from "bun:test";
import { Effect } from "effect";
import type { Context as TelegrafContext, Telegraf } from "telegraf";

import { registerSetQrCommand } from "./setqr.command";
import { getDefaultLocale } from "../../lang/group-locale";
import { createMockRuntime } from "../../test-utils";

describe("setqr command", () => {
  const t = getDefaultLocale();

  test("rejects /setqr if called inside a group chat", async () => {
    let commandHandler:
      | ((ctx: TelegrafContext) => Promise<unknown> | unknown)
      | undefined;
    const bot = {
      command: (name: string, handler: typeof commandHandler) => {
        if (name === "setqr") {
          commandHandler = handler;
        }
      },
      on: () => {},
    } as unknown as Telegraf;

    const mockUpdatePaymentQr = () => Effect.succeed({} as any);

    registerSetQrCommand(
      bot,
      createMockRuntime({
        telegramUserService: {
          updatePaymentQr: mockUpdatePaymentQr,
        },
      }),
    );

    const replies: string[] = [];
    const ctx = {
      chat: { id: 123, type: "group" },
      from: { id: 456 },
      reply: (msg: string) => {
        replies.push(msg);
        return Promise.resolve();
      },
      update: { update_id: 1 },
    } as unknown as TelegrafContext;

    await commandHandler?.(ctx);

    expect(replies).toEqual([t.setqr.useInPrivate()]);
  });

  test("returns usage instructions if /setqr called in private chat without a photo", async () => {
    let commandHandler:
      | ((ctx: TelegrafContext) => Promise<unknown> | unknown)
      | undefined;
    const bot = {
      command: (name: string, handler: typeof commandHandler) => {
        if (name === "setqr") {
          commandHandler = handler;
        }
      },
      on: () => {},
    } as unknown as Telegraf;

    const mockUpdatePaymentQr = () => Effect.succeed({} as any);

    registerSetQrCommand(
      bot,
      createMockRuntime({
        telegramUserService: {
          updatePaymentQr: mockUpdatePaymentQr,
        },
      }),
    );

    const replies: string[] = [];
    const ctx = {
      chat: { id: 123, type: "private" },
      from: { id: 456 },
      message: { text: "/setqr" },
      reply: (msg: string) => {
        replies.push(msg);
        return Promise.resolve();
      },
      update: { update_id: 1 },
    } as unknown as TelegrafContext;

    await commandHandler?.(ctx);

    expect(replies).toEqual([t.setqr.usagePrivate()]);
  });

  test("saves QR and replies with success if /setqr called with photo in private chat", async () => {
    let commandHandler:
      | ((ctx: TelegrafContext) => Promise<unknown> | unknown)
      | undefined;
    const bot = {
      command: (name: string, handler: typeof commandHandler) => {
        if (name === "setqr") {
          commandHandler = handler;
        }
      },
      on: () => {},
    } as unknown as Telegraf;

    let updatedUserId = "";
    let updatedFileId = "";

    const mockUpdatePaymentQr = (userId: string, fileId: string) => {
      updatedUserId = userId;
      updatedFileId = fileId;
      return Effect.succeed({} as any);
    };

    registerSetQrCommand(
      bot,
      createMockRuntime({
        telegramUserService: {
          updatePaymentQr: mockUpdatePaymentQr,
        },
      }),
    );

    const replies: string[] = [];
    const ctx = {
      chat: { id: 123, type: "private" },
      from: { id: 456 },
      message: {
        text: "/setqr",
        photo: [
          { file_id: "small_id", width: 100, height: 100 },
          { file_id: "large_id", width: 800, height: 800 },
        ],
      },
      reply: (msg: string) => {
        replies.push(msg);
        return Promise.resolve();
      },
      update: { update_id: 1 },
    } as unknown as TelegrafContext;

    await commandHandler?.(ctx);

    expect(updatedUserId).toBe("456");
    expect(updatedFileId).toBe("large_id");
    expect(replies).toEqual([t.setqr.success()]);
  });

  test("saves QR when photo is sent directly in private chat", async () => {
    let photoHandler:
      | ((ctx: TelegrafContext) => Promise<unknown> | unknown)
      | undefined;
    const bot = {
      command: () => {},
      on: (event: string, handler: typeof photoHandler) => {
        if (event === "photo") {
          photoHandler = handler;
        }
      },
    } as unknown as Telegraf;

    let updatedUserId = "";
    let updatedFileId = "";

    const mockUpdatePaymentQr = (userId: string, fileId: string) => {
      updatedUserId = userId;
      updatedFileId = fileId;
      return Effect.succeed({} as any);
    };

    registerSetQrCommand(
      bot,
      createMockRuntime({
        telegramUserService: {
          updatePaymentQr: mockUpdatePaymentQr,
        },
      }),
    );

    const replies: string[] = [];
    const ctx = {
      chat: { id: 123, type: "private" },
      from: { id: 456 },
      message: {
        photo: [
          { file_id: "small_id", width: 100, height: 100 },
          { file_id: "large_id", width: 800, height: 800 },
        ],
      },
      reply: (msg: string) => {
        replies.push(msg);
        return Promise.resolve();
      },
      update: { update_id: 1 },
    } as unknown as TelegrafContext;

    await photoHandler?.(ctx);

    expect(updatedUserId).toBe("456");
    expect(updatedFileId).toBe("large_id");
    expect(replies).toEqual([t.setqr.success()]);
  });
});
