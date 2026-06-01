import { AllocationKind } from "./purchase-allocation.model";

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
