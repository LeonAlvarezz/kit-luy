import { Context, Effect } from "effect";
import type { Telegraf } from "telegraf";

import type { GroupService } from "@/modules/group/group.service";
import { MemberService } from "@/modules/member/member.service";
import { PurchaseStatus } from "@/modules/purchase/purchase.model";
import { PurchaseService } from "@/modules/purchase/purchase.service";
import { IncorrectTelegramCommand } from "../telegram.error";
import { getDefaultLocale, getGroupLocale } from "../lang/group-locale";
import { isGroupContext } from "../telegram.utils";
import { runTelegramCommand } from "./command-error";

export type VoidCommandDependencies = Pick<
  Context.Tag.Service<typeof MemberService>,
  "findTelegramMember"
> & {
  findGroupById: Context.Tag.Service<typeof GroupService>["findById"];
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

      const sender = yield* dependencies.findTelegramMember({
        tg_chat_id: String(ctx.chat.id),
        tg_user_id: String(ctx.from.id),
      });
      const t = yield* getGroupLocale(
        dependencies.findGroupById,
        sender.group_id,
      );
      const purchase = yield* dependencies.findPurchaseById(purchaseId);

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

      const voidedPurchase = yield* dependencies.updatePurchase(purchase.id, {
        status: PurchaseStatus.VOIDED,
        voided_at: Date.now(),
      });

      return yield* Effect.promise(() =>
        ctx.reply(t.void.voided({ purchaseId: voidedPurchase.id })),
      );
    });

    return runTelegramCommand(
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
