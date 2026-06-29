import { Cause, Context, Effect } from "effect";
import type { Telegraf } from "telegraf";

import { getErrorMessage } from "@/core/error/app-error";
import type { GroupService } from "@/modules/group/group.service";
import type { MemberService } from "@/modules/member/member.service";
import type { RepaymentClaimService } from "@/modules/repayment/repayment-claim.service";
import type { RepaymentService } from "@/modules/repayment/repayment.service";
import { IncorrectTelegramCommand } from "../telegram.error";
import { getDefaultLocale, getGroupLocale } from "../lang/group-locale";
import { isGroupContext } from "../telegram.utils";
import { RepaymentClaimStatus } from "@/modules/repayment/repayment-claim.model";

type RepaymentClaimAction = "accept" | "reject";

export type RepaymentClaimEventDependencies = Pick<
  Context.Tag.Service<typeof MemberService>,
  "findTelegramMember"
> &
  Pick<
    Context.Tag.Service<typeof RepaymentClaimService>,
    "findById" | "confirmClaim" | "rejectClaim"
  > & {
    findGroupById: Context.Tag.Service<typeof GroupService>["findById"];
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
      if (!isGroupContext(ctx)) {
        return yield* Effect.fail(
          new IncorrectTelegramCommand({
            command: "repayment_claim",
            message: getDefaultLocale().repaymentClaim.useInGroup(),
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
      const t = yield* getGroupLocale(
        dependencies.findGroupById,
        member.group_id,
      );

      if (member.id !== claim.receiver_member_id) {
        return yield* Effect.fail(
          new IncorrectTelegramCommand({
            command: "repayment_claim",
            message: t.repaymentClaim.onlyReceiver(),
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
          ? t.repaymentClaim.accepted()
          : t.repaymentClaim.rejected();

      return yield* Effect.promise(async () => {
        await ctx.answerCbQuery(statusText);
        await ctx.editMessageText(
          updatedClaim.status === RepaymentClaimStatus.CONFIRMED
            ? t.repaymentClaim.success({
                claimId: updatedClaim.id,
              })
            : t.repaymentClaim.failed({
                claimId: updatedClaim.id,
              }),
        );
      });
    });

    return Effect.runPromise(
      commandFlow.pipe(
        Effect.catchAllCause((cause) => {
          const error = Cause.squash(cause);
          const message = getErrorMessage(
            error,
            getDefaultLocale().repaymentClaim.fallback(),
          );

          return Effect.promise(() =>
            ctx.answerCbQuery(message, { show_alert: true }),
          );
        }),
      ),
    );
  });
};
