import { Cause, Effect, Runtime } from "effect";
import type { Context as TelegrafContext } from "telegraf";

import {
  getErrorCode,
  getErrorMessage,
  getErrorName,
  logAppError,
} from "@/core/error/app-error";
import { LoggerLive } from "@/lib/logger";
import { getDefaultLocale } from "../lang/group-locale";

export const logAndReplyCommandError =
  (
    ctx: TelegrafContext,
    options: {
      readonly command: string;
      readonly fallbackMessage?: string;
    },
  ) =>
  (cause: Cause.Cause<unknown>) => {
    const error = Cause.squash(cause);
    const t = getDefaultLocale();
    const message = getErrorMessage(
      error,
      options.fallbackMessage ?? t.command.failed(),
    );

    return logAppError(cause, {
      message: "Telegram command failed",
      annotations: {
        command: options.command,
        code: getErrorCode(error),
        error: getErrorName(error),
        updateId: String(ctx.update.update_id),
        chatId: ctx.chat ? String(ctx.chat.id) : "unknown",
        userId: ctx.from ? String(ctx.from.id) : "unknown",
      },
    }).pipe(Effect.zipRight(Effect.promise(() => ctx.reply(message))));
  };

export const runTelegramCommand = <A, E, R>(
  runtime: Runtime.Runtime<R>,
  ctx: TelegrafContext,
  options: {
    readonly command: string;
    readonly fallbackMessage?: string;
  },
  effect: Effect.Effect<A, E, R>,
) =>
  Runtime.runPromise(runtime)(
    effect.pipe(
      Effect.catchAllCause(logAndReplyCommandError(ctx, options)),
    ),
  );
