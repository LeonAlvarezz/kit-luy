import { Context, Effect, Layer } from "effect";
import { Telegraf } from "telegraf";

import { WorkerEnv } from "@/http/worker-env";

export class TelegramService extends Context.Tag("TelegramService")<
  TelegramService,
  {
    readonly bot: Telegraf;
    readonly handleUpdate: (update: any) => Effect.Effect<void, Error, never>;
    readonly setWebhook: (url: string) => Effect.Effect<void, Error, never>;
  }
>() {}

export const TelegramServiceLive = Layer.effect(
  TelegramService,
  Effect.gen(function* () {
    const env = yield* WorkerEnv;
    const token = env.TELEGRAM_BOT_TOKEN;

    if (!token) {
      return yield* Effect.dieMessage(
        "TELEGRAM_BOT_TOKEN is missing in the environment bindings.",
      );
    }

    const bot = new Telegraf(token);

    bot.catch((error, ctx) => {
      throw new Error(
        `Telegram update ${ctx.update.update_id} failed: ${String(error)}`,
      );
    });

    // Register basic bot events and commands
    bot.start((ctx) => {
      return ctx.reply("Welcome to Kit Luy Bot!");
    });

    bot.help((ctx) => {
      return ctx.reply("Send me any message, and I will echo it back to you.");
    });

    bot.on("text", (ctx) => {
      if (ctx.message.text.startsWith("/")) {
        return;
      }

      return ctx.reply(`You said: ${ctx.message.text}`);
    });

    const handleUpdate = (update: any) =>
      Effect.tryPromise({
        try: () => bot.handleUpdate(update),
        catch: (error) => new Error(`Telegraf update error: ${error}`),
      }).pipe(Effect.asVoid);

    const setWebhook = (url: string) =>
      Effect.tryPromise({
        try: () => bot.telegram.setWebhook(url),
        catch: (error) => new Error(`Telegram setWebhook error: ${error}`),
      });

    return {
      bot,
      handleUpdate,
      setWebhook,
    };
  }),
);
