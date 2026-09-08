export type UserRole = "Partner" | "AuditStaff";

export interface User {
  id: number;
  email: string;
  fullName: string;
  role: UserRole;
  createdAt?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export type CompanyStatus = "Active" | "Inactive";

export interface Company {
  id: number;
  companyName: string;
  contactPerson: string;
  email: string;
  alternativeEmail?: string | null;
  mobile: string;
  address: string;
  pan: string;
  industry: string;
  status: CompanyStatus;
  categories: string[];
  createdDate: string;
}

export type CategoryStatus = "Active" | "Inactive";

export interface Category {
  id: number;
  category: string;
  description: string;
  status?: CategoryStatus;
  companyCount: number;
  createdDate: string;
}

export interface EmailTemplate {
  id: number;
  templateName: string;
  subject: string;
  body: string;
  createdDate: string;
}

export interface EmailAttachment {
  filename: string;
  content: string; // base64 encoded
  contentType?: string;
}

export type CommunicationStatus = "Sent" | "Scheduled" | "Draft" | "Failed";

export interface Communication {
  id: number;
  subject: string;
  body: string;
  categories: string[];
  recipientCount: number;
  status: CommunicationStatus;
  sentDate: string | null;
  scheduledFor: string | null;
  attachments?: EmailAttachment[];
}

export interface CommunicationRecipient {
  id: number;
  communicationId: number;
  companyId: number | null;
  companyName?: string | null;
  email: string;
  status: "Pending" | "Sent" | "Failed";
  error: string | null;
}

export type DetailedCommunicationRecipient = CommunicationRecipient;

export interface DetailedCommunication extends Communication {
  recipients?: CommunicationRecipient[];
}

export type SmtpEncryption = "tls" | "ssl" | "none";

export interface SmtpConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  encryption: SmtpEncryption;
  senderEmail: string;
  senderName: string;
}
