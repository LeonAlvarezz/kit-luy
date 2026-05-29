```txt
npm install
npm run dev
```

```txt
npm run deploy
```

[For generating/synchronizing types based on your Worker configuration run](https://developers.cloudflare.com/workers/wrangler/commands/#types):

```txt
npm run cf-typegen
```

The Worker entrypoint is backed by `@effect/platform` typed `HttpApi` routes:

```ts
// src/index.ts
const webHandler = HttpApiBuilder.toWebHandler(AppLive)

export default {
  fetch(request: Request, env: Bindings, ctx: ExecutionContext) {
    return webHandler.handler(request)
  },
}
```

Cloudflare bindings are provided to the Effect layer graph through
`WorkerEnv`, and the D1-backed `DrizzleService` is derived from `env.D1_DB`.

## Telegram webhook

For local webhook development, expose Wrangler with ngrok and put the bot
settings in `.dev.vars`:

```txt
TELEGRAM_BOT_TOKEN=123456:your-token
NGROK_URL=https://your-ngrok-domain.ngrok-free.app
```

Wrangler passes `.dev.vars` as Worker bindings. The app registers
`${NGROK_URL}/telegram/webhook/${TELEGRAM_BOT_TOKEN}` on the first request.
