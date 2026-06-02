import type { MemberModel } from "@/modules/member/member.model";
import type { PurchaseAllocationModel } from "@/modules/purchase/purchase-allocation.model";
import { formatAmount } from "@/shared/currency";
import { escapeHtml, formatMemberName } from "../telegram.utils";

type BeneficiaryAllocation = {
  readonly member: MemberModel.Entity;
  readonly allocation: Pick<PurchaseAllocationModel.CreateForPurchase, "amount">;
};

type FormatBuyAllReplyParams = {
  readonly purchaseId: number;
  readonly totalAmount: number;
  readonly payer: MemberModel.Entity;
  readonly beneficiaryAllocations: readonly BeneficiaryAllocation[];
};

export const formatBuyAllReply = ({
  purchaseId,
  totalAmount,
  payer,
  beneficiaryAllocations,
}: FormatBuyAllReplyParams) =>
  `Purchase #${purchaseId} created: <code>$${formatAmount(
    totalAmount,
  )}</code> paid by <b>${formatMember(payer)}</b>.\n\n` +
  `Beneficiaries:\n${formatBeneficiaryAllocations(beneficiaryAllocations)}`;

const formatBeneficiaryAllocations = (
  beneficiaryAllocations: readonly BeneficiaryAllocation[],
) =>
  beneficiaryAllocations
    .map(({ member, allocation }) => formatBeneficiaryLine(member, allocation))
    .join("\n");

const formatBeneficiaryLine = (
  member: MemberModel.Entity,
  allocation: Pick<PurchaseAllocationModel.CreateForPurchase, "amount">,
) =>
  `   - ${formatMember(member)}\t\t\t\t\t<code>$${formatAmount(
    allocation.amount,
  )}</code>`;

const formatMember = (member: MemberModel.Entity) =>
  escapeHtml(formatMemberName(member));
