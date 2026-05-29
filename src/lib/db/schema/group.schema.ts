import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { CURRENCY } from "@/shared/currency";
import { enumToSqliteEnum, simpleTimestamps } from "./common";

export const groupTable = sqliteTable("groups", {
  id: integer().primaryKey({ autoIncrement: true }),
  tg_chat_id: text().unique().notNull(),
  title: text().notNull(),
  currency: text({ enum: enumToSqliteEnum(CURRENCY) })
    .notNull()
    .default(CURRENCY.USD),
  ...simpleTimestamps,
});
