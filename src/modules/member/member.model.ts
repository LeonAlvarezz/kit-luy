import { BaseModel } from "@/shared/base";
import { Schema } from "effect";

export enum MEMBER_STATUS {
  ACTIVE = "active",
  INACTIVE = "inactive",
}

export namespace MemberModel {
  export const EntitySchema = BaseModel.EntitySchema.pipe(
    Schema.extend(
      Schema.Struct({
        group_id: Schema.Number,
        tg_user_id: Schema.NullOr(Schema.String),
        display_name: Schema.NullOr(Schema.String),
        alias: Schema.NullOr(Schema.String),
        status: Schema.Enums(MEMBER_STATUS),
        registered_at: Schema.NullOr(Schema.String),
      }),
    ),
  );

  export const CreateSchema = EntitySchema.pipe(
    Schema.pick(
      "group_id",
      "tg_user_id",
      "display_name",
      "alias",
      "status",
      "registered_at",
    ),
  );

  export type Entity = Schema.Schema.Type<typeof EntitySchema>;
  export type Create = Schema.Schema.Type<typeof CreateSchema>;
  export type UpsertTelegramMember = Create & {
    tg_user_id: string;
  };
  export type RegisterTelegramMember = {
    group: {
      tg_chat_id: string;
      title: string;
    };
    member: {
      tg_user_id: string;
      display_name: string | null;
      alias: string | null;
    };
  };
  export type DeactivateTelegramMember = {
    tg_chat_id: string;
    tg_user_id: string;
  };
}
