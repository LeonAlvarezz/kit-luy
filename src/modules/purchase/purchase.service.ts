import { DbError } from "@/core/error";
import { DrizzleService } from "@/lib/db";
import { purchaseAllocationTable, purchaseTable } from "@/lib/db/schema";
import { sql } from "drizzle-orm";
import { Context, Effect, Layer } from "effect";
import { PurchaseModel } from "./purchase.model";
import {
  PurchaseAllocationsRequired,
  PurchaseNotFound,
} from "./purchase.error";
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
    createWithAllocations: (
      payload: PurchaseModel.CreateWithAllocations,
    ) => Effect.Effect<
      PurchaseModel.WithAllocations,
      DbError | PurchaseAllocationsRequired
    >;

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
    const db = yield* DrizzleService;

    return {
      findAll: () =>
        Effect.gen(function* () {
          return yield* repo.findAll();
        }),
      create: (payload) =>
        Effect.gen(function* () {
          return yield* repo.create(payload);
        }),
      createWithAllocations: (payload) =>
        Effect.gen(function* () {
          if (payload.allocations.length <= 0) {
            return yield* Effect.fail(new PurchaseAllocationsRequired());
          }

          return yield* Effect.tryPromise({
            try: async () => {
              const insertPurchase = db
                .insert(purchaseTable)
                .values(payload.purchase)
                .returning();

              const insertAllocations = db
                .insert(purchaseAllocationTable)
                .values(
                  payload.allocations.map((allocation) => ({
                    ...allocation,
                    purchase_id: sql<number>`(select seq from sqlite_sequence where name = 'purchases')`,
                  })),
                )
                .returning();

              const [[purchase], allocations] = await db.batch([
                insertPurchase,
                insertAllocations,
              ]);

              return { purchase, allocations };
            },
            catch: (error) => new DbError({ error }),
          });
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
