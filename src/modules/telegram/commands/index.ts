import type { Telegraf } from "telegraf";
import { Runtime } from "effect";

import { registerBuyCommand } from "./buy.command";
import { registerHelpCommand } from "./help.command";
import { registerJoinCommand } from "./join.command";
import { registerSettleCommand } from "./settle.command";
import { registerPaidCommand } from "./paid.command";
import { registerListCommand } from "./list.command";
import { registerVoidCommand } from "./void.command";
import { registerLangCommand } from "./lang.command";
import { registerSetQrCommand } from "./setqr.command";
import { registerQrCommand } from "./qr.command";
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
