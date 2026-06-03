import { GROUP_LANG_ENUM, type GroupModel } from "@/modules/group/group.model";
import type { GroupService } from "@/modules/group/group.service";
import { Effect, type Context } from "effect";
import { getLocale } from "./get";

export type FindGroupById = Context.Tag.Service<
  typeof GroupService
>["findById"];

export const getGroupLocale = (
  findGroupById: FindGroupById | undefined,
  groupId: number,
): Effect.Effect<ReturnType<typeof getLocale>, never, never> =>
  findGroupById
    ? findGroupById(groupId).pipe(
    Effect.map((group: GroupModel.Entity | undefined) =>
      getLocale(group?.language ?? GROUP_LANG_ENUM.EN),
    ),
    Effect.catchAll(() => Effect.succeed(getLocale(GROUP_LANG_ENUM.EN))),
      )
    : Effect.succeed(getLocale(GROUP_LANG_ENUM.EN));

export const getDefaultLocale = () => getLocale(GROUP_LANG_ENUM.EN);
