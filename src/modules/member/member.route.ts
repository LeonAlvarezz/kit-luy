import { InternalServerError, BadRequestError } from "@/core/error";
import { Schema } from "effect";
import { MemberModel } from "./member.model";
import { HttpApiEndpoint, HttpApiGroup } from "@effect/platform";

export const MemberRoute = HttpApiGroup.make("members")
  .add(
    HttpApiEndpoint.get("findAllMembers", "/")
      .addSuccess(Schema.Array(MemberModel.EntitySchema))
      .addError(InternalServerError, { status: 500 }),
  )
  .add(
    HttpApiEndpoint.post("createMember", "/")
      .setPayload(MemberModel.CreateSchema)
      .addSuccess(MemberModel.EntitySchema)
      .addError(InternalServerError)
      .addError(BadRequestError),
  )
  .prefix("/members");
