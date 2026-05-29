import { InternalServerError, BadRequestError } from "@/core/error";
import { HttpApiEndpoint, HttpApiGroup, OpenApi } from "@effect/platform";
import { Schema } from "effect";
import { GroupModel } from "./group.model";

export const GroupRoute = HttpApiGroup.make("groups")
  .annotate(OpenApi.Title, "Group")
  .annotate(OpenApi.Description, "Group management endpoints.")
  .add(
    HttpApiEndpoint.get("findAllGroups", "/")
      .addSuccess(Schema.Array(GroupModel.EntitySchema))
      .addError(InternalServerError, { status: 500 })
      .annotate(OpenApi.Summary, "Find All Groups")
      .annotate(OpenApi.Description, "Returns all registered groups."),
  )
  .add(
    HttpApiEndpoint.post("createGroup", "/")
      .setPayload(GroupModel.CreateSchema)
      .addSuccess(GroupModel.EntitySchema)
      .addError(InternalServerError)
      .addError(BadRequestError)
      .annotate(OpenApi.Summary, "Create Group")
      .annotate(OpenApi.Description, "Creates a new group record."),
  )
  .add(
    HttpApiEndpoint.del("deleteGroupById", "/:id")
      .setPath(Schema.Struct({ id: Schema.NumberFromString }))
      .addSuccess(GroupModel.EntitySchema)
      .addError(InternalServerError)
      .addError(BadRequestError)
      .annotate(OpenApi.Summary, "Delete Group")
      .annotate(OpenApi.Description, "Delete group record by ID"),
  )
  .prefix("/groups");
