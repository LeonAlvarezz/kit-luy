import { DbError } from "@/core/error";
import { DrizzleService } from "@/lib/db";
import { telegramConversationSessionTable } from "@/lib/db/schema";
import { and, eq, lt } from "drizzle-orm";
import { Context, Effect, Layer } from "effect";

import {
  TelegramConversationModel,
  TelegramConversationStatus,
} from "./telegram-conversation.model";

export class TelegramConversationRepository extends Context.Tag(
  "TelegramConversationRepository",
)<
  TelegramConversationRepository,
  {
    findById: (
      id: number,
    ) => Effect.Effect<TelegramConversationModel.Entity | undefined, DbError>;
    findActiveByGroupAndMember: (
      group_id: number,
      member_id: number,
    ) => Effect.Effect<TelegramConversationModel.Entity | undefined, DbError>;
    create: (
      payload: TelegramConversationModel.Create,
    ) => Effect.Effect<TelegramConversationModel.Entity, DbError>;
    update: (
      id: number,
      payload: TelegramConversationModel.Update,
    ) => Effect.Effect<TelegramConversationModel.Entity, DbError>;
    cancelActiveByGroupAndMember: (
      group_id: number,
      member_id: number,
      updated_at: number,
    ) => Effect.Effect<void, DbError>;
    expireBefore: (now: number) => Effect.Effect<void, DbError>;
  }
>() {}

export const TelegramConversationRepositoryLive = Layer.effect(
  TelegramConversationRepository,
  Effect.gen(function* () {
    const db = yield* DrizzleService;

    return {
      findById: (id) =>
        Effect.tryPromise({
          try: () =>
            db.query.telegramConversationSessionTable.findFirst({
              where: eq(telegramConversationSessionTable.id, id),
            }),
          catch: (error) => new DbError({ error }),
        }),
      findActiveByGroupAndMember: (group_id, member_id) =>
        Effect.tryPromise({
          try: () =>
            db.query.telegramConversationSessionTable.findFirst({
              where: and(
                eq(telegramConversationSessionTable.group_id, group_id),
                eq(telegramConversationSessionTable.member_id, member_id),
                eq(
                  telegramConversationSessionTable.status,
                  TelegramConversationStatus.ACTIVE,
                ),
              ),
            }),
          catch: (error) => new DbError({ error }),
        }),
      create: (payload) =>
        Effect.gen(function* () {
          const [result] = yield* Effect.tryPromise({
            try: () =>
              db
                .insert(telegramConversationSessionTable)
                .values(payload)
                .returning(),
            catch: (error) => new DbError({ error }),
          });
          return result;
        }),
      update: (id, payload) =>
        Effect.gen(function* () {
          const [result] = yield* Effect.tryPromise({
            try: () =>
              db
                .update(telegramConversationSessionTable)
                .set(payload)
                .where(eq(telegramConversationSessionTable.id, id))
                .returning(),
            catch: (error) => new DbError({ error }),
          });
          return result;
        }),
      cancelActiveByGroupAndMember: (group_id, member_id, updated_at) =>
        Effect.tryPromise({
          try: async () => {
            await db
              .update(telegramConversationSessionTable)
              .set({
                status: TelegramConversationStatus.CANCELLED,
                updated_at,
              })
              .where(
                and(
                  eq(telegramConversationSessionTable.group_id, group_id),
                  eq(telegramConversationSessionTable.member_id, member_id),
                  eq(
                    telegramConversationSessionTable.status,
                    TelegramConversationStatus.ACTIVE,
                  ),
                ),
              );
          },
          catch: (error) => new DbError({ error }),
        }),
      expireBefore: (now) =>
        Effect.tryPromise({
          try: async () => {
            await db
              .update(telegramConversationSessionTable)
              .set({
                status: TelegramConversationStatus.EXPIRED,
                updated_at: now,
              })
              .where(
                and(
                  eq(
                    telegramConversationSessionTable.status,
                    TelegramConversationStatus.ACTIVE,
                  ),
                  lt(telegramConversationSessionTable.expires_at, now),
                ),
              );
          },
          catch: (error) => new DbError({ error }),
        }),
    };
  }),
);
