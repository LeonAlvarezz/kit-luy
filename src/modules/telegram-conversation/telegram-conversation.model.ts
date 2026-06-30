import { Schema } from "effect";

export enum TelegramConversationFlow {
  BUY = "buy",
  PAID = "paid",
  QR = "qr",
}

export enum TelegramConversationStatus {
  ACTIVE = "active",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
  EXPIRED = "expired",
}

export enum ConversationStep {
  AMOUNT = "amount",
  MEMBERS = "members",
  PURCHASE = "purchase",
  CONFIRM = "confirm",
}

export namespace TelegramConversationModel {
  export const EntitySchema = Schema.Struct({
    id: Schema.Number,
    group_id: Schema.Number,
    member_id: Schema.Number,
    flow: Schema.String,
    step: Schema.String,
    payload_json: Schema.String,
    status: Schema.String,
    expires_at: Schema.Number,
    created_at: Schema.Number,
    updated_at: Schema.Number,
  });

  export const CreateSchema = EntitySchema.pipe(
    Schema.pick(
      "group_id",
      "member_id",
      "flow",
      "step",
      "payload_json",
      "status",
      "expires_at",
      "created_at",
      "updated_at",
    ),
  );

  export const UpdateSchema = Schema.partial(
    EntitySchema.pipe(
      Schema.pick("step", "payload_json", "status", "expires_at", "updated_at"),
    ),
  );

  export const StartSessionSchema = EntitySchema.pipe(
    Schema.pick("flow", "group_id", "member_id"),
  );

  export const BuyConversationSchema = Schema.Struct({
    amount: Schema.optional(Schema.Number),
    selectedMemberIds: Schema.optional(Schema.Array(Schema.Number)),
  });

  export const PaidConversationSchema = Schema.Struct({
    amount: Schema.optional(Schema.Number),
    receiverMemberId: Schema.optional(Schema.Number),
    purchaseId: Schema.optional(Schema.NullOr(Schema.Number)),
  });

  export type Entity = Schema.Schema.Type<typeof EntitySchema>;
  export type Create = Schema.Schema.Type<typeof CreateSchema>;
  export type Update = Schema.Schema.Type<typeof UpdateSchema>;
  export type StartSession = Schema.Schema.Type<typeof StartSessionSchema>;
  export type BuyConversation = Schema.Schema.Type<
    typeof BuyConversationSchema
  >;
  export type PaidConversation = Schema.Schema.Type<
    typeof PaidConversationSchema
  >;
}
