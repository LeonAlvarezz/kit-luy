import { Context, Effect, Layer } from "effect";
import { RepaymentClaimModel } from "./repayment-claim.model";
import { DbError } from "@/core/error";
import { DrizzleService } from "@/lib/db";
import { repaymentClaimTable } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

export class RepaymentClaimRepository extends Context.Tag(
  "RepaymentClaimRepository",
)<
  RepaymentClaimRepository,
  {
    findAll: () => Effect.Effect<RepaymentClaimModel.Entity[], DbError>;
    findById: (
      id: number,
    ) => Effect.Effect<RepaymentClaimModel.Entity | undefined, DbError>;
    create: (
      payload: RepaymentClaimModel.Create,
    ) => Effect.Effect<RepaymentClaimModel.Entity, DbError>;
    update: (
      id: number,
      payload: RepaymentClaimModel.Update,
    ) => Effect.Effect<RepaymentClaimModel.Entity, DbError>;
    delete: (id: number) => Effect.Effect<RepaymentClaimModel.Entity, DbError>;
  }
>() {}

export const RepaymentClaimRepositoryLive = Layer.effect(
  RepaymentClaimRepository,
  Effect.gen(function* () {
    const db = yield* DrizzleService;
    return {
      findAll: () =>
        Effect.tryPromise({
          try: () => db.query.repaymentClaimTable.findMany(),
          catch: (error) => new DbError({ error }),
        }),

      findById: (id) =>
        Effect.tryPromise({
          try: () =>
            db.query.repaymentClaimTable.findFirst({
              where: eq(repaymentClaimTable.id, id),
            }),
          catch: (error) => new DbError({ error }),
        }),

      create: (payload) =>
        Effect.gen(function* () {
          const [result] = yield* Effect.tryPromise({
            try: () =>
              db.insert(repaymentClaimTable).values(payload).returning(),
            catch: (error) => new DbError({ error }),
          });
          return result;
        }),

      update: (id, payload) =>
        Effect.gen(function* () {
          const [result] = yield* Effect.tryPromise({
            try: () =>
              db
                .update(repaymentClaimTable)
                .set({ ...payload, resolved_at: sql`CURRENT_TIMESTAMP` })
                .where(eq(repaymentClaimTable.id, id))
                .returning(),
            catch: (error) => new DbError({ error }),
          });
          return result;
        }),

      delete: (id) =>
        Effect.gen(function* () {
          const [result] = yield* Effect.tryPromise({
            try: () =>
              db
                .delete(repaymentClaimTable)
                .where(eq(repaymentClaimTable.id, id))
                .returning(),
            catch: (error) => new DbError({ error }),
          });
          return result;
        }),
    };
  }),
);
