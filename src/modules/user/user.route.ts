import {
  HttpApiEndpoint,
  HttpApiError,
  HttpApiGroup,
  HttpApiSchema,
} from "@effect/platform";
import { Schema } from "effect";
import { UserModel } from "./user.model";
import {
  ConflictError,
  ForbiddenError,
  InternalServerError,
  NotFoundError,
} from "@/core/error";

export const UsersGroup = HttpApiGroup.make("users")
  .add(
    HttpApiEndpoint.get("findAllUsers", "/")
      .addSuccess(Schema.Array(UserModel.EntitySchema))
      .addError(InternalServerError, { status: 500 }),
  )
  .add(
    HttpApiEndpoint.get("getUser", "/:id")
      .setPath(
        Schema.Struct({
          id: HttpApiSchema.param("id", UserModel.UserIdSchema),
        }),
      )
      .addSuccess(UserModel.EntitySchema)
      .addError(NotFoundError, { status: 404 })
      .addError(InternalServerError, { status: 500 }),
  )
  .add(
    HttpApiEndpoint.post("createUser", "/")
      .setPayload(UserModel.CreateSchema)
      .addSuccess(UserModel.EntitySchema, { status: 200 })
      .addError(HttpApiError.HttpApiDecodeError)
      .addError(ConflictError, { status: 409 })
      .addError(InternalServerError),
  )
  .add(
    HttpApiEndpoint.put("updateUser", "/:id")
      .setPath(
        Schema.Struct({
          id: HttpApiSchema.param("id", UserModel.UserIdSchema),
        }),
      )
      .setPayload(UserModel.UpdateSchema)
      .addSuccess(UserModel.EntitySchema, { status: 200 })
      .addError(HttpApiError.HttpApiDecodeError)
      .addError(NotFoundError, { status: 409 })
      .addError(InternalServerError)
      .addError(ForbiddenError),
  )
  .prefix("/users");
