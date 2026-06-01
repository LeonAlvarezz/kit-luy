import {
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { purchaseTable } from "./purchase.schema";
import { relations } from "drizzle-orm";
import { memberTable } from "./member.schema";
import { enumToSqliteEnum } from "./common";
import { AllocationKind } from "@/modules/purchase/purchase-allocation.model";

export const purchaseAllocationTable = sqliteTable(
  "purchase_allocations",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    purchase_id: integer("purchase_id")
      .notNull()
      .references(() => purchaseTable.id),
    beneficiary_member_id: integer("beneficiary_member_id")
      .notNull()
      .references(() => memberTable.id),
    responsible_member_id: integer("responsible_member_id")
      .notNull()
      .references(() => memberTable.id),
    amount: integer("amount").notNull(),
    allocation_kind: text("allocation_kind", {
      enum: enumToSqliteEnum(AllocationKind),
    }).notNull(),
  },
  (table) => [
    uniqueIndex("purchase_beneficiary_member_unique").on(
      table.beneficiary_member_id,
      table.purchase_id,
    ),
  ],
);

export const purchaseAllocationRelations = relations(
  purchaseAllocationTable,
  ({ one }) => ({
    purchase: one(purchaseTable, {
      fields: [purchaseAllocationTable.purchase_id],
      references: [purchaseTable.id],
    }),
    beneficiary_member: one(memberTable, {
      fields: [purchaseAllocationTable.beneficiary_member_id],
      references: [memberTable.id],
      relationName: "beneficiary_member",
    }),
    responsible_member: one(memberTable, {
      fields: [purchaseAllocationTable.responsible_member_id],
      references: [memberTable.id],
      relationName: "responsible_member",
    }),
  }),
);
