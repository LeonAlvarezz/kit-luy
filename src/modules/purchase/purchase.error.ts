import { Schema } from "effect";

export class PurchaseNotFound extends Schema.TaggedError<PurchaseNotFound>()(
  "PurchaseNotFound",
  {
    purchase_id: Schema.Int,
    message: Schema.String,
    code: Schema.String,
  },
) {
  constructor(props: { purchase_id: number; message?: string }) {
    super({
      purchase_id: props.purchase_id,
      message: props.message ?? `Purchase ${props.purchase_id} not found`,
      code: "PURCHASE_NOT_FOUND",
    });
  }
}

export class PurchaseAllocationNotFound extends Schema.TaggedError<PurchaseAllocationNotFound>()(
  "PurchaseAllocationNotFound",
  {
    purchase_allocation_id: Schema.Int,
    message: Schema.String,
    code: Schema.String,
  },
) {
  constructor(props: { purchase_allocation_id: number; message?: string }) {
    super({
      purchase_allocation_id: props.purchase_allocation_id,
      message:
        props.message ??
        `Purchase allocation ${props.purchase_allocation_id} not found`,
      code: "PURCHASE_ALLOCATION_NOT_FOUND",
    });
  }
}

export class PurchasePayerNotFound extends Schema.TaggedError<PurchasePayerNotFound>()(
  "PurchasePayerNotFound",
  {
    tg_chat_id: Schema.String,
    tg_user_id: Schema.String,
    message: Schema.String,
    code: Schema.String,
  },
) {
  constructor(props: {
    tg_chat_id: string;
    tg_user_id: string;
    message?: string;
  }) {
    super({
      tg_chat_id: props.tg_chat_id,
      tg_user_id: props.tg_user_id,
      message:
        props.message ??
        "Use /join before recording a purchase in this settlement group.",
      code: "PURCHASE_PAYER_NOT_FOUND",
    });
  }
}

export class PurchaseNoActiveMembers extends Schema.TaggedError<PurchaseNoActiveMembers>()(
  "PurchaseNoActiveMembers",
  {
    tg_chat_id: Schema.String,
    message: Schema.String,
    code: Schema.String,
  },
) {
  constructor(props: { tg_chat_id: string; message?: string }) {
    super({
      tg_chat_id: props.tg_chat_id,
      message:
        props.message ??
        "There are no active members in this settlement group.",
      code: "PURCHASE_NO_ACTIVE_MEMBERS",
    });
  }
}

export class PurchaseBeneficiaryNotFound extends Schema.TaggedError<PurchaseBeneficiaryNotFound>()(
  "PurchaseBeneficiaryNotFound",
  {
    username: Schema.String,
    message: Schema.String,
    code: Schema.String,
  },
) {
  constructor(props: { username: string; message?: string }) {
    super({
      username: props.username,
      message:
        props.message ??
        `Could not find @${props.username} in this settlement group.`,
      code: "PURCHASE_BENEFICIARY_NOT_FOUND",
    });
  }
}

export class PurchaseDuplicateBeneficiary extends Schema.TaggedError<PurchaseDuplicateBeneficiary>()(
  "PurchaseDuplicateBeneficiary",
  {
    username: Schema.String,
    message: Schema.String,
    code: Schema.String,
  },
) {
  constructor(props: { username: string; message?: string }) {
    super({
      username: props.username,
      message:
        props.message ??
        `@${props.username} appears more than once in this purchase.`,
      code: "PURCHASE_DUPLICATE_BENEFICIARY",
    });
  }
}

export class PurchaseAllocationTotalMismatch extends Schema.TaggedError<PurchaseAllocationTotalMismatch>()(
  "PurchaseAllocationTotalMismatch",
  {
    totalAmount: Schema.Number,
    allocationTotal: Schema.Number,
    message: Schema.String,
    code: Schema.String,
  },
) {
  constructor(props: {
    totalAmount: number;
    allocationTotal: number;
    message?: string;
  }) {
    super({
      totalAmount: props.totalAmount,
      allocationTotal: props.allocationTotal,
      message:
        props.message ??
        "Explicit allocations must add up to the purchase total.",
      code: "PURCHASE_ALLOCATION_TOTAL_MISMATCH",
    });
  }
}
