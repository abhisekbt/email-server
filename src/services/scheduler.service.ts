import { pool } from "../db/pool";
import { EmailAttachment } from "../types";
import { companiesService } from "./companies.service";
import { mailerService } from "./mailer.service";

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

let schedulerTimer: NodeJS.Timeout | null = null;
let isProcessing = false;

export const schedulerService = {
  async processDueScheduledCommunications(): Promise<void> {
    if (isProcessing) return;
    isProcessing = true;

    try {
      // Find all scheduled communications where scheduled_for is reached or passed
      const { rows: dueCommunications } = await pool.query<{
        id: number;
        subject: string;
        body: string;
        categories: string[] | null;
        scheduled_for: Date | string;
        attachments: EmailAttachment[] | null;
      }>(
        `SELECT id, subject, body, categories, scheduled_for, attachments
         FROM communications
         WHERE status = 'Scheduled' AND scheduled_for <= NOW()
         ORDER BY scheduled_for ASC`
      );

      if (dueCommunications.length === 0) {
        return;
      }

      console.log(`[SCHEDULER] Found ${dueCommunications.length} due scheduled communication(s). Dispatching...`);

      for (const comm of dueCommunications) {
        const categories = comm.categories ?? [];
        const recipients = dedupeByEmail(await companiesService.listByCategories(categories));
        const attachments = Array.isArray(comm.attachments) ? comm.attachments : undefined;

        console.log(
          `[SCHEDULER] Processing communication #${comm.id} (${comm.subject}) for ${recipients.length} active client(s) with ${attachments?.length ?? 0} attachment(s)...`
        );

        if (recipients.length === 0) {
          console.warn(`[SCHEDULER] No active recipients found for communication #${comm.id}. Marking as Failed.`);
          await pool.query(
            "UPDATE communications SET status = 'Failed', sent_date = CURRENT_DATE, recipient_count = 0 WHERE id = $1",
            [comm.id]
          );
          continue;
        }

        let sentCount = 0;
        let failedCount = 0;

        for (const recipient of recipients) {
          const personalizedBody = interpolate(comm.body, {
            contactPerson: recipient.contactPerson,
            companyName: recipient.companyName,
          }).replace(/\n/g, "<br />");

          try {
            await mailerService.sendMail({
              to: recipient.email,
              subject: comm.subject,
              html: personalizedBody,
              attachments,
            });
            sentCount += 1;
            await pool.query(
              "INSERT INTO communication_recipients (communication_id, company_id, email, status) VALUES ($1, $2, $3, 'Sent')",
              [comm.id, recipient.id, recipient.email]
            );
          } catch (error) {
            failedCount += 1;
            const message = error instanceof Error ? error.message : "Failed to send scheduled email";
            console.error(`[SCHEDULER] Failed to send scheduled email #${comm.id} to ${recipient.email}:`, message);
            await pool.query(
              "INSERT INTO communication_recipients (communication_id, company_id, email, status, error) VALUES ($1, $2, $3, 'Failed', $4)",
              [comm.id, recipient.id, recipient.email, message]
            );
          }
        }

        const finalStatus = sentCount > 0 ? "Sent" : "Failed";
        await pool.query(
          "UPDATE communications SET status = $1, sent_date = CURRENT_DATE, recipient_count = $2 WHERE id = $3",
          [finalStatus, recipients.length, comm.id]
        );

        console.log(
          `[SCHEDULER] Communication #${comm.id} completed. Sent: ${sentCount}, Failed: ${failedCount}, Attachments: ${attachments?.length ?? 0}, Final Status: ${finalStatus}.`
        );
      }
    } catch (error) {
      console.error("[SCHEDULER] Error during scheduled dispatch processing:", error);
    } finally {
      isProcessing = false;
    }
  },

  start(intervalMs = 30000): void {
    if (schedulerTimer) return;
    console.log(`[SCHEDULER] Background scheduled circular runner initialized (interval: ${intervalMs / 1000}s).`);
    // Run immediately once on start
    this.processDueScheduledCommunications();
    // Then poll periodically
    schedulerTimer = setInterval(() => {
      this.processDueScheduledCommunications();
    }, intervalMs);
  },

  stop(): void {
    if (schedulerTimer) {
      clearInterval(schedulerTimer);
      schedulerTimer = null;
      console.log("[SCHEDULER] Background scheduled circular runner stopped.");
    }
  },
};
