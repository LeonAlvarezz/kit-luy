import { $ } from "bun";
import { getMode } from "./utils/get-mode";

const D1_BINDING = "D1_DB";
const listTablesSql = `
SELECT name
FROM sqlite_master
WHERE type = 'table'
  AND name NOT LIKE 'sqlite_%'
  AND name NOT LIKE '_cf_%'
ORDER BY name;
`;

type D1ExecuteJson = Array<{
  results?: Array<{ name: string }>;
  success: boolean;
}>;

function quoteIdentifier(identifier: string) {
  return `"${identifier.replaceAll('"', '""')}"`;
}

async function main() {
  const args = process.argv.slice(2);
  const mode = getMode(args);
  const locationFlag = mode === "prod" ? "--remote" : "--local";

  if (mode === "prod" && process.env.RESET_PROD_DATABASE !== "true") {
    console.error(
      "Refusing to reset prod database. Set RESET_PROD_DATABASE=true and pass --prod if this is intentional.",
    );
    process.exit(1);
  }

  console.log(`🧹 Resetting ${mode} database...`);
  const tablesResult =
    await $`bunx wrangler d1 execute ${D1_BINDING} ${locationFlag} --json --command ${listTablesSql}`.quiet();
  const tablesJson = JSON.parse(tablesResult.stdout.toString()) as D1ExecuteJson;
  const tables = tablesJson.flatMap((result) => result.results ?? []);

  if (tables.length === 0) {
    console.log("No tables to drop.");
    process.exit(0);
  }

  const resetSql = [
    "PRAGMA foreign_keys = OFF;",
    ...tables.map(({ name }) => `DROP TABLE IF EXISTS ${quoteIdentifier(name)};`),
    "PRAGMA foreign_keys = ON;",
  ].join("\n");

  await $`bunx wrangler d1 execute ${D1_BINDING} ${locationFlag} --command ${resetSql}`;
  for (const table of tables) {
    console.log(`Dropped table: ${table.name}`);
  }
  console.log(`✅ ${mode} database reset completed successfully!`);
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Unexpected error during database reset:", err);
  process.exit(1);
});
