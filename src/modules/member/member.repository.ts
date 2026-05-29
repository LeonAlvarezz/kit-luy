import { Context, Effect, Layer } from "effect";
import { MEMBER_STATUS, MemberModel } from "./member.model";
import { DbError } from "@/core/error";
import { DrizzleService } from "@/lib/db";
import { groupTable, memberTable } from "@/lib/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { TelegramGroupNotFound, TelegramMemberNotFound } from "./member.error";

export class MemberRepository extends Context.Tag("MemberRepository")<
  MemberRepository,
  {
    findAll: () => Effect.Effect<MemberModel.Entity[], DbError>;
    create: (
      payload: MemberModel.Create,
    ) => Effect.Effect<MemberModel.Entity, DbError>;
    upsertByTelegramUser: (
      payload: MemberModel.UpsertTelegramMember,
    ) => Effect.Effect<MemberModel.Entity, DbError>;
    deactivateByTelegramUser: (
      payload: MemberModel.DeactivateTelegramMember,
    ) => Effect.Effect<
      MemberModel.Entity,
      DbError | TelegramGroupNotFound | TelegramMemberNotFound
    >;
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
          const group = yield* Effect.tryPromise({
            try: () =>
              db.query.groupTable.findFirst({
                where: eq(groupTable.tg_chat_id, payload.tg_chat_id),
              }),
            catch: (error) => new DbError({ error }),
          });

          if (!group) {
            return yield* Effect.fail(
              new TelegramGroupNotFound({
                tg_chat_id: payload.tg_chat_id,
              }),
            );
          }

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
                    eq(memberTable.group_id, group.id),
                    eq(memberTable.tg_user_id, payload.tg_user_id),
                  ),
                )
                .returning(),
            catch: (error) => new DbError({ error }),
          });

          if (!result) {
            return yield* Effect.fail(
              new TelegramMemberNotFound({
                tg_chat_id: payload.tg_chat_id,
                tg_user_id: payload.tg_user_id,
              }),
            );
          }

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
