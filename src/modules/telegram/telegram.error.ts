import { Schema } from "effect";

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
