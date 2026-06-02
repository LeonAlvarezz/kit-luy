import { Context, Effect } from "effect";
import type { Telegraf } from "telegraf";

import type { MemberService } from "@/modules/member/member.service";
import type { PurchaseService } from "@/modules/purchase/purchase.service";
import { runTelegramCommand } from "./command-error";
import { IncorrectTelegramCommand } from "../telegram.error";
import { formatMemberName, isSettlementGroupChat } from "../telegram.utils";

export type SettleCommandDependencies = Pick<
  Context.Tag.Service<typeof MemberService>,
  "findTelegramMember" | "findActiveByGroupId"
> & {
  findSettlementBalancesByGroupId: Context.Tag.Service<
    typeof PurchaseService
  >["findSettlementBalancesByGroupId"];
};

type Repayment = {
  readonly fromMemberId: number;
  readonly toMemberId: number;
  readonly amount: number;
};

const formatAmount = (amount: number) => (amount / 100).toFixed(2);

const getMemberName = (
  memberById: Map<
    number,
    {
      readonly id: number;
      readonly alias: string | null;
      readonly display_name: string | null;
    }
  >,
  memberId: number,
) => {
  const member = memberById.get(memberId);
  return member ? formatMemberName(member) : `member #${memberId}`;
};

const calculateRepayments = (
  balances: readonly { readonly member_id: number; readonly balance: number }[],
): Repayment[] => {
  const debtors = balances
    .filter(({ balance }) => balance < 0)
    .map(({ member_id, balance }) => ({
      memberId: member_id,
      amount: Math.abs(balance),
    }))
    .sort((a, b) => a.memberId - b.memberId);

  const creditors = balances
    .filter(({ balance }) => balance > 0)
    .map(({ member_id, balance }) => ({
      memberId: member_id,
      amount: balance,
    }))
    .sort((a, b) => a.memberId - b.memberId);

  const repayments: Repayment[] = [];
  let debtorIndex = 0;
  let creditorIndex = 0;

  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const debtor = debtors[debtorIndex];
    const creditor = creditors[creditorIndex];
    const amount = Math.min(debtor.amount, creditor.amount);

    if (amount > 0) {
      repayments.push({
        fromMemberId: debtor.memberId,
        toMemberId: creditor.memberId,
        amount,
      });
    }

    debtor.amount -= amount;
    creditor.amount -= amount;

    if (debtor.amount === 0) {
      debtorIndex += 1;
    }
    if (creditor.amount === 0) {
      creditorIndex += 1;
    }
  }

  return repayments;
};

const formatRepayments = (
  repayments: readonly Repayment[],
  memberById: Map<
    number,
    {
      readonly id: number;
      readonly alias: string | null;
      readonly display_name: string | null;
    }
  >,
) => {
  const repaymentsByDebtor = new Map<number, Repayment[]>();

  for (const repayment of repayments) {
    const debtorRepayments =
      repaymentsByDebtor.get(repayment.fromMemberId) ?? [];
    debtorRepayments.push(repayment);
    repaymentsByDebtor.set(repayment.fromMemberId, debtorRepayments);
  }

  return [...repaymentsByDebtor.entries()]
    .map(([fromMemberId, debtorRepayments]) => {
      const repaymentLines = debtorRepayments
        .map(
          (repayment) =>
            `    ${getMemberName(memberById, repayment.toMemberId)} $${formatAmount(
              repayment.amount,
            )}`,
        )
        .join("\n");

      return `${getMemberName(memberById, fromMemberId)}\n${repaymentLines}`;
    })
    .join("\n\n");
};

export const registerSettleCommand = (
  bot: Telegraf,
  dependencies: SettleCommandDependencies,
) => {
  bot.command("settle", async (ctx) => {
    const commandFlow = Effect.gen(function* () {
      if (!ctx.chat || !ctx.from || !isSettlementGroupChat(ctx.chat)) {
        return yield* Effect.fail(
          new IncorrectTelegramCommand({
            command: "/settle",
            message: "Use /settle inside your Kit Luy group.",
          }),
        );
      }

      const sender = yield* dependencies.findTelegramMember({
        tg_chat_id: String(ctx.chat.id),
        tg_user_id: String(ctx.from.id),
      });

      const [members, balances] = yield* Effect.all([
        dependencies.findActiveByGroupId(sender.group_id),
        dependencies.findSettlementBalancesByGroupId(sender.group_id),
      ]);
      const memberById = new Map(members.map((member) => [member.id, member]));
      const repayments = calculateRepayments(balances);

      if (repayments.length <= 0) {
        return yield* Effect.promise(() =>
          ctx.reply("All clear. No repayments are needed."),
        );
      }

      const repaymentLines = formatRepayments(repayments, memberById);

      return yield* Effect.promise(() =>
        ctx.reply(`Repayments to settle:\n${repaymentLines}`),
      );
    });

    return runTelegramCommand(
      ctx,
      {
        command: "/settle",
        fallbackMessage: "Could not calculate settlement.",
      },
      commandFlow,
    );
  });
};
