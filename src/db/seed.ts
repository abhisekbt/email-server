import { env } from "../config/env";
import { authService } from "../services/auth.service";
import { pool } from "./pool";

async function seed() {
  // Ensure default practice users exist
  const partnerEmail = "partner@reconepal.com";

  const existingPartner = await authService.findByEmail(partnerEmail);
  if (!existingPartner) {
    await authService.createUser({
      email: partnerEmail,
      password: "Partner@2026",
      fullName: "RecoNepal Partner",
      role: "Partner",
    });
  }

  const { rows: existing } = await pool.query("SELECT COUNT(*)::int AS count FROM companies");
  if (existing[0].count > 0) {
    await pool.end();
    return;
  }

  await pool.query(
    `INSERT INTO categories (category, description, status, created_date) VALUES
      ('Direct Tax', 'Income tax, advance tax compliance, and returns', 'Active', '2024-01-10'),
      ('Statutory Audit', 'Annual statutory audits and independent financial reviews', 'Active', '2024-02-12'),
      ('Corporate Law', 'ROC filings, company compliance, and secretarial matters', 'Active', '2024-03-08'),
      ('Payroll & HR', 'Payroll processing, TDS salary compliance, and provident fund', 'Active', '2024-04-05'),
      ('Financial Advisory', 'Financial risk consulting and strategic advisory', 'Active', '2024-04-20'),
      ('Transfer Pricing', 'Cross-border transaction benchmarking and documentation', 'Active', '2024-05-02'),
      ('Risk & Internal Audit', 'Internal control reviews and process audit', 'Active', '2024-05-18'),
      ('IFRS & GAAP Reporting', 'Financial reporting under international standards', 'Active', '2024-06-01')`
  );

  await pool.query(
    `INSERT INTO companies
      (company_name, contact_person, email, alternative_email, mobile, address, pan, industry, status, categories, created_date)
    VALUES
      ('Northwind Holdings Pvt. Ltd.', 'Alicia Grant', 'ops@northwind.com', 'alerts@northwind.com', '9876543210', 'Tower A, 21st Floor, Kathmandu', 'ABCPG1234H', 'Financial Services', 'Active', ARRAY['Direct Tax','Statutory Audit'], '2024-01-16'),
      ('Verde Capital Partners', 'Darius Cole', 'finance@verdecapital.com', NULL, '9123456780', 'Sector 22, Lalitpur', 'CCQPK4567L', 'Asset Management', 'Active', ARRAY['Corporate Law','Financial Advisory'], '2024-03-02'),
      ('Harbor Advisory Group', 'Mina Flores', 'team@harboradvisory.co', NULL, '9000111222', 'Commercial Hub, Pokhara', 'DEWPM7890Q', 'Consulting', 'Inactive', ARRAY['Statutory Audit'], '2023-10-08'),
      ('Summit Ledger Technologies', 'Ravi Sharma', 'accounts@summitlegder.com', NULL, '9988776655', 'Technology Park, Kathmandu', 'FGHRS1122M', 'Technology', 'Active', ARRAY['Direct Tax','Payroll & HR'], '2024-05-21'),
      ('Lumen Advisory Ltd.', 'Nadia Brooks', 'hello@lumenadvisory.com', NULL, '9012345678', 'Central Business District, Biratnagar', 'LMNBR3344N', 'Corporate Advisory', 'Active', ARRAY['Corporate Law'], '2024-06-11'),
      ('Beacon Financial Corporation', 'Owen Blake', 'info@beaconfinancial.com', NULL, '9765432109', 'Trade Tower, Kathmandu', 'BCNFN5566P', 'Banking & Finance', 'Active', ARRAY['Direct Tax','Financial Advisory'], '2024-06-25')`
  );

  await pool.query(
    `INSERT INTO email_templates (template_name, subject, body, created_date) VALUES
      ('Quarterly Compliance Reminder', 'Quarterly Compliance Reminder: Upcoming Deadlines', 'Dear {{contactPerson}},\n\nKindly note the statutory compliance deadlines approaching for {{companyName}} for the current period.\n\nPlease ensure required documents are submitted before the cutoff date.', '2024-01-12'),
      ('Tax Filing Notice', 'Statutory Notice: Periodic Return Filing Schedule', 'Dear {{contactPerson}},\n\nPlease find the tax return filing window and deposit schedule for {{companyName}}.\n\nKindly review and confirm submission at your earliest convenience.', '2024-02-22'),
      ('Annual Audit Notification', 'Notification: Statutory Audit Engagement Initiation', 'Dear {{contactPerson}},\n\nOur statutory audit team has scheduled the commencement of the annual audit review for {{companyName}}.\n\nPlease refer to the attached schedule for required preparatory documentation.', '2024-03-08')`
  );

  await pool.query(
    `INSERT INTO smtp_config (host, port, username, password, encryption, sender_email, sender_name) VALUES
      ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT DO NOTHING`,
    [
      env.smtp.host,
      env.smtp.port,
      env.smtp.username,
      env.smtp.password,
      env.smtp.encryption,
      env.smtp.senderEmail,
      env.smtp.senderName,
    ]
  );

  await pool.end();
}

seed().catch((error) => {
  console.error("Seed failed:", error);
  process.exitCode = 1;
});
