import { InternalServerError } from "@/core/error";
import { AppApi } from "@/http/api";
import { HttpApiBuilder } from "@effect/platform";
import { Effect, Layer } from "effect";
import { GroupService, GroupServiceLive } from "./group.service";

export const GroupControllerLive = HttpApiBuilder.group(
  AppApi,
  "groups",
  (handlers) =>
    handlers
      .handle("findAllGroups", () =>
        Effect.gen(function* () {
          const srv = yield* GroupService;
          return yield* srv.findAllGroups().pipe(
            Effect.catchTags({
              DbError: (error) =>
                Effect.fail(
                  new InternalServerError({
                    message: error.message,
                    code: "DB_ERROR",
                  }),
                ),
            }),
          );
        }),
      )
      .handle("createGroup", ({ payload }) =>
        Effect.gen(function* () {
          const srv = yield* GroupService;
          return yield* srv.createGroup(payload).pipe(
            Effect.catchTags({
              DbError: (error) =>
                Effect.fail(
                  new InternalServerError({
                    message: error.message,
                    code: "DB_ERROR",
                  }),
                ),
            }),
          );
        }),
      )
      .handle("deleteGroupById", ({ path }) =>
        Effect.gen(function* () {
          const srv = yield* GroupService;
          return yield* srv.deleteGroupById(path.id).pipe(
            Effect.catchTags({
              DbError: (error) =>
                Effect.fail(
                  new InternalServerError({
                    message: error.message,
                    code: "DB_ERROR",
                  }),
                ),
            }),
          );
        }),
      ),
);

export const GroupLive = Layer.mergeAll(GroupControllerLive).pipe(
  Layer.provide(GroupServiceLive),
);
