import type { Telegraf } from "telegraf";

export const TELEGRAM_COMMAND_HELP_MESSAGE = [
  "Kit Luy commands:",
  "",
  "/start - Show the welcome message.",
  "/join - Register yourself in this settlement group.",
  "/buy <amount> - Record a purchase split across everyone.",
  "/buy <amount> @user=amount ... - Record a purchase with explicit splits.",
  "/paid <amount> - Claim that you paid your next repayment.",
  "/paid @user=<amount> - Claim that you paid a specific member.",
  "/settle - Show who should pay whom.",
  "/list - Show recent active purchases.",
  "/void <purchase-id> - Void a purchase.",
  "/help - Show this command list.",
].join("\n");

export const registerHelpCommand = (bot: Telegraf) => {
  bot.help((ctx) => {
    return ctx.reply(TELEGRAM_COMMAND_HELP_MESSAGE);
  });
};
