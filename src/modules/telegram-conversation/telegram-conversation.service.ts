import { DbError } from "@/core/error";
import { Context, Effect, Layer } from "effect";

import {
  BuyConversationStep,
  type BuyConversationPayload,
  TelegramConversationFlow,
  TelegramConversationModel,
  TelegramConversationStatus,
} from "./telegram-conversation.model";
import {
  TelegramConversationRepository,
  TelegramConversationRepositoryLive,
} from "./telegram-conversation.repository";

const SESSION_TTL_MS = 30 * 60 * 1000;

export class TelegramConversationService extends Context.Tag(
  "TelegramConversationService",
)<
  TelegramConversationService,
  {
    startBuySession: (payload: {
      readonly group_id: number;
      readonly member_id: number;
    }) => Effect.Effect<TelegramConversationModel.Entity, DbError>;
    findActiveSession: (payload: {
      readonly group_id: number;
      readonly member_id: number;
    }) => Effect.Effect<TelegramConversationModel.Entity | undefined, DbError>;
    findSessionById: (
      id: number,
    ) => Effect.Effect<TelegramConversationModel.Entity | undefined, DbError>;
    updateSession: (
      id: number,
      payload: {
        readonly step: BuyConversationStep;
        readonly payload: BuyConversationPayload;
      },
    ) => Effect.Effect<TelegramConversationModel.Entity, DbError>;
    completeSession: (
      id: number,
    ) => Effect.Effect<TelegramConversationModel.Entity, DbError>;
    cancelSession: (
      id: number,
    ) => Effect.Effect<TelegramConversationModel.Entity, DbError>;
    cancelActiveSession: (payload: {
      readonly group_id: number;
      readonly member_id: number;
    }) => Effect.Effect<void, DbError>;
  }
>() {}

export const TelegramConversationServiceLive = Layer.effect(
  TelegramConversationService,
  Effect.gen(function* () {
    const repo = yield* TelegramConversationRepository;

    const expireOldSessions = () => repo.expireBefore(Date.now());
    const nextExpiry = () => Date.now() + SESSION_TTL_MS;

    return {
      startBuySession: ({ group_id, member_id }) =>
        Effect.gen(function* () {
          yield* expireOldSessions();
          const now = Date.now();
          yield* repo.cancelActiveByGroupAndMember(group_id, member_id, now);
          return yield* repo.create({
            group_id,
            member_id,
            flow: TelegramConversationFlow.BUY,
            step: BuyConversationStep.AMOUNT,
            payload_json: JSON.stringify({}),
            status: TelegramConversationStatus.ACTIVE,
            expires_at: now + SESSION_TTL_MS,
            created_at: now,
            updated_at: now,
          });
        }),
      findActiveSession: ({ group_id, member_id }) =>
        Effect.gen(function* () {
          yield* expireOldSessions();
          return yield* repo.findActiveByGroupAndMember(group_id, member_id);
        }),
      findSessionById: (id) =>
        Effect.gen(function* () {
          yield* expireOldSessions();
          return yield* repo.findById(id);
        }),
      updateSession: (id, { step, payload }) =>
        repo.update(id, {
          step,
          payload_json: JSON.stringify(payload),
          expires_at: nextExpiry(),
          updated_at: Date.now(),
        }),
      completeSession: (id) =>
        repo.update(id, {
          status: TelegramConversationStatus.COMPLETED,
          updated_at: Date.now(),
        }),
      cancelSession: (id) =>
        repo.update(id, {
          status: TelegramConversationStatus.CANCELLED,
          updated_at: Date.now(),
        }),
      cancelActiveSession: ({ group_id, member_id }) =>
        repo.cancelActiveByGroupAndMember(group_id, member_id, Date.now()),
    };
  }),
).pipe(Layer.provide(TelegramConversationRepositoryLive));
