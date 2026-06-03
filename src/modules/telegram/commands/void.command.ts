import { Context, Effect } from "effect";
import type { Telegraf } from "telegraf";

import { MemberService } from "@/modules/member/member.service";
import { PurchaseStatus } from "@/modules/purchase/purchase.model";
import { PurchaseService } from "@/modules/purchase/purchase.service";
import { IncorrectTelegramCommand } from "../telegram.error";
import { isSettlementGroupChat } from "../telegram.utils";
import { runTelegramCommand } from "./command-error";

export type VoidCommandDependencies = Pick<
  Context.Tag.Service<typeof MemberService>,
  "findTelegramMember"
> & {
  findPurchaseById: Context.Tag.Service<typeof PurchaseService>["findById"];
  updatePurchase: Context.Tag.Service<typeof PurchaseService>["update"];
};

export const registerVoidCommand = (
  bot: Telegraf,
  dependencies: VoidCommandDependencies,
) => {
  bot.command("void", async (ctx) => {
    const commandFlow = Effect.gen(function* () {
      const purchaseId = parseVoidCommand(ctx.message.text);

      if (purchaseId === null) {
        return yield* Effect.fail(
          new IncorrectTelegramCommand({
            command: "/void",
            message: "Use /void <purchase-id>.",
          }),
        );
      }

      if (!ctx.chat || !ctx.from || !isSettlementGroupChat(ctx.chat)) {
        return yield* Effect.fail(
          new IncorrectTelegramCommand({
            command: "/void",
            message: "Use /void inside a group.",
          }),
        );
      }

      const sender = yield* dependencies.findTelegramMember({
        tg_chat_id: String(ctx.chat.id),
        tg_user_id: String(ctx.from.id),
      });
      const purchase = yield* dependencies.findPurchaseById(purchaseId);

      if (purchase.group_id !== sender.group_id) {
        return yield* Effect.fail(
          new IncorrectTelegramCommand({
            command: "/void",
            message: `Purchase #${purchaseId} does not belong to this group.`,
          }),
        );
      }

      if (purchase.status === PurchaseStatus.VOIDED) {
        return yield* Effect.fail(
          new IncorrectTelegramCommand({
            command: "/void",
            message: `Purchase #${purchaseId} is already voided.`,
          }),
        );
      }

      const voidedPurchase = yield* dependencies.updatePurchase(purchase.id, {
        status: PurchaseStatus.VOIDED,
        voided_at: Date.now(),
      });

      return yield* Effect.promise(() =>
        ctx.reply(`Purchase #${voidedPurchase.id} voided.`),
      );
    });

    return runTelegramCommand(
      ctx,
      {
        command: "/void",
        fallbackMessage: "Could not void this purchase.",
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
