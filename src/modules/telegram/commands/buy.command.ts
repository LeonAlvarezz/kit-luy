import { Context, Effect } from "effect";
import type { Telegraf } from "telegraf";

import type { MemberService } from "@/modules/member/member.service";
import type { GroupService } from "@/modules/group/group.service";
import { AllocationKind } from "@/modules/purchase/purchase-allocation.model";
import {
  PurchaseAllocationTotalMismatch,
  PurchaseBeneficiaryNotFound,
  PurchaseDuplicateBeneficiary,
  PurchaseNoActiveMembers,
} from "@/modules/purchase/purchase.error";
import { PurchaseStatus } from "@/modules/purchase/purchase.model";
import type { PurchaseService } from "@/modules/purchase/purchase.service";
import { splitEqually, toCents } from "@/modules/purchase/purchase.utils";
import { formatBuyAllReply, type BeneficiaryAllocation } from "./buy.utils";
import { runTelegramCommand } from "./command-error";
import { parseBuyCommand } from "../parsers/buy.parser";
import { IncorrectTelegramCommand } from "../telegram.error";
import { isSettlementGroupChat } from "../telegram.utils";
import { getDefaultLocale, getGroupLocale } from "../lang/group-locale";

export type BuyCommandDependencies = Pick<
  Context.Tag.Service<typeof MemberService>,
  "findTelegramMember" | "findActiveByGroupId"
> & {
  findGroupById: Context.Tag.Service<typeof GroupService>["findById"];
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
        const t = getDefaultLocale();
        return yield* Effect.fail(
          new IncorrectTelegramCommand({
            command: "/buy",
            message:
              result.reason === "usage"
                ? t.buy.usage()
                : t.buy.allocationUsage(),
          }),
        );
      }

      if (!ctx.chat || !ctx.from || !isSettlementGroupChat(ctx.chat)) {
        return yield* Effect.fail(
          new IncorrectTelegramCommand({
            command: "/buy",
            message: getDefaultLocale().command.useInGroup({
              command: "/buy",
            }),
          }),
        );
      }

      const { command } = result;

      const tgChatId = String(ctx.chat.id);
      const tgUserId = String(ctx.from.id);
      const sender = yield* dependencies.findTelegramMember({
        tg_chat_id: tgChatId,
        tg_user_id: tgUserId,
      });
      const t = yield* getGroupLocale(dependencies.findGroupById, sender.group_id);
      const members = yield* dependencies.findActiveByGroupId(sender.group_id);

      if (command.type === "all") {
        const beneficiaries = members.filter(
          (member) => member.id !== sender.id,
        );

        if (beneficiaries.length <= 0) {
          return yield* Effect.fail(
            new PurchaseNoActiveMembers({
              tg_chat_id: tgChatId,
              message: t.buy.noOtherActiveMembers(),
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

        const replyMessage = formatBuyAllReply({
          t,
          purchaseId: result.purchase.id,
          totalAmount,
          payer: sender,
          beneficiaryAllocations,
        });

        return yield* Effect.promise(() =>
          ctx.reply(replyMessage, {
            parse_mode: "HTML",
          }),
        );
      }

      // Explicit
      // Filter out null alias and map in one go
      const membersByAlias = new Map(
        members.flatMap((member) =>
          member.alias ? [[member.alias.toLowerCase(), member]] : [],
        ),
      );

      // Find Duplicate User
      const seenUsernames = new Set<string>();
      for (const allocation of command.allocations) {
        const username = allocation.username.toLowerCase();

        if (seenUsernames.has(username)) {
          return yield* Effect.fail(
            new PurchaseDuplicateBeneficiary({
              username: allocation.username,
              message: t.buy.duplicateBeneficiary({
                username: allocation.username,
              }),
            }),
          );
        }
        seenUsernames.add(username);
      }

      const totalAmount = toCents(command.totalAmount);
      const allocationTotal = command.allocations.reduce(
        (sum, allocation) => sum + toCents(allocation.amount),
        0,
      );

      if (allocationTotal !== totalAmount) {
        return yield* Effect.fail(
          new PurchaseAllocationTotalMismatch({
            totalAmount,
            allocationTotal,
            message: t.buy.allocationTotalMismatch(),
          }),
        );
      }

      const allocationsByMember: BeneficiaryAllocation[] = [];
      for (const allocation of command.allocations) {
        const member = membersByAlias.get(allocation.username.toLowerCase());
        if (!member) {
          return yield* Effect.fail(
            new PurchaseBeneficiaryNotFound({
              username: allocation.username,
              message: t.buy.beneficiaryNotFound({
                username: allocation.username,
              }),
            }),
          );
        }

        allocationsByMember.push({
          member,
          allocation: {
            amount: toCents(allocation.amount),
            allocation_kind: AllocationKind.EXPLICIT,
          },
        });
      }

      const beneficiaryAllocations = allocationsByMember.filter(
        ({ member }) => member.id !== sender.id,
      );

      const createdPurchase = yield* dependencies.createPurchaseWithAllocations(
        {
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
        },
      );

      const replyMessage = formatBuyAllReply({
        t,
        purchaseId: createdPurchase.purchase.id,
        totalAmount,
        payer: sender,
        beneficiaryAllocations,
      });

      return yield* Effect.promise(() =>
        ctx.reply(replyMessage, {
          parse_mode: "HTML",
        }),
      );
    });

    return runTelegramCommand(
      ctx,
      {
        command: "/buy",
        fallbackMessage: getDefaultLocale().buy.fallback(),
      },
      commandFlow,
    );
  });
};
