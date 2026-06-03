import type { MemberModel } from "@/modules/member/member.model";
import type { PurchaseModel } from "@/modules/purchase/purchase.model";
import { formatAmount } from "@/shared/currency";
import type { TranslationFunctions } from "../lang/i18n-types";
import { escapeHtml, formatMemberName } from "../telegram.utils";

export const createMemberLookup = (members: readonly MemberModel.Entity[]) =>
  new Map(members.map((member) => [member.id, member]));

export const formatRepayments = (
  t: TranslationFunctions,
  repayments: readonly PurchaseModel.Repayment[],
  memberById: ReadonlyMap<number, MemberModel.Entity>,
) =>
  [...groupRepaymentsByDebtor(repayments).entries()]
    .map(([fromMemberId, debtorRepayments]) =>
      formatDebtorRepayments(t, fromMemberId, debtorRepayments, memberById),
    )
    .join("\n\n");

const groupRepaymentsByDebtor = (
  repayments: readonly PurchaseModel.Repayment[],
) => {
  const repaymentsByDebtor = new Map<number, PurchaseModel.Repayment[]>();

  for (const repayment of repayments) {
    const debtorRepayments = repaymentsByDebtor.get(repayment.toMemberId) ?? [];
    debtorRepayments.push(repayment);
    repaymentsByDebtor.set(repayment.toMemberId, debtorRepayments);
  }

  return repaymentsByDebtor;
};

const formatDebtorRepayments = (
  t: TranslationFunctions,
  debtorMemberId: number,
  repayments: readonly PurchaseModel.Repayment[],
  memberById: ReadonlyMap<number, MemberModel.Entity>,
) =>
  `+ <b>${getMemberName(t, memberById, debtorMemberId)}</b>  (${t.settle.creditor()})\n${repayments
    .map((repayment) => formatRepaymentLine(t, repayment, memberById))
    .join("\n")}`;

const formatRepaymentLine = (
  t: TranslationFunctions,
  repayment: PurchaseModel.Repayment,
  memberById: ReadonlyMap<number, MemberModel.Entity>,
) =>
  t.settle.repaymentLine({
    member: getMemberName(t, memberById, repayment.fromMemberId),
    amount: formatAmount(repayment.amount),
  });

const getMemberName = (
  t: TranslationFunctions,
  memberById: ReadonlyMap<number, MemberModel.Entity>,
  memberId: number,
) => {
  const member = memberById.get(memberId);
  return escapeHtml(
    member ? formatMemberName(member) : t.list.unknownMember({ memberId }),
  );
};
