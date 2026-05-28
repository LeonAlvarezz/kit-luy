import { Context, Effect, Layer } from "effect";
import { UserRepository, UserRepositoryLive } from "./user.repository";
import { UserModel } from "./user.model";
import { DbError } from "@/core/error";
import {
  UserNotFound,
  UserAlreadyExists,
  CannotChangeEmail,
} from "./user.error";

export class UserService extends Context.Tag("UserService")<
  UserService,
  {
    getUser: (
      id: number,
    ) => Effect.Effect<UserModel.Entity, UserNotFound | DbError>;
    createUser: (
      user: UserModel.Create,
    ) => Effect.Effect<UserModel.Entity, UserAlreadyExists | DbError>;

    findAllUser: () => Effect.Effect<UserModel.Entity[], DbError>;
    updateUser: (
      id: number,
      user: UserModel.Update,
    ) => Effect.Effect<
      UserModel.Entity,
      UserNotFound | CannotChangeEmail | DbError
    >;
  }
>() {}

export const UserServiceLive = Layer.effect(
  UserService,
  Effect.gen(function* () {
    const repo = yield* UserRepository;
    return {
      getUser: (id) =>
        Effect.gen(function* () {
          const user = yield* repo.findById(id);

          if (!user) {
            return yield* new UserNotFound({ id, message: "User Not Found" });
          }

          return user;
        }),
      createUser: (user) =>
        Effect.gen(function* () {
          const existing = yield* repo.findByEmail(user.email);

          if (existing) {
            return yield* new UserAlreadyExists({ email: user.email });
          }

          return yield* repo.create(user);
        }),

      updateUser: (id, data) =>
        Effect.gen(function* () {
          if (data.email)
            return yield* new CannotChangeEmail({ email: data.email });

          const user = yield* repo.findById(id);
          if (!user) {
            return yield* new UserNotFound({
              id,
              message: "User Not Found",
            });
          }
          return yield* repo.update(id, data);
        }),
      findAllUser: () =>
        Effect.gen(function* () {
          return yield* repo.findAll();
        }),
    };
  }),
).pipe(Layer.provide(UserRepositoryLive));
