import { z } from "zod";

export const companyPayloadSchema = z.object({
  companyName: z.string().min(2),
  contactPerson: z.string().min(2),
  email: z.string().email(),
  alternativeEmail: z.string().email().optional().or(z.literal("")).nullable(),
  mobile: z.string().min(7),
  address: z.string().min(3),
  pan: z.string().min(3),
  industry: z.string().min(1),
  status: z.enum(["Active", "Inactive"]),
  categories: z.array(z.string()).min(1),
});

export const companyUpdateSchema = companyPayloadSchema.partial();

export const assignCategoriesSchema = z.object({
  categories: z.array(z.string()),
});

export const categoryPayloadSchema = z.object({
  category: z.string().min(1),
  description: z.string().default(""),
  status: z.enum(["Active", "Inactive"]).optional().default("Active"),
});

export const categoryUpdateSchema = categoryPayloadSchema.partial();

export const templatePayloadSchema = z.object({
  templateName: z.string().min(2),
  subject: z.string().min(2),
  body: z.string().min(2),
});

export const templateUpdateSchema = templatePayloadSchema.partial();

export const emailAttachmentSchema = z.object({
  filename: z.string().min(1),
  content: z.string().min(1),
  contentType: z.string().optional(),
});

export const sendCommunicationSchema = z.object({
  subject: z.string().min(2),
  body: z.string().min(2),
  categories: z.array(z.string()).min(1),
  attachments: z.array(emailAttachmentSchema).optional(),
});

export const scheduleCommunicationSchema = sendCommunicationSchema.extend({
  scheduledFor: z.string().min(4),
});

export const testDispatchSchema = z.object({
  subject: z.string().min(2),
  body: z.string().min(2),
  testEmail: z.string().email(),
  attachments: z.array(emailAttachmentSchema).optional(),
});

export const smtpConfigSchema = z.object({
  host: z.string().min(1),
  port: z.number().int().positive(),
  username: z.string().optional().default(""),
  password: z.string().optional(),
  encryption: z.enum(["tls", "ssl", "none"]),
  senderEmail: z.string().email(),
  senderName: z.string().min(1),
});

export const smtpConfigUpdateSchema = smtpConfigSchema.partial();
