import type { Telegraf } from "telegraf";

import { parseBuyCommand } from "../parsers/buy.parser";

export const registerBuyCommand = (bot: Telegraf) => {
  bot.command("buy", (ctx) => {
    const result = parseBuyCommand(ctx.message.text);

    if (!result.ok) {
      return ctx.reply(result.message);
    }

    const { command } = result;

    if (command.type === "all") {
      return ctx.reply(
        `Buy command received: ${command.totalAmount} for @all.`,
      );
    }

    return ctx.reply(
      `Buy command received: ${command.totalAmount} split between ${command.allocations
        .map(({ username, amount }) => `@${username}=${amount}`)
        .join(" ")}.`,
    );
  });
};
