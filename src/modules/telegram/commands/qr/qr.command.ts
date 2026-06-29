import { Context, Effect, Runtime } from "effect";
import type { Telegraf } from "telegraf";

import { GroupService } from "@/modules/group/group.service";
import { MemberService } from "@/modules/member/member.service";
import { TelegramUserService } from "@/modules/telegram-user/telegram-user.service";
import { IncorrectTelegramCommand } from "../../telegram.error";
import { formatMemberName, isSettlementGroupChat } from "../../telegram.utils";
import { runTelegramCommand } from "../command-error";
import { getDefaultLocale, getGroupLocale } from "../../lang/group-locale";
import type { TelegramDeps } from "../../telegram.types";
import { MemberModel } from "@/modules/member/member.model";
import type { TranslationFunctions } from "../../lang/i18n-types";
import { TelegramConversationService } from "@/modules/telegram-conversation/telegram-conversation.service";

const qrCommandRegex = /^\/qr(?:@\w+)?(?:\s+(.+))?$/i;
const formatPickerMemberName = (
  sender: MemberModel.Entity,
  member: MemberModel.Entity,
  t: TranslationFunctions,
) =>
  member.id === sender.id
    ? t.qr.memberPickerMyself()
    : formatMemberName(member);

const constructQRKeyboard = (
  sessionId: number,
  sender: MemberModel.Entity,
  members: readonly MemberModel.Entity[],
  t: TranslationFunctions,
) => {
  return {
    inline_keyboard: [
      ...members.map((member) => [
        {
          text: formatPickerMemberName(sender, member, t),
          callback_data: `flow:user:${sessionId}:${member.id}`,
        },
      ]),
      [
        {
          text: t.command.cancel(),
          callback_data: `flow:cancel:${sessionId}`,
        },
      ],
    ],
  };
};

export const registerQrCommand = (
  bot: Telegraf,
  runtime: Runtime.Runtime<TelegramDeps>,
) => {
  bot.command("qr", async (ctx) => {
    const commandFlow = Effect.gen(function* () {
      const memberService = yield* MemberService;
      const groupService = yield* GroupService;
      const telegramUserService = yield* TelegramUserService;
      const telegramConversationService = yield* TelegramConversationService;

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
        const sender = yield* memberService.findTelegramMember({
          tg_chat_id: tgChatId,
          tg_user_id: tgUserId,
        });
        const t = yield* getGroupLocale(groupService.findById, sender.group_id);

        // Get sender's own QR in group chat
        if (!targetUsername) {
          const session = yield* telegramConversationService.startSession({
            group_id: sender.group_id,
            flow: "qr",
            member_id: sender.id,
          });
          const members = yield* memberService.findActiveByGroupId(
            sender.group_id,
          );

          return yield* Effect.promise(() =>
            ctx.reply(t.qr.selectMember(), {
              parse_mode: "HTML",
              reply_markup: constructQRKeyboard(session.id, sender, members, t),
            }),
          );
        }

        // Get mentioned user's QR
        const members = yield* memberService.findActiveByGroupId(
          sender.group_id,
        );

        const targetMember = members.find(
          (m) => m.alias?.toLowerCase() === targetUsername.toLowerCase(),
        );

        if (!targetMember) {
          return yield* Effect.promise(() =>
            ctx.reply(t.buy.beneficiaryNotFound({ username: targetUsername }), {
              parse_mode: "HTML",
            }),
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

        const tgUser =
          yield* telegramUserService.findByTgUserId(targetTgUserId);
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

      // 2. Private Chat Flow
      const t = defaultT;

      // Subflow: Get another user's QR globally by username in private chat
      if (targetUsername) {
        const tgUser =
          yield* telegramUserService.findByUsername(targetUsername);
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
      const tgUser = yield* telegramUserService.findByTgUserId(tgUserId);
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
      runtime,
      ctx,
      {
        command: "/qr",
        fallbackMessage: getDefaultLocale().qr.fallback(),
      },
      commandFlow,
    );
  });
};
