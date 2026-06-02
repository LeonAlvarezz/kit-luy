import { Context, Effect, Layer } from "effect";
import { PurchaseModel } from "./purchase.model";
import { DbError } from "@/core/error";
import { DrizzleService } from "@/lib/db";
import { purchaseTable } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";

export class PurchaseRepository extends Context.Tag("PurchaseRepository")<
  PurchaseRepository,
  {
    findAll: () => Effect.Effect<PurchaseModel.Entity[], DbError>;
    findById: (
      id: number,
    ) => Effect.Effect<PurchaseModel.Entity | undefined, DbError>;
    create: (
      payload: PurchaseModel.Create,
    ) => Effect.Effect<PurchaseModel.Entity, DbError>;
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
      create: (payload) =>
        Effect.gen(function* () {
          const [result] = yield* Effect.tryPromise({
            try: () => db.insert(purchaseTable).values(payload).returning(),
            catch: (error) => new DbError({ error }),
          });
          return result;
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
