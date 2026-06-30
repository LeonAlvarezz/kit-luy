import { Schema } from "effect";

export enum RepaymentStatus {
  ACTIVE = "active",
  CORRECTED = "corrected",
  VOIDED = "voided",
}

export namespace RepaymentModel {
  export const EntitySchema = Schema.Struct({
    id: Schema.Number,
    group_id: Schema.Number,
    purchase_id: Schema.NullOr(Schema.Number),
    repayment_claim_id: Schema.NullOr(Schema.Number),
    sender_member_id: Schema.Number,
    receiver_member_id: Schema.Number,
    amount_cents: Schema.Number,
    confirmed_by_member_id: Schema.Number,
    status: Schema.Enums(RepaymentStatus),
    created_at: Schema.String,
  });

  export const CreateSchema = EntitySchema.pipe(
    Schema.pick(
      "group_id",
      "purchase_id",
      "repayment_claim_id",
      "sender_member_id",
      "receiver_member_id",
      "amount_cents",
      "confirmed_by_member_id",
      "status",
    ),
  );

  export const UpdateSchema = Schema.partial(
    EntitySchema.pipe(Schema.pick("status")),
  );

  export type Entity = Schema.Schema.Type<typeof EntitySchema>;
  export type Create = Schema.Schema.Type<typeof CreateSchema>;
  export type Update = Schema.Schema.Type<typeof UpdateSchema>;
}
