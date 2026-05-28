import { HttpApiEndpoint, HttpApiGroup } from "@effect/platform";
import { Schema } from "effect";

export const HealthResponse = Schema.Struct({
  status: Schema.Literal("ok"),
});

export const HealthGroup = HttpApiGroup.make("health", {
  topLevel: true,
}).add(HttpApiEndpoint.get("health", "/health").addSuccess(HealthResponse));
