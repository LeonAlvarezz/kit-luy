import type { MemberModel } from "@/modules/member/member.model";
import type { PurchaseAllocationModel } from "@/modules/purchase/purchase-allocation.model";
import { formatAmount } from "@/shared/currency";
import type { TranslationFunctions } from "../../lang/i18n-types";
import { escapeHtml, formatMemberName } from "../../telegram.utils";

export type BeneficiaryAllocation = {
  readonly member: MemberModel.Entity;
  readonly allocation: Pick<
    PurchaseAllocationModel.CreateForPurchase,
    "amount" | "allocation_kind"
  >;
};

type FormatBuyAllReplyParams = {
  readonly t: TranslationFunctions;
  readonly purchaseId: number;
  readonly totalAmount: number;
  readonly payer: MemberModel.Entity;
  readonly beneficiaryAllocations: readonly BeneficiaryAllocation[];
};

export const formatBuyAllReply = ({
  t,
  purchaseId,
  totalAmount,
  payer,
  beneficiaryAllocations,
}: FormatBuyAllReplyParams) =>
  `${t.buy.created({
    purchaseId,
    amount: formatAmount(totalAmount),
    payer: formatMember(payer),
  })}\n\n${t.buy.beneficiaries()}\n${formatBeneficiaryAllocations(
    t,
    beneficiaryAllocations,
  )}`;

const formatBeneficiaryAllocations = (
  t: TranslationFunctions,
  beneficiaryAllocations: readonly BeneficiaryAllocation[],
) =>
  beneficiaryAllocations
    .map(({ member, allocation }) =>
      formatBeneficiaryLine(t, member, allocation),
    )
    .join("\n");

const formatBeneficiaryLine = (
  t: TranslationFunctions,
  member: MemberModel.Entity,
  allocation: Pick<PurchaseAllocationModel.CreateForPurchase, "amount">,
) =>
  t.buy.beneficiaryLine({
    member: formatMember(member),
    amount: formatAmount(allocation.amount),
  });

const formatMember = (member: MemberModel.Entity) =>
  escapeHtml(formatMemberName(member));
