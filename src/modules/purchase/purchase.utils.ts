import { AllocationKind } from "./purchase-allocation.model";
import type { PurchaseModel } from "./purchase.model";

export const toCents = (amount: number) => Math.round(amount * 100);

export const splitEqually = (totalAmount: number, memberCount: number) => {
  const baseAmount = Math.floor(totalAmount / memberCount);
  const remainder = totalAmount % memberCount;

  return Array.from({ length: memberCount }, (_, index) => ({
    amount: baseAmount + (index === 0 ? remainder : 0),
    allocation_kind:
      index === 0 && remainder > 0
        ? AllocationKind.ROUNDING_REMAINDER
        : AllocationKind.EQUAL,
  }));
};

export const calculateRepayments = (
  balances: readonly PurchaseModel.SettlementBalance[],
): PurchaseModel.Repayment[] => {
  const debtors = getDebtors(balances);
  const creditors = getCreditors(balances);

  const repayments: PurchaseModel.Repayment[] = [];
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

const getDebtors = (
  balances: readonly PurchaseModel.SettlementBalance[],
): PurchaseModel.SettlementParticipant[] =>
  balances
    .filter(({ balance }) => balance < 0)
    .map(({ member_id, balance }) => ({
      memberId: member_id,
      amount: Math.abs(balance),
    }))
    .sort(sortByMemberId);

const getCreditors = (
  balances: readonly PurchaseModel.SettlementBalance[],
): PurchaseModel.SettlementParticipant[] =>
  balances
    .filter(({ balance }) => balance > 0)
    .map(({ member_id, balance }) => ({
      memberId: member_id,
      amount: balance,
    }))
    .sort(sortByMemberId);

const sortByMemberId = (
  left: PurchaseModel.SettlementParticipant,
  right: PurchaseModel.SettlementParticipant,
) => left.memberId - right.memberId;
