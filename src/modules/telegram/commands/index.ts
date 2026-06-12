import type { Telegraf } from "telegraf";

import { registerBuyCommand, type BuyCommandDependencies } from "./buy.command";
import { registerHelpCommand, type HelpCommandDependencies } from "./help.command";
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
import { LangCommandDependencies, registerLangCommand } from "./lang.command";
import {
  registerSetQrCommand,
  type SetQrCommandDependencies,
} from "./setqr.command";
import { registerQrCommand, type QrCommandDependencies } from "./qr.command";
import { getDefaultLocale } from "../lang/group-locale";

export const registerTelegramCommands = (
  bot: Telegraf,
  joinDependencies: JoinCommandDependencies,
  helpDependencies: HelpCommandDependencies,
  buyDependencies: BuyCommandDependencies,
  settleDependencies: SettleCommandDependencies,
  paidCommandDependencies: PaidCommandDependencies,
  listCommandDependencies: ListCommandDependencies,
  voidCommandDependencies: VoidCommandDependencies,
  langCommandDependencies: LangCommandDependencies,
  setQrDependencies: SetQrCommandDependencies,
  qrDependencies: QrCommandDependencies,
) => {
  bot.start((ctx) => {
    return ctx.reply(getDefaultLocale().bot.welcome());
  });

  registerHelpCommand(bot, helpDependencies);

  registerJoinCommand(bot, joinDependencies);
  registerBuyCommand(bot, buyDependencies);
  registerSettleCommand(bot, settleDependencies);
  registerPaidCommand(bot, paidCommandDependencies);
  registerListCommand(bot, listCommandDependencies);
  registerVoidCommand(bot, voidCommandDependencies);
  registerLangCommand(bot, langCommandDependencies);
  registerSetQrCommand(bot, setQrDependencies);
  registerQrCommand(bot, qrDependencies);
};
