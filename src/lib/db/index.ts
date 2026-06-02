import { Context, Layer } from "effect";
import { drizzle, DrizzleD1Database } from "drizzle-orm/d1";
import * as schema from "./schema";

export type AppDB = DrizzleD1Database<typeof schema>;

export class DrizzleService extends Context.Tag("DrizzleService")<
  DrizzleService,
  AppDB
>() {}

export type DrizzleTransaction = Parameters<
  Parameters<AppDB["transaction"]>[0]
>[0];

export const makeDrizzleLayer = (d1: D1Database) =>
  Layer.succeed(DrizzleService, drizzle(d1, { schema }));
