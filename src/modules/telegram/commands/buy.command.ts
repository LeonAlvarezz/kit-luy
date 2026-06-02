import { Context, Effect } from "effect";
import type { Telegraf } from "telegraf";

import type { MemberService } from "@/modules/member/member.service";
import { PurchaseNoActiveMembers } from "@/modules/purchase/purchase.error";
import { PurchaseStatus } from "@/modules/purchase/purchase.model";
import type { PurchaseService } from "@/modules/purchase/purchase.service";
import { splitEqually, toCents } from "@/modules/purchase/purchase.utils";
import { runTelegramCommand } from "./command-error";
import { parseBuyCommand } from "../parsers/buy.parser";
import { IncorrectTelegramCommand } from "../telegram.error";
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
    const commandFlow = Effect.gen(function* () {
      const result = parseBuyCommand(ctx.message.text);

      if (!result.ok) {
        return yield* Effect.fail(
          new IncorrectTelegramCommand({
            command: "/buy",
            message: result.message,
          }),
        );
      }

      if (!ctx.chat || !ctx.from || !isSettlementGroupChat(ctx.chat)) {
        return yield* Effect.fail(
          new IncorrectTelegramCommand({
            command: "/buy",
            message: "Use /buy inside your Kit Luy group.",
          }),
        );
      }

      const { command } = result;

      if (command.type === "all") {
        const tgChatId = String(ctx.chat.id);
        const tgUserId = String(ctx.from.id);

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
        const memberAllocations = splitEqually(totalAmount, members.length);
        const allocationsByMember = members.map((member, index) => ({
          member,
          allocation: memberAllocations[index],
        }));
        const beneficiaryAllocations = allocationsByMember.filter(
          ({ member }) => member.id !== sender.id,
        );
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
          allocations: beneficiaryAllocations.map(({ member, allocation }) => ({
            beneficiary_member_id: member.id,
            responsible_member_id: member.id,
            amount: allocation.amount,
            allocation_kind: allocation.allocation_kind,
          })),
        });

        const payerName = sender.alias
          ? `@${sender.alias}`
          : (sender.display_name ?? `member #${sender.id}`);

        const beneficiaryLines = beneficiaryAllocations
          .map(({ member, allocation }) => {
            const name = member.alias
              ? `@${member.alias}`
              : (member.display_name ?? `member #${member.id}`);
            const amount = (allocation.amount / 100).toFixed(2);
            return `  • ${name} owes ${amount}`;
          })
          .join("\n");

        return yield* Effect.promise(() =>
          ctx.reply(
            `Purchase #${result.purchase.id} created: ${command.totalAmount} paid by ${payerName}.\n\n` +
              `Beneficiaries:\n${beneficiaryLines}`,
          ),
        );
      }

      return yield* Effect.promise(() =>
        ctx.reply(
          `Buy command received: ${command.totalAmount} split between ${command.allocations
            .map(({ username, amount }) => `@${username}=${amount}`)
            .join(" ")}.`,
        ),
      );
    });

    return runTelegramCommand(
      ctx,
      {
        command: "/buy",
        fallbackMessage: "Could not record this purchase.",
      },
      commandFlow,
    );
  });
};
