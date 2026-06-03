import type { Telegraf } from "telegraf";

import { registerBuyCommand, type BuyCommandDependencies } from "./buy.command";
import { registerHelpCommand } from "./help.command";
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

  registerHelpCommand(bot);

  registerJoinCommand(bot, joinDependencies);
  registerBuyCommand(bot, buyDependencies);
  registerSettleCommand(bot, settleDependencies);
  registerPaidCommand(bot, paidCommandDependencies);
  registerListCommand(bot, listCommandDependencies);
  registerVoidCommand(bot, voidCommandDependencies);
};
