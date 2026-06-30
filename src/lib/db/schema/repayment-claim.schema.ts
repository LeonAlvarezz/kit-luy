import { relations, sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { enumToSqliteEnum } from "./common";
import { groupTable } from "./group.schema";
import { memberTable } from "./member.schema";
import { RepaymentClaimStatus } from "@/modules/repayment/repayment-claim.model";
import { repaymentTable } from "./repayment.schema";
import { purchaseTable } from "./purchase.schema";

export const repaymentClaimTable = sqliteTable("repayment_claims", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  group_id: integer("group_id")
    .notNull()
    .references(() => groupTable.id),
  purchase_id: integer("purchase_id").references(() => purchaseTable.id),
  sender_member_id: integer("sender_member_id")
    .notNull()
    .references(() => memberTable.id),
  receiver_member_id: integer("receiver_member_id")
    .notNull()
    .references(() => memberTable.id),
  amount_cents: integer("amount_cents").notNull(),
  status: text("status", { enum: enumToSqliteEnum(RepaymentClaimStatus) })
    .notNull()
    .default(RepaymentClaimStatus.PENDING),
  tg_message_id: integer("tg_message_id"),
  created_at: text("created_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  resolved_at: text("resolved_at"),
});

export const repaymentClaimRelations = relations(
  repaymentClaimTable,
  ({ many, one }) => ({
    repayments: many(repaymentTable),
    group: one(groupTable, {
      fields: [repaymentClaimTable.group_id],
      references: [groupTable.id],
    }),
    purchase: one(purchaseTable, {
      fields: [repaymentClaimTable.purchase_id],
      references: [purchaseTable.id],
    }),
    sender_member: one(memberTable, {
      fields: [repaymentClaimTable.sender_member_id],
      references: [memberTable.id],
      relationName: "repayment_claim_sender_member",
    }),
    receiver_member: one(memberTable, {
      fields: [repaymentClaimTable.receiver_member_id],
      references: [memberTable.id],
      relationName: "repayment_claim_receiver_member",
    }),
  }),
);
