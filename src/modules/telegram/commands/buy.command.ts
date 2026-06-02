import { Context, Effect } from "effect";
import type { Telegraf } from "telegraf";

import type { MemberService } from "@/modules/member/member.service";
import { PurchaseNoActiveMembers } from "@/modules/purchase/purchase.error";
import { PurchaseStatus } from "@/modules/purchase/purchase.model";
import type { PurchaseService } from "@/modules/purchase/purchase.service";
import { splitEqually, toCents } from "@/modules/purchase/purchase.utils";
import { runTelegramCommand } from "./command-error";
import { parseBuyCommand } from "../parsers/buy.parser";
import { isSettlementGroupChat } from "../telegram.utils";

export type BuyCommandDependencies = Pick<
  Context.Tag.Service<typeof MemberService>,
  "findTelegramMember" | "findActiveByGroupId"
> & {
  createPurchaseWithAllocations: Context.Tag.Service<
    typeof PurchaseService
  >["createWithAllocations"];
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

        const beneficiaries = members.filter(
          (member) => member.id !== sender.id,
        );

        if (beneficiaries.length <= 0) {
          return yield* Effect.fail(
            new PurchaseNoActiveMembers({
              tg_chat_id: tgChatId,
              message:
                "There are no other active members in this settlement group.",
            }),
          );
        }

        const totalAmount = toCents(command.totalAmount);
        const allocations = splitEqually(totalAmount, beneficiaries.length);
        const result = yield* dependencies.createPurchaseWithAllocations({
          purchase: {
            group_id: sender.group_id,
            payer_member_id: sender.id,
            tg_message_id: ctx.message.message_id,
            amount: totalAmount,
            note: null,
            status: PurchaseStatus.ACTIVE,
            created_at: Date.now(),
          },
          allocations: beneficiaries.map((member, index) => ({
            beneficiary_member_id: member.id,
            responsible_member_id: member.id,
            amount: allocations[index].amount,
            allocation_kind: allocations[index].allocation_kind,
          })),
        });

        return {
          purchase: result.purchase,
          sender,
          beneficiaries,
          allocations,
        };
      });

      return runTelegramCommand(
        ctx,
        {
          command: "/buy",
          fallbackMessage: "Could not record this purchase.",
        },
        createPurchaseFlow.pipe(
          Effect.flatMap(({ purchase, sender, beneficiaries, allocations }) => {
            const payerName = sender.alias
              ? `@${sender.alias}`
              : (sender.display_name ?? `member #${sender.id}`);

            const beneficiaryLines = beneficiaries
              .map((member, index) => {
                const name = member.alias
                  ? `@${member.alias}`
                  : (member.display_name ?? `member #${member.id}`);
                const amount = (allocations[index].amount / 100).toFixed(2);
                return `  • ${name} owes ${amount}`;
              })
              .join("\n");

            return Effect.promise(() =>
              ctx.reply(
                `Purchase #${purchase.id} created: ${command.totalAmount} paid by ${payerName}.\n\n` +
                  `Beneficiaries:\n${beneficiaryLines}`,
              ),
            );
          }),
        ),
      );
    }

    return ctx.reply(
      `Buy command received: ${command.totalAmount} split between ${command.allocations
        .map(({ username, amount }) => `@${username}=${amount}`)
        .join(" ")}.`,
    );
  });
};
