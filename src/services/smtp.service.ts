import { pool } from "../db/pool";
import { env } from "../config/env";
import { SmtpConfig, SmtpEncryption } from "../types";
import { toSmtpConfig } from "../utils/mappers";

export interface SmtpConfigInput {
  host: string;
  port: number;
  username: string;
  password?: string;
  encryption: SmtpEncryption;
  senderEmail: string;
  senderName: string;
}

const fallbackConfig: SmtpConfig = { ...env.smtp };

export const smtpService = {
  async get(): Promise<SmtpConfig> {
    const result = await pool.query("SELECT * FROM smtp_config ORDER BY id ASC LIMIT 1");
    if (!result.rows[0]) return fallbackConfig;
    return toSmtpConfig(result.rows[0]);
  },

  async update(payload: Partial<SmtpConfigInput>): Promise<SmtpConfig> {
    const existing = await pool.query("SELECT * FROM smtp_config ORDER BY id ASC LIMIT 1");
    const current = existing.rows[0] ? toSmtpConfig(existing.rows[0]) : fallbackConfig;

    const merged: SmtpConfig = {
      host: payload.host ?? current.host,
      port: payload.port ?? current.port,
      username: payload.username ?? current.username,
      password:
        payload.password && payload.password.trim() !== "" ? payload.password : current.password,
      encryption: payload.encryption ?? current.encryption,
      senderEmail: payload.senderEmail ?? current.senderEmail,
      senderName: payload.senderName ?? current.senderName,
    };

    if (existing.rows[0]) {
      await pool.query(
        `UPDATE smtp_config SET host = $1, port = $2, username = $3, password = $4,
          encryption = $5, sender_email = $6, sender_name = $7 WHERE id = $8`,
        [
          merged.host,
          merged.port,
          merged.username,
          merged.password,
          merged.encryption,
          merged.senderEmail,
          merged.senderName,
          existing.rows[0].id,
        ]
      );
    } else {
      await pool.query(
        `INSERT INTO smtp_config (host, port, username, password, encryption, sender_email, sender_name)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          merged.host,
          merged.port,
          merged.username,
          merged.password,
          merged.encryption,
          merged.senderEmail,
          merged.senderName,
        ]
      );
    }

    return merged;
  },
};
