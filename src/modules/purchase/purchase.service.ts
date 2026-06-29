import { DbError } from "@/core/error";
import { Context, Effect, Layer } from "effect";
import { PurchaseModel } from "./purchase.model";
import type { RepaymentModel } from "../repayment/repayment.model";
import {
  PurchaseAllocationsRequired,
  PurchaseNotFound,
} from "./purchase.error";
import {
  PurchaseRepositoryLive,
  PurchaseRepository,
} from "./purchase.repository";
import {
  RepaymentRepository,
  RepaymentRepositoryLive,
} from "../repayment/repayment.repository";

export class PurchaseService extends Context.Tag("PurchaseService")<
  PurchaseService,
  {
    findAll: () => Effect.Effect<PurchaseModel.Entity[], DbError>;
    findAllByGroupId: (
      id: number,
    ) => Effect.Effect<PurchaseModel.Entity[], DbError | PurchaseNotFound>;
    findById: (
      id: number,
    ) => Effect.Effect<PurchaseModel.Entity, DbError | PurchaseNotFound>;
    create: (
      payload: PurchaseModel.Create,
    ) => Effect.Effect<PurchaseModel.Entity, DbError>;
    createWithAllocations: (
      payload: PurchaseModel.CreateWithAllocations,
    ) => Effect.Effect<
      PurchaseModel.WithAllocations,
      DbError | PurchaseAllocationsRequired
    >;
    findSettlementBalancesByGroupId: (
      group_id: number,
    ) => Effect.Effect<PurchaseModel.SettlementBalance[], DbError>;

    update: (
      id: number,
      payload: PurchaseModel.Update,
    ) => Effect.Effect<PurchaseModel.Entity, DbError | PurchaseNotFound>;
  }
>() {}

export const PurchaseServiceLive = Layer.effect(
  PurchaseService,
  Effect.gen(function* () {
    const repo = yield* PurchaseRepository;
    const repaymentRepo = yield* RepaymentRepository;

    return {
      findAll: () =>
        Effect.gen(function* () {
          return yield* repo.findAll();
        }),

      findSettlementBalancesByGroupId: (group_id) =>
        Effect.gen(function* () {
          const [purchases, repayments] = yield* Effect.all([
            repo.findActivePurchaseByGroupId(group_id),
            repaymentRepo.findActiveByGroupId(group_id),
          ]);
          return calculateSettlementBalances({ purchases, repayments });
        }),
      update: (id, payload) =>
        Effect.gen(function* () {
          const purchase = yield* repo.findById(id);
          if (!purchase) {
            return yield* Effect.fail(
              new PurchaseNotFound({ purchase_id: id }),
            );
          }
          return yield* repo.update(purchase.id, payload);
        }),
      findById: (id) =>
        Effect.gen(function* () {
          const result = yield* repo.findById(id);
          if (!result) {
            return yield* Effect.fail(
              new PurchaseNotFound({ purchase_id: id }),
            );
          }
          return result;
        }),
      findAllByGroupId: (group_id) => repo.findAllByGroupId(group_id),
      create: (payload) =>
        Effect.gen(function* () {
          return yield* repo.create(payload);
        }),
      createWithAllocations: (payload) =>
        Effect.gen(function* () {
          if (payload.allocations.length <= 0) {
            return yield* Effect.fail(new PurchaseAllocationsRequired());
          }

          return yield* repo.createWithAllocations(payload);
        }),
    };
  }),
).pipe(
  Layer.provide(PurchaseRepositoryLive),
  Layer.provide(RepaymentRepositoryLive),
);

export const calculateSettlementBalances = ({
  purchases,
  repayments,
}: {
  readonly purchases: readonly PurchaseModel.EntityWithAllocation[];
  readonly repayments: readonly RepaymentModel.Entity[];
}): PurchaseModel.SettlementBalance[] => {
  const balancesByMember = new Map<number, number>();

  for (const purchase of purchases) {
    for (const allocation of purchase.allocations) {
      balancesByMember.set(
        purchase.payer_member_id,
        (balancesByMember.get(purchase.payer_member_id) ?? 0) +
          allocation.amount,
      );
      balancesByMember.set(
        allocation.responsible_member_id,
        (balancesByMember.get(allocation.responsible_member_id) ?? 0) -
          allocation.amount,
      );
    }
  }

  for (const repayment of repayments) {
    const senderBalance = balancesByMember.get(repayment.sender_member_id) ?? 0;
    const receiverBalance =
      balancesByMember.get(repayment.receiver_member_id) ?? 0;
    const amount = Math.min(
      repayment.amount_cents,
      Math.max(0, -senderBalance),
      Math.max(0, receiverBalance),
    );

    if (amount <= 0) {
      continue;
    }

    balancesByMember.set(repayment.sender_member_id, senderBalance + amount);
    balancesByMember.set(
      repayment.receiver_member_id,
      receiverBalance - amount,
    );
  }

  return [...balancesByMember.entries()]
    .filter(([, balance]) => balance !== 0)
    .map(([member_id, balance]) => ({ member_id, balance }));
};
