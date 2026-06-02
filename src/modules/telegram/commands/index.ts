import { Effect } from "effect";
import type { Telegraf } from "telegraf";

import type { TelegramChat, TelegramUser } from "../telegram.mapper";
import { registerBuyCommand, type BuyCommandDependencies } from "./buy.command";
import {
  registerJoinCommand,
  type JoinCommandDependencies,
} from "./join.command";
import {
  registerSettleCommand,
  type SettleCommandDependencies,
} from "./settle.command";
import { PaidCommandDependencies, registerPaidCommand } from "./paid.command";

export const registerTelegramCommands = (
  bot: Telegraf,
  joinDependencies: JoinCommandDependencies,
  buyDependencies: BuyCommandDependencies,
  settleDependencies: SettleCommandDependencies,
  paidCommandDependencies: PaidCommandDependencies,
) => {
  bot.start((ctx) => {
    return ctx.reply("Welcome to Kit Luy Bot!");
  });

  bot.help((ctx) => {
    return ctx.reply("Send me any message, and I will echo it back to you.");
  });

  registerJoinCommand(bot, joinDependencies);
  registerBuyCommand(bot, buyDependencies);
  registerSettleCommand(bot, settleDependencies);
  registerPaidCommand(bot, paidCommandDependencies);
};
