import { Schema } from "effect";

export enum RepaymentClaimStatus {
  PENDING = "pending",
  CONFIRMED = "confirmed",
  REJECTED = "rejected",
}

export namespace RepaymentClaimModel {
  export const EntitySchema = Schema.Struct({
    id: Schema.Number,
    group_id: Schema.Number,
    sender_member_id: Schema.Number,
    receiver_member_id: Schema.Number,
    amount_cents: Schema.Number,
    status: Schema.Enums(RepaymentClaimStatus),
    tg_message_id: Schema.NullOr(Schema.Number),
    created_at: Schema.String,
    resolved_at: Schema.NullOr(Schema.String),
  });

  export const CreateSchema = EntitySchema.pipe(
    Schema.pick(
      "group_id",
      "sender_member_id",
      "receiver_member_id",
      "amount_cents",
      "status",
      "tg_message_id",
    ),
  );

  export const UpdateSchema = Schema.partial(
    EntitySchema.pipe(Schema.pick("status", "tg_message_id", "resolved_at")),
  );

  export type Entity = Schema.Schema.Type<typeof EntitySchema>;
  export type Create = Schema.Schema.Type<typeof CreateSchema>;
  export type Update = Schema.Schema.Type<typeof UpdateSchema>;
}
