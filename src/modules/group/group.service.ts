import { DbError } from "@/core/error";
import { Context, Effect, Layer } from "effect";
import { GROUP_LANG_ENUM, GroupModel } from "./group.model";
import { GroupRepository, GroupRepositoryLive } from "./group.repository";

export class GroupService extends Context.Tag("GroupService")<
  GroupService,
  {
    findAllGroups: () => Effect.Effect<GroupModel.Entity[], DbError>;
    findById: (
      id: number,
    ) => Effect.Effect<GroupModel.Entity | undefined, DbError>;
    createGroup: (
      payload: GroupModel.Create,
    ) => Effect.Effect<GroupModel.Entity, DbError>;
    updateTelegramChatId: (
      oldChatId: string,
      newChatId: string,
    ) => Effect.Effect<GroupModel.Entity | undefined, DbError>;
    deleteGroupById: (id: number) => Effect.Effect<GroupModel.Entity, DbError>;
    updateLang: (
      lang: GROUP_LANG_ENUM,
      id: number,
    ) => Effect.Effect<GroupModel.Entity, DbError>;
  }
>() {}

export const GroupServiceLive = Layer.effect(
  GroupService,
  Effect.gen(function* () {
    const repo = yield* GroupRepository;
    return {
      findAllGroups: () =>
        Effect.gen(function* () {
          return yield* repo.findAll();
        }),
      findById: (id) => repo.findById(id),
      createGroup: (payload) =>
        Effect.gen(function* () {
          return yield* repo.create(payload);
        }),

      updateTelegramChatId: (oldChatId, newChatId) =>
        Effect.gen(function* () {
          const oldGroup = yield* repo.findByTelegramChatId(oldChatId);
          const newGroup = yield* repo.findByTelegramChatId(newChatId);

          if (!oldGroup) {
            return newGroup;
          }

          if (newGroup && newGroup.id !== oldGroup.id) {
            return yield* repo.replaceTelegramChatId({
              oldGroupId: oldGroup.id,
              duplicateGroupId: newGroup.id,
              newChatId,
            });
          }

          return yield* repo.updateTelegramChatIdById(oldGroup.id, newChatId);
        }),
      updateLang: (lang, id) => repo.updateLang(lang, id),
      deleteGroupById: (id) =>
        Effect.gen(function* () {
          return yield* repo.delete(id);
        }),
    };
  }),
).pipe(Layer.provide(GroupRepositoryLive));
