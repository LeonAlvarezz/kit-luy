import type { Telegraf } from "telegraf";
import { Runtime } from "effect";

import { registerBuyCommand } from "./buy/buy.command";
import { registerHelpCommand } from "./help/help.command";
import { registerJoinCommand } from "./join.command";
import { registerSettleCommand } from "./settle/settle.command";
import { registerPaidCommand } from "./paid.command";
import { registerListCommand } from "./list/list.command";
import { registerVoidCommand } from "./void/void.command";
import { registerLangCommand } from "./lang/lang.command";
import { registerSetQrCommand } from "./qr/setqr.command";
import { registerQrCommand } from "./qr/qr.command";
import { getDefaultLocale } from "../lang/group-locale";
import type { TelegramDeps } from "../telegram.types";

export const registerTelegramCommands = (
  bot: Telegraf,
  runtime: Runtime.Runtime<TelegramDeps>,
) => {
  bot.start((ctx) => {
    return ctx.reply(getDefaultLocale().bot.welcome());
  });

  registerHelpCommand(bot, runtime);
  registerJoinCommand(bot, runtime);
  registerBuyCommand(bot, runtime);
  registerSettleCommand(bot, runtime);
  registerPaidCommand(bot, runtime);
  registerListCommand(bot, runtime);
  registerVoidCommand(bot, runtime);
  registerLangCommand(bot, runtime);
  registerSetQrCommand(bot, runtime);
  registerQrCommand(bot, runtime);
};
