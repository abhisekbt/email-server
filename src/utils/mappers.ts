import {
  Category,
  Communication,
  CommunicationRecipient,
  Company,
  EmailAttachment,
  EmailTemplate,
  SmtpConfig,
} from "../types";

interface CompanyRow {
  id: number;
  company_name: string;
  contact_person: string;
  email: string;
  alternative_email: string | null;
  mobile: string;
  address: string;
  pan: string;
  industry: string;
  status: Company["status"];
  categories: string[] | null;
  created_date: string | Date;
}

interface CategoryRow {
  id: number;
  category: string;
  description: string;
  status?: Category["status"];
  company_count: number | string | null;
  created_date: string | Date;
}

interface EmailTemplateRow {
  id: number;
  template_name: string;
  subject: string;
  body: string;
  created_date: string | Date;
}

interface CommunicationRow {
  id: number;
  subject: string;
  body: string;
  categories: string[] | null;
  recipient_count: number;
  status: Communication["status"];
  sent_date: string | Date | null;
  scheduled_for: string | Date | null;
  attachments?: EmailAttachment[] | null;
}

interface CommunicationRecipientRow {
  id: number;
  communication_id: number;
  company_id: number | null;
  email: string;
  status: CommunicationRecipient["status"];
  error: string | null;
}

interface SmtpConfigRow {
  host: string;
  port: number;
  username: string;
  password: string;
  encryption: SmtpConfig["encryption"];
  sender_email: string;
  sender_name: string;
}

export function toCompany(row: CompanyRow): Company {
  return {
    id: row.id,
    companyName: row.company_name,
    contactPerson: row.contact_person,
    email: row.email,
    alternativeEmail: row.alternative_email,
    mobile: row.mobile,
    address: row.address,
    pan: row.pan,
    industry: row.industry,
    status: row.status,
    categories: row.categories ?? [],
    createdDate: toDateString(row.created_date),
  };
}

export function toCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    category: row.category,
    description: row.description,
    status: row.status,
    companyCount: Number(row.company_count ?? 0),
    createdDate: toDateString(row.created_date),
  };
}

export function toEmailTemplate(row: EmailTemplateRow): EmailTemplate {
  return {
    id: row.id,
    templateName: row.template_name,
    subject: row.subject,
    body: row.body,
    createdDate: toDateString(row.created_date),
  };
}

export function toCommunication(row: CommunicationRow): Communication {
  return {
    id: row.id,
    subject: row.subject,
    body: row.body,
    categories: row.categories ?? [],
    recipientCount: row.recipient_count,
    status: row.status,
    sentDate: row.sent_date ? toDateString(row.sent_date) : null,
    scheduledFor: row.scheduled_for ? (row.scheduled_for instanceof Date ? row.scheduled_for.toISOString() : String(row.scheduled_for)) : null,
    attachments: Array.isArray(row.attachments) ? row.attachments : undefined,
  };
}

export function toCommunicationRecipient(row: CommunicationRecipientRow): CommunicationRecipient {
  return {
    id: row.id,
    communicationId: row.communication_id,
    companyId: row.company_id,
    email: row.email,
    status: row.status,
    error: row.error,
  };
}

export function toSmtpConfig(row: SmtpConfigRow): SmtpConfig {
  return {
    host: row.host,
    port: row.port,
    username: row.username,
    password: row.password,
    encryption: row.encryption,
    senderEmail: row.sender_email,
    senderName: row.sender_name,
  };
}

function toDateString(value: string | Date): string {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  return String(value).slice(0, 10);
}
