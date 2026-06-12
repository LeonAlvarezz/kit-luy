import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { simpleTimestamps } from "./common";

export const telegramUserTable = sqliteTable("telegram_users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tg_user_id: text("tg_user_id").notNull().unique(),
  username: text("username"),
  display_name: text("display_name"),
  payment_qr_file_id: text("payment_qr_file_id"),
  payment_qr_updated_at: text("payment_qr_updated_at"),
  ...simpleTimestamps,
});
