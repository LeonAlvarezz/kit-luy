import { HttpApiBuilder, HttpApiScalar, HttpServer } from "@effect/platform";
import { Effect as Ef, Layer } from "effect";

import { logAppError } from "@/core/error/app-error";
import { withResponseEnvelope } from "@/core/middleware/response-envelope";
import { config, configProviderFromEnv } from "./lib/config";
import { AppApi } from "@/http/api";
import { RoutesLive } from "@/http/routes";
import {
  Bindings,
  DrizzleFromWorkerEnvLive,
  makeWorkerEnvLayer,
} from "@/http/worker-env";
import {
  TelegramService,
  TelegramServiceLive,
} from "@/modules/telegram/telegram.service";
import { LoggerLive } from "./lib/logger";

const handlersByEnv = new WeakMap<
  Bindings,
  ReturnType<typeof HttpApiBuilder.toWebHandler>
>();
const telegramWebhookStartupByEnv = new WeakMap<Bindings, Promise<void>>();

const getTelegramWebhookUrl = (env: Bindings) => {
  const baseUrl = env.NGROK_URL?.trim().replace(/\/+$/, "");
  const token = env.TELEGRAM_BOT_TOKEN?.trim();

  if (!baseUrl || !token) {
    return undefined;
  }

  return `${baseUrl}/telegram/webhook/${token}`;
};

const startup = Ef.gen(function* () {
  const { port } = yield* config;

  yield* Ef.log(`server is running at http://localhost:${port}`);
}).pipe(Ef.annotateLogs({ file: "app.ts" }));

const setupTelegramWebhookOnStartup = (env: Bindings) =>
  Ef.gen(function* () {
    const webhookUrl = getTelegramWebhookUrl(env);
    console.log({ webhookUrl });

    if (!webhookUrl) {
      yield* Ef.log(
        "telegram webhook setup skipped: NGROK_URL or TELEGRAM_BOT_TOKEN is missing",
      );
      return;
    }

    const service = yield* TelegramService;

    yield* service.setWebhook(webhookUrl);
    yield* Ef.log("telegram webhook registered");
  }).pipe(
    Ef.catchAllCause((cause) =>
      logAppError(cause, {
        message: "Telegram webhook setup failed",
      }),
    ),
    Ef.provide(TelegramServiceLive),
    Ef.provide(DrizzleFromWorkerEnvLive),
    Ef.provide(makeWorkerEnvLayer(env)),
    Ef.provide(LoggerLive),
    Ef.annotateLogs({ file: "app.ts" }),
  );

const ensureTelegramWebhookStarted = (env: Bindings, ctx: ExecutionContext) => {
  const existing = telegramWebhookStartupByEnv.get(env);

  if (existing) {
    ctx.waitUntil(existing);
    return;
  }

  const setup = Ef.runPromise(setupTelegramWebhookOnStartup(env));
  telegramWebhookStartupByEnv.set(env, setup);
  ctx.waitUntil(setup);
};

const makeHandler = (env: Bindings) => {
  const cached = handlersByEnv.get(env);
  if (cached) {
    return cached.handler;
  }

  const AppApiLive = HttpApiBuilder.api(AppApi).pipe(Layer.provide(RoutesLive));
  const DocsLive = Layer.mergeAll(
    HttpApiBuilder.middlewareOpenApi({ path: "/openapi.json" }),
    HttpApiScalar.layer({ path: "/docs" }),
  ).pipe(Layer.provide(AppApiLive));
  const ApiLive = Layer.mergeAll(AppApiLive, DocsLive);

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

    ensureTelegramWebhookStarted(env, ctx);

    return makeHandler(env)(request);
  },
};
