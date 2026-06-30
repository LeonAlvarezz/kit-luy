import { Effect, Schema } from "effect";
import { ConversationStrategy } from "./conversation.strategy";
import {
  constructConfirmKeyboard,
  escapeHtml,
  formatMemberName,
  parseAmount,
} from "../telegram.utils";
import { MemberService } from "@/modules/member/member.service";
import { TelegramConversationService } from "@/modules/telegram-conversation/telegram-conversation.service";
import { PurchaseNoActiveMembers } from "@/modules/purchase/purchase.error";
import {
  ConversationStep,
  TelegramConversationModel,
} from "@/modules/telegram-conversation/telegram-conversation.model";
import { MemberModel } from "@/modules/member/member.model";
import { formatAmount } from "@/shared/currency";
import { RepaymentClaimService } from "@/modules/repayment/repayment-claim.service";
import { RepaymentClaimStatus } from "@/modules/repayment/repayment-claim.model";
import { getGroupLocale } from "../lang/group-locale";
import type { TranslationFunctions } from "../lang/i18n-types";
import { GroupService } from "@/modules/group/group.service";
import { PurchaseService } from "@/modules/purchase/purchase.service";

export const constructKeyboard = (
  sessionId: number,
  members: MemberModel.Entity[],
  t: TranslationFunctions,
) => {
  return {
    inline_keyboard: [
      ...members.map((member) => [
        {
          text: `${formatMemberName(member)}`,
          callback_data: `flow:user:${sessionId}:${member.id}`,
        },
      ]),
      [{ text: t.paid.cancel(), callback_data: `flow:cancel:${sessionId}` }],
    ],
  };
};

const parsePaidConversationPayload = (payloadJson: string) =>
  Schema.decodeUnknownSync(TelegramConversationModel.PaidConversationSchema)(
    JSON.parse(payloadJson),
  );

const formatSummary = (
  t: TranslationFunctions,
  sender: MemberModel.Entity,
  receiver: MemberModel.Entity,
  amount: number,
  purchaseNote?: string | null,
) => {
  let summary = `${t.paid.summaryHeader()}\n\n${t.paid.summaryAmount()}: <code>${formatAmount(amount)}</code>\n${t.paid.summaryFrom()}: <b>${escapeHtml(
    formatMemberName(sender),
  )}</b>\n${t.paid.summaryTo()}: <b>${escapeHtml(formatMemberName(receiver))}</b>`;
  
  if (purchaseNote !== undefined) {
    summary += `\n${t.paid.summaryPurchase()}: <b>${escapeHtml(purchaseNote || t.paid.summaryNoPurchase())}</b>`;
  }
  return summary;
};

export const paidStrategy: ConversationStrategy = {
  flow: "paid",
  onText: (ctx, sender, session) =>
    Effect.gen(function* () {
      const amount = parseAmount(ctx);
      const groupService = yield* GroupService;
      const t = yield* getGroupLocale(groupService.findById, sender.group_id);

      if (!amount) {
        return yield* Effect.promise(() =>
          ctx.reply(t.paid.validAmount()),
        );
      }

      const memberService = yield* MemberService;
      const telegramConversationService = yield* TelegramConversationService;

      const members = yield* memberService.findActiveByGroupId(sender.group_id);
      if (members.filter((member) => member.id !== sender.id).length <= 0) {
        return yield* Effect.fail(
          new PurchaseNoActiveMembers({
            tg_chat_id: String(ctx.chat?.id),
            message: t.paid.noOtherActiveMembers(),
          }),
        );
      }

      const payload: TelegramConversationModel.PaidConversation = {
        amount,
      };

      const updatedSession = yield* telegramConversationService.updateSession(
        session.id,
        {
          step: ConversationStep.MEMBERS,
          payload,
        },
      );

      const excludeSender = members.filter(
        (member) => member.tg_user_id !== sender.tg_user_id,
      );

      return yield* Effect.promise(() =>
        ctx.reply(t.paid.askReceiver(), {
          reply_markup: constructKeyboard(updatedSession.id, excludeSender, t),
        }),
      );
    }),
  onAction: (ctx, action, sender, session, targetMemberId) =>
    Effect.gen(function* () {
      const memberService = yield* MemberService;
      const repaymentClaimService = yield* RepaymentClaimService;
      const telegramConversationService = yield* TelegramConversationService;
      const groupService = yield* GroupService;
      const t = yield* getGroupLocale(groupService.findById, sender.group_id);

      const payload = parsePaidConversationPayload(session.payload_json);

      if (action === "cancel") {
        yield* telegramConversationService.cancelSession(session.id);
        yield* Effect.promise(() => ctx.answerCbQuery(t.paid.cancelled()));
        return yield* Effect.promise(() => ctx.editMessageText(t.paid.cancelled()));
      }

      if (action === "user" && targetMemberId) {
        const members = yield* memberService.findActiveByGroupId(
          sender.group_id,
        );
        const receiver = members.find((member) => member.id === targetMemberId);
        const totalAmount = payload.amount;

        if (!receiver || !totalAmount) {
          yield* Effect.promise(() =>
            ctx.answerCbQuery(t.paid.incompleteFlow()),
          );
          return;
        }

        const purchaseService = yield* PurchaseService;
        const activePurchases = yield* purchaseService.findAllByGroupId(
          sender.group_id,
        );
        const userActivePurchases = activePurchases.filter((p) => {
          if (p.status !== "active") return false;
          if (p.payer_member_id !== receiver.id) return false;
          const allocation = p.allocations.find(
            (a) => a.responsible_member_id === sender.id,
          );
          return !!allocation;
        });

        if (userActivePurchases.length > 0) {
          yield* telegramConversationService.updateSession(session.id, {
            step: ConversationStep.PURCHASE,
            payload: {
              ...payload,
              receiverMemberId: receiver.id,
            },
          });

          const inline_keyboard = [
            ...userActivePurchases.map((p) => {
              const allocation = p.allocations.find(
                (a) => a.responsible_member_id === sender.id,
              )!;
              const label = `${p.note || "Purchase"} (${formatAmount(allocation.amount)})`;
              return [
                {
                  text: label,
                  callback_data: `flow:purchase:${session.id}:${p.id}`,
                },
              ];
            }),
            [
              {
                text: t.paid.generalPayment(),
                callback_data: `flow:purchase:${session.id}:0`,
              },
            ],
            [
              {
                text: t.paid.cancel(),
                callback_data: `flow:cancel:${session.id}`,
              },
            ],
          ];

          yield* Effect.promise(() => ctx.answerCbQuery());
          return yield* Effect.promise(() =>
            ctx.editMessageText(t.paid.askPurchase(), {
              reply_markup: { inline_keyboard },
            }),
          );
        }

        yield* telegramConversationService.updateSession(session.id, {
          step: ConversationStep.CONFIRM,
          payload: {
            ...payload,
            receiverMemberId: receiver.id,
            purchaseId: null,
          },
        });
        yield* Effect.promise(() => ctx.answerCbQuery());
        return yield* Effect.promise(() =>
          ctx.editMessageText(formatSummary(t, sender, receiver, totalAmount, null), {
            parse_mode: "HTML",
            reply_markup: constructConfirmKeyboard(session.id, t),
          }),
        );
      }

      if (action === "purchase" && targetMemberId !== undefined) {
        const members = yield* memberService.findActiveByGroupId(
          sender.group_id,
        );
        const receiver = members.find(
          (member) => member.id === payload.receiverMemberId,
        );
        const totalAmount = payload.amount;

        if (!receiver || !totalAmount) {
          yield* Effect.promise(() =>
            ctx.answerCbQuery(t.paid.incompleteFlow()),
          );
          return;
        }

        const purchaseId = targetMemberId === 0 ? null : targetMemberId;
        let purchaseNote: string | null = null;
        if (purchaseId !== null) {
          const purchaseService = yield* PurchaseService;
          const purchase = yield* purchaseService.findById(purchaseId);
          purchaseNote = `#${purchase.id} - ${purchase.note || "Purchase"}`;
        }

        yield* telegramConversationService.updateSession(session.id, {
          step: ConversationStep.CONFIRM,
          payload: {
            ...payload,
            purchaseId,
          },
        });

        yield* Effect.promise(() => ctx.answerCbQuery());
        return yield* Effect.promise(() =>
          ctx.editMessageText(
            formatSummary(t, sender, receiver, totalAmount, purchaseNote),
            {
              parse_mode: "HTML",
              reply_markup: constructConfirmKeyboard(session.id, t),
            },
          ),
        );
      }

      if (action === "confirm") {
        const members = yield* memberService.findActiveByGroupId(
          sender.group_id,
        );
        const receiver = members.find(
          (member) => member.id === payload.receiverMemberId,
        );
        const totalAmount = payload.amount;

        if (!receiver || !totalAmount) {
          yield* Effect.promise(() =>
            ctx.answerCbQuery(t.paid.incompleteFlow()),
          );
          return;
        }

        const repaymentClaim = yield* repaymentClaimService.create({
          status: RepaymentClaimStatus.PENDING,
          amount_cents: totalAmount,
          group_id: sender.group_id,
          purchase_id: payload.purchaseId ?? null,
          sender_member_id: sender.id,
          receiver_member_id: receiver.id,
          tg_message_id: ctx.callbackQuery?.message?.message_id ?? 0,
        });
        yield* telegramConversationService.completeSession(session.id);
        yield* Effect.promise(() => ctx.answerCbQuery(t.paid.claimCreatedToast()));

        return yield* Effect.promise(() =>
          ctx.editMessageText(
            t.paid.claimCreated({
              claimId: repaymentClaim.id,
              amount: formatAmount(totalAmount),
            }),
            {
              reply_markup: {
                inline_keyboard: [
                  [
                    {
                      text: t.paid.accept(),
                      callback_data: `repayment_claim:accept:${repaymentClaim.id}`,
                    },
                    {
                      text: t.paid.reject(),
                      callback_data: `repayment_claim:reject:${repaymentClaim.id}`,
                    },
                  ],
                ],
              },
            },
          ),
        );
      }
    }),
};
