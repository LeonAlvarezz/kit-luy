import { describe, expect, test } from "bun:test";
import { Effect, Layer } from "effect";
import { RepaymentService, RepaymentServiceLiveImpl } from "./repayment.service";
import { RepaymentRepository } from "./repayment.repository";
import { PurchaseRepository } from "../purchase/purchase.repository";
import { RepaymentStatus } from "./repayment.model";
import { PurchaseStatus } from "../purchase/purchase.model";
import { AllocationKind } from "../purchase/purchase-allocation.model";
import { RepaymentClaimStatus } from "./repayment-claim.model";

const createMockPurchase = (
  id: number,
  responsibleMemberId: number,
  amount: number,
) => ({
  id,
  group_id: 10,
  payer_member_id: 1, // receiver
  tg_message_id: 100,
  amount,
  note: `Purchase ${id}`,
  status: PurchaseStatus.ACTIVE,
  created_at: Date.now(),
  voided_at: null,
  allocations: [
    {
      id: id * 10,
      purchase_id: id,
      beneficiary_member_id: responsibleMemberId,
      responsible_member_id: responsibleMemberId,
      amount,
      allocation_kind: AllocationKind.EQUAL,
    },
  ],
});

const createMockClaim = (amountCents: number) => ({
  id: 100,
  group_id: 10,
  purchase_id: null,
  sender_member_id: 2,
  receiver_member_id: 1,
  amount_cents: amountCents,
  status: RepaymentClaimStatus.PENDING,
  tg_message_id: 200,
  created_at: new Date().toISOString(),
  resolved_at: null,
});

describe("RepaymentService.createFromConfirmedClaim auto-splitting", () => {
  test("splits repayment across multiple active purchases from oldest to newest", async () => {
    // 2 active purchases where sender (2) owes receiver (1):
    // Purchase 1: owes 500 cents ($5.00)
    // Purchase 2: owes 1000 cents ($10.00)
    const mockPurchases = [
      createMockPurchase(1, 2, 500),
      createMockPurchase(2, 2, 1000),
    ];

    const createdRepayments: any[] = [];

    const mockRepaymentRepo = {
      create: (payload: any) =>
        Effect.sync(() => {
          createdRepayments.push(payload);
          return { id: createdRepayments.length, ...payload };
        }),
      findActiveByGroupId: () => Effect.succeed([]), // no existing repayments
    };

    const mockPurchaseRepo = {
      findAllByGroupId: () => Effect.succeed(mockPurchases),
    };

    const testProgram = Effect.gen(function* () {
      const repaymentService = yield* RepaymentService;
      const claim = createMockClaim(1200); // Pays $12.00
      return yield* repaymentService.createFromConfirmedClaim({
        claim,
        confirmedByMemberId: 1,
      });
    });

    const runnable = testProgram.pipe(
      Effect.provide(RepaymentServiceLiveImpl),
      Effect.provide(
        Layer.succeed(RepaymentRepository, mockRepaymentRepo as any),
      ),
      Effect.provide(
        Layer.succeed(PurchaseRepository, mockPurchaseRepo as any),
      ),
    );

    await Effect.runPromise(runnable);

    // Expect 2 repayments to be created:
    // 1. $5.00 linked to Purchase 1
    // 2. $7.00 linked to Purchase 2
    expect(createdRepayments).toHaveLength(2);
    expect(createdRepayments[0]).toEqual({
      group_id: 10,
      purchase_id: 1,
      repayment_claim_id: 100,
      sender_member_id: 2,
      receiver_member_id: 1,
      amount_cents: 500,
      confirmed_by_member_id: 1,
      status: RepaymentStatus.ACTIVE,
    });
    expect(createdRepayments[1]).toEqual({
      group_id: 10,
      purchase_id: 2,
      repayment_claim_id: 100,
      sender_member_id: 2,
      receiver_member_id: 1,
      amount_cents: 700,
      confirmed_by_member_id: 1,
      status: RepaymentStatus.ACTIVE,
    });
  });

  test("creates general repayment if there are no active purchases", async () => {
    const createdRepayments: any[] = [];

    const mockRepaymentRepo = {
      create: (payload: any) =>
        Effect.sync(() => {
          createdRepayments.push(payload);
          return { id: 1, ...payload };
        }),
      findActiveByGroupId: () => Effect.succeed([]),
    };

    const mockPurchaseRepo = {
      findAllByGroupId: () => Effect.succeed([]),
    };

    const testProgram = Effect.gen(function* () {
      const repaymentService = yield* RepaymentService;
      const claim = createMockClaim(1000);
      return yield* repaymentService.createFromConfirmedClaim({
        claim,
        confirmedByMemberId: 1,
      });
    });

    const runnable = testProgram.pipe(
      Effect.provide(RepaymentServiceLiveImpl),
      Effect.provide(
        Layer.succeed(RepaymentRepository, mockRepaymentRepo as any),
      ),
      Effect.provide(
        Layer.succeed(PurchaseRepository, mockPurchaseRepo as any),
      ),
    );

    await Effect.runPromise(runnable);

    expect(createdRepayments).toHaveLength(1);
    expect(createdRepayments[0].purchase_id).toBeNull();
    expect(createdRepayments[0].amount_cents).toBe(1000);
  });
});
