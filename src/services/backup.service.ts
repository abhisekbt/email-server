import fs from "node:fs";
import path from "node:path";
import { Pool } from "pg";

import { env } from "../config/env";
import { fallbackPool, primaryPool } from "../db/pool";

function resolveMigrationsDir(): string {
  const candidate1 = path.join(__dirname, "../db/migrations");
  if (fs.existsSync(candidate1)) return candidate1;

  const candidate2 = path.join(process.cwd(), "src/db/migrations");
  if (fs.existsSync(candidate2)) return candidate2;

  const candidate3 = path.join(process.cwd(), "server/src/db/migrations");
  if (fs.existsSync(candidate3)) return candidate3;

  const candidate4 = path.join(__dirname, "../../../src/db/migrations");
  if (fs.existsSync(candidate4)) return candidate4;

  return candidate1;
}

export class BackupService {
  private syncTimer: NodeJS.Timeout | null = null;
  private isSyncing = false;

  /**
   * Applies schema migrations to a target PostgreSQL connection pool (e.g. Supabase).
   */
  async ensureSchemaOnPool(targetPool: Pool): Promise<void> {
    const migrationsDir = resolveMigrationsDir();
    if (!fs.existsSync(migrationsDir)) {
      console.warn(`[BACKUP] Migrations folder not found for Supabase at: ${migrationsDir}`);
      return;
    }

    await targetPool.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    const result = await targetPool.query<{ name: string }>("SELECT name FROM schema_migrations");
    const applied = new Set(result.rows.map((r) => r.name));

    const files = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith(".sql"))
      .sort();

    for (const file of files) {
      if (applied.has(file)) continue;

      const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
      console.log(`[BACKUP:Supabase] Applying schema migration: ${file}`);

      const client = await targetPool.connect();
      try {
        await client.query("BEGIN");
        await client.query(sql);
        await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [file]);
        await client.query("COMMIT");
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      } finally {
        client.release();
      }
    }
  }

  /**
   * Synchronizes all primary database tables to the Supabase standby database.
   */
  async syncToSupabase(): Promise<{
    success: boolean;
    syncedTables: Record<string, number>;
    error?: string;
  }> {
    if (!fallbackPool) {
      return {
        success: false,
        syncedTables: {},
        error: "Supabase fallback database is not configured (SUPABASE_DATABASE_URL is missing).",
      };
    }

    if (this.isSyncing) {
      return {
        success: false,
        syncedTables: {},
        error: "Synchronization already in progress.",
      };
    }

    this.isSyncing = true;
    const stats: Record<string, number> = {};

    try {
      console.log("[BACKUP] Verifying schema on Supabase standby database...");
      await this.ensureSchemaOnPool(fallbackPool);

      // 1. Sync Users
      const usersRes = await primaryPool.query("SELECT * FROM users ORDER BY id ASC");
      if (usersRes.rows.length > 0) {
        for (const u of usersRes.rows) {
          await fallbackPool.query(
            `INSERT INTO users (id, email, password_hash, full_name, role, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT (id) DO UPDATE SET
               email = EXCLUDED.email,
               password_hash = EXCLUDED.password_hash,
               full_name = EXCLUDED.full_name,
               role = EXCLUDED.role,
               updated_at = EXCLUDED.updated_at`,
            [u.id, u.email, u.password_hash, u.full_name, u.role, u.created_at, u.updated_at]
          );
        }
      }
      stats.users = usersRes.rows.length;

      // 2. Sync Categories / Industries
      const catRes = await primaryPool.query("SELECT * FROM categories ORDER BY id ASC");
      if (catRes.rows.length > 0) {
        for (const c of catRes.rows) {
          await fallbackPool.query(
            `INSERT INTO categories (id, category, description, status, created_date)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (id) DO UPDATE SET
               category = EXCLUDED.category,
               description = EXCLUDED.description,
               status = EXCLUDED.status,
               created_date = EXCLUDED.created_date`,
            [c.id, c.category, c.description, c.status, c.created_date]
          );
        }
      }
      stats.categories = catRes.rows.length;

      // 3. Sync Companies / Clients
      const compRes = await primaryPool.query("SELECT * FROM companies ORDER BY id ASC");
      if (compRes.rows.length > 0) {
        for (const comp of compRes.rows) {
          await fallbackPool.query(
            `INSERT INTO companies (id, company_name, contact_person, email, alternative_email, mobile, address, pan, industry, status, categories, created_date)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
             ON CONFLICT (id) DO UPDATE SET
               company_name = EXCLUDED.company_name,
               contact_person = EXCLUDED.contact_person,
               email = EXCLUDED.email,
               alternative_email = EXCLUDED.alternative_email,
               mobile = EXCLUDED.mobile,
               address = EXCLUDED.address,
               pan = EXCLUDED.pan,
               industry = EXCLUDED.industry,
               status = EXCLUDED.status,
               categories = EXCLUDED.categories,
               created_date = EXCLUDED.created_date`,
            [
              comp.id,
              comp.company_name,
              comp.contact_person,
              comp.email,
              comp.alternative_email,
              comp.mobile,
              comp.address,
              comp.pan,
              comp.industry,
              comp.status,
              comp.categories,
              comp.created_date,
            ]
          );
        }
      }
      stats.companies = compRes.rows.length;

      // 4. Sync Email Templates
      const templRes = await primaryPool.query("SELECT * FROM email_templates ORDER BY id ASC");
      if (templRes.rows.length > 0) {
        for (const t of templRes.rows) {
          await fallbackPool.query(
            `INSERT INTO email_templates (id, template_name, subject, body, created_date)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (id) DO UPDATE SET
               template_name = EXCLUDED.template_name,
               subject = EXCLUDED.subject,
               body = EXCLUDED.body,
               created_date = EXCLUDED.created_date`,
            [t.id, t.template_name, t.subject, t.body, t.created_date]
          );
        }
      }
      stats.email_templates = templRes.rows.length;

      // 5. Sync Communications
      const commRes = await primaryPool.query("SELECT * FROM communications ORDER BY id ASC");
      if (commRes.rows.length > 0) {
        for (const m of commRes.rows) {
          await fallbackPool.query(
            `INSERT INTO communications (id, subject, body, categories, recipient_count, status, sent_at, scheduled_for, created_date, attachments)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
             ON CONFLICT (id) DO UPDATE SET
               subject = EXCLUDED.subject,
               body = EXCLUDED.body,
               categories = EXCLUDED.categories,
               recipient_count = EXCLUDED.recipient_count,
               status = EXCLUDED.status,
               sent_at = EXCLUDED.sent_at,
               scheduled_for = EXCLUDED.scheduled_for,
               created_date = EXCLUDED.created_date,
               attachments = EXCLUDED.attachments`,
            [
              m.id,
              m.subject,
              m.body,
              m.categories,
              m.recipient_count,
              m.status,
              m.sent_at,
              m.scheduled_for,
              m.created_date,
              JSON.stringify(m.attachments || []),
            ]
          );
        }
      }
      stats.communications = commRes.rows.length;

      // 6. Sync Communication Logs
      const logsRes = await primaryPool.query("SELECT * FROM communication_logs ORDER BY id ASC");
      if (logsRes.rows.length > 0) {
        for (const l of logsRes.rows) {
          await fallbackPool.query(
            `INSERT INTO communication_logs (id, communication_id, company_id, company_name, email, status, error_message, sent_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             ON CONFLICT (id) DO UPDATE SET
               communication_id = EXCLUDED.communication_id,
               company_id = EXCLUDED.company_id,
               company_name = EXCLUDED.company_name,
               email = EXCLUDED.email,
               status = EXCLUDED.status,
               error_message = EXCLUDED.error_message,
               sent_at = EXCLUDED.sent_at`,
            [l.id, l.communication_id, l.company_id, l.company_name, l.email, l.status, l.error_message, l.sent_at]
          );
        }
      }
      stats.communication_logs = logsRes.rows.length;

      // 7. Sync SMTP Config
      const smtpRes = await primaryPool.query("SELECT * FROM smtp_config ORDER BY id ASC");
      if (smtpRes.rows.length > 0) {
        for (const s of smtpRes.rows) {
          await fallbackPool.query(
            `INSERT INTO smtp_config (id, host, port, username, password, encryption, sender_email, sender_name, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             ON CONFLICT (id) DO UPDATE SET
               host = EXCLUDED.host,
               port = EXCLUDED.port,
               username = EXCLUDED.username,
               password = EXCLUDED.password,
               encryption = EXCLUDED.encryption,
               sender_email = EXCLUDED.sender_email,
               sender_name = EXCLUDED.sender_name,
               updated_at = EXCLUDED.updated_at`,
            [s.id, s.host, s.port, s.username, s.password, s.encryption, s.sender_email, s.sender_name, s.updated_at]
          );
        }
      }
      stats.smtp_config = smtpRes.rows.length;

      console.log("[BACKUP:Supabase] Synchronized tables successfully:", stats);
      return {
        success: true,
        syncedTables: stats,
      };
    } catch (error) {
      const msg = (error as Error).message;
      console.error("[BACKUP:Supabase Sync Failed]", msg);
      return {
        success: false,
        syncedTables: stats,
        error: msg,
      };
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Starts periodic background synchronization to Supabase.
   */
  startPeriodicSync(intervalMinutes: number = env.supabaseSyncIntervalMinutes) {
    if (!fallbackPool) {
      console.log("[BACKUP] Supabase fallback database is not configured. Periodic sync disabled.");
      return;
    }

    const intervalMs = Math.max(1, intervalMinutes) * 60 * 1000;
    console.log(`[BACKUP] Initialized Supabase periodic standby backup (interval: ${intervalMinutes} mins).`);

    // Run initial sync shortly after boot
    setTimeout(() => {
      this.syncToSupabase().catch((err) =>
        console.error("[BACKUP] Initial Supabase sync warning:", err.message)
      );
    }, 15000);

    this.syncTimer = setInterval(() => {
      this.syncToSupabase().catch((err) =>
        console.error("[BACKUP] Periodic Supabase sync warning:", err.message)
      );
    }, intervalMs);
  }

  stop() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }
}

export const backupService = new BackupService();
