import { HttpApiBuilder } from "@effect/platform";
import { Effect, Layer } from "effect";

import { AppApi } from "@/http/api";

export const HealthHandlersLive = HttpApiBuilder.group(
  AppApi,
  "health",
  (handlers) =>
    handlers.handle("health", () => Effect.succeed({ status: "ok" })),
);

export const HealthLive = Layer.mergeAll(HealthHandlersLive);
