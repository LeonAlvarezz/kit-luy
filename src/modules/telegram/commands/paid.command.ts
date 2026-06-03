import { Telegraf } from "telegraf";

import { parsePaidCommand } from "../parsers/paid.parser";
import { runTelegramCommand } from "./command-error";
import { Context, Effect } from "effect";
import { IncorrectTelegramCommand } from "../telegram.error";
import { isSettlementGroupChat } from "../telegram.utils";
import type { GroupService } from "@/modules/group/group.service";
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

export type PaidCommandDependencies = Pick<
  Context.Tag.Service<typeof MemberService>,
  "findTelegramMember" | "findActiveByGroupId"
> & {
  findGroupById: Context.Tag.Service<typeof GroupService>["findById"];
  findSettlementBalancesByGroupId: Context.Tag.Service<
    typeof PurchaseService
  >["findSettlementBalancesByGroupId"];
  createRepaymentClaim: Context.Tag.Service<
    typeof RepaymentClaimService
  >["create"];
};
export const registerPaidCommand = (
  bot: Telegraf,
  dependencies: PaidCommandDependencies,
) => {
  bot.command("paid", async (ctx) => {
    const commandFlow = Effect.gen(function* () {
      const result = parsePaidCommand(ctx.message.text);
      if (!result.ok) {
        return yield* Effect.fail(
          new IncorrectTelegramCommand({
            command: "/paid",
            message: getDefaultLocale().paid.usage(),
          }),
        );
      }

      if (!ctx.chat || !ctx.from || !isSettlementGroupChat(ctx.chat)) {
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

      const sender = yield* dependencies.findTelegramMember({
        tg_chat_id: String(ctx.chat.id),
        tg_user_id: String(ctx.from.id),
      });
      const t = yield* getGroupLocale(dependencies.findGroupById, sender.group_id);

      const balances = yield* dependencies.findSettlementBalancesByGroupId(
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
              const members = yield* dependencies.findActiveByGroupId(
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

      const repaymentClaim = yield* dependencies.createRepaymentClaim({
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
      ctx,
      {
        command: "/paid",
        fallbackMessage: getDefaultLocale().paid.fallback(),
      },
      commandFlow,
    );
  });
};
