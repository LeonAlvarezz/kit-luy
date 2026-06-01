import { DbError } from "@/core/error";
import { Context, Effect, Layer } from "effect";
import { PurchaseModel } from "./purchase.model";
import { PurchaseNotFound } from "./purchase.error";
import {
  PurchaseRepositoryLive,
  PurchaseRepository,
} from "./purchase.repository";

export class PurchaseService extends Context.Tag("PurchaseService")<
  PurchaseService,
  {
    findAll: () => Effect.Effect<PurchaseModel.Entity[], DbError>;
    findById: (
      id: number,
    ) => Effect.Effect<PurchaseModel.Entity, DbError | PurchaseNotFound>;
    create: (
      payload: PurchaseModel.Create,
    ) => Effect.Effect<PurchaseModel.Entity, DbError>;

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
    return {
      findAll: () =>
        Effect.gen(function* () {
          return yield* repo.findAll();
        }),
      create: (payload) =>
        Effect.gen(function* () {
          return yield* repo.create(payload);
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
    };
  }),
).pipe(Layer.provide(PurchaseRepositoryLive));
