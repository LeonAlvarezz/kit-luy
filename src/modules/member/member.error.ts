import { Schema } from "effect";

export class MemberNotFound extends Schema.TaggedError<MemberNotFound>()(
  "MemberNotFound",
  {
    id: Schema.Number,
    message: Schema.String,
    code: Schema.String,
  },
) {
  constructor(props: { id: number; message?: string }) {
    super({
      id: props.id,
      message: props.message ?? "Member Not Found",
      code: "MEMBER_NOT_FOUND",
    });
  }
}

export class TelegramGroupNotFound extends Schema.TaggedError<TelegramGroupNotFound>()(
  "TelegramGroupNotFound",
  {
    tg_chat_id: Schema.String,
    message: Schema.String,
    code: Schema.String,
  },
) {
  constructor(props: { tg_chat_id: string; message?: string }) {
    super({
      tg_chat_id: props.tg_chat_id,
      message:
        props.message ?? `Telegram group ${props.tg_chat_id} not found`,
      code: "TELEGRAM_GROUP_NOT_FOUND",
    });
  }
}

export class TelegramMemberNotFound extends Schema.TaggedError<TelegramMemberNotFound>()(
  "TelegramMemberNotFound",
  {
    tg_chat_id: Schema.String,
    tg_user_id: Schema.String,
    message: Schema.String,
    code: Schema.String,
  },
) {
  constructor(props: {
    tg_chat_id: string;
    tg_user_id: string;
    message?: string;
  }) {
    super({
      tg_chat_id: props.tg_chat_id,
      tg_user_id: props.tg_user_id,
      message:
        props.message ??
        `Telegram member ${props.tg_user_id} not found in chat ${props.tg_chat_id}`,
      code: "TELEGRAM_MEMBER_NOT_FOUND",
    });
  }
}
