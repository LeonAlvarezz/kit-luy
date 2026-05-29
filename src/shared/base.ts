import { Schema } from "effect";

export namespace BaseModel {
  export const EntitySchema = Schema.Struct({
    id: Schema.Number,
    created_at: Schema.String,
    updated_at: Schema.NullOr(Schema.String),
  });

  export type Entity = Schema.Schema.Type<typeof EntitySchema>;
}
