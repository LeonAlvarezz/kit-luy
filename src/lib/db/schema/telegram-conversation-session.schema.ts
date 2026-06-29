import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { groupTable } from "./group.schema";
import { memberTable } from "./member.schema";

export const telegramConversationSessionTable = sqliteTable(
  "telegram_conversation_sessions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    group_id: integer("group_id")
      .notNull()
      .references(() => groupTable.id),
    member_id: integer("member_id")
      .notNull()
      .references(() => memberTable.id),
    flow: text("flow").notNull(),
    step: text("step").notNull(),
    payload_json: text("payload_json").notNull(),
    status: text("status").notNull(),
    expires_at: integer("expires_at").notNull(),
    created_at: integer("created_at").notNull(),
    updated_at: integer("updated_at").notNull(),
  },
);
