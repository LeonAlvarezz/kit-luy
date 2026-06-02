import { relations, sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { enumToSqliteEnum } from "./common";
import { groupTable } from "./group.schema";
import { memberTable } from "./member.schema";
import { repaymentClaimTable } from "./repayment-claim.schema";
import { RepaymentStatus } from "@/modules/repayment/repayment.model";

export const repaymentTable = sqliteTable("repayments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  group_id: integer("group_id")
    .notNull()
    .references(() => groupTable.id),
  repayment_claim_id: integer("repayment_claim_id").references(
    () => repaymentClaimTable.id,
  ),
  sender_member_id: integer("sender_member_id")
    .notNull()
    .references(() => memberTable.id),
  receiver_member_id: integer("receiver_member_id")
    .notNull()
    .references(() => memberTable.id),
  amount_cents: integer("amount_cents").notNull(),
  confirmed_by_member_id: integer("confirmed_by_member_id")
    .notNull()
    .references(() => memberTable.id),
  created_at: text("created_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  status: text("status", { enum: enumToSqliteEnum(RepaymentStatus) })
    .notNull()
    .default(RepaymentStatus.ACTIVE),
});

export const repaymentRelations = relations(repaymentTable, ({ one }) => ({
  group: one(groupTable, {
    fields: [repaymentTable.group_id],
    references: [groupTable.id],
  }),
  repayment_claim: one(repaymentClaimTable, {
    fields: [repaymentTable.repayment_claim_id],
    references: [repaymentClaimTable.id],
  }),
  sender_member: one(memberTable, {
    fields: [repaymentTable.sender_member_id],
    references: [memberTable.id],
    relationName: "repayment_sender_member",
  }),
  receiver_member: one(memberTable, {
    fields: [repaymentTable.receiver_member_id],
    references: [memberTable.id],
    relationName: "repayment_receiver_member",
  }),
  confirmed_by_member: one(memberTable, {
    fields: [repaymentTable.confirmed_by_member_id],
    references: [memberTable.id],
    relationName: "repayment_confirmed_by_member",
  }),
}));
