import { backupService } from "../services/backup.service";
import { fallbackPool, primaryPool } from "../db/pool";

async function main() {
  console.log("=== RecoNepal -> Supabase Standby Synchronization ===");

  if (!fallbackPool) {
    console.error("Error: SUPABASE_DATABASE_URL environment variable is not set.");
    console.error("Please add SUPABASE_DATABASE_URL=postgres://postgres.[ref]:[pass]@[host]:[port]/postgres to your .env file.");
    process.exit(1);
  }

  console.log("1. Checking connection to Primary Database...");
  await primaryPool.query("SELECT 1");
  console.log("✓ Primary Database reachable.");

  console.log("2. Checking connection to Supabase Standby...");
  await fallbackPool.query("SELECT 1");
  console.log("✓ Supabase Standby reachable.");

  console.log("3. Initiating schema verification and full data replication...");
  const result = await backupService.syncToSupabase();

  if (result.success) {
    console.log("✓ Backup & synchronization completed successfully!");
    console.table(result.syncedTables);
  } else {
    console.error("✗ Backup failed:", result.error);
    process.exit(1);
  }

  await primaryPool.end();
  await fallbackPool.end();
}

main().catch((error) => {
  console.error("Unexpected error during Supabase sync:", error);
  process.exit(1);
});
