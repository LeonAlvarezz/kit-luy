import { Schema } from "effect";
import { PurchaseAllocationModel } from "./purchase-allocation.model";

export enum PurchaseStatus {
  ACTIVE = "active",
  VOIDED = "voided",
}

export namespace PurchaseModel {
  export const EntitySchema = Schema.Struct({
    id: Schema.Number,
    group_id: Schema.Number,
    payer_member_id: Schema.Number,
    tg_message_id: Schema.Number,
    amount: Schema.Number,
    note: Schema.NullOr(Schema.String),
    status: Schema.Enums(PurchaseStatus),
    created_at: Schema.Number,
    voided_at: Schema.NullOr(Schema.Number),
  });

  export const CreateSchema = EntitySchema.pipe(
    Schema.pick(
      "group_id",
      "payer_member_id",
      "tg_message_id",
      "amount",
      "note",
      "status",
      "created_at",
    ),
  );

  export const UpdateSchema = Schema.partial(
    EntitySchema.pipe(Schema.pick("amount", "note", "status", "voided_at")),
  );

  export const CreateWithAllocationsSchema = Schema.Struct({
    purchase: CreateSchema,
    allocations: Schema.Array(PurchaseAllocationModel.CreateForPurchaseSchema),
  });

  export const WithAllocationsSchema = Schema.Struct({
    purchase: EntitySchema,
    allocations: Schema.Array(PurchaseAllocationModel.EntitySchema),
  });

  export type Entity = Schema.Schema.Type<typeof EntitySchema>;
  export type Create = Schema.Schema.Type<typeof CreateSchema>;
  export type Update = Schema.Schema.Type<typeof UpdateSchema>;
  export type CreateWithAllocations = Schema.Schema.Type<
    typeof CreateWithAllocationsSchema
  >;
  export type WithAllocations = Schema.Schema.Type<
    typeof WithAllocationsSchema
  >;
}
