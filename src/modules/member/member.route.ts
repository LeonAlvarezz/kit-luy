import { InternalServerError, BadRequestError } from "@/core/error";
import { Schema } from "effect";
import { MemberModel } from "./member.model";
import { HttpApiEndpoint, HttpApiGroup, OpenApi } from "@effect/platform";

export const MemberRoute = HttpApiGroup.make("members")
  .annotate(OpenApi.Title, "Member")
  .annotate(OpenApi.Description, "Member management endpoints.")
  .add(
    HttpApiEndpoint.get("findAllMembers", "/")
      .addSuccess(Schema.Array(MemberModel.EntitySchema))
      .addError(InternalServerError, { status: 500 })
      .annotate(OpenApi.Summary, "Find All Member")
      .annotate(OpenApi.Description, "Returns all registered members."),
  )
  .add(
    HttpApiEndpoint.post("createMember", "/")
      .setPayload(MemberModel.CreateSchema)
      .addSuccess(MemberModel.EntitySchema)
      .addError(InternalServerError)
      .addError(BadRequestError)
      .annotate(OpenApi.Summary, "Create Member")
      .annotate(OpenApi.Description, "Creates a new member record."),
  )
  .prefix("/members");
