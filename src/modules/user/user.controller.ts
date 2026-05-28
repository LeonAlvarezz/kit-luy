import { HttpApiBuilder } from "@effect/platform";
import { Effect, Layer } from "effect";

import { AppApi } from "@/http/api";
import { UserService, UserServiceLive } from "./user.service";
import {
  ConflictError,
  ErrorCode,
  ForbiddenError,
  InternalServerError,
  NotFoundError,
} from "@/core/error";

export const UserControllerLive = HttpApiBuilder.group(
  AppApi,
  "users",
  (handlers) =>
    handlers
      .handle("findAllUsers", () =>
        Effect.gen(function* () {
          const srv = yield* UserService;
          return yield* srv.findAllUser().pipe(
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
      .handle("getUser", ({ path }) =>
        Effect.gen(function* () {
          const srv = yield* UserService;
          return yield* srv.getUser(path.id).pipe(
            Effect.catchTags({
              UserNotFound: (error) =>
                Effect.fail(
                  new NotFoundError({
                    message: error.message,
                  }),
                ),
              DbError: (error) =>
                Effect.fail(
                  new InternalServerError({
                    message: error.message,
                    code: ErrorCode.DbError,
                  }),
                ),
            }),
          );
        }),
      )
      .handle("createUser", ({ payload }) =>
        Effect.gen(function* () {
          const srv = yield* UserService;

          return yield* srv.createUser(payload).pipe(
            Effect.catchTags({
              UserAlreadyExists: (error) =>
                Effect.fail(
                  new ConflictError({
                    message: error.message,
                  }),
                ),
              DbError: (error) =>
                Effect.fail(
                  new InternalServerError({
                    message: error.message,
                    code: ErrorCode.DbError,
                  }),
                ),
            }),
          );
        }),
      )

      .handle("updateUser", ({ path, payload }) =>
        Effect.gen(function* () {
          const srv = yield* UserService;

          return yield* srv.updateUser(path.id, payload).pipe(
            Effect.catchTags({
              UserNotFound: (error) =>
                Effect.fail(
                  new NotFoundError({
                    message: error.message,
                  }),
                ),
              CannotChangeEmail: (error) =>
                Effect.fail(
                  new ForbiddenError({
                    message: error.message,
                  }),
                ),
              DbError: (error) =>
                Effect.fail(
                  new InternalServerError({
                    message: error.message,
                  }),
                ),
            }),
          );
        }),
      ),
);

export const UserLive = Layer.mergeAll(UserControllerLive).pipe(
  Layer.provide(UserServiceLive),
);
