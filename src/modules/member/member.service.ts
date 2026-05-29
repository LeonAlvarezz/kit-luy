import { DbError } from "@/core/error";
import { Context, Effect, Layer } from "effect";
import { CURRENCY } from "@/shared/currency";
import {
  GroupRepository,
  GroupRepositoryLive,
} from "@/modules/group/group.repository";
import { TelegramGroupNotFound, TelegramMemberNotFound } from "./member.error";
import { MEMBER_STATUS, MemberModel } from "./member.model";
import { MemberRepository, MemberRepositoryLive } from "./member.repository";

export class MemberService extends Context.Tag("MemberService")<
  MemberService,
  {
    findAllMembers: () => Effect.Effect<MemberModel.Entity[], DbError>;
    createMember: (
      payload: MemberModel.Create,
    ) => Effect.Effect<MemberModel.Entity, DbError>;
    registerTelegramMember: (
      payload: MemberModel.RegisterTelegramMember,
    ) => Effect.Effect<MemberModel.Entity, DbError>;
    deactivateTelegramMember: (
      payload: MemberModel.DeactivateTelegramMember,
    ) => Effect.Effect<
      MemberModel.Entity,
      DbError | TelegramGroupNotFound | TelegramMemberNotFound
    >;
    deleteMemberById: (
      id: number,
    ) => Effect.Effect<MemberModel.Entity, DbError>;
  }
>() {}

export const MemberServiceLive = Layer.effect(
  MemberService,
  Effect.gen(function* () {
    const repo = yield* MemberRepository;
    const groupRepo = yield* GroupRepository;
    return {
      findAllMembers: () =>
        Effect.gen(function* () {
          return yield* repo.findAll();
        }),
      createMember: (payload) =>
        Effect.gen(function* () {
          return yield* repo.create(payload);
        }),
      registerTelegramMember: (payload) =>
        Effect.gen(function* () {
          const group = yield* groupRepo.upsertByTelegramChatId({
            tg_chat_id: payload.group.tg_chat_id,
            title: payload.group.title,
            currency: CURRENCY.USD,
          });

          return yield* repo.upsertByTelegramUser({
            group_id: group.id,
            tg_user_id: payload.member.tg_user_id,
            display_name: payload.member.display_name,
            alias: payload.member.alias,
            status: MEMBER_STATUS.ACTIVE,
            registered_at: new Date().toISOString(),
          });
        }),
      deactivateTelegramMember: (payload) =>
        Effect.gen(function* () {
          return yield* repo.deactivateByTelegramUser(payload);
        }),

      deleteMemberById: (id) =>
        Effect.gen(function* () {
          return yield* repo.delete(id);
        }),
    };
  }),
).pipe(Layer.provide(MemberRepositoryLive), Layer.provide(GroupRepositoryLive));
