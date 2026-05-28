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
