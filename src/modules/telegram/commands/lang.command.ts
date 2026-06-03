import { Effect } from "effect";
import { Telegraf } from "telegraf";
import { runTelegramCommand } from "./command-error";
import { parseLangCommand } from "../parsers/lang.parser";
import { IncorrectTelegramCommand } from "../telegram.error";

export const registerLangCommand = (bot: Telegraf) => {
  bot.command("lang", async (ctx) => {
    const commandFlow = Effect.gen(function* () {
      const result = parseLangCommand(ctx.message.text);
      if (!result.ok) {
        return yield* Effect.fail(
          new IncorrectTelegramCommand({
            command: "/lang",
            message: result.message,
          }),
        );
      }
      return yield* Effect.promise(() => ctx.reply(`Show current lang`));
    });
    return runTelegramCommand(
      ctx,
      {
        command: "/lang",
        fallbackMessage: "Error processing language",
      },
      commandFlow,
    );
  });
};
