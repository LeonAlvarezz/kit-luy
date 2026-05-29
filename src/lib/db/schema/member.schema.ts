import { relations } from "drizzle-orm";
import {
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

import { enumToSqliteEnum, simpleTimestamps } from "./common";
import { groupTable } from "./group.schema";
import { MEMBER_STATUS } from "@/modules/member/member.model";

export const memberTable = sqliteTable(
  "members",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    group_id: integer()
      .notNull()
      .references(() => groupTable.id, { onDelete: "cascade" }),
    tg_user_id: text(),
    display_name: text(),
    alias: text(),
    status: text({ enum: enumToSqliteEnum(MEMBER_STATUS) })
      .notNull()
      .default(MEMBER_STATUS.ACTIVE),
    registered_at: text("registered_at"),
    ...simpleTimestamps,
  },
  (table) => [
    uniqueIndex("members_group_tg_user_id_unique").on(
      table.group_id,
      table.tg_user_id,
    ),
    uniqueIndex("members_group_alias_unique").on(table.group_id, table.alias),
  ],
);

export const memberRelations = relations(memberTable, ({ one }) => ({
  group: one(groupTable, {
    fields: [memberTable.group_id],
    references: [groupTable.id],
  }),
}));
