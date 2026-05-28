import { Schema } from "effect";

export class UserNotFound extends Schema.TaggedError<UserNotFound>()(
  "UserNotFound",
  {
    id: Schema.Number,
    message: Schema.String,
    code: Schema.String,
  },
) {
  constructor(props: { id: number; message?: string }) {
    super({
      id: props.id,
      message: props.message ?? "User Not Found",
      code: "USER_NOT_FOUND",
    });
  }
}

export class UserAlreadyExists extends Schema.TaggedError<UserAlreadyExists>()(
  "UserAlreadyExists",
  {
    email: Schema.String,
    message: Schema.String,
    code: Schema.String,
  },
) {
  constructor(props: { email: string; message?: string }) {
    super({
      email: props.email,
      message: props.message ?? "User already exists",
      code: "USER_ALREADY_EXISTS",
    });
  }
}

export class CannotChangeEmail extends Schema.TaggedError<CannotChangeEmail>()(
  "CannotChangeEmail",
  {
    email: Schema.String,
    message: Schema.String,
    code: Schema.String,
  },
) {
  constructor(props: { email: string; message?: string }) {
    super({
      email: props.email,
      message: props.message ?? "Cannot Change Email",
      code: "CANNOT_CHANGE_EMAIL",
    });
  }
}
