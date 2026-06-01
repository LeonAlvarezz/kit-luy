import { Context, Effect } from "effect";
import type { Telegraf } from "telegraf";

import type { MemberService } from "@/modules/member/member.service";
import type { PurchaseAllocationService } from "@/modules/purchase/purchase-allocation.service";
import { PurchaseStatus } from "@/modules/purchase/purchase.model";
import type { PurchaseService } from "@/modules/purchase/purchase.service";
import { splitEqually, toCents } from "@/modules/purchase/purchase.utils";
import { parseBuyCommand } from "../parsers/buy.parser";
import { isSettlementGroupChat } from "../telegram.utils";

export type BuyCommandDependencies = Pick<
  Context.Tag.Service<typeof MemberService>,
  "findTelegramMember" | "findActiveByGroupId"
> & {
  createPurchase: Context.Tag.Service<typeof PurchaseService>["create"];
  createPurchaseAllocation: Context.Tag.Service<
    typeof PurchaseAllocationService
  >["create"];
};

const toErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  return "Could not record this purchase.";
};

export const registerBuyCommand = (
  bot: Telegraf,
  dependencies: BuyCommandDependencies,
) => {
  bot.command("buy", async (ctx) => {
    const result = parseBuyCommand(ctx.message.text);

    if (!result.ok) {
      return ctx.reply(result.message);
    }

    if (!ctx.chat || !ctx.from || !isSettlementGroupChat(ctx.chat)) {
      return ctx.reply("Use /buy inside your Kit Luy group.");
    }

    const { command } = result;

    if (command.type === "all") {
      /**
       * Create purchase
       * Get all active member
       * Create purchase allocations for all member
       * Display who owe it and by how much
       */
      const tgChatId = String(ctx.chat.id);
      const tgUserId = String(ctx.from.id);

      const createPurchaseFlow = Effect.gen(function* () {
        const sender = yield* dependencies.findTelegramMember({
          tg_chat_id: tgChatId,
          tg_user_id: tgUserId,
        });

        const members = yield* dependencies.findActiveByGroupId(
          sender.group_id,
        );

        if (members.length <= 0) {
          return yield* Effect.fail(
            new Error(
              "Insufficient member count, cannot create purchase record",
            ),
          );
        }

        const purchase = yield* dependencies.createPurchase({
          group_id: sender.group_id,
          payer_member_id: sender.id,
          tg_message_id: ctx.message.message_id,
          amount: toCents(command.totalAmount),
          note: null,
          status: PurchaseStatus.ACTIVE,
          created_at: Date.now(),
        });

        const allocations = splitEqually(purchase.amount, members.length);

        yield* Effect.forEach(
          members,
          (member, index) =>
            dependencies.createPurchaseAllocation({
              purchase_id: purchase.id,
              beneficiary_member_id: member.id,
              responsible_member_id: member.id,
              amount: allocations[index].amount,
              allocation_kind: allocations[index].allocation_kind,
            }),
          { discard: true },
        );

        return { purchase, sender };
      });

      return Effect.runPromise(createPurchaseFlow)
        .then(({ purchase, sender }) =>
          ctx.reply(
            `Purchase #${purchase.id} created: ${command.totalAmount} paid by ${
              sender.alias
                ? `@${sender.alias}`
                : (sender.display_name ?? `member #${sender.id}`)
            }.`,
          ),
        )
        .catch((error) => ctx.reply(toErrorMessage(error)));
    }

    return ctx.reply(
      `Buy command received: ${command.totalAmount} split between ${command.allocations
        .map(({ username, amount }) => `@${username}=${amount}`)
        .join(" ")}.`,
    );
  });
};
