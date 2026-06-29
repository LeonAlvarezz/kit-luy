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

      const result = parsePaidCommand(ctx.message.text);
      if (!result.ok) {
        return yield* Effect.fail(
          new IncorrectTelegramCommand({
            command: "/paid",
            message: getDefaultLocale().paid.usage(),
          }),
        );
      }

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

      const { command } = result;

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
        return yield* Effect.promise(() =>
          ctx.reply(t.paid.nothingToSettle()),
        );
      }

      const targetRepayment =
        command.type === "first"
          ? repayments[0]
          : yield* Effect.gen(function* () {
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

              const repayment = repayments.find(
                (repayment) => repayment.toMemberId === receiver.id,
              );

              if (!repayment) {
                return yield* Effect.fail(
                  new IncorrectTelegramCommand({
                    command: "/paid",
                    message: t.paid.nothingToSettleWith({
                      username: command.username,
                    }),
                  }),
                );
              }

              return repayment;
            });

      const amountCents = toCents(command.totalAmount);

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
        sender_member_id: sender.id,
        receiver_member_id: targetRepayment.toMemberId,
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
