import { Context, Effect, Layer } from "effect";
import { MEMBER_STATUS, MemberModel } from "./member.model";
import { DbError } from "@/core/error";
import { DrizzleService } from "@/lib/db";
import { memberTable } from "@/lib/db/schema";
import { and, eq, sql } from "drizzle-orm";

export class MemberRepository extends Context.Tag("MemberRepository")<
  MemberRepository,
  {
    findAll: () => Effect.Effect<MemberModel.Entity[], DbError>;
    findByTgUserId: (
      tg_user_id: string,
    ) => Effect.Effect<MemberModel.Entity | undefined, DbError>;
    findByGroupIdAndTgUserId: (
      group_id: number,
      tg_user_id: string,
    ) => Effect.Effect<MemberModel.Entity | undefined, DbError>;
    findActiveByGroupId: (
      group_id: number,
    ) => Effect.Effect<MemberModel.Entity[], DbError>;
    create: (
      payload: MemberModel.Create,
    ) => Effect.Effect<MemberModel.Entity, DbError>;
    upsertByTelegramUser: (
      payload: MemberModel.UpsertTelegramMember,
    ) => Effect.Effect<MemberModel.Entity, DbError>;
    deactivateByTelegramUser: (
      payload: MemberModel.DeactivateMemberByTelegramUser,
    ) => Effect.Effect<MemberModel.Entity | undefined, DbError>;
    delete: (id: number) => Effect.Effect<MemberModel.Entity, DbError>;
  }
>() {}

export const MemberRepositoryLive = Layer.effect(
  MemberRepository,
  Effect.gen(function* () {
    const db = yield* DrizzleService;
    return {
      findAll: () =>
        Effect.tryPromise({
          try: () => db.query.memberTable.findMany(),
          catch: (error) => new DbError({ error }),
        }),
      create: (payload) =>
        Effect.gen(function* () {
          const [result] = yield* Effect.tryPromise({
            try: () => db.insert(memberTable).values(payload).returning(),
            catch: (error) => new DbError({ error }),
          });
          return result;
        }),
      findByTgUserId: (tg_user_id) =>
        Effect.tryPromise({
          try: () =>
            db.query.memberTable.findFirst({
              where: eq(memberTable.tg_user_id, tg_user_id),
            }),
          catch: (error) => new DbError({ error }),
        }),
      findByGroupIdAndTgUserId: (group_id, tg_user_id) =>
        Effect.tryPromise({
          try: () =>
            db.query.memberTable.findFirst({
              where: and(
                eq(memberTable.group_id, group_id),
                eq(memberTable.tg_user_id, tg_user_id),
              ),
            }),
          catch: (error) => new DbError({ error }),
        }),
      findActiveByGroupId: (group_id) =>
        Effect.tryPromise({
          try: () =>
            db.query.memberTable.findMany({
              where: and(
                eq(memberTable.group_id, group_id),
                eq(memberTable.status, MEMBER_STATUS.ACTIVE),
              ),
            }),
          catch: (error) => new DbError({ error }),
        }),
      upsertByTelegramUser: (payload) =>
        Effect.gen(function* () {
          const [result] = yield* Effect.tryPromise({
            try: () =>
              db
                .insert(memberTable)
                .values(payload)
                .onConflictDoUpdate({
                  target: [memberTable.group_id, memberTable.tg_user_id],
                  set: {
                    display_name: payload.display_name,
                    alias: payload.alias,
                    status: payload.status,
                    registered_at: sql`coalesce(${memberTable.registered_at}, ${payload.registered_at})`,
                    updated_at: sql`CURRENT_TIMESTAMP`,
                  },
                })
                .returning(),
            catch: (error) => new DbError({ error }),
          });
          return result;
        }),

      deactivateByTelegramUser: (payload) =>
        Effect.gen(function* () {
          const [result] = yield* Effect.tryPromise({
            try: () =>
              db
                .update(memberTable)
                .set({
                  status: MEMBER_STATUS.INACTIVE,
                  updated_at: sql`CURRENT_TIMESTAMP`,
                })
                .where(
                  and(
                    eq(memberTable.group_id, payload.group_id),
                    eq(memberTable.tg_user_id, payload.tg_user_id),
                  ),
                )
                .returning(),
            catch: (error) => new DbError({ error }),
          });

          return result;
        }),

      delete: (id: number) =>
        Effect.gen(function* () {
          const [result] = yield* Effect.tryPromise({
            try: () =>
              db.delete(memberTable).where(eq(memberTable.id, id)).returning(),
            catch: (error) => new DbError({ error }),
          });
          return result;
        }),
    };
  }),
);
