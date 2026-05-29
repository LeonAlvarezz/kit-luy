import { Data, Schema } from "effect";

export const ErrorCode = {
  InternalServer: "INTERNAL_SERVER_ERROR",
  Forbidden: "FORBIDDEN",
  NotFound: "NOT_FOUND",
  Conflict: "CONFLICT",
  DbError: "DB_ERROR",
  BadRequest: "BAD_REQUEST",
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

export class DbError extends Data.TaggedError("DbError")<{
  error: unknown;
}> {}

export class InternalServerError extends Schema.TaggedError<InternalServerError>()(
  "InternalServerError",
  {
    message: Schema.String,
    code: Schema.optional(Schema.Enums(ErrorCode)),
  },
) {
  constructor(props: { message?: string; code?: ErrorCode }) {
    super({
      message: props.message ?? "Something went wrong...",
      code: props.code ? props.code : ErrorCode.InternalServer,
    });
  }
}

export class ForbiddenError extends Schema.TaggedError<ForbiddenError>()(
  "ForbiddenError",
  {
    message: Schema.String,
    code: Schema.optional(Schema.Enums(ErrorCode)),
  },
) {
  constructor(props: { message?: string; code?: ErrorCode }) {
    super({
      message: props.message ?? "Forbidden",
      code: props.code ? props.code : ErrorCode.Forbidden,
    });
  }
}

export class NotFoundError extends Schema.TaggedError<NotFoundError>()(
  "NotFoundError",
  {
    message: Schema.String,
    code: Schema.optional(Schema.Enums(ErrorCode)),
  },
) {
  constructor(props: { message?: string; code?: ErrorCode }) {
    super({
      message: props.message ?? "Not Found",
      code: props.code ? props.code : ErrorCode.NotFound,
    });
  }
}

export class ConflictError extends Schema.TaggedError<ConflictError>()(
  "ConflictError",
  {
    message: Schema.String,
    code: Schema.optional(Schema.Enums(ErrorCode)),
  },
) {
  constructor(props: { message?: string; code?: ErrorCode }) {
    super({
      message: props.message ?? "Conflict",
      code: props.code ? props.code : ErrorCode.Conflict,
    });
  }
}

export class BadRequestError extends Schema.TaggedError<BadRequestError>()(
  "BadRequestError",
  {
    message: Schema.String,
    code: Schema.optional(Schema.Enums(ErrorCode)),
  },
) {
  constructor(props: { message?: string; code?: ErrorCode }) {
    super({
      message: props.message ?? "Bad Request",
      code: props.code ? props.code : ErrorCode.BadRequest,
    });
  }
}
