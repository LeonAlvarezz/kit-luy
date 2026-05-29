import { Context, Effect, Layer } from "effect";
import { MemberModel } from "./member.model";
import { DbError } from "@/core/error";
import { DrizzleService } from "@/lib/db";
import { memberTable } from "@/lib/db/schema";
export class MemberRepository extends Context.Tag("MemberRepository")<
  MemberRepository,
  {
    findAll: () => Effect.Effect<MemberModel.Entity[], DbError>;
    create: (
      payload: MemberModel.Create,
    ) => Effect.Effect<MemberModel.Entity, DbError>;
  }
>() {}

export const MemberRepositoryLive = Layer.effect(
  MemberRepository,
  Effect.gen(function* () {
    const db = yield* DrizzleService;
    return {
      findAll: () =>
        Effect.tryPromise({
          try: () => db.query.memberTable.findMany(),
          catch: (error) => new DbError({ error }),
        }),
      create: (payload) =>
        Effect.gen(function* () {
          const [result] = yield* Effect.tryPromise({
            try: () => db.insert(memberTable).values(payload).returning(),
            catch: (error) => new DbError({ error }),
          });
          return result;
        }),
    };
  }),
);
