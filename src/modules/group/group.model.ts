import { BaseModel } from "@/shared/base";
import { Schema } from "effect";
import { CURRENCY } from "@/shared/currency";

export namespace GroupModel {
  export const EntitySchema = BaseModel.EntitySchema.pipe(
    Schema.extend(
      Schema.Struct({
        tg_chat_id: Schema.String,
        title: Schema.String,
        currency: Schema.Enums(CURRENCY),
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
