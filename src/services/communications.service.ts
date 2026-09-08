import { pool } from "../db/pool";
import { Communication, DetailedCommunication, DetailedCommunicationRecipient } from "../types";
import { ApiError } from "../middleware/error-handler";
import { toCommunication } from "../utils/mappers";
import { companiesService } from "./companies.service";
import { mailerService } from "./mailer.service";

interface AttachmentInput {
  filename: string;
  content: string; // base64
  contentType?: string;
}

export interface SendCommunicationInput {
  subject: string;
  body: string;
  categories: string[];
  attachments?: AttachmentInput[];
}

export interface ScheduleCommunicationInput {
  subject: string;
  body: string;
  categories: string[];
  scheduledFor: string;
  attachments?: AttachmentInput[];
}

export interface TestDispatchInput {
  testEmail: string;
  subject: string;
  body: string;
  attachments?: AttachmentInput[];
}

function interpolate(template: string, values: Record<string, string>): string {
  return template.replace(/{{\s*(\w+)\s*}}/g, (_match, key: string) => values[key] ?? "");
}

function dedupeByEmail<T extends { email: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.email)) return false;
    seen.add(item.email);
    return true;
  });
}

export const communicationsService = {
  async list(): Promise<Communication[]> {
    const result = await pool.query(
      `SELECT * FROM communications
       ORDER BY created_at DESC, id DESC`
    );
    return result.rows.map(toCommunication);
  },

  async get(id: number): Promise<DetailedCommunication | null> {
    const commResult = await pool.query("SELECT * FROM communications WHERE id = $1", [id]);
    if (!commResult.rows[0]) return null;

    const comm = toCommunication(commResult.rows[0]);

    const recipientRows = await pool.query(
      `SELECT
         cr.id,
         cr.company_id,
         cr.email,
         cr.status,
         cr.error,
         c.company_name
       FROM communication_recipients cr
       LEFT JOIN companies c ON cr.company_id = c.id
       WHERE cr.communication_id = $1
       ORDER BY cr.id ASC`,
      [id]
    );

    const recipients: DetailedCommunicationRecipient[] = recipientRows.rows.map((r) => ({
      id: r.id,
      communicationId: r.communication_id ?? id,
      companyId: r.company_id,
      companyName: r.company_name,
      email: r.email,
      status: r.status,
      error: r.error,
    }));

    return {
      ...comm,
      recipients,
    };
  },

  async send(payload: SendCommunicationInput): Promise<Communication> {
    const recipients = dedupeByEmail(await companiesService.listByCategories(payload.categories));

    if (recipients.length === 0) {
      throw new ApiError(400, "No recipients found for the selected categories. Assign companies to these categories first.");
    }

    const attachmentsJson = JSON.stringify(payload.attachments || []);

    const commResult = await pool.query(
      `INSERT INTO communications (subject, body, categories, recipient_count, status, sent_date, attachments)
       VALUES ($1, $2, $3, $4, 'Sent', CURRENT_DATE, $5::jsonb)
       RETURNING *`,
      [payload.subject, payload.body, payload.categories, recipients.length, attachmentsJson]
    );
    const communicationId = commResult.rows[0].id;

    let sentCount = 0;
    let failedCount = 0;

    for (const recipient of recipients) {
      const personalizedBody = interpolate(payload.body, {
        contactPerson: recipient.contactPerson,
        companyName: recipient.companyName,
      }).replace(/\n/g, "<br />");

      try {
        await mailerService.sendMail({
          to: recipient.email,
          subject: payload.subject,
          html: personalizedBody,
          attachments: payload.attachments,
        });
        sentCount += 1;
        await pool.query(
          "INSERT INTO communication_recipients (communication_id, company_id, email, status) VALUES ($1, $2, $3, 'Sent')",
          [communicationId, recipient.id, recipient.email]
        );
      } catch (error) {
        failedCount += 1;
        const message = error instanceof Error ? error.message : "Failed to send email";
        console.error(`Failed to send communication ${communicationId} to ${recipient.email}:`, message);
        await pool.query(
          "INSERT INTO communication_recipients (communication_id, company_id, email, status, error) VALUES ($1, $2, $3, 'Failed', $4)",
          [communicationId, recipient.id, recipient.email, message]
        );
      }
    }

    if (failedCount > 0) {
      console.warn(`Communication ${communicationId}: ${failedCount} of ${recipients.length} emails failed to send.`);
    }

    const finalStatus = recipients.length > 0 && sentCount === 0 ? "Failed" : "Sent";
    const updateResult = await pool.query("UPDATE communications SET status = $1 WHERE id = $2 RETURNING *", [
      finalStatus,
      communicationId,
    ]);

    return {
      ...toCommunication(updateResult.rows[0]),
      recipientCount: recipients.length,
    };
  },

  async schedule(payload: ScheduleCommunicationInput): Promise<Communication> {
    const recipients = dedupeByEmail(await companiesService.listByCategories(payload.categories));
    const attachmentsJson = JSON.stringify(payload.attachments || []);

    const result = await pool.query(
      `INSERT INTO communications (subject, body, categories, recipient_count, status, scheduled_for, attachments)
       VALUES ($1, $2, $3, $4, 'Scheduled', $5, $6::jsonb)
       RETURNING *`,
      [payload.subject, payload.body, payload.categories, recipients.length, payload.scheduledFor, attachmentsJson]
    );

    return toCommunication(result.rows[0]);
  },

  async draft(payload: SendCommunicationInput): Promise<Communication> {
    const recipients = dedupeByEmail(await companiesService.listByCategories(payload.categories));
    const attachmentsJson = JSON.stringify(payload.attachments || []);

    const result = await pool.query(
      `INSERT INTO communications (subject, body, categories, recipient_count, status, attachments)
       VALUES ($1, $2, $3, $4, 'Draft', $5::jsonb)
       RETURNING *`,
      [payload.subject, payload.body, payload.categories, recipients.length, attachmentsJson]
    );

    return toCommunication(result.rows[0]);
  },

  async testDispatch(payload: TestDispatchInput): Promise<{ success: boolean; message: string }> {
    const personalizedBody = interpolate(payload.body, {
      contactPerson: "Valued Client (Test Preview)",
      companyName: "Sample Corporate Client Corp",
    }).replace(/\n/g, "<br />");

    await mailerService.sendMail({
      to: payload.testEmail,
      subject: `[TEST PREVIEW] ${payload.subject}`,
      html: `<div style="background-color: #f8fafc; padding: 12px; border-left: 4px solid #d97706; margin-bottom: 16px; font-family: sans-serif; font-size: 12px; color: #475569;">
        <strong>NOTICE: TEST PREVIEW DISPATCH</strong><br />
        This is an internal practice test delivery generated for preview inspection before public circular broadcast.
      </div>${personalizedBody}`,
      attachments: payload.attachments,
    });

    return {
      success: true,
      message: `Test circular preview successfully dispatched to ${payload.testEmail}`,
    };
  },
};
