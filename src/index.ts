import { HttpApiBuilder, HttpServer } from "@effect/platform";
import { Effect as Ef, Layer } from "effect";

import { withResponseEnvelope } from "@/core/middleware/response-envelope";
import { config, configProviderFromEnv } from "./lib/config";
import { AppApi } from "@/http/api";
import { RoutesLive } from "@/http/routes";
import {
  Bindings,
  DrizzleFromWorkerEnvLive,
  makeWorkerEnvLayer,
} from "@/http/worker-env";
import { LoggerLive } from "./lib/logger";

const handlersByEnv = new WeakMap<
  Bindings,
  ReturnType<typeof HttpApiBuilder.toWebHandler>
>();

const startup = Ef.gen(function* () {
  const { port } = yield* config;

  yield* Ef.log(`server is running at http://localhost:${port}`);
}).pipe(Ef.annotateLogs({ file: "app.ts" }));

const makeHandler = (env: Bindings) => {
  const cached = handlersByEnv.get(env);
  if (cached) {
    return cached.handler;
  }

  const ApiLive = HttpApiBuilder.api(AppApi).pipe(Layer.provide(RoutesLive));

  const AppLive = Layer.mergeAll(ApiLive, HttpServer.layerContext).pipe(
    Layer.provide(DrizzleFromWorkerEnvLive),
    Layer.provide(makeWorkerEnvLayer(env)),
    Layer.provide(LoggerLive),
  );

  const webHandler = HttpApiBuilder.toWebHandler(AppLive, {
    middleware: withResponseEnvelope,
  });
  handlersByEnv.set(env, webHandler);
  return webHandler.handler;
};

export default {
  fetch(request: Request, env: Bindings, ctx: ExecutionContext) {
    Ef.runSync(
      startup.pipe(
        Ef.provide(LoggerLive),
        Ef.withConfigProvider(configProviderFromEnv(env)),
      ),
    );

    return makeHandler(env)(request);
  },
};
