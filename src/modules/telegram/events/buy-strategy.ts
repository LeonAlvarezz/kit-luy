import { Effect, Schema } from "effect";
import { GroupService } from "@/modules/group/group.service";
import type { MemberModel } from "@/modules/member/member.model";
import { MemberService } from "@/modules/member/member.service";
import { AllocationKind } from "@/modules/purchase/purchase-allocation.model";
import { PurchaseNoActiveMembers } from "@/modules/purchase/purchase.error";
import { PurchaseStatus } from "@/modules/purchase/purchase.model";
import { PurchaseService } from "@/modules/purchase/purchase.service";
import { splitEqually } from "@/modules/purchase/purchase.utils";
import {
  ConversationStep,
  TelegramConversationFlow,
  TelegramConversationStatus,
  TelegramConversationModel,
} from "@/modules/telegram-conversation/telegram-conversation.model";
import { TelegramConversationService } from "@/modules/telegram-conversation/telegram-conversation.service";
import { formatAmount } from "@/shared/currency";
import {
  formatBuyAllReply,
  type BeneficiaryAllocation,
} from "../commands/buy/buy.utils";
import { getGroupLocale } from "../lang/group-locale";
import type { TranslationFunctions } from "../lang/i18n-types";
import {
  constructConfirmKeyboard,
  escapeHtml,
  formatMemberName,
  parseAmount,
} from "../telegram.utils";
import { ConversationStrategy } from "./conversation.strategy";
const memberPickerKeyboard = (
  sessionId: number,
  sender: MemberModel.Entity,
  members: readonly MemberModel.Entity[],
  payload: TelegramConversationModel.BuyConversation,
  t: TranslationFunctions,
) => {
  const selected = new Set(payload.selectedMemberIds ?? []);

  const senderMember = members.find((m) => m.id === sender.id);
  const otherMembers = members.filter((m) => m.id !== sender.id);
  const orderedMembers = senderMember
    ? [senderMember, ...otherMembers]
    : members;

  return {
    inline_keyboard: [
      [
        {
          text: t.buy.memberPickerEveryone(),
          callback_data: `flow:everyone:${sessionId}`,
        },
      ],
      ...orderedMembers.map((member) => [
        {
          text: `${selected.has(member.id) ? "✓ " : ""}${formatPickerMemberName(
            sender,
            member,
            t,
          )}`,
          callback_data: `flow:toggle:${sessionId}:${member.id}`,
        },
      ]),
      [
        {
          text: t.buy.memberPickerDone(),
          callback_data: `flow:done:${sessionId}`,
        },
        {
          text: t.buy.memberPickerCancel(),
          callback_data: `flow:cancel:${sessionId}`,
        },
      ],
    ],
  };
};

const formatPickerMemberName = (
  sender: MemberModel.Entity,
  member: MemberModel.Entity,
  t: TranslationFunctions,
) =>
  member.id === sender.id
    ? t.buy.memberPickerMyself()
    : formatMemberName(member);

const buildEqualAllocations = (
  sender: MemberModel.Entity,
  members: readonly MemberModel.Entity[],
  payload: TelegramConversationModel.BuyConversation,
) => {
  const selectedIds = new Set(payload.selectedMemberIds ?? []);
  const selectedMembers = members.filter((member) =>
    selectedIds.has(member.id),
  );
  const memberAllocations = splitEqually(
    payload.amount ?? 0,
    selectedMembers.length,
  );
  const beneficiaryAllocations = selectedMembers
    .map((member, index) => ({
      member,
      allocation: memberAllocations[index] ?? {
        amount: 0,
        allocation_kind: AllocationKind.EQUAL,
      },
    }))
    .filter(({ member }) => member.id !== sender.id);

  return { beneficiaryAllocations };
};

const formatSummary = (
  t: TranslationFunctions,
  sender: MemberModel.Entity,
  totalAmount: number,
  beneficiaryAllocations: readonly BeneficiaryAllocation[],
) =>
  `${t.buy.summaryHeader()}\n\n${t.buy.summaryTotal()}: <code>$${formatAmount(totalAmount)}</code>\n${t.buy.summaryPaidBy()}: <b>${escapeHtml(
    formatMemberName(sender),
  )}</b>\n\n${t.buy.beneficiaries()}\n${beneficiaryAllocations
    .map(
      ({ member, allocation }) =>
        `   - ${escapeHtml(formatMemberName(member))}\t\t\t\t\t<code>$${formatAmount(
          allocation.amount,
        )}</code>`,
    )
    .join("\n")}`;

export const parseSessionIfBelongToUser = (
  user: MemberModel.Entity,
  session?: TelegramConversationModel.Entity,
) => {
  if (
    session &&
    session.status === TelegramConversationStatus.ACTIVE &&
    session.group_id === user.group_id &&
    session.member_id === user.id
  ) {
    return session;
  }
  return undefined;
};

export const buyStrategy: ConversationStrategy = {
  flow: "buy",
  onText: (ctx, sender, session) =>
    Effect.gen(function* () {
      const amount = parseAmount(ctx);
      const groupService = yield* GroupService;
      const t = yield* getGroupLocale(groupService.findById, sender.group_id);

      if (!amount) {
        return yield* Effect.promise(() => ctx.reply(t.buy.validAmount()));
      }

      const memberService = yield* MemberService;
      const telegramConversationService = yield* TelegramConversationService;

      const members = yield* memberService.findActiveByGroupId(sender.group_id);
      if (members.filter((member) => member.id !== sender.id).length <= 0) {
        return yield* Effect.fail(
          new PurchaseNoActiveMembers({
            tg_chat_id: String(ctx.chat?.id),
            message: t.buy.noOtherActiveMembers(),
          }),
        );
      }

      const payload: TelegramConversationModel.BuyConversation = {
        amount,
        selectedMemberIds: [sender.id],
      };

      const updatedSession = yield* telegramConversationService.updateSession(
        session.id,
        {
          step: ConversationStep.MEMBERS,
          payload,
        },
      );

      return yield* Effect.promise(() =>
        ctx.reply(t.buy.askMembers(), {
          reply_markup: memberPickerKeyboard(
            updatedSession.id,
            sender,
            members,
            payload,
            t,
          ),
        }),
      );
    }),

  onAction: (ctx, action, sender, session, targetMemberId) =>
    Effect.gen(function* () {
      const memberService = yield* MemberService;
      const telegramConversationService = yield* TelegramConversationService;
      const groupService = yield* GroupService;
      const purchaseService = yield* PurchaseService;
      const t = yield* getGroupLocale(groupService.findById, sender.group_id);

      const payload = Schema.decodeUnknownSync(
        TelegramConversationModel.BuyConversationSchema,
      )(JSON.parse(session.payload_json));
      const members = yield* memberService.findActiveByGroupId(sender.group_id);

      if (action === "cancel") {
        yield* telegramConversationService.cancelSession(session.id);
        yield* Effect.promise(() => ctx.answerCbQuery(t.buy.cancelled()));
        return yield* Effect.promise(() =>
          ctx.editMessageText(t.buy.cancelled()),
        );
      }

      if (action === "everyone") {
        const nextPayload = {
          ...payload,
          selectedMemberIds: members.map((member) => member.id),
        };
        yield* telegramConversationService.updateSession(session.id, {
          step: ConversationStep.MEMBERS,
          payload: nextPayload,
        });
        yield* Effect.promise(() =>
          ctx.answerCbQuery(t.buy.everyoneSelected()),
        );
        return yield* Effect.promise(() =>
          ctx.editMessageReplyMarkup(
            memberPickerKeyboard(session.id, sender, members, nextPayload, t),
          ),
        );
      }

      if (action === "toggle" && targetMemberId) {
        const selected = new Set(payload.selectedMemberIds ?? []);
        if (selected.has(targetMemberId)) {
          selected.delete(targetMemberId);
        } else {
          selected.add(targetMemberId);
        }

        const nextPayload = {
          ...payload,
          selectedMemberIds: [...selected],
        };
        yield* telegramConversationService.updateSession(session.id, {
          step: ConversationStep.MEMBERS,
          payload: nextPayload,
        });
        yield* Effect.promise(() => ctx.answerCbQuery());
        return yield* Effect.promise(() =>
          ctx.editMessageReplyMarkup(
            memberPickerKeyboard(session.id, sender, members, nextPayload, t),
          ),
        );
      }

      if (action === "done") {
        const allocations = buildEqualAllocations(sender, members, payload);
        if (allocations.beneficiaryAllocations.length <= 0) {
          yield* Effect.promise(() =>
            ctx.answerCbQuery(t.buy.selectAtLeastOneOther()),
          );
          return;
        }

        yield* telegramConversationService.updateSession(session.id, {
          step: ConversationStep.CONFIRM,
          payload,
        });
        yield* Effect.promise(() => ctx.answerCbQuery());
        return yield* Effect.promise(() =>
          ctx.editMessageText(
            formatSummary(
              t,
              sender,
              payload.amount ?? 0,
              allocations.beneficiaryAllocations,
            ),
            {
              parse_mode: "HTML",
              reply_markup: constructConfirmKeyboard(session.id, t),
            },
          ),
        );
      }

      if (action === "confirm") {
        const allocations = buildEqualAllocations(sender, members, payload);
        const totalAmount = payload.amount;
        if (!totalAmount || allocations.beneficiaryAllocations.length <= 0) {
          yield* Effect.promise(() =>
            ctx.answerCbQuery(t.buy.incompleteFlow()),
          );
          return;
        }

        const createdPurchase = yield* purchaseService.createWithAllocations({
          purchase: {
            group_id: sender.group_id,
            payer_member_id: sender.id,
            tg_message_id: ctx.callbackQuery?.message?.message_id ?? 0,
            amount: totalAmount,
            note: null,
            status: PurchaseStatus.ACTIVE,
            created_at: Date.now(),
          },
          allocations: allocations.beneficiaryAllocations.map(
            ({ member, allocation }) => ({
              beneficiary_member_id: member.id,
              responsible_member_id: member.id,
              amount: allocation.amount,
              allocation_kind: allocation.allocation_kind,
            }),
          ),
        });

        yield* telegramConversationService.completeSession(session.id);

        yield* Effect.promise(() =>
          ctx.answerCbQuery(t.buy.purchaseRecorded()),
        );
        return yield* Effect.promise(() =>
          ctx.editMessageText(
            formatBuyAllReply({
              t,
              purchaseId: createdPurchase.purchase.id,
              totalAmount,
              payer: sender,
              beneficiaryAllocations: allocations.beneficiaryAllocations,
            }),
            { parse_mode: "HTML" },
          ),
        );
      }
    }),
};
