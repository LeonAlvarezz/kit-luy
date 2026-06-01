import { Effect } from "effect";
import type { Telegraf } from "telegraf";

import type { TelegramChat, TelegramUser } from "../telegram.mapper";
import { isSettlementGroupChat } from "../telegram.utils";

type RegisterTelegramMember = (
  chat: TelegramChat,
  user: TelegramUser,
) => Effect.Effect<void, unknown>;

export const registerJoinCommand = (
  bot: Telegraf,
  registerTelegramMember: RegisterTelegramMember,
) => {
  bot.command("join", async (ctx) => {
    if (!ctx.chat || !ctx.from || !isSettlementGroupChat(ctx.chat)) {
      return ctx.reply("Use /join inside your Kit Luy group.");
    }

    return Effect.runPromise(registerTelegramMember(ctx.chat, ctx.from)).then(
      () => ctx.reply("You are registered in this settlement group."),
    );
  });
};
