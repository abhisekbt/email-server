import { pool } from "../db/pool";
import { EmailTemplate } from "../types";
import { toEmailTemplate } from "../utils/mappers";

export interface EmailTemplateInput {
  templateName: string;
  subject: string;
  body: string;
}

export const templatesService = {
  async list(): Promise<EmailTemplate[]> {
    const result = await pool.query("SELECT * FROM email_templates ORDER BY id ASC");
    return result.rows.map(toEmailTemplate);
  },

  async get(id: number): Promise<EmailTemplate | null> {
    const result = await pool.query("SELECT * FROM email_templates WHERE id = $1", [id]);
    return result.rows[0] ? toEmailTemplate(result.rows[0]) : null;
  },

  async create(payload: EmailTemplateInput): Promise<EmailTemplate> {
    const result = await pool.query(
      "INSERT INTO email_templates (template_name, subject, body) VALUES ($1, $2, $3) RETURNING *",
      [payload.templateName, payload.subject, payload.body]
    );
    return toEmailTemplate(result.rows[0]);
  },

  async update(id: number, payload: Partial<EmailTemplateInput>): Promise<EmailTemplate | null> {
    const existing = await this.get(id);
    if (!existing) return null;

    const result = await pool.query(
      "UPDATE email_templates SET template_name = $1, subject = $2, body = $3 WHERE id = $4 RETURNING *",
      [
        payload.templateName ?? existing.templateName,
        payload.subject ?? existing.subject,
        payload.body ?? existing.body,
        id,
      ]
    );
    return toEmailTemplate(result.rows[0]);
  },

  async remove(id: number): Promise<boolean> {
    const result = await pool.query("DELETE FROM email_templates WHERE id = $1", [id]);
    return (result.rowCount ?? 0) > 0;
  },
};
