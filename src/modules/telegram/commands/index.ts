import { Effect } from "effect";
import type { Telegraf } from "telegraf";

import type { TelegramChat, TelegramUser } from "../telegram.mapper";
import {
  registerBuyCommand,
  type BuyCommandDependencies,
} from "./buy.command";
import { registerJoinCommand } from "./join.command";

type RegisterTelegramMember = (
  chat: TelegramChat,
  user: TelegramUser,
) => Effect.Effect<void, unknown>;

export const registerTelegramCommands = (
  bot: Telegraf,
  registerTelegramMember: RegisterTelegramMember,
  dependencies: BuyCommandDependencies,
) => {
  bot.start((ctx) => {
    return ctx.reply("Welcome to Kit Luy Bot!");
  });

  bot.help((ctx) => {
    return ctx.reply("Send me any message, and I will echo it back to you.");
  });

  registerJoinCommand(bot, registerTelegramMember);
  registerBuyCommand(bot, dependencies);
};
