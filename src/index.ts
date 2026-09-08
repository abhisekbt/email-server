import { createApp } from "./app";
import { env } from "./config/env";
import { runMigrations } from "./db/migrate";
import { backupService } from "./services/backup.service";
import { schedulerService } from "./services/scheduler.service";

async function bootstrap() {
  // Ensure database migrations are automatically verified and applied on startup
  try {
    await runMigrations();
  } catch (error) {
    console.error("[DB] Migration check warning (will retry on incoming requests):", (error as Error).message);
  }

  const app = createApp();

  app.listen(env.port, () => {
    console.log(`RecoNepal API server listening on http://localhost:${env.port}`);
    schedulerService.start(30000); // Poll every 30 seconds for due scheduled dispatches

    // Start periodic background synchronization to Supabase standby (if configured)
    if (env.supabaseDatabaseUrl) {
      backupService.startPeriodicSync(env.supabaseSyncIntervalMinutes);
    }
  });
}

bootstrap().catch((error) => {
  console.error("Fatal server bootstrap error:", error);
  process.exit(1);
});
