import { Effect } from "effect";
import { ConversationStrategy } from "./conversation.strategy";
import { MemberService } from "@/modules/member/member.service";
import { TelegramUserService } from "@/modules/telegram-user/telegram-user.service";
import { getGroupLocale } from "../lang/group-locale";
import { GroupService } from "@/modules/group/group.service";
import { TelegramConversationService } from "@/modules/telegram-conversation/telegram-conversation.service";
import { formatMemberName } from "../telegram.utils";

export const qrStrategy: ConversationStrategy = {
  flow: "qr",
  onText: (ctx, sender, session) => Effect.void,
  onAction: (ctx, action, sender, session, targetMemberId) =>
    Effect.gen(function* () {
      const memberService = yield* MemberService;
      const telegramUserService = yield* TelegramUserService;
      const telegramConversationService = yield* TelegramConversationService;
      const groupService = yield* GroupService;
      const t = yield* getGroupLocale(groupService.findById, sender.group_id);

      if (action === "cancel") {
        yield* telegramConversationService.cancelSession(session.id);
        yield* Effect.promise(() => ctx.answerCbQuery(t.qr.cancelled()));
        return yield* Effect.promise(() =>
          ctx.editMessageText(t.qr.cancelled()),
        );
      }
/*  */
      if (action === "user" && targetMemberId) {
        const members = yield* memberService.findActiveByGroupId(
          sender.group_id,
        );
        const targetMember = members.find(
          (member) => member.id === targetMemberId,
        );

        if (!targetMember?.tg_user_id) {
          const name = targetMember ? formatMemberName(targetMember) : "";
          yield* telegramConversationService.completeSession(session.id);
          yield* Effect.promise(() => ctx.answerCbQuery());
          return yield* Effect.promise(() =>
            ctx.reply(t.qr.notSetOther({ name }), { parse_mode: "HTML" }),
          );
        }

        const tgUser = yield* telegramUserService.findByTgUserId(
          targetMember.tg_user_id,
        );
        const paymentQrFileId = tgUser?.payment_qr_file_id;

        yield* telegramConversationService.completeSession(session.id);
        yield* Effect.promise(() => ctx.answerCbQuery());

        if (!paymentQrFileId) {
          return yield* Effect.promise(() =>
            ctx.reply(
              t.qr.notSetOther({ name: formatMemberName(targetMember) }),
              {
                parse_mode: "HTML",
              },
            ),
          );
        }

        if (targetMember.id === sender.id) {
          return yield* Effect.promise(() =>
            ctx.replyWithPhoto(paymentQrFileId, {
              caption: t.qr.captionSelf(),
              parse_mode: "HTML",
            }),
          );
        }

        return yield* Effect.promise(() =>
          ctx.replyWithPhoto(paymentQrFileId, {
            caption: t.qr.captionOther({
              name: formatMemberName(targetMember),
            }),
            parse_mode: "HTML",
          }),
        );
      }

      return;
    }),
};
