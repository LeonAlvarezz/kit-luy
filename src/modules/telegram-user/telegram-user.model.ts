import { BaseModel } from "@/shared/base";
import { Schema } from "effect";

export namespace TelegramUserModel {
  export const EntitySchema = BaseModel.EntitySchema.pipe(
    Schema.extend(
      Schema.Struct({
        tg_user_id: Schema.String,
        username: Schema.NullOr(Schema.String),
        display_name: Schema.NullOr(Schema.String),
        payment_qr_file_id: Schema.NullOr(Schema.String),
        payment_qr_updated_at: Schema.NullOr(Schema.String),
      }),
    ),
  );

  export const CreateSchema = EntitySchema.pipe(
    Schema.pick(
      "tg_user_id",
      "username",
      "display_name",
      "payment_qr_file_id",
      "payment_qr_updated_at",
    ),
  );

  export type Entity = Schema.Schema.Type<typeof EntitySchema>;
  export type Create = Schema.Schema.Type<typeof CreateSchema>;
  export type UpsertTelegramUser = Pick<
    Create,
    "tg_user_id" | "username" | "display_name"
  >;
}
