import { describe, expect, test } from "bun:test";
import type { Context as TelegrafContext, Telegraf } from "telegraf";

import {
  registerHelpCommand,
  TELEGRAM_COMMAND_HELP_MESSAGE,
} from "./help.command";
import { createMockRuntime } from "../../test-utils";

describe("TELEGRAM_COMMAND_HELP_MESSAGE", () => {
  test("lists every registered command", () => {
    expect(TELEGRAM_COMMAND_HELP_MESSAGE).toContain("/start");
    expect(TELEGRAM_COMMAND_HELP_MESSAGE).toContain("/join");
    expect(TELEGRAM_COMMAND_HELP_MESSAGE).toContain("/buy <amount>");
    expect(TELEGRAM_COMMAND_HELP_MESSAGE).toContain("/paid <amount>");
    expect(TELEGRAM_COMMAND_HELP_MESSAGE).toContain("/settle");
    expect(TELEGRAM_COMMAND_HELP_MESSAGE).toContain("/list");
    expect(TELEGRAM_COMMAND_HELP_MESSAGE).toContain("/void <purchase-id>");
    expect(TELEGRAM_COMMAND_HELP_MESSAGE).toContain("/setqr");
    expect(TELEGRAM_COMMAND_HELP_MESSAGE).toContain("/qr");
    expect(TELEGRAM_COMMAND_HELP_MESSAGE).toContain("/qr @user");
    expect(TELEGRAM_COMMAND_HELP_MESSAGE).toContain("/help");
  });

  test("registers the /help command", async () => {
    const replies: string[] = [];
    let helpHandler:
      | ((ctx: TelegrafContext) => Promise<unknown> | unknown)
      | undefined;
    const bot = {
      help: (handler: typeof helpHandler) => {
        helpHandler = handler;
      },
    } as unknown as Telegraf;

    registerHelpCommand(bot, createMockRuntime({}));

    expect(helpHandler).toBeDefined();
    await helpHandler?.({
      reply: (message: string) => {
        replies.push(message);
        return Promise.resolve();
      },
    } as unknown as TelegrafContext);

    expect(replies).toEqual([TELEGRAM_COMMAND_HELP_MESSAGE]);
  });
});
