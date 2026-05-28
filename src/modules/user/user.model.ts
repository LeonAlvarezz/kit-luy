import { Schema } from "effect";

export namespace UserModel {
  export const EmailSchema = Schema.String.pipe(
    Schema.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/),
  );

  export const EntitySchema = Schema.Struct({
    id: Schema.Number,
    name: Schema.String,
    age: Schema.Number,
    email: EmailSchema,
  });

  export const CreateSchema = Schema.Struct({
    name: Schema.NonEmptyTrimmedString,
    age: Schema.Number.pipe(Schema.int(), Schema.positive()),
    email: EmailSchema,
  });

  export const UpdateSchema = Schema.partial(CreateSchema);

  export const UserIdSchema = Schema.NumberFromString.pipe(
    Schema.int(),
    Schema.positive(),
  );
  export type Entity = Schema.Schema.Type<typeof EntitySchema>;
  export type Create = Schema.Schema.Type<typeof CreateSchema>;
  export type Update = Schema.Schema.Type<typeof UpdateSchema>;
}
