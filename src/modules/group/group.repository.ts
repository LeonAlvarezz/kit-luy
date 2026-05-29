import { Context, Effect, Layer } from "effect";
import { GroupModel } from "./group.model";
import { DbError } from "@/core/error";
import { DrizzleService } from "@/lib/db";
import { groupTable, memberTable } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

export class GroupRepository extends Context.Tag("GroupRepository")<
  GroupRepository,
  {
    findAll: () => Effect.Effect<GroupModel.Entity[], DbError>;
    create: (
      payload: GroupModel.Create,
    ) => Effect.Effect<GroupModel.Entity, DbError>;
    findByTelegramChatId: (
      tgChatId: string,
    ) => Effect.Effect<GroupModel.Entity | undefined, DbError>;
    upsertByTelegramChatId: (
      payload: GroupModel.Create,
    ) => Effect.Effect<GroupModel.Entity, DbError>;
    updateTelegramChatIdById: (
      id: number,
      newChatId: string,
    ) => Effect.Effect<GroupModel.Entity | undefined, DbError>;
    replaceTelegramChatId: (payload: {
      oldGroupId: number;
      duplicateGroupId: number;
      newChatId: string;
    }) => Effect.Effect<GroupModel.Entity | undefined, DbError>;
    delete: (id: number) => Effect.Effect<GroupModel.Entity, DbError>;
  }
>() {}

export const GroupRepositoryLive = Layer.effect(
  GroupRepository,
  Effect.gen(function* () {
    const db = yield* DrizzleService;
    return {
      findAll: () =>
        Effect.tryPromise({
          try: () => db.query.groupTable.findMany(),
          catch: (error) => new DbError({ error }),
        }),
      create: (payload) =>
        Effect.gen(function* () {
          const [result] = yield* Effect.tryPromise({
            try: () => db.insert(groupTable).values(payload).returning(),
            catch: (error) => new DbError({ error }),
          });
          return result;
        }),
      findByTelegramChatId: (tgChatId) =>
        Effect.tryPromise({
          try: () =>
            db.query.groupTable.findFirst({
              where: eq(groupTable.tg_chat_id, tgChatId),
            }),
          catch: (error) => new DbError({ error }),
        }),
      upsertByTelegramChatId: (payload) =>
        Effect.gen(function* () {
          const [result] = yield* Effect.tryPromise({
            try: () =>
              db
                .insert(groupTable)
                .values(payload)
                .onConflictDoUpdate({
                  target: groupTable.tg_chat_id,
                  set: {
                    title: payload.title,
                    currency: payload.currency,
                    updated_at: sql`CURRENT_TIMESTAMP`,
                  },
                })
                .returning(),
            catch: (error) => new DbError({ error }),
          });
          return result;
        }),
      updateTelegramChatIdById: (id, newChatId) =>
        Effect.gen(function* () {
          const [result] = yield* Effect.tryPromise({
            try: () =>
              db
                .update(groupTable)
                .set({
                  tg_chat_id: newChatId,
                  updated_at: sql`CURRENT_TIMESTAMP`,
                })
                .where(eq(groupTable.id, id))
                .returning(),
            catch: (error) => new DbError({ error }),
          });
          return result;
        }),
      replaceTelegramChatId: ({ oldGroupId, duplicateGroupId, newChatId }) =>
        Effect.tryPromise({
          try: async () => {
            const [, , [result]] = await db.batch([
              db
                .delete(memberTable)
                .where(eq(memberTable.group_id, duplicateGroupId)),
              db.delete(groupTable).where(eq(groupTable.id, duplicateGroupId)),
              db
                .update(groupTable)
                .set({
                  tg_chat_id: newChatId,
                  updated_at: sql`CURRENT_TIMESTAMP`,
                })
                .where(eq(groupTable.id, oldGroupId))
                .returning(),
            ]);

            return result;
          },
          catch: (error) => new DbError({ error }),
        }),
      delete: (id) =>
        Effect.gen(function* () {
          const [result] = yield* Effect.tryPromise({
            try: () =>
              db.delete(groupTable).where(eq(groupTable.id, id)).returning(),
            catch: (error) => new DbError({ error }),
          });
          return result;
        }),
    };
  }),
);
