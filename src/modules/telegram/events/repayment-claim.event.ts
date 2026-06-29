import { Cause, Context, Effect, Runtime } from "effect";
import type { Telegraf } from "telegraf";

import { getErrorMessage } from "@/core/error/app-error";
import { GroupService } from "@/modules/group/group.service";
import { MemberService } from "@/modules/member/member.service";
import { RepaymentClaimService } from "@/modules/repayment/repayment-claim.service";
import { RepaymentService } from "@/modules/repayment/repayment.service";
import { IncorrectTelegramCommand } from "../telegram.error";
import { getDefaultLocale, getGroupLocale } from "../lang/group-locale";
import { isGroupContext } from "../telegram.utils";
import { RepaymentClaimStatus } from "@/modules/repayment/repayment-claim.model";
import type { TelegramDeps } from "../telegram.types";

type RepaymentClaimAction = "accept" | "reject";

export const registerRepaymentClaimEvents = (
  bot: Telegraf,
  runtime: Runtime.Runtime<TelegramDeps>,
) => {
  bot.action(/^repayment_claim:(accept|reject):(\d+)$/, async (ctx) => {
    const commandFlow = Effect.gen(function* () {
      const memberService = yield* MemberService;
      const repaymentClaimService = yield* RepaymentClaimService;
      const groupService = yield* GroupService;
      const repaymentService = yield* RepaymentService;

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
        memberService.findTelegramMember({
          tg_chat_id: String(ctx.chat.id),
          tg_user_id: String(ctx.from.id),
        }),
        repaymentClaimService.findById(claimId),
      ]);
      const t = yield* getGroupLocale(
        groupService.findById,
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
          ? yield* repaymentClaimService.confirmClaim(claim.id)
          : yield* repaymentClaimService.rejectClaim(claim.id);

      if (action === "accept") {
        yield* repaymentService.createFromConfirmedClaim({
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

    return Runtime.runPromise(runtime)(
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
