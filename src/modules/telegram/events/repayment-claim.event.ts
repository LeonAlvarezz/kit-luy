import { Cause, Context, Effect } from "effect";
import type { Telegraf } from "telegraf";

import { getErrorMessage } from "@/core/error/app-error";
import type { MemberService } from "@/modules/member/member.service";
import type { RepaymentClaimService } from "@/modules/repayment/repayment-claim.service";
import type { RepaymentService } from "@/modules/repayment/repayment.service";
import { IncorrectTelegramCommand } from "../telegram.error";
import { isSettlementGroupChat } from "../telegram.utils";

type RepaymentClaimAction = "accept" | "reject";

export type RepaymentClaimEventDependencies = Pick<
  Context.Tag.Service<typeof MemberService>,
  "findTelegramMember"
> &
  Pick<
    Context.Tag.Service<typeof RepaymentClaimService>,
    "findById" | "confirmClaim" | "rejectClaim"
  > & {
    createRepaymentFromConfirmedClaim: Context.Tag.Service<
      typeof RepaymentService
    >["createFromConfirmedClaim"];
  };

export const registerRepaymentClaimEvents = (
  bot: Telegraf,
  dependencies: RepaymentClaimEventDependencies,
) => {
  bot.action(/^repayment_claim:(accept|reject):(\d+)$/, async (ctx) => {
    const commandFlow = Effect.gen(function* () {
      if (!ctx.chat || !ctx.from || !isSettlementGroupChat(ctx.chat)) {
        return yield* Effect.fail(
          new IncorrectTelegramCommand({
            command: "repayment_claim",
            message: "Use repayment claim actions inside a group.",
          }),
        );
      }

      const action = ctx.match[1] as RepaymentClaimAction;
      const claimId = Number(ctx.match[2]);

      const [member, claim] = yield* Effect.all([
        dependencies.findTelegramMember({
          tg_chat_id: String(ctx.chat.id),
          tg_user_id: String(ctx.from.id),
        }),
        dependencies.findById(claimId),
      ]);

      if (member.id !== claim.receiver_member_id) {
        return yield* Effect.fail(
          new IncorrectTelegramCommand({
            command: "repayment_claim",
            message:
              "Only the repayment receiver can accept or reject this claim.",
          }),
        );
      }

      const updatedClaim =
        action === "accept"
          ? yield* dependencies.confirmClaim(claim.id)
          : yield* dependencies.rejectClaim(claim.id);

      if (action === "accept") {
        yield* dependencies.createRepaymentFromConfirmedClaim({
          claim: updatedClaim,
          confirmedByMemberId: member.id,
        });
      }

      const statusText =
        action === "accept"
          ? "Repayment claim accepted."
          : "Repayment claim rejected.";

      return yield* Effect.promise(async () => {
        await ctx.answerCbQuery(statusText);
        await ctx.editMessageText(
          `Repayment claim #${updatedClaim.id} ${updatedClaim.status}.`,
        );
      });
    });

    return Effect.runPromise(
      commandFlow.pipe(
        Effect.catchAllCause((cause) => {
          const error = Cause.squash(cause);
          const message = getErrorMessage(
            error,
            "Could not process repayment claim action.",
          );

          return Effect.promise(() =>
            ctx.answerCbQuery(message, { show_alert: true }),
          );
        }),
      ),
    );
  });
};
