import { Context, Effect, Runtime } from "effect";
import type { Telegraf } from "telegraf";

import { GroupService } from "@/modules/group/group.service";
import { MemberService } from "@/modules/member/member.service";
import { PurchaseStatus } from "@/modules/purchase/purchase.model";
import { PurchaseService } from "@/modules/purchase/purchase.service";
import { RepaymentService } from "@/modules/repayment/repayment.service";
import { RepaymentClaimService } from "@/modules/repayment/repayment-claim.service";
import { IncorrectTelegramCommand } from "../../telegram.error";
import { getDefaultLocale, getGroupLocale } from "../../lang/group-locale";
import { isGroupContext } from "../../telegram.utils";
import { runTelegramCommand } from "../command-error";
import type { TelegramDeps } from "../../telegram.types";

export const registerVoidCommand = (
  bot: Telegraf,
  runtime: Runtime.Runtime<TelegramDeps>,
) => {
  bot.command("void", async (ctx) => {
    const commandFlow = Effect.gen(function* () {
      const memberService = yield* MemberService;
      const groupService = yield* GroupService;
      const purchaseService = yield* PurchaseService;
      const repaymentService = yield* RepaymentService;
      const repaymentClaimService = yield* RepaymentClaimService;

      const purchaseId = parseVoidCommand(ctx.message.text);

      if (purchaseId === null) {
        return yield* Effect.fail(
          new IncorrectTelegramCommand({
            command: "/void",
            message: getDefaultLocale().void.usage(),
          }),
        );
      }

      if (!isGroupContext(ctx)) {
        return yield* Effect.fail(
          new IncorrectTelegramCommand({
            command: "/void",
            message: getDefaultLocale().command.useInGroup({
              command: "/void",
            }),
          }),
        );
      }

      const sender = yield* memberService.findTelegramMember({
        tg_chat_id: String(ctx.chat.id),
        tg_user_id: String(ctx.from.id),
      });
      const t = yield* getGroupLocale(groupService.findById, sender.group_id);
      const purchase = yield* purchaseService.findById(purchaseId);

      if (purchase.group_id !== sender.group_id) {
        return yield* Effect.fail(
          new IncorrectTelegramCommand({
            command: "/void",
            message: t.void.wrongGroup({ purchaseId }),
          }),
        );
      }

      if (purchase.payer_member_id !== sender.id) {
        return yield* Effect.fail(
          new IncorrectTelegramCommand({
            command: "/void",
            message: t.void.onlyCreator({ purchaseId }),
          }),
        );
      }

      if (purchase.status === PurchaseStatus.VOIDED) {
        return yield* Effect.fail(
          new IncorrectTelegramCommand({
            command: "/void",
            message: t.void.alreadyVoided({ purchaseId }),
          }),
        );
      }

      const voidedPurchase = yield* purchaseService.update(purchase.id, {
        status: PurchaseStatus.VOIDED,
        voided_at: Date.now(),
      });

      yield* repaymentService.voidActiveRepaymentsByPurchaseId(purchase.id);
      yield* repaymentClaimService.rejectPendingByPurchaseId(purchase.id);

      return yield* Effect.promise(() =>
        ctx.reply(t.void.voided({ purchaseId: voidedPurchase.id })),
      );
    });

    return runTelegramCommand(
      runtime,
      ctx,
      {
        command: "/void",
        fallbackMessage: getDefaultLocale().void.fallback(),
      },
      commandFlow,
    );
  });
};

const parseVoidCommand = (text: string) => {
  const [, rawPurchaseId, ...extraArguments] = text.trim().split(/\s+/);

  if (!rawPurchaseId || extraArguments.length > 0) {
    return null;
  }

  const normalizedPurchaseId = rawPurchaseId.startsWith("#")
    ? rawPurchaseId.slice(1)
    : rawPurchaseId;
  const purchaseId = Number(normalizedPurchaseId);

  if (!Number.isInteger(purchaseId) || purchaseId <= 0) {
    return null;
  }

  return purchaseId;
};
