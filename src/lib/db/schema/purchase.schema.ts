import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { enumToSqliteEnum } from "./common";
import { PurchaseStatus } from "@/modules/purchase/purchase.model";
import { groupTable } from "./group.schema";
import { memberTable } from "./member.schema";
import { relations } from "drizzle-orm";
import { purchaseAllocationTable } from "./purchase-allocation.schema";

export const purchaseTable = sqliteTable("purchases", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  group_id: integer("group_id")
    .notNull()
    .references(() => groupTable.id),
  payer_member_id: integer("payer_member_id")
    .notNull()
    .references(() => memberTable.id),
  tg_message_id: integer("tg_message_id").notNull(),
  amount: integer().notNull(),
  note: text(),
  status: text({ enum: enumToSqliteEnum(PurchaseStatus) })
    .notNull()
    .default(PurchaseStatus.ACTIVE),
  created_at: integer("created_at").notNull(),
  voided_at: integer("voided_at"),
});

export const purchaseRelations = relations(purchaseTable, ({ many, one }) => ({
  allocations: many(purchaseAllocationTable),
  payer: one(memberTable, {
    fields: [purchaseTable.payer_member_id],
    references: [memberTable.id],
    relationName: "payer_member",
  }),
  group: one(groupTable, {
    fields: [purchaseTable.group_id],
    references: [groupTable.id],
  }),
}));
