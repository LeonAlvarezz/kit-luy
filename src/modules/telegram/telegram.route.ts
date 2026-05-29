import { HttpApiEndpoint, HttpApiGroup, OpenApi } from "@effect/platform";
import { Schema } from "effect";

import { BadRequestError, ForbiddenError, InternalServerError } from "@/core/error";

export const TelegramRoute = HttpApiGroup.make("telegram")
  .annotate(OpenApi.Title, "Telegram")
  .annotate(OpenApi.Description, "Telegram Bot integration endpoints.")
  .add(
    HttpApiEndpoint.post("webhook", "/webhook/:token")
      .setPath(Schema.Struct({ token: Schema.String }))
      .setPayload(Schema.Unknown)
      .addSuccess(Schema.Struct({ status: Schema.Literal("ok") }))
      .addError(ForbiddenError)
      .addError(BadRequestError)
      .addError(InternalServerError)
      .annotate(OpenApi.Summary, "Telegram Webhook")
      .annotate(OpenApi.Description, "Receives and handles incoming updates from Telegram.")
  )
  .add(
    HttpApiEndpoint.get("setupWebhook", "/setup/:token")
      .setPath(Schema.Struct({ token: Schema.String }))
      .addSuccess(
        Schema.Struct({
          status: Schema.Literal("ok"),
          webhookUrl: Schema.String,
        })
      )
      .addError(ForbiddenError)
      .addError(InternalServerError)
      .annotate(OpenApi.Summary, "Setup Telegram Webhook")
      .annotate(
        OpenApi.Description,
        "Dynamically registers the webhook URL using the request origin."
      )
  )
  .prefix("/telegram");
