import { eq } from "drizzle-orm";
import { Context, Effect, Layer, Schema } from "effect";

import { DrizzleService } from "@/lib/db";
import { usersTable } from "@/lib/db/schema";
import { DbError } from "@/core/error";
import { UserModel } from "./user.model";
import { UserNotFound } from "./user.error";

export class UserRepository extends Context.Tag("UserRepository")<
  UserRepository,
  {
    findById: (
      id: number,
    ) => Effect.Effect<UserModel.Entity, UserNotFound | DbError>;
    findAll: () => Effect.Effect<UserModel.Entity[], DbError>;
    findByEmail: (
      email: string,
    ) => Effect.Effect<UserModel.Entity | undefined, DbError>;
    create: (
      user: UserModel.Create,
    ) => Effect.Effect<UserModel.Entity, DbError>;

    update: (
      id: number,
      user: UserModel.Update,
    ) => Effect.Effect<UserModel.Entity, DbError>;
  }
>() {}

export const UserRepositoryLive = Layer.effect(
  UserRepository,
  Effect.gen(function* () {
    const db = yield* DrizzleService;

    return {
      findById: (id) =>
        Effect.gen(function* () {
          const result = yield* Effect.tryPromise({
            try: () =>
              db.query.usersTable.findFirst({
                where: eq(usersTable.id, id),
              }),
            catch: (error) => new DbError({ error }),
          });

          if (!result) return yield* new UserNotFound({ id });

          return result;
        }),

      findAll: () =>
        Effect.gen(function* () {
          return yield* Effect.tryPromise({
            try: () => db.query.usersTable.findMany(),
            catch: (error) => new DbError({ error }),
          });
        }),
      findByEmail: (email) =>
        Effect.tryPromise({
          try: () =>
            db.query.usersTable.findFirst({
              where: eq(usersTable.email, email),
            }),
          catch: (error) => new DbError({ error }),
        }),
      create: (user) =>
        Effect.gen(function* () {
          const [created] = yield* Effect.tryPromise({
            try: () => db.insert(usersTable).values(user).returning(),
            catch: (error) => new DbError({ error }),
          });

          return created;
        }),

      update: (id, user) =>
        Effect.gen(function* () {
          const [created] = yield* Effect.tryPromise({
            try: () =>
              db
                .update(usersTable)
                .set(user)
                .where(eq(usersTable.id, id))
                .returning(),
            catch: (error) => new DbError({ error }),
          });

          return created;
        }),
    };
  }),
);
