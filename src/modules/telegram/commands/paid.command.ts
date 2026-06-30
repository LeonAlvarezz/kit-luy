import { Telegraf } from "telegraf";

import { parsePaidCommand } from "../parsers/paid.parser";
import { runTelegramCommand } from "./command-error";
import { Context, Effect, Runtime } from "effect";
import { IncorrectTelegramCommand } from "../telegram.error";
import { isGroupContext } from "../telegram.utils";
import { GroupService } from "@/modules/group/group.service";
import { MemberService } from "@/modules/member/member.service";
import { PurchaseService } from "@/modules/purchase/purchase.service";
import {
  calculateRepayments,
  toCents,
} from "@/modules/purchase/purchase.utils";
import { RepaymentClaimService } from "@/modules/repayment/repayment-claim.service";
import { RepaymentClaimStatus } from "@/modules/repayment/repayment-claim.model";
import { formatAmount } from "@/shared/currency";
import { getDefaultLocale, getGroupLocale } from "../lang/group-locale";
import type { TelegramDeps } from "../telegram.types";
import { TelegramConversationService } from "@/modules/telegram-conversation/telegram-conversation.service";

export const registerPaidCommand = (
  bot: Telegraf,
  runtime: Runtime.Runtime<TelegramDeps>,
) => {
  bot.command("paid", async (ctx) => {
    const commandFlow = Effect.gen(function* () {
      const memberService = yield* MemberService;
      const groupService = yield* GroupService;
      const purchaseService = yield* PurchaseService;
      const repaymentClaimService = yield* RepaymentClaimService;
      const telegramConversationService = yield* TelegramConversationService;

      if (!isGroupContext(ctx)) {
        return yield* Effect.fail(
          new IncorrectTelegramCommand({
            command: "/paid",
            message: getDefaultLocale().command.useInGroup({
              command: "/paid",
            }),
          }),
        );
      }

      const sender = yield* memberService.findTelegramMember({
        tg_chat_id: String(ctx.chat.id),
        tg_user_id: String(ctx.from.id),
      });

      const t = yield* getGroupLocale(groupService.findById, sender.group_id);

      const balances = yield* purchaseService.findSettlementBalancesByGroupId(
        sender.group_id,
      );

      const repayments = calculateRepayments(balances).filter(
        (repayment) => repayment.fromMemberId === sender.id,
      );

      if (repayments.length <= 0) {
        return yield* Effect.promise(() => ctx.reply(t.paid.nothingToSettle()));
      }

      if (ctx.message.text.trim().match(/^\/paid(?:@\w+)?$/i)) {
        yield* telegramConversationService.startSession({
          group_id: sender.group_id,
          flow: "paid",
          member_id: sender.id,
        });

        return yield* Effect.promise(() =>
          ctx.reply(t.paid.askAmount(), {
            reply_markup: { force_reply: true, selective: true },
          }),
        );
      }

      const result = parsePaidCommand(ctx.message.text);
      if (!result.ok) {
        return yield* Effect.fail(
          new IncorrectTelegramCommand({
            command: "/paid",
            message: getDefaultLocale().paid.usage(),
          }),
        );
      }

      const { command } = result;
      const amountCents = toCents(command.totalAmount);

      let receiverId: number;
      let purchaseId: number | null = null;

      if (command.purchaseId !== undefined) {
        const purchase = yield* purchaseService.findById(command.purchaseId);
        if (purchase.group_id !== sender.group_id) {
          return yield* Effect.fail(
            new IncorrectTelegramCommand({
              command: "/paid",
              message: t.void.wrongGroup({ purchaseId: command.purchaseId }),
            }),
          );
        }
        // Verify sender is a beneficiary of this purchase
        const hasAllocation = purchase.allocations.some(
          (a) => a.responsible_member_id === sender.id,
        );
        if (!hasAllocation) {
          return yield* Effect.fail(
            new IncorrectTelegramCommand({
              command: "/paid",
              message: "You are not a beneficiary of this purchase.",
            }),
          );
        }
        receiverId = purchase.payer_member_id;
        purchaseId = purchase.id;
      } else if (command.type === "explicit") {
        const members = yield* memberService.findActiveByGroupId(
          sender.group_id,
        );
        const receiver = members.find(
          (member) =>
            member.alias?.toLowerCase() ===
            command.username.toLowerCase(),
        );

        if (!receiver) {
          return yield* Effect.fail(
            new IncorrectTelegramCommand({
              command: "/paid",
              message: t.paid.receiverNotFound({
                username: command.username,
              }),
            }),
          );
        }
        receiverId = receiver.id;
      } else {
        receiverId = repayments[0].toMemberId;
      }

      // Auto-linking if not explicitly specified
      if (purchaseId === null) {
        const activePurchases = yield* purchaseService.findAllByGroupId(
          sender.group_id,
        );
        const candidatePurchases = activePurchases.filter((p) => {
          if (p.status !== "active") return false;
          if (p.payer_member_id !== receiverId) return false;
          const allocation = p.allocations.find(
            (a) =>
              a.responsible_member_id === sender.id &&
              a.amount === amountCents,
          );
          return !!allocation;
        });

        if (candidatePurchases.length === 1) {
          purchaseId = candidatePurchases[0].id;
        }
      }

      const targetRepayment = repayments.find(
        (repayment) => repayment.toMemberId === receiverId,
      );

      if (!targetRepayment) {
        const members = yield* memberService.findActiveByGroupId(
          sender.group_id,
        );
        const receiver = members.find((m) => m.id === receiverId);
        const username = receiver?.alias || `Member #${receiverId}`;
        return yield* Effect.fail(
          new IncorrectTelegramCommand({
            command: "/paid",
            message: t.paid.nothingToSettleWith({
              username,
            }),
          }),
        );
      }

      if (amountCents > targetRepayment.amount) {
        return yield* Effect.fail(
          new IncorrectTelegramCommand({
            command: "/paid",
            message: t.paid.claimTooMuch(),
          }),
        );
      }

      const repaymentClaim = yield* repaymentClaimService.create({
        status: RepaymentClaimStatus.PENDING,
        amount_cents: amountCents,
        group_id: sender.group_id,
        purchase_id: purchaseId,
        sender_member_id: sender.id,
        receiver_member_id: receiverId,
        tg_message_id: ctx.message.message_id,
      });

      return yield* Effect.promise(() =>
        ctx.reply(
          t.paid.claimCreated({
            claimId: repaymentClaim.id,
            amount: formatAmount(amountCents),
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
    });

    return runTelegramCommand(
      runtime,
      ctx,
      {
        command: "/paid",
        fallbackMessage: getDefaultLocale().paid.fallback(),
      },
      commandFlow,
    );
  });
};
