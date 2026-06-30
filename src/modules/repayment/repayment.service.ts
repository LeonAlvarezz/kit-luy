import { DbError } from "@/core/error";
import { Context, Effect, Layer } from "effect";
import type { RepaymentClaimModel } from "./repayment-claim.model";
import { RepaymentModel, RepaymentStatus } from "./repayment.model";
import {
  RepaymentRepository,
  RepaymentRepositoryLive,
} from "./repayment.repository";

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

export const RepaymentServiceLive = Layer.effect(
  RepaymentService,
  Effect.gen(function* () {
    const repo = yield* RepaymentRepository;

    return {
      findAll: () => repo.findAll(),
      findActiveByGroupId: (group_id) => repo.findActiveByGroupId(group_id),
      create: (payload) => repo.create(payload),
      createFromConfirmedClaim: ({ claim, confirmedByMemberId }) =>
        repo.create({
          group_id: claim.group_id,
          purchase_id: claim.purchase_id,
          repayment_claim_id: claim.id,
          sender_member_id: claim.sender_member_id,
          receiver_member_id: claim.receiver_member_id,
          amount_cents: claim.amount_cents,
          confirmed_by_member_id: confirmedByMemberId,
          status: RepaymentStatus.ACTIVE,
        }),
      voidActiveRepaymentsByPurchaseId: (purchase_id) =>
        repo.voidActiveByPurchaseId(purchase_id),
    };
  }),
).pipe(Layer.provide(RepaymentRepositoryLive));
