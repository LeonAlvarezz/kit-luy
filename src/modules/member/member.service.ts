import { DbError } from "@/core/error";
import { Context, Effect, Layer } from "effect";
import { MemberModel } from "./member.model";
import { MemberRepository, MemberRepositoryLive } from "./member.repository";

export class MemberService extends Context.Tag("MemberService")<
  MemberService,
  {
    findAllMembers: () => Effect.Effect<MemberModel.Entity[], DbError>;
    createMember: (
      payload: MemberModel.Create,
    ) => Effect.Effect<MemberModel.Entity, DbError>;
  }
>() {}

export const MemberServiceLive = Layer.effect(
  MemberService,
  Effect.gen(function* () {
    const repo = yield* MemberRepository;
    return {
      findAllMembers: () =>
        Effect.gen(function* () {
          return yield* repo.findAll();
        }),
      createMember: (payload) =>
        Effect.gen(function* () {
          return yield* repo.create(payload);
        }),
    };
  }),
).pipe(Layer.provide(MemberRepositoryLive));
