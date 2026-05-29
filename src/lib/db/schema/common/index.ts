import { sql, type AnyColumn, type SQL } from "drizzle-orm";
import { customType, text } from "drizzle-orm/sqlite-core";

export const timestamps = {
  created_at: text("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updated_at: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
  deleted_at: text("deleted_at"),
};

export const simpleTimestamps = {
  created_at: text("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updated_at: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
};

export const dateOnly = customType<{
  data: string;
  driverData: string;
}>({
  dataType() {
    return "text";
  },
  toDriver(value: Date | string): string {
    if (typeof value === "string") return value.split("T")[0] ?? value;
    return value.toISOString().split("T")[0] ?? value.toISOString();
  },
  fromDriver(value: string): string {
    return value;
  },
});

type StringEnumValue<T extends Record<string, string | number>> = Extract<
  T[keyof T],
  string
>;

export function enumToSqliteEnum<T extends Record<string, string | number>>(
  myEnum: T,
): [StringEnumValue<T>, ...StringEnumValue<T>[]] {
  return Object.values(myEnum).map(String) as [
    StringEnumValue<T>,
    ...StringEnumValue<T>[],
  ];
}

export function coalesce<T>(
  ...columns: (AnyColumn<{ data: T }> | SQL<T> | T)[]
): SQL<T | null> {
  const sqlArgs = sql.join(
    columns.map((a) => sql`${a}`),
    sql.raw(","),
  );
  return sql`coalesce(${sqlArgs})`;
}
