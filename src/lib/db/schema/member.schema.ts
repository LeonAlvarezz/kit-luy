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
import { purchaseAllocationTable } from "./purchase-allocation.schema";
import { purchaseTable } from "./purchase.schema";
import { repaymentClaimTable } from "./repayment-claim.schema";
import { repaymentTable } from "./repayment.schema";

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

export const memberRelations = relations(memberTable, ({ one, many }) => ({
  group: one(groupTable, {
    fields: [memberTable.group_id],
    references: [groupTable.id],
  }),
  paid_purchases: many(purchaseTable, {
    relationName: "payer_member",
  }),
  beneficiary_allocations: many(purchaseAllocationTable, {
    relationName: "beneficiary_member",
  }),
  responsible_allocations: many(purchaseAllocationTable, {
    relationName: "responsible_member",
  }),
  sent_repayments: many(repaymentTable, {
    relationName: "repayment_sender_member",
  }),
  received_repayments: many(repaymentTable, {
    relationName: "repayment_receiver_member",
  }),
  confirmed_repayments: many(repaymentTable, {
    relationName: "repayment_confirmed_by_member",
  }),
  sent_repayment_claims: many(repaymentClaimTable, {
    relationName: "repayment_claim_sender_member",
  }),
  received_repayment_claims: many(repaymentClaimTable, {
    relationName: "repayment_claim_receiver_member",
  }),
}));
