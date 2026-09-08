import nodemailer, { Transporter } from "nodemailer";

import { SmtpConfig } from "../types";
import { smtpService } from "./smtp.service";

function cleanPassword(pass?: string): string | undefined {
  if (!pass) return pass;
  // If Google App Password format (e.g. "abcd efgh ijkl mnop"), strip spaces
  if (pass.includes(" ") && pass.replace(/\s+/g, "").length === 16) {
    return pass.replace(/\s+/g, "");
  }
  return pass;
}

function buildTransporter(config: SmtpConfig): Transporter {
  const isSecure = config.encryption === "ssl" || config.port === 465;
  const password = cleanPassword(config.password);
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: isSecure,
    requireTLS: config.encryption === "tls" && !isSecure,
    auth: config.username ? { user: config.username, pass: password } : undefined,
  });
}

export const mailerService = {
  async getTransporter(): Promise<{ transporter: Transporter; config: SmtpConfig }> {
    const config = await smtpService.get();
    return { transporter: buildTransporter(config), config };
  },

  async verifyConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const { transporter } = await this.getTransporter();
      await transporter.verify();
      return { success: true, message: "SMTP connection succeeded" };
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : "SMTP connection failed" };
    }
  },

  async sendMail(options: {
    to: string;
    subject: string;
    html: string;
    attachments?: Array<{ filename: string; content: string; contentType?: string }>;
  }): Promise<void> {
    const { transporter, config } = await this.getTransporter();
    await transporter.sendMail({
      from: `"${config.senderName}" <${config.senderEmail}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      attachments: options.attachments?.map((att) => {
        const rawContent = att.content.includes(",") ? att.content.split(",")[1] : att.content;
        return {
          filename: att.filename,
          content: rawContent,
          encoding: "base64",
          contentType: att.contentType,
        };
      }),
    });
  },
};
