import { Schema } from "effect";
import { RepaymentClaimStatus } from "./repayment-claim.model";

export class RepaymentClaimNotFound extends Schema.TaggedError<RepaymentClaimNotFound>()(
  "RepaymentClaimNotFound",
  {
    id: Schema.Number,
    message: Schema.String,
    code: Schema.String,
  },
) {
  constructor(props: { id: number; message?: string }) {
    super({
      id: props.id,
      message: props.message ?? `Repayment claim ${props.id} not found`,
      code: "REPAYMENT_CLAIM_NOT_FOUND",
    });
  }
}

export class RepaymentClaimInvalidStatus extends Schema.TaggedError<RepaymentClaimInvalidStatus>()(
  "RepaymentClaimInvalidStatus",
  {
    id: Schema.Number,
    current_status: Schema.String,
    expected_status: Schema.String,
    message: Schema.String,
    code: Schema.String,
  },
) {
  constructor(props: {
    id: number;
    current_status: RepaymentClaimStatus;
    expected_status: RepaymentClaimStatus;
    message?: string;
  }) {
    super({
      id: props.id,
      current_status: props.current_status,
      expected_status: props.expected_status,
      message:
        props.message ??
        `Repayment claim ${props.id} has status '${props.current_status}', expected '${props.expected_status}'`,
      code: "REPAYMENT_CLAIM_INVALID_STATUS",
    });
  }
}
