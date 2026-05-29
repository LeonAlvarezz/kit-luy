import { Schema } from "effect";

export class MemberNotFound extends Schema.TaggedError<MemberNotFound>()(
  "MemberNotFound",
  {
    id: Schema.Number,
    message: Schema.String,
    code: Schema.String,
  },
) {
  constructor(props: { id: number; message?: string }) {
    super({
      id: props.id,
      message: props.message ?? "Member Not Found",
      code: "MEMBER_NOT_FOUND",
    });
  }
}
