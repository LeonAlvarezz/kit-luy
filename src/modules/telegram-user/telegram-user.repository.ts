import { DbError } from "@/core/error";
import { DrizzleService } from "@/lib/db";
import { telegramUserTable } from "@/lib/db/schema";
import { Context, Effect, Layer } from "effect";
import { eq, sql } from "drizzle-orm";
import { TelegramUserModel } from "./telegram-user.model";

export class TelegramUserRepository extends Context.Tag(
  "TelegramUserRepository",
)<
  TelegramUserRepository,
  {
    findByTgUserId: (
      tg_user_id: string,
    ) => Effect.Effect<TelegramUserModel.Entity | undefined, DbError>;
    upsertByTelegramUser: (
      payload: TelegramUserModel.UpsertTelegramUser,
    ) => Effect.Effect<TelegramUserModel.Entity, DbError>;
    updatePaymentQr: (
      tg_user_id: string,
      payment_qr_file_id: string,
    ) => Effect.Effect<TelegramUserModel.Entity, DbError>;
    findByUsername: (
      username: string,
    ) => Effect.Effect<TelegramUserModel.Entity | undefined, DbError>;
  }
>() {}

export const TelegramUserRepositoryLive = Layer.effect(
  TelegramUserRepository,
  Effect.gen(function* () {
    const db = yield* DrizzleService;

    return {
      findByTgUserId: (tg_user_id) =>
        Effect.tryPromise({
          try: () =>
            db.query.telegramUserTable.findFirst({
              where: eq(telegramUserTable.tg_user_id, tg_user_id),
            }),
          catch: (error) => new DbError({ error }),
        }),
      findByUsername: (username) =>
        Effect.tryPromise({
          try: () =>
            db.query.telegramUserTable.findFirst({
              where: eq(
                sql`lower(${telegramUserTable.username})`,
                username.toLowerCase(),
              ),
            }),
          catch: (error) => new DbError({ error }),
        }),
      upsertByTelegramUser: (payload) =>
        Effect.gen(function* () {
          const [result] = yield* Effect.tryPromise({
            try: () =>
              db
                .insert(telegramUserTable)
                .values({
                  ...payload,
                  payment_qr_file_id: null,
                  payment_qr_updated_at: null,
                })
                .onConflictDoUpdate({
                  target: telegramUserTable.tg_user_id,
                  set: {
                    username: payload.username,
                    display_name: payload.display_name,
                    updated_at: sql`CURRENT_TIMESTAMP`,
                  },
                })
                .returning(),
            catch: (error) => new DbError({ error }),
          });

          return result;
        }),
      updatePaymentQr: (tg_user_id, payment_qr_file_id) =>
        Effect.gen(function* () {
          const [result] = yield* Effect.tryPromise({
            try: () =>
              db
                .update(telegramUserTable)
                .set({
                  payment_qr_file_id,
                  payment_qr_updated_at: sql`CURRENT_TIMESTAMP`,
                  updated_at: sql`CURRENT_TIMESTAMP`,
                })
                .where(eq(telegramUserTable.tg_user_id, tg_user_id))
                .returning(),
            catch: (error) => new DbError({ error }),
          });

          return result;
        }),
    };
  }),
);
