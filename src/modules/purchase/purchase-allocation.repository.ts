import { DbError } from "@/core/error";
import { DrizzleService } from "@/lib/db";
import { purchaseAllocationTable } from "@/lib/db/schema";
import { Context, Effect, Layer } from "effect";
import { eq, sql } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import { PurchaseAllocationModel } from "./purchase-allocation.model";

export class PurchaseAllocationRepository extends Context.Tag(
  "PurchaseAllocationRepository",
)<
  PurchaseAllocationRepository,
  {
    findAll: () => Effect.Effect<PurchaseAllocationModel.Entity[], DbError>;
    findById: (
      id: number,
    ) => Effect.Effect<PurchaseAllocationModel.Entity | undefined, DbError>;
    create: (
      payload: PurchaseAllocationModel.Create,
    ) => Effect.Effect<PurchaseAllocationModel.Entity, DbError>;

    update: (
      id: number,
      payload: PurchaseAllocationModel.Update,
    ) => Effect.Effect<PurchaseAllocationModel.Entity, DbError>;
  }
>() {}

export const PurchaseAllocationRepositoryLive = Layer.effect(
  PurchaseAllocationRepository,
  Effect.gen(function* () {
    const db = yield* DrizzleService;

    return {
      findAll: () =>
        Effect.tryPromise({
          try: () => db.query.purchaseAllocationTable.findMany(),
          catch: (error) => new DbError({ error }),
        }),
      findById: (id) =>
        Effect.tryPromise({
          try: () =>
            db.query.purchaseAllocationTable.findFirst({
              where: eq(purchaseAllocationTable.id, id),
            }),
          catch: (error) => new DbError({ error }),
        }),
      create: (payload) =>
        Effect.gen(function* () {
          const [result] = yield* Effect.tryPromise({
            try: () =>
              db.insert(purchaseAllocationTable).values(payload).returning(),
            catch: (error) => new DbError({ error }),
          });

          return result;
        }),
      update: (id, payload) =>
        Effect.gen(function* () {
          const [result] = yield* Effect.tryPromise({
            try: () =>
              db
                .update(purchaseAllocationTable)
                .set(payload)
                .where(eq(purchaseAllocationTable.id, id))
                .returning(),
            catch: (error) => new DbError({ error }),
          });

          return result;
        }),
    };
  }),
);
