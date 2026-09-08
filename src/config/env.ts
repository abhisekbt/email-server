import "dotenv/config";

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  port: Number(process.env.PORT ?? 4000),
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:3000",
  databaseUrl: required("DATABASE_URL", "postgres://postgres:postgres@localhost:5432/reconepal"),
  supabaseDatabaseUrl: process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_FALLBACK_URL || null,
  supabaseSyncIntervalMinutes: Number(process.env.SUPABASE_SYNC_INTERVAL_MINUTES ?? 60),
  smtp: {
    host: process.env.SMTP_HOST ?? "smtp.example.com",
    port: Number(process.env.SMTP_PORT ?? 587),
    username: process.env.SMTP_USERNAME ?? "",
    password: process.env.SMTP_PASSWORD ?? "",
    encryption: (process.env.SMTP_ENCRYPTION as "tls" | "ssl" | "none") ?? "tls",
    senderEmail: process.env.SMTP_SENDER_EMAIL ?? "noreply@example.com",
    senderName: process.env.SMTP_SENDER_NAME ?? "RecoNepal",
  },
};
