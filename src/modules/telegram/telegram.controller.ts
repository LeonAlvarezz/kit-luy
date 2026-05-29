import { HttpApiBuilder, HttpServerRequest } from "@effect/platform";
import { Effect, Layer } from "effect";

import { AppApi } from "@/http/api";
import { WorkerEnv } from "@/http/worker-env";
import { ForbiddenError, InternalServerError } from "@/core/error";
import { TelegramService, TelegramServiceLive } from "./telegram.service";

export const TelegramControllerLive = HttpApiBuilder.group(
  AppApi,
  "telegram",
  (handlers) =>
    handlers
      .handle("webhook", ({ path, payload }) =>
        Effect.gen(function* () {
          const env = yield* WorkerEnv;
          const service = yield* TelegramService;

          // Verify the webhook token matches our configured token to prevent unauthorized requests
          if (path.token !== env.TELEGRAM_BOT_TOKEN) {
            return yield* Effect.fail(
              new ForbiddenError({ message: "Unauthorized webhook request" }),
            );
          }

          yield* Effect.log("telegram webhook update received").pipe(
            Effect.annotateLogs({
              updateId:
                payload && typeof payload === "object" && "update_id" in payload
                  ? String(payload.update_id)
                  : "unknown",
            }),
          );

          // Process the incoming update
          yield* service.handleUpdate(payload).pipe(
            Effect.catchAll((err) =>
              Effect.fail(
                new InternalServerError({
                  message: `Failed to handle Telegram update: ${err.message}`,
                }),
              ),
            ),
          );

          return { status: "ok" as const };
        }),
      )
      .handle("setupWebhook", ({ path }) =>
        Effect.gen(function* () {
          const env = yield* WorkerEnv;
          const service = yield* TelegramService;
          const request = yield* HttpServerRequest.HttpServerRequest;

          // Verify token matches to prevent unauthorized setup attempts
          if (path.token !== env.TELEGRAM_BOT_TOKEN) {
            return yield* Effect.fail(
              new ForbiddenError({ message: "Unauthorized setup request" }),
            );
          }

          // Dynamically construct the webhook URL based on the incoming request origin
          const parsedUrl = new URL(request.url);

          const webhookUrl = `${parsedUrl.protocol}//${parsedUrl.host}/telegram/webhook/${env.TELEGRAM_BOT_TOKEN}`;

          // Register webhook with Telegram API
          yield* service.setWebhook(webhookUrl).pipe(
            Effect.catchAll((err) =>
              Effect.fail(
                new InternalServerError({
                  message: `Failed to set webhook: ${err.message}`,
                }),
              ),
            ),
          );

          return { status: "ok" as const, webhookUrl };
        }),
      ),
);

export const TelegramLive = Layer.mergeAll(TelegramControllerLive).pipe(
  Layer.provide(TelegramServiceLive),
);
