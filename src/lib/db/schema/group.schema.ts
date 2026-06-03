import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { CURRENCY } from "@/shared/currency";
import { enumToSqliteEnum, simpleTimestamps } from "./common";
import { GROUP_LANG_ENUM } from "@/modules/group/group.model";

export const groupTable = sqliteTable("groups", {
  id: integer().primaryKey({ autoIncrement: true }),
  tg_chat_id: text().unique().notNull(),
  title: text().notNull(),
  currency: text({ enum: enumToSqliteEnum(CURRENCY) })
    .notNull()
    .default(CURRENCY.USD),
  language: text({ enum: enumToSqliteEnum(GROUP_LANG_ENUM) })
    .notNull()
    .default(GROUP_LANG_ENUM.EN),
  ...simpleTimestamps,
});
