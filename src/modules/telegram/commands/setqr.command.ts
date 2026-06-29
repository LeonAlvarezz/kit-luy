import { Context, Effect, Runtime } from "effect";
import type { Telegraf } from "telegraf";

import { TelegramUserService } from "@/modules/telegram-user/telegram-user.service";
import { getDefaultLocale } from "../lang/group-locale";
import { IncorrectTelegramCommand } from "../telegram.error";
import { isSettlementGroupChat } from "../telegram.utils";
import { runTelegramCommand } from "./command-error";
import type { TelegramDeps } from "../telegram.types";
import { message } from "telegraf/filters";

type TelegramPhoto = {
  readonly file_id: string;
};

const getPhotos = (message: unknown): readonly TelegramPhoto[] | undefined => {
  if (!message || typeof message !== "object" || !("photo" in message)) {
    return undefined;
  }

  const photo = (message as { readonly photo?: unknown }).photo;
  if (!Array.isArray(photo)) {
    return undefined;
  }

  return photo.filter(
    (item): item is TelegramPhoto =>
      !!item &&
      typeof item === "object" &&
      "file_id" in item &&
      typeof item.file_id === "string",
  );
};

export const registerSetQrCommand = (
  bot: Telegraf,
  runtime: Runtime.Runtime<TelegramDeps>,
) => {
  bot.command("setqr", async (ctx) => {
    const commandFlow = Effect.gen(function* () {
      const telegramUserService = yield* TelegramUserService;
      const t = getDefaultLocale();

      if (!ctx.chat || isSettlementGroupChat(ctx.chat)) {
        return yield* Effect.fail(
          new IncorrectTelegramCommand({
            command: "/setqr",
            message: t.setqr.useInPrivate(),
          }),
        );
      }

      if (!ctx.from) {
        return yield* Effect.fail(
          new IncorrectTelegramCommand({
            command: "/setqr",
            message: t.command.failed(),
          }),
        );
      }

      const photo = getPhotos(ctx.message);

      if (photo && photo.length > 0) {
        const fileId = photo[photo.length - 1].file_id;
        const tgUserId = String(ctx.from.id);

        yield* telegramUserService.updatePaymentQr(tgUserId, fileId);

        return yield* Effect.promise(() => ctx.reply(t.setqr.success()));
      }

      return yield* Effect.promise(() => ctx.reply(t.setqr.usagePrivate()));
    });

    return runTelegramCommand(
      runtime,
      ctx,
      {
        command: "/setqr",
        fallbackMessage: getDefaultLocale().setqr.fallback(),
      },
      commandFlow,
    );
  });

  bot.on(message("photo"), async (ctx) => {
    const messageFlow = Effect.gen(function* () {
      const telegramUserService = yield* TelegramUserService;
      const t = getDefaultLocale();

      if (!ctx.chat || isSettlementGroupChat(ctx.chat)) {
        return;
      }

      if (!ctx.from) {
        return yield* Effect.fail(
          new IncorrectTelegramCommand({
            command: "photo upload",
            message: t.command.failed(),
          }),
        );
      }

      const photo = getPhotos(ctx.message);
      if (photo && photo.length > 0) {
        const fileId = photo[photo.length - 1].file_id;
        const tgUserId = String(ctx.from.id);

        yield* telegramUserService.updatePaymentQr(tgUserId, fileId);

        return yield* Effect.promise(() => ctx.reply(t.setqr.success()));
      }
    });

    return runTelegramCommand(
      runtime,
      ctx,
      {
        command: "photo upload",
        fallbackMessage: getDefaultLocale().setqr.fallback(),
      },
      messageFlow,
    );
  });
};
