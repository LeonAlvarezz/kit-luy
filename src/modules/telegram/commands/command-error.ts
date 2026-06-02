import { Cause, Effect } from "effect";
import type { Context as TelegrafContext } from "telegraf";

import { LoggerLive } from "@/lib/logger";

const toErrorMessage = (error: unknown, fallbackMessage: string) => {
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  return fallbackMessage;
};

const getStringField = (error: unknown, field: string) => {
  if (typeof error !== "object" || error === null || !(field in error)) {
    return undefined;
  }

  const value = (error as Record<string, unknown>)[field];
  return typeof value === "string" ? value : undefined;
};

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
    const message = toErrorMessage(
      error,
      options.fallbackMessage ?? "Command failed.",
    );

    return Effect.logError("Telegram command failed").pipe(
      Effect.annotateLogs({
        command: options.command,
        message,
        code: getStringField(error, "code") ?? "UNKNOWN",
        error:
          getStringField(error, "_tag") ??
          getStringField(error, "name") ??
          "UNKNOWN",
        cause: Cause.pretty(cause),
        updateId: String(ctx.update.update_id),
        chatId: ctx.chat ? String(ctx.chat.id) : "unknown",
        userId: ctx.from ? String(ctx.from.id) : "unknown",
      }),
      Effect.zipRight(Effect.promise(() => ctx.reply(message))),
    );
  };

export const runTelegramCommand = <A, E>(
  ctx: TelegrafContext,
  options: {
    readonly command: string;
    readonly fallbackMessage?: string;
  },
  effect: Effect.Effect<A, E, never>,
) =>
  Effect.runPromise(
    effect.pipe(
      Effect.catchAllCause(logAndReplyCommandError(ctx, options)),
      Effect.provide(LoggerLive),
    ),
  );
