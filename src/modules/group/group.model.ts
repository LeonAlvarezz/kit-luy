import { BaseModel } from "@/shared/base";
import { Schema } from "effect";
import { CURRENCY } from "@/shared/currency";
export enum GROUP_LANG_ENUM {
  EN = "en",
  KH = "kh",
}
export namespace GroupModel {
  export const EntitySchema = BaseModel.EntitySchema.pipe(
    Schema.extend(
      Schema.Struct({
        tg_chat_id: Schema.String,
        title: Schema.String,
        currency: Schema.Enums(CURRENCY),
        language: Schema.Enums(GROUP_LANG_ENUM),
      }),
    ),
  );

  export const CreateSchema = Schema.Struct({
    tg_chat_id: Schema.NonEmptyString,
    title: Schema.NonEmptyString,
    currency: Schema.Enums(CURRENCY),
  });

  export const UpdateSchema = CreateSchema.pipe(Schema.partial);

  export type Entity = Schema.Schema.Type<typeof EntitySchema>;
  export type Create = Schema.Schema.Type<typeof CreateSchema>;
  export type Update = Schema.Schema.Type<typeof UpdateSchema>;
}
