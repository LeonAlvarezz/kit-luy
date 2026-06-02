import { Context, Effect, Layer } from "effect";
import { PurchaseModel, PurchaseStatus } from "./purchase.model";
import { DbError } from "@/core/error";
import { DrizzleService } from "@/lib/db";
import { purchaseAllocationTable, purchaseTable } from "@/lib/db/schema";
import { and, eq, sql } from "drizzle-orm";

export class PurchaseRepository extends Context.Tag("PurchaseRepository")<
  PurchaseRepository,
  {
    findAll: () => Effect.Effect<PurchaseModel.Entity[], DbError>;
    findById: (
      id: number,
    ) => Effect.Effect<PurchaseModel.Entity | undefined, DbError>;
    findActivePurchaseByGroupId: (
      group_id: number,
    ) => Effect.Effect<PurchaseModel.EntityWithAllocation[], DbError>;
    create: (
      payload: PurchaseModel.Create,
    ) => Effect.Effect<PurchaseModel.Entity, DbError>;
    createWithAllocations: (
      payload: PurchaseModel.CreateWithAllocations,
    ) => Effect.Effect<PurchaseModel.WithAllocations, DbError>;
    update: (
      id: number,
      payload: PurchaseModel.Update,
    ) => Effect.Effect<PurchaseModel.Entity, DbError>;
  }
>() {}

export const PurchaseRepositoryLive = Layer.effect(
  PurchaseRepository,
  Effect.gen(function* () {
    const db = yield* DrizzleService;
    return {
      findAll: () =>
        Effect.tryPromise({
          try: () => db.query.purchaseTable.findMany(),
          catch: (error) => new DbError({ error }),
        }),
      findById: (id) =>
        Effect.tryPromise({
          try: () =>
            db.query.purchaseTable.findFirst({
              where: eq(purchaseTable.id, id),
            }),
          catch: (error) => new DbError({ error }),
        }),
      findActivePurchaseByGroupId: (group_id) =>
        Effect.tryPromise({
          try: () =>
            db.query.purchaseTable.findMany({
              where: and(
                eq(purchaseTable.group_id, group_id),
                eq(purchaseTable.status, PurchaseStatus.ACTIVE),
              ),
              with: {
                allocations: true,
              },
            }),
          catch: (error) => new DbError({ error }),
        }),
      create: (payload) =>
        Effect.gen(function* () {
          const [result] = yield* Effect.tryPromise({
            try: () => db.insert(purchaseTable).values(payload).returning(),
            catch: (error) => new DbError({ error }),
          });
          return result;
        }),
      createWithAllocations: (payload) =>
        Effect.tryPromise({
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
        }),

      update: (id, payload) =>
        Effect.gen(function* () {
          const [result] = yield* Effect.tryPromise({
            try: () =>
              db
                .update(purchaseTable)
                .set(payload)
                .where(eq(purchaseTable.id, id))
                .returning(),
            catch: (error) => new DbError({ error }),
          });
          return result;
        }),
    };
  }),
);
