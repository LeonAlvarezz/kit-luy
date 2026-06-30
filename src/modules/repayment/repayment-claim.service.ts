import { DbError } from "@/core/error";
import { Context, Effect, Layer } from "effect";
import {
  RepaymentClaimModel,
  RepaymentClaimStatus,
} from "./repayment-claim.model";
import {
  RepaymentClaimNotFound,
  RepaymentClaimInvalidStatus,
} from "./repayment-claim.error";
import {
  RepaymentClaimRepository,
  RepaymentClaimRepositoryLive,
} from "./repayment-claim.repository";

export class RepaymentClaimService extends Context.Tag("RepaymentClaimService")<
  RepaymentClaimService,
  {
    findAll: () => Effect.Effect<RepaymentClaimModel.Entity[], DbError>;
    findById: (
      id: number,
    ) => Effect.Effect<
      RepaymentClaimModel.Entity,
      DbError | RepaymentClaimNotFound
    >;
    create: (
      payload: RepaymentClaimModel.Create,
    ) => Effect.Effect<RepaymentClaimModel.Entity, DbError>;
    confirmClaim: (
      id: number,
    ) => Effect.Effect<
      RepaymentClaimModel.Entity,
      DbError | RepaymentClaimNotFound | RepaymentClaimInvalidStatus
    >;
    rejectClaim: (
      id: number,
    ) => Effect.Effect<
      RepaymentClaimModel.Entity,
      DbError | RepaymentClaimNotFound | RepaymentClaimInvalidStatus
    >;
    delete: (
      id: number,
    ) => Effect.Effect<
      RepaymentClaimModel.Entity,
      DbError | RepaymentClaimNotFound
    >;
    rejectPendingByPurchaseId: (
      purchase_id: number,
    ) => Effect.Effect<RepaymentClaimModel.Entity[], DbError>;
  }
>() {}

export const RepaymentClaimServiceLive = Layer.effect(
  RepaymentClaimService,
  Effect.gen(function* () {
    const repo = yield* RepaymentClaimRepository;

    return {
      findAll: () => repo.findAll(),

      findById: (id) =>
        Effect.gen(function* () {
          const claim = yield* repo.findById(id);
          if (!claim) {
            return yield* Effect.fail(new RepaymentClaimNotFound({ id }));
          }
          return claim;
        }),

      create: (payload) =>
        Effect.gen(function* () {
          return yield* repo.create(payload);
        }),

      confirmClaim: (id) =>
        Effect.gen(function* () {
          const claim = yield* repo.findById(id);
          if (!claim) {
            return yield* Effect.fail(new RepaymentClaimNotFound({ id }));
          }
          if (claim.status !== RepaymentClaimStatus.PENDING) {
            return yield* Effect.fail(
              new RepaymentClaimInvalidStatus({
                id,
                current_status: claim.status,
                expected_status: RepaymentClaimStatus.PENDING,
              }),
            );
          }
          return yield* repo.update(id, {
            status: RepaymentClaimStatus.CONFIRMED,
          });
        }),

      rejectClaim: (id) =>
        Effect.gen(function* () {
          const claim = yield* repo.findById(id);
          if (!claim) {
            return yield* Effect.fail(new RepaymentClaimNotFound({ id }));
          }
          if (claim.status !== RepaymentClaimStatus.PENDING) {
            return yield* Effect.fail(
              new RepaymentClaimInvalidStatus({
                id,
                current_status: claim.status,
                expected_status: RepaymentClaimStatus.PENDING,
              }),
            );
          }
          return yield* repo.update(id, {
            status: RepaymentClaimStatus.REJECTED,
          });
        }),

      delete: (id) =>
        Effect.gen(function* () {
          const claim = yield* repo.findById(id);
          if (!claim) {
            return yield* Effect.fail(new RepaymentClaimNotFound({ id }));
          }
          return yield* repo.delete(id);
        }),

      rejectPendingByPurchaseId: (purchase_id) =>
        Effect.gen(function* () {
          return yield* repo.rejectPendingByPurchaseId(purchase_id);
        }),
    };
  }),
).pipe(Layer.provide(RepaymentClaimRepositoryLive));
