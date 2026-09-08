CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  category TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
  created_date DATE NOT NULL DEFAULT CURRENT_DATE
);

CREATE TABLE IF NOT EXISTS companies (
  id SERIAL PRIMARY KEY,
  company_name TEXT NOT NULL,
  contact_person TEXT NOT NULL,
  email TEXT NOT NULL,
  alternative_email TEXT,
  mobile TEXT NOT NULL,
  address TEXT NOT NULL,
  pan TEXT NOT NULL,
  gst TEXT NOT NULL,
  industry TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Pending', 'Inactive')),
  categories TEXT[] NOT NULL DEFAULT '{}',
  created_date DATE NOT NULL DEFAULT CURRENT_DATE
);

CREATE INDEX IF NOT EXISTS idx_companies_categories ON companies USING GIN (categories);

CREATE TABLE IF NOT EXISTS email_templates (
  id SERIAL PRIMARY KEY,
  template_name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  created_date DATE NOT NULL DEFAULT CURRENT_DATE
);

CREATE TABLE IF NOT EXISTS communications (
  id SERIAL PRIMARY KEY,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  categories TEXT[] NOT NULL DEFAULT '{}',
  recipient_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Draft' CHECK (status IN ('Sent', 'Scheduled', 'Draft', 'Failed')),
  sent_date DATE,
  scheduled_for DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS communication_recipients (
  id SERIAL PRIMARY KEY,
  communication_id INTEGER NOT NULL REFERENCES communications (id) ON DELETE CASCADE,
  company_id INTEGER REFERENCES companies (id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Sent', 'Failed')),
  error TEXT
);

CREATE TABLE IF NOT EXISTS smtp_config (
  id SERIAL PRIMARY KEY,
  host TEXT NOT NULL,
  port INTEGER NOT NULL,
  username TEXT NOT NULL,
  password TEXT NOT NULL,
  encryption TEXT NOT NULL DEFAULT 'tls' CHECK (encryption IN ('tls', 'ssl', 'none')),
  sender_email TEXT NOT NULL,
  sender_name TEXT NOT NULL
);
