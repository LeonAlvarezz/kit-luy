import { DbError } from "@/core/error";
import { Context, Effect, Layer } from "effect";
import type { RepaymentClaimModel } from "./repayment-claim.model";
import { RepaymentModel, RepaymentStatus } from "./repayment.model";
import {
  RepaymentRepository,
  RepaymentRepositoryLive,
} from "./repayment.repository";
import {
  PurchaseRepository,
  PurchaseRepositoryLive,
} from "../purchase/purchase.repository";

export class RepaymentService extends Context.Tag("RepaymentService")<
  RepaymentService,
  {
    findAll: () => Effect.Effect<RepaymentModel.Entity[], DbError>;
    findActiveByGroupId: (
      group_id: number,
    ) => Effect.Effect<RepaymentModel.Entity[], DbError>;
    create: (
      payload: RepaymentModel.Create,
    ) => Effect.Effect<RepaymentModel.Entity, DbError>;
    createFromConfirmedClaim: (payload: {
      readonly claim: RepaymentClaimModel.Entity;
      readonly confirmedByMemberId: number;
    }) => Effect.Effect<RepaymentModel.Entity, DbError>;
    voidActiveRepaymentsByPurchaseId: (
      purchase_id: number,
    ) => Effect.Effect<RepaymentModel.Entity[], DbError>;
  }
>() {}

export const RepaymentServiceLiveImpl = Layer.effect(
  RepaymentService,
  Effect.gen(function* () {
    const repo = yield* RepaymentRepository;
    const purchaseRepo = yield* PurchaseRepository;

    return {
      findAll: () => repo.findAll(),
      findActiveByGroupId: (group_id) => repo.findActiveByGroupId(group_id),
      create: (payload) => repo.create(payload),
      createFromConfirmedClaim: ({ claim, confirmedByMemberId }) =>
        Effect.gen(function* () {
          // If claim has an explicit purchase_id, link directly
          if (claim.purchase_id !== null && claim.purchase_id !== undefined) {
            return yield* repo.create({
              group_id: claim.group_id,
              purchase_id: claim.purchase_id,
              repayment_claim_id: claim.id,
              sender_member_id: claim.sender_member_id,
              receiver_member_id: claim.receiver_member_id,
              amount_cents: claim.amount_cents,
              confirmed_by_member_id: confirmedByMemberId,
              status: RepaymentStatus.ACTIVE,
            });
          }

          // Otherwise, auto-distribute to active purchases of sender to receiver
          const activePurchases = yield* purchaseRepo.findAllByGroupId(
            claim.group_id,
          );

          // Filter active purchases where receiver is the payer and sender has an allocation
          const relevantPurchases = activePurchases
            .filter((p) => {
              if (p.status !== "active") return false;
              if (p.payer_member_id !== claim.receiver_member_id) return false;
              const hasAllocation = p.allocations.some(
                (a) => a.responsible_member_id === claim.sender_member_id,
              );
              return hasAllocation;
            })
            // Sort by id ascending (oldest first)
            .sort((a, b) => a.id - b.id);

          // Get all active repayments for the group to calculate outstanding purchase balances
          const repayments = yield* repo.findActiveByGroupId(claim.group_id);

          let remainingClaimAmount = claim.amount_cents;
          let lastRepayment: RepaymentModel.Entity | undefined = undefined;

          for (const purchase of relevantPurchases) {
            if (remainingClaimAmount <= 0) break;

            const allocation = purchase.allocations.find(
              (a) => a.responsible_member_id === claim.sender_member_id,
            );
            if (!allocation) continue;

            // Sum of existing active repayments linked to this purchase from the sender to the receiver
            const alreadyPaid = repayments
              .filter(
                (r) =>
                  r.purchase_id === purchase.id &&
                  r.sender_member_id === claim.sender_member_id &&
                  r.receiver_member_id === claim.receiver_member_id,
              )
              .reduce((sum, r) => sum + r.amount_cents, 0);

            const remainingOwed = allocation.amount - alreadyPaid;
            if (remainingOwed > 0) {
              const allocatedAmount = Math.min(
                remainingClaimAmount,
                remainingOwed,
              );
              lastRepayment = yield* repo.create({
                group_id: claim.group_id,
                purchase_id: purchase.id,
                repayment_claim_id: claim.id,
                sender_member_id: claim.sender_member_id,
                receiver_member_id: claim.receiver_member_id,
                amount_cents: allocatedAmount,
                confirmed_by_member_id: confirmedByMemberId,
                status: RepaymentStatus.ACTIVE,
              });
              remainingClaimAmount -= allocatedAmount;
            }
          }

          // If there's still leftover payment amount (or no active purchases at all),
          // create a general repayment with purchase_id as null
          if (remainingClaimAmount > 0) {
            lastRepayment = yield* repo.create({
              group_id: claim.group_id,
              purchase_id: null,
              repayment_claim_id: claim.id,
              sender_member_id: claim.sender_member_id,
              receiver_member_id: claim.receiver_member_id,
              amount_cents: remainingClaimAmount,
              confirmed_by_member_id: confirmedByMemberId,
              status: RepaymentStatus.ACTIVE,
            });
          }

          // Return the last repayment created, or a dummy if none created (should always create at least one)
          return lastRepayment!;
        }),
      voidActiveRepaymentsByPurchaseId: (purchase_id) =>
        repo.voidActiveByPurchaseId(purchase_id),
    };
  }),
);

export const RepaymentServiceLive = RepaymentServiceLiveImpl.pipe(
  Layer.provide(RepaymentRepositoryLive),
  Layer.provide(PurchaseRepositoryLive),
);
