import { HttpApiBuilder, HttpServerRequest } from "@effect/platform";
import { Effect, Layer } from "effect";

import { AppApi } from "@/http/api";
import { WorkerEnv } from "@/http/worker-env";
import { ForbiddenError, InternalServerError } from "@/core/error";
import { TelegramService, TelegramServiceLive } from "./telegram.service";

const normalizeOrigin = (url: string | undefined) => {
  if (!url) {
    return undefined;
  }

  try {
    return new URL(url.trim()).origin;
  } catch {
    return undefined;
  }
};

const getSetupRequestOrigin = (
  request: HttpServerRequest.HttpServerRequest,
  env: { PUBLIC_BASE_URL?: string },
) => {
  const configuredOrigin = normalizeOrigin(env.PUBLIC_BASE_URL);
  if (configuredOrigin) {
    return configuredOrigin;
  }

  const host = request.headers.host?.trim();
  if (!host) {
    return undefined;
  }

  const protocol =
    request.headers["x-forwarded-proto"]?.split(",")[0]?.trim() ?? "https";

  return `${protocol}://${host}`;
};

export const TelegramControllerLive = HttpApiBuilder.group(
  AppApi,
  "telegram",
  (handlers) =>
    handlers
      .handle("webhook", ({ path, payload }) =>
        Effect.gen(function* () {
          const env = yield* WorkerEnv;

          // Verify the webhook token matches our configured token to prevent unauthorized requests
          if (path.token !== env.TELEGRAM_BOT_TOKEN) {
            return yield* Effect.fail(
              new ForbiddenError({ message: "Unauthorized webhook request" }),
            );
          }

          const service = yield* TelegramService;

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
          const request = yield* HttpServerRequest.HttpServerRequest;

          // Verify token matches to prevent unauthorized setup attempts
          if (path.token !== env.TELEGRAM_BOT_TOKEN) {
            return yield* Effect.fail(
              new ForbiddenError({ message: "Unauthorized setup request" }),
            );
          }

          const service = yield* TelegramService;

          // Dynamically construct the webhook URL based on the incoming request origin
          const origin = getSetupRequestOrigin(request, env);
          if (!origin) {
            return yield* Effect.fail(
              new InternalServerError({
                message:
                  "Could not determine the public origin for Telegram webhook setup.",
              }),
            );
          }

          const webhookUrl = `${origin}/telegram/webhook/${env.TELEGRAM_BOT_TOKEN}`;

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
