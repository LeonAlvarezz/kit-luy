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
import { ListCommandDependencies, registerListCommand } from "./list.command";
import {
  registerVoidCommand,
  type VoidCommandDependencies,
} from "./void.command";

export const registerTelegramCommands = (
  bot: Telegraf,
  joinDependencies: JoinCommandDependencies,
  buyDependencies: BuyCommandDependencies,
  settleDependencies: SettleCommandDependencies,
  paidCommandDependencies: PaidCommandDependencies,
  listCommandDependencies: ListCommandDependencies,
  voidCommandDependencies: VoidCommandDependencies,
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
  registerListCommand(bot, listCommandDependencies);
  registerVoidCommand(bot, voidCommandDependencies);
};
