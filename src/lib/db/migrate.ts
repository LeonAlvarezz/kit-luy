import { $ } from "bun";
import { getMode } from "./utils/get-mode";

const D1_BINDING = "D1_DB";

async function main() {
  const args = process.argv.slice(2);
  const mode = getMode(args);
  console.log(`🌱 Running ${mode} migration...`);
  await $`bunx wrangler d1 migrations apply ${D1_BINDING} ${mode === "prod" ? "--remote" : "--local"}`;
  console.log(`✅ ${mode} migration completed successfully!`);
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Unexpected error during migration:", err);
  process.exit(1);
});
