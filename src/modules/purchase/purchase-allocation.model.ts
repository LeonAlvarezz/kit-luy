import { Schema } from "effect";

export enum AllocationKind {
  EQUAL = "equal",
  EXPLICIT = "explicit",
  INFERRED = "inferred",
  ROUNDING_REMAINDER = "rounding_remainder",
}

export namespace PurchaseAllocationModel {
  export const EntitySchema = Schema.Struct({
    id: Schema.Number,
    purchase_id: Schema.Number,
    beneficiary_member_id: Schema.Number,
    responsible_member_id: Schema.Number,
    amount: Schema.Number,
    allocation_kind: Schema.Enums(AllocationKind),
  });

  export const CreateSchema = EntitySchema.pipe(
    Schema.pick(
      "purchase_id",
      "beneficiary_member_id",
      "responsible_member_id",
      "amount",
      "allocation_kind",
    ),
  );

  export const UpdateSchema = Schema.partial(
    EntitySchema.pipe(Schema.pick("amount", "allocation_kind")),
  );

  export type Entity = Schema.Schema.Type<typeof EntitySchema>;
  export type Create = Schema.Schema.Type<typeof CreateSchema>;
  export type Update = Schema.Schema.Type<typeof UpdateSchema>;
}
