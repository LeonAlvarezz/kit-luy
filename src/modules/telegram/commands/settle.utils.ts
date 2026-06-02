import type { MemberModel } from "@/modules/member/member.model";
import type { PurchaseModel } from "@/modules/purchase/purchase.model";
import { formatAmount } from "@/shared/currency";
import { escapeHtml, formatMemberName } from "../telegram.utils";

export const createMemberLookup = (members: readonly MemberModel.Entity[]) =>
  new Map(members.map((member) => [member.id, member]));

export const formatRepayments = (
  repayments: readonly PurchaseModel.Repayment[],
  memberById: ReadonlyMap<number, MemberModel.Entity>,
) =>
  [...groupRepaymentsByDebtor(repayments).entries()]
    .map(([fromMemberId, debtorRepayments]) =>
      formatDebtorRepayments(fromMemberId, debtorRepayments, memberById),
    )
    .join("\n\n");

const groupRepaymentsByDebtor = (
  repayments: readonly PurchaseModel.Repayment[],
) => {
  const repaymentsByDebtor = new Map<number, PurchaseModel.Repayment[]>();

  for (const repayment of repayments) {
    const debtorRepayments =
      repaymentsByDebtor.get(repayment.fromMemberId) ?? [];
    debtorRepayments.push(repayment);
    repaymentsByDebtor.set(repayment.fromMemberId, debtorRepayments);
  }

  return repaymentsByDebtor;
};

const formatDebtorRepayments = (
  debtorMemberId: number,
  repayments: readonly PurchaseModel.Repayment[],
  memberById: ReadonlyMap<number, MemberModel.Entity>,
) =>
  `+ <b>${getMemberName(memberById, debtorMemberId)}</b>\n${repayments
    .map((repayment) => formatRepaymentLine(repayment, memberById))
    .join("\n")}`;

const formatRepaymentLine = (
  repayment: PurchaseModel.Repayment,
  memberById: ReadonlyMap<number, MemberModel.Entity>,
) =>
  `   - ${getMemberName(memberById, repayment.toMemberId)}\t\t\t\t\t<code>$${formatAmount(repayment.amount)}</code>`;

const getMemberName = (
  memberById: ReadonlyMap<number, MemberModel.Entity>,
  memberId: number,
) => {
  const member = memberById.get(memberId);
  return escapeHtml(member ? formatMemberName(member) : `member #${memberId}`);
};
