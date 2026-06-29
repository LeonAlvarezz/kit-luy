import { Context, Effect, Runtime } from "effect";
import type { Telegraf } from "telegraf";

import { MemberService } from "@/modules/member/member.service";
import { GroupService } from "@/modules/group/group.service";
import { TelegramConversationService } from "@/modules/telegram-conversation/telegram-conversation.service";
import { AllocationKind } from "@/modules/purchase/purchase-allocation.model";
import {
  PurchaseAllocationTotalMismatch,
  PurchaseBeneficiaryNotFound,
  PurchaseDuplicateBeneficiary,
  PurchaseNoActiveMembers,
} from "@/modules/purchase/purchase.error";
import { PurchaseStatus } from "@/modules/purchase/purchase.model";
import { PurchaseService } from "@/modules/purchase/purchase.service";
import { splitEqually, toCents } from "@/modules/purchase/purchase.utils";
import { formatBuyAllReply, type BeneficiaryAllocation } from "./buy.utils";
import { runTelegramCommand } from "./command-error";
import { parseBuyCommand } from "../parsers/buy.parser";
import type { BuyAllocation } from "../parsers/buy.parser";
import { IncorrectTelegramCommand } from "../telegram.error";
import { isGroupContext } from "../telegram.utils";
import { getDefaultLocale, getGroupLocale } from "../lang/group-locale";
import type { TelegramDeps } from "../telegram.types";

export const registerBuyCommand = (
  bot: Telegraf,
  runtime: Runtime.Runtime<TelegramDeps>,
) => {
  bot.command("buy", async (ctx) => {
    const commandFlow = Effect.gen(function* () {
      const memberService = yield* MemberService;
      const groupService = yield* GroupService;
      const purchaseService = yield* PurchaseService;
      const telegramConversationService = yield* TelegramConversationService;

      if (!isGroupContext(ctx)) {
        return yield* Effect.fail(
          new IncorrectTelegramCommand({
            command: "/buy",
            message: getDefaultLocale().command.useInGroup({
              command: "/buy",
            }),
          }),
        );
      }

      const tgChatId = String(ctx.chat.id);
      const tgUserId = String(ctx.from.id);
      const sender = yield* memberService.findTelegramMember({
        tg_chat_id: tgChatId,
        tg_user_id: tgUserId,
      });

      const t = yield* getGroupLocale(
        groupService.findById,
        sender.group_id,
      );

      if (ctx.message.text.trim().match(/^\/buy(?:@\w+)?$/i)) {
        yield* telegramConversationService.startBuySession({
          group_id: sender.group_id,
          member_id: sender.id,
        });

        return yield* Effect.promise(() =>
          ctx.reply("How much did you pay?", {
            reply_markup: { force_reply: true, selective: true },
          }),
        );
      }

      const result = parseBuyCommand(ctx.message.text);

      if (!result.ok) {
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

      const { command } = result;
      const members = yield* memberService.findActiveByGroupId(sender.group_id);

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
        const result = yield* purchaseService.createWithAllocations({
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
      const hasEqualAllocations = command.allocations.some(
        (allocation) => allocation.value.type === "equal",
      );

      if (hasEqualAllocations) {
        const hasExplicitAllocations = command.allocations.some(
          (allocation) => allocation.value.type !== "equal",
        );

        if (hasExplicitAllocations) {
          return yield* Effect.fail(
            new IncorrectTelegramCommand({
              command: "/buy",
              message: t.buy.allocationUsage(),
            }),
          );
        }

        const selectedMembers = [];
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

          selectedMembers.push(member);
        }

        const participantMembers = selectedMembers.some(
          (member) => member.id === sender.id,
        )
          ? selectedMembers
          : [sender, ...selectedMembers];
        const memberAllocations = splitEqually(
          totalAmount,
          participantMembers.length,
        );
        const allocationsByMember = participantMembers.map((member, index) => ({
          member,
          allocation: memberAllocations[index],
        }));
        const beneficiaryAllocations = allocationsByMember.filter(
          ({ member }) => member.id !== sender.id,
        );

        const createdPurchase =
          yield* purchaseService.createWithAllocations({
            purchase: {
              group_id: sender.group_id,
              payer_member_id: sender.id,
              tg_message_id: ctx.message.message_id,
              amount: totalAmount,
              note: null,
              status: PurchaseStatus.ACTIVE,
              created_at: Date.now(),
            },
            allocations: beneficiaryAllocations.map(
              ({ member, allocation }) => ({
                beneficiary_member_id: member.id,
                responsible_member_id: member.id,
                amount: allocation.amount,
                allocation_kind: allocation.allocation_kind,
              }),
            ),
          });

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
      }

      const resolvedAllocations = command.allocations.map((allocation) => ({
        ...allocation,
        amount: resolveBuyAllocationAmount(allocation, totalAmount),
      }));
      const allocationTotal = resolvedAllocations.reduce(
        (sum, allocation) => sum + allocation.amount,
        0,
      );

      if (allocationTotal > totalAmount) {
        return yield* Effect.fail(
          new PurchaseAllocationTotalMismatch({
            totalAmount,
            allocationTotal,
            message: t.buy.allocationTotalMismatch(),
          }),
        );
      }

      const allocationsByMember: BeneficiaryAllocation[] = [];
      for (const allocation of resolvedAllocations) {
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
            amount: allocation.amount,
            allocation_kind: AllocationKind.EXPLICIT,
          },
        });
      }

      const senderRemainder = totalAmount - allocationTotal;
      if (senderRemainder > 0) {
        allocationsByMember.push({
          member: sender,
          allocation: {
            amount: senderRemainder,
            allocation_kind: AllocationKind.INFERRED,
          },
        });
      }

      const beneficiaryAllocations = allocationsByMember.filter(
        ({ member }) => member.id !== sender.id,
      );

      const createdPurchase = yield* purchaseService.createWithAllocations(
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
      runtime,
      ctx,
      {
        command: "/buy",
        fallbackMessage: getDefaultLocale().buy.fallback(),
      },
      commandFlow,
    );
  });
};

const resolveBuyAllocationAmount = (
  allocation: BuyAllocation,
  totalAmount: number,
) => {
  switch (allocation.value.type) {
    case "amount":
      return toCents(allocation.value.amount);
    case "fraction":
      return Math.round(
        (totalAmount * allocation.value.numerator) /
          allocation.value.denominator,
      );
    case "equal":
      throw new Error("Equal allocations must be resolved before this point.");
  }
};
