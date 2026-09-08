import fs from "node:fs";
import path from "node:path";

import { pool } from "./pool";

function resolveMigrationsDir(): string {
  const candidate1 = path.join(__dirname, "migrations");
  if (fs.existsSync(candidate1)) return candidate1;

  const candidate2 = path.join(process.cwd(), "src/db/migrations");
  if (fs.existsSync(candidate2)) return candidate2;

  const candidate3 = path.join(process.cwd(), "server/src/db/migrations");
  if (fs.existsSync(candidate3)) return candidate3;

  const candidate4 = path.join(__dirname, "../../src/db/migrations");
  if (fs.existsSync(candidate4)) return candidate4;

  return candidate1;
}

const migrationsDir = resolveMigrationsDir();

async function ensureMigrationsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
}

async function getAppliedMigrations(): Promise<Set<string>> {
  const result = await pool.query<{ name: string }>("SELECT name FROM schema_migrations");
  return new Set(result.rows.map((row) => row.name));
}

export async function runMigrations() {
  await ensureMigrationsTable();
  const applied = await getAppliedMigrations();

  if (!fs.existsSync(migrationsDir)) {
    console.warn(`Migrations directory not found at: ${migrationsDir}`);
    return;
  }

  const files = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith(".sql"))
    .sort();

  for (const file of files) {
    if (applied.has(file)) {
      continue;
    }

    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
    console.log(`[DB] Applying migration: ${file}`);

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [file]);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  console.log("[DB] Schema migrations up to date.");
}

if (require.main === module) {
  runMigrations()
    .then(() => pool.end())
    .catch((error) => {
      console.error("Migration failed:", error);
      process.exitCode = 1;
    });
}
