import { Context, Effect, Layer } from "effect";

import { makeDrizzleLayer } from "@/lib/db";

export type Bindings = Record<string, string | undefined> & {
  D1_DB: D1Database;
};

export class WorkerEnv extends Context.Tag("WorkerEnv")<
  WorkerEnv,
  Bindings
>() {}

export const makeWorkerEnvLayer = (env: Bindings) =>
  Layer.succeed(WorkerEnv, env);

export const DrizzleFromWorkerEnvLive = Layer.unwrapEffect(
  Effect.map(WorkerEnv, (env) => makeDrizzleLayer(env.D1_DB)),
);
