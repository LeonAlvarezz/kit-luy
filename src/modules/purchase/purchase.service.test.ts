import { describe, expect, test } from "bun:test";

import { AllocationKind } from "./purchase-allocation.model";
import { PurchaseStatus, type PurchaseModel } from "./purchase.model";
import { calculateSettlementBalances } from "./purchase.service";
import {
  RepaymentStatus,
  type RepaymentModel,
} from "../repayment/repayment.model";

const createPurchase = (
  overrides: Partial<PurchaseModel.EntityWithAllocation> = {},
): PurchaseModel.EntityWithAllocation => ({
  id: 1,
  group_id: 10,
  payer_member_id: 1,
  tg_message_id: 100,
  amount: 1000,
  note: null,
  status: PurchaseStatus.ACTIVE,
  created_at: Date.UTC(2026, 5, 29),
  voided_at: null,
  allocations: [
    {
      id: 1,
      purchase_id: 1,
      beneficiary_member_id: 2,
      responsible_member_id: 2,
      amount: 1000,
      allocation_kind: AllocationKind.EQUAL,
    },
  ],
  ...overrides,
});

const createRepayment = (
  overrides: Partial<RepaymentModel.Entity> = {},
): RepaymentModel.Entity => ({
  id: 1,
  group_id: 10,
  repayment_claim_id: 1,
  sender_member_id: 2,
  receiver_member_id: 1,
  amount_cents: 1000,
  confirmed_by_member_id: 1,
  status: RepaymentStatus.ACTIVE,
  created_at: "2026-06-29T00:00:00.000Z",
  ...overrides,
});

describe("calculateSettlementBalances", () => {
  test("does not create settlement debt from repayments when no active purchases remain", () => {
    const balances = calculateSettlementBalances({
      purchases: [],
      repayments: [createRepayment()],
    });

    expect(balances).toEqual([]);
  });

  test("clamps repayments so voided purchase debt does not invert balances", () => {
    const balances = calculateSettlementBalances({
      purchases: [createPurchase({ amount: 1000 })],
      repayments: [createRepayment({ amount_cents: 1500 })],
    });

    expect(balances).toEqual([]);
  });

  test("applies repayments against active purchase debt", () => {
    const balances = calculateSettlementBalances({
      purchases: [createPurchase()],
      repayments: [createRepayment({ amount_cents: 400 })],
    });

    expect(balances).toEqual([
      { member_id: 1, balance: 600 },
      { member_id: 2, balance: -600 },
    ]);
  });
});
