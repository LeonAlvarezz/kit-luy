import { Context, Effect, Layer } from "effect";
import { RepaymentModel, RepaymentStatus } from "./repayment.model";
import { DbError } from "@/core/error";
import { DrizzleService } from "@/lib/db";
import { repaymentTable } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

export class RepaymentRepository extends Context.Tag("RepaymentRepository")<
  RepaymentRepository,
  {
    findAll: () => Effect.Effect<RepaymentModel.Entity[], DbError>;
    findById: (
      id: number,
    ) => Effect.Effect<RepaymentModel.Entity | undefined, DbError>;
    findActiveByGroupId: (
      group_id: number,
    ) => Effect.Effect<RepaymentModel.Entity[], DbError>;
    create: (
      payload: RepaymentModel.Create,
    ) => Effect.Effect<RepaymentModel.Entity, DbError>;
    update: (
      id: number,
      payload: RepaymentModel.Update,
    ) => Effect.Effect<RepaymentModel.Entity, DbError>;
    delete: (id: number) => Effect.Effect<RepaymentModel.Entity, DbError>;
  }
>() {}

export const RepaymentRepositoryLive = Layer.effect(
  RepaymentRepository,
  Effect.gen(function* () {
    const db = yield* DrizzleService;
    return {
      findAll: () =>
        Effect.tryPromise({
          try: () => db.query.repaymentTable.findMany(),
          catch: (error) => new DbError({ error }),
        }),

      findById: (id) =>
        Effect.tryPromise({
          try: () =>
            db.query.repaymentTable.findFirst({
              where: eq(repaymentTable.id, id),
            }),
          catch: (error) => new DbError({ error }),
        }),
      findActiveByGroupId: (group_id) =>
        Effect.tryPromise({
          try: () =>
            db.query.repaymentTable.findMany({
              where: and(
                eq(repaymentTable.group_id, group_id),
                eq(repaymentTable.status, RepaymentStatus.ACTIVE),
              ),
            }),
          catch: (error) => new DbError({ error }),
        }),

      create: (payload) =>
        Effect.gen(function* () {
          const [result] = yield* Effect.tryPromise({
            try: () => db.insert(repaymentTable).values(payload).returning(),
            catch: (error) => new DbError({ error }),
          });
          return result;
        }),

      update: (id, payload) =>
        Effect.gen(function* () {
          const [result] = yield* Effect.tryPromise({
            try: () =>
              db
                .update(repaymentTable)
                .set(payload)
                .where(eq(repaymentTable.id, id))
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
                .delete(repaymentTable)
                .where(eq(repaymentTable.id, id))
                .returning(),
            catch: (error) => new DbError({ error }),
          });
          return result;
        }),
    };
  }),
);
