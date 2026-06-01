import { DbError } from "@/core/error";
import { Context, Effect, Layer } from "effect";
import { PurchaseAllocationModel } from "./purchase-allocation.model";
import {
  PurchaseAllocationRepository,
  PurchaseAllocationRepositoryLive,
} from "./purchase-allocation.repository";
import { PurchaseAllocationNotFound } from "./purchase.error";

export class PurchaseAllocationService extends Context.Tag(
  "PurchaseAllocationService",
)<
  PurchaseAllocationService,
  {
    findAll: () => Effect.Effect<PurchaseAllocationModel.Entity[], DbError>;
    findById: (
      id: number,
    ) => Effect.Effect<
      PurchaseAllocationModel.Entity,
      DbError | PurchaseAllocationNotFound
    >;
    create: (
      payload: PurchaseAllocationModel.Create,
    ) => Effect.Effect<PurchaseAllocationModel.Entity, DbError>;
    update: (
      id: number,
      payload: PurchaseAllocationModel.Update,
    ) => Effect.Effect<
      PurchaseAllocationModel.Entity,
      DbError | PurchaseAllocationNotFound
    >;
  }
>() {}

export const PurchaseAllocationServiceLive = Layer.effect(
  PurchaseAllocationService,
  Effect.gen(function* () {
    const repo = yield* PurchaseAllocationRepository;

    return {
      findAll: () =>
        Effect.gen(function* () {
          return yield* repo.findAll();
        }),
      findById: (id) =>
        Effect.gen(function* () {
          const allocation = yield* repo.findById(id);

          if (!allocation) {
            return yield* Effect.fail(
              new PurchaseAllocationNotFound({
                purchase_allocation_id: id,
              }),
            );
          }

          return allocation;
        }),
      create: (payload) =>
        Effect.gen(function* () {
          return yield* repo.create(payload);
        }),
      update: (id, payload) =>
        Effect.gen(function* () {
          const allocation = yield* repo.findById(id);

          if (!allocation) {
            return yield* Effect.fail(
              new PurchaseAllocationNotFound({
                purchase_allocation_id: id,
              }),
            );
          }

          return yield* repo.update(allocation.id, payload);
        }),
    };
  }),
).pipe(Layer.provide(PurchaseAllocationRepositoryLive));
