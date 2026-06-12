import { DbError } from "@/core/error";
import { Context, Effect, Layer } from "effect";
import { TelegramUserModel } from "./telegram-user.model";
import {
  TelegramUserRepository,
  TelegramUserRepositoryLive,
} from "./telegram-user.repository";

export class TelegramUserService extends Context.Tag("TelegramUserService")<
  TelegramUserService,
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

export const TelegramUserServiceLive = Layer.effect(
  TelegramUserService,
  Effect.gen(function* () {
    const repo = yield* TelegramUserRepository;

    return {
      findByTgUserId: (tg_user_id) => repo.findByTgUserId(tg_user_id),
      upsertByTelegramUser: (payload) => repo.upsertByTelegramUser(payload),
      updatePaymentQr: (tg_user_id, payment_qr_file_id) =>
        repo.updatePaymentQr(tg_user_id, payment_qr_file_id),
      findByUsername: (username) => repo.findByUsername(username),
    };
  }),
).pipe(Layer.provide(TelegramUserRepositoryLive));
