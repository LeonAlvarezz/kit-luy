import { Telegraf } from "telegraf";

import { parsePaidCommand } from "../parsers/paid.parser";
import { runTelegramCommand } from "./command-error";
import { Context, Effect } from "effect";
import { IncorrectTelegramCommand } from "../telegram.error";
import { isSettlementGroupChat } from "../telegram.utils";
import { MemberService } from "@/modules/member/member.service";
import { PurchaseService } from "@/modules/purchase/purchase.service";
import {
  calculateRepayments,
  toCents,
} from "@/modules/purchase/purchase.utils";
import { RepaymentClaimService } from "@/modules/repayment/repayment-claim.service";
import { RepaymentClaimStatus } from "@/modules/repayment/repayment-claim.model";
import { formatAmount } from "@/shared/currency";

export type PaidCommandDependencies = Pick<
  Context.Tag.Service<typeof MemberService>,
  "findTelegramMember" | "findActiveByGroupId"
> & {
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
            message: result.message,
          }),
        );
      }

      if (!ctx.chat || !ctx.from || !isSettlementGroupChat(ctx.chat)) {
        return yield* Effect.fail(
          new IncorrectTelegramCommand({
            command: "/paid",
            message: "Use /paid inside a group.",
          }),
        );
      }

      const { command } = result;

      const sender = yield* dependencies.findTelegramMember({
        tg_chat_id: String(ctx.chat.id),
        tg_user_id: String(ctx.from.id),
      });

      const balances = yield* dependencies.findSettlementBalancesByGroupId(
        sender.group_id,
      );

      const repayments = calculateRepayments(balances).filter(
        (repayment) => repayment.fromMemberId === sender.id,
      );

      if (repayments.length <= 0) {
        return yield* Effect.promise(() =>
          ctx.reply("You don't have anything to settle."),
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
                    message: `Could not find @${command.username} in this group.`,
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
                    message: `You don't have anything to settle with @${command.username}.`,
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
            message: "You cannot claim more than you owe.",
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
          `Repayment claim #${repaymentClaim.id} created for $${formatAmount(
            amountCents,
          )}. Waiting for confirmation.`,
          {
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: "Accept",
                    callback_data: `repayment_claim:accept:${repaymentClaim.id}`,
                  },
                  {
                    text: "Reject",
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
        fallbackMessage: "Could not process paid command",
      },
      commandFlow,
    );
  });
};
