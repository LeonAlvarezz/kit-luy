import { Config, ConfigProvider, Effect as Ef } from "effect";

export const config = Ef.gen(function* () {
  return {
    port: yield* Config.number("PORT").pipe(Config.withDefault(5000)),
    jwtExpire: yield* Config.string("JWT_EXPIRE").pipe(
      Config.withDefault("7d"),
    ),
    secretCode: yield* Config.string("SECRET_CODE"),
    salt: yield* Config.string("SALT").pipe(
      Config.withDefault("D;%yL9TS:5PalS/d"),
    ),
  };
});

type WorkerEnv = Record<string, unknown>;

export const configProviderFromEnv = (env: WorkerEnv) =>
  ConfigProvider.fromMap(
    new Map(
      Object.entries(env)
        .filter(([, value]) => value !== undefined && value !== null)
        .map(([key, value]) => [key, String(value)]),
    ),
  );
