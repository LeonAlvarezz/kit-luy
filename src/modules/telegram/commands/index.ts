import { Effect } from "effect";
import type { Telegraf } from "telegraf";

import type { TelegramChat, TelegramUser } from "../telegram.mapper";
import { registerBuyCommand, type BuyCommandDependencies } from "./buy.command";
import {
  registerJoinCommand,
  type JoinCommandDependencies,
} from "./join.command";

type RegisterTelegramMember = (
  chat: TelegramChat,
  user: TelegramUser,
) => Effect.Effect<unknown, unknown>;

export const registerTelegramCommands = (
  bot: Telegraf,
  joinDependencies: JoinCommandDependencies,
  buyDependencies: BuyCommandDependencies,
) => {
  bot.start((ctx) => {
    return ctx.reply("Welcome to Kit Luy Bot!");
  });

  bot.help((ctx) => {
    return ctx.reply("Send me any message, and I will echo it back to you.");
  });

  registerJoinCommand(bot, joinDependencies);
  registerBuyCommand(bot, buyDependencies);
};
