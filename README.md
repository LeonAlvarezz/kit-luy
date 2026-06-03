```txt
npm install
npm run dev
```

```txt
npm run deploy
```

## GitHub Actions deployment

Production deploys run through `.github/workflows/deploy.yml` on pushes to
`main` or from a manual workflow dispatch.

Add these GitHub repository secrets before enabling the workflow:

```txt
CLOUDFLARE_ACCOUNT_ID=<your-cloudflare-account-id>
CLOUDFLARE_API_TOKEN=<api-token-with-workers-and-d1-deploy-access>
PUBLIC_BASE_URL=https://kit-luy.<subdomain>.workers.dev
TELEGRAM_BOT_TOKEN=123456:your-token
```

`CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` are not passed as command
arguments. Wrangler reads them from the GitHub Actions environment during the
migration and deploy steps.

The workflow installs dependencies, applies remote D1 migrations, deploys the
Worker with the `TELEGRAM_BOT_TOKEN` GitHub secret, then calls:

```txt
${PUBLIC_BASE_URL}/telegram/setup/${TELEGRAM_BOT_TOKEN}
```

That final request registers the deployed Worker URL as the Telegram webhook and
fails the workflow if registration fails.

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
PUBLIC_BASE_URL=https://your-ngrok-domain.ngrok-free.app
```

Wrangler passes `.dev.vars` as Worker bindings. The app registers
`${PUBLIC_BASE_URL}/telegram/webhook/${TELEGRAM_BOT_TOKEN}` on the first request.
