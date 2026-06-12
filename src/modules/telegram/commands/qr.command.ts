import { Context, Effect } from "effect";
import type { Telegraf } from "telegraf";

import type { GroupService } from "@/modules/group/group.service";
import type { MemberService } from "@/modules/member/member.service";
import type { TelegramUserService } from "@/modules/telegram-user/telegram-user.service";
import { IncorrectTelegramCommand } from "../telegram.error";
import { formatMemberName, isSettlementGroupChat } from "../telegram.utils";
import { runTelegramCommand } from "./command-error";
import { getDefaultLocale, getGroupLocale } from "../lang/group-locale";

export type QrCommandDependencies = Pick<
  Context.Tag.Service<typeof MemberService>,
  "findTelegramMember" | "findActiveByGroupId"
> & {
  readonly findGroupById: Context.Tag.Service<typeof GroupService>["findById"];
  readonly findByTgUserId: Context.Tag.Service<
    typeof TelegramUserService
  >["findByTgUserId"];
  readonly findByUsername: Context.Tag.Service<
    typeof TelegramUserService
  >["findByUsername"];
};

const qrCommandRegex = /^\/qr(?:@\w+)?(?:\s+(.+))?$/i;

export const registerQrCommand = (
  bot: Telegraf,
  dependencies: QrCommandDependencies,
) => {
  bot.command("qr", async (ctx) => {
    const commandFlow = Effect.gen(function* () {
      const defaultT = getDefaultLocale();

      if (!ctx.chat || !ctx.from) {
        return yield* Effect.fail(
          new IncorrectTelegramCommand({
            command: "/qr",
            message: defaultT.command.failed(),
          }),
        );
      }

      const match = ctx.message.text.match(qrCommandRegex);
      if (!match) {
        return yield* Effect.fail(
          new IncorrectTelegramCommand({
            command: "/qr",
            message: defaultT.qr.usage(),
          }),
        );
      }

      const targetRaw = match[1]?.trim();
      const targetUsername = targetRaw?.startsWith("@")
        ? targetRaw.slice(1)
        : targetRaw;

      const tgUserId = String(ctx.from.id);

      // 1. Group Chat Flow
      if (isSettlementGroupChat(ctx.chat)) {
        const tgChatId = String(ctx.chat.id);
        const sender = yield* dependencies.findTelegramMember({
          tg_chat_id: tgChatId,
          tg_user_id: tgUserId,
        });
        const t = yield* getGroupLocale(
          dependencies.findGroupById,
          sender.group_id,
        );

        // Subflow: Get another user's QR
        if (targetUsername) {
          const members = yield* dependencies.findActiveByGroupId(
            sender.group_id,
          );
          const targetMember = members.find(
            (m) => m.alias?.toLowerCase() === targetUsername.toLowerCase(),
          );

          if (!targetMember) {
            return yield* Effect.promise(() =>
              ctx.reply(
                t.buy.beneficiaryNotFound({ username: targetUsername }),
                { parse_mode: "HTML" },
              ),
            );
          }

          const targetTgUserId = targetMember.tg_user_id;
          if (!targetTgUserId) {
            const displayName = formatMemberName(targetMember);
            return yield* Effect.promise(() =>
              ctx.reply(t.qr.notSetOther({ name: displayName }), {
                parse_mode: "HTML",
              }),
            );
          }

          const tgUser = yield* dependencies.findByTgUserId(targetTgUserId);
          const paymentQrFileId = tgUser?.payment_qr_file_id;
          if (paymentQrFileId) {
            const displayName = formatMemberName(targetMember);
            return yield* Effect.promise(() =>
              ctx.replyWithPhoto(paymentQrFileId, {
                caption: t.qr.captionOther({ name: displayName }),
                parse_mode: "HTML",
              }),
            );
          }

          const displayName = formatMemberName(targetMember);
          return yield* Effect.promise(() =>
            ctx.reply(t.qr.notSetOther({ name: displayName }), {
              parse_mode: "HTML",
            }),
          );
        }

        // Subflow: Get sender's own QR in group chat
        const tgUser = yield* dependencies.findByTgUserId(tgUserId);
        const paymentQrFileId = tgUser?.payment_qr_file_id;
        if (paymentQrFileId) {
          return yield* Effect.promise(() =>
            ctx.replyWithPhoto(paymentQrFileId, {
              caption: t.qr.captionSelf(),
              parse_mode: "HTML",
            }),
          );
        }

        return yield* Effect.promise(() =>
          ctx.reply(t.qr.notSetSelf(), { parse_mode: "HTML" }),
        );
      }

      // 2. Private Chat Flow
      const t = defaultT;

      // Subflow: Get another user's QR globally by username in private chat
      if (targetUsername) {
        const tgUser = yield* dependencies.findByUsername(targetUsername);
        const paymentQrFileId = tgUser?.payment_qr_file_id;
        if (paymentQrFileId) {
          const displayName = tgUser.display_name ?? `@${tgUser.username}`;
          return yield* Effect.promise(() =>
            ctx.replyWithPhoto(paymentQrFileId, {
              caption: t.qr.captionOther({ name: displayName }),
              parse_mode: "HTML",
            }),
          );
        }

        const displayName = `@${targetUsername}`;
        return yield* Effect.promise(() =>
          ctx.reply(t.qr.notSetOther({ name: displayName }), {
            parse_mode: "HTML",
          }),
        );
      }

      // Subflow: Get sender's own QR in private chat
      const tgUser = yield* dependencies.findByTgUserId(tgUserId);
      const paymentQrFileId = tgUser?.payment_qr_file_id;
      if (paymentQrFileId) {
        return yield* Effect.promise(() =>
          ctx.replyWithPhoto(paymentQrFileId, {
            caption: t.qr.captionSelf(),
            parse_mode: "HTML",
          }),
        );
      }

      return yield* Effect.promise(() =>
        ctx.reply(t.qr.notSetSelf(), { parse_mode: "HTML" }),
      );
    });

    return runTelegramCommand(
      ctx,
      {
        command: "/qr",
        fallbackMessage: getDefaultLocale().qr.fallback(),
      },
      commandFlow,
    );
  });
};
