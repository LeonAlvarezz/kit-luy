import { AppApi } from "@/http/api";
import { HttpApiBuilder } from "@effect/platform";
import { Effect, Layer } from "effect";
import { MemberService, MemberServiceLive } from "./member.service";
import { InternalServerError } from "@/core/error";

export const MemberControllerLive = HttpApiBuilder.group(
  AppApi,
  "members",
  (handlers) =>
    handlers
      .handle("findAllMembers", () =>
        Effect.gen(function* () {
          const srv = yield* MemberService;
          return yield* srv.findAllMembers().pipe(
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
      .handle("createMember", ({ payload }) =>
        Effect.gen(function* () {
          const srv = yield* MemberService;
          return yield* srv.createMember(payload).pipe(
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

export const MemberLive = Layer.mergeAll(MemberControllerLive).pipe(
  Layer.provide(MemberServiceLive),
);
