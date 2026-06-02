import { Schema } from "effect";

export class IncorrectTelegramCommand extends Schema.TaggedError<IncorrectTelegramCommand>()(
  "IncorrectTelegramCommand",
  {
    command: Schema.String,
    message: Schema.String,
    code: Schema.String,
  },
) {
  constructor(props: { command: string; message: string }) {
    super({
      command: props.command,
      message: props.message,
      code: "INCORRECT_TELEGRAM_COMMAND",
    });
  }
}

export class InvalidTelegramMemberPayload extends Schema.TaggedError<InvalidTelegramMemberPayload>()(
  "InvalidTelegramMemberPayload",
  {
    operation: Schema.Literal("register", "deactivate"),
    tg_chat_id: Schema.String,
    tg_user_id: Schema.String,
    message: Schema.String,
    code: Schema.String,
  },
) {
  constructor(props: {
    operation: "register" | "deactivate";
    tg_chat_id: string;
    tg_user_id: string;
    message?: string;
  }) {
    super({
      operation: props.operation,
      tg_chat_id: props.tg_chat_id,
      tg_user_id: props.tg_user_id,
      message:
        props.message ??
        `Could not build Telegram ${props.operation} member payload.`,
      code: "INVALID_TELEGRAM_MEMBER_PAYLOAD",
    });
  }
}

export class TelegramUpdateHandlingFailed extends Schema.TaggedError<TelegramUpdateHandlingFailed>()(
  "TelegramUpdateHandlingFailed",
  {
    message: Schema.String,
    code: Schema.String,
  },
) {
  constructor(props: { message?: string }) {
    super({
      message: props.message ?? "Failed to handle Telegram update.",
      code: "TELEGRAM_UPDATE_HANDLING_FAILED",
    });
  }
}

export class TelegramSetWebhookFailed extends Schema.TaggedError<TelegramSetWebhookFailed>()(
  "TelegramSetWebhookFailed",
  {
    message: Schema.String,
    code: Schema.String,
  },
) {
  constructor(props: { message?: string }) {
    super({
      message: props.message ?? "Failed to set Telegram webhook.",
      code: "TELEGRAM_SET_WEBHOOK_FAILED",
    });
  }
}

export class TelegramReplyFailed extends Schema.TaggedError<TelegramReplyFailed>()(
  "TelegramReplyFailed",
  {
    command: Schema.String,
    message: Schema.String,
    code: Schema.String,
  },
) {
  constructor(props: { command: string; message?: string }) {
    super({
      command: props.command,
      message: props.message ?? "Failed to send Telegram reply.",
      code: "TELEGRAM_REPLY_FAILED",
    });
  }
}
