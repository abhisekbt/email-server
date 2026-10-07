CREATE TABLE IF NOT EXISTS sectors (
  id SERIAL PRIMARY KEY,
  sector TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
  created_date DATE NOT NULL DEFAULT CURRENT_DATE
);

INSERT INTO sectors (sector, description) VALUES
  ('Education', 'Schools, universities, training institutions, and education services.'),
  ('Manufacturing', 'Businesses involved in producing goods and industrial products.'),
  ('IT', 'Information technology, software, and digital services businesses.'),
  ('Healthcare', 'Hospitals, clinics, healthcare providers, and medical services.'),
  ('Banking', 'Banks, financial institutions, and related financial services.'),
  ('Construction', 'Construction, infrastructure, and building services.'),
  ('Hospitality', 'Hotels, restaurants, tourism, and accommodation services.')
ON CONFLICT (sector) DO NOTHING;

INSERT INTO sectors (sector)
SELECT DISTINCT BTRIM(company.act)
FROM companies AS company
WHERE NULLIF(BTRIM(company.act), '') IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM categories AS act
    WHERE act.category = BTRIM(company.act)
  )
ON CONFLICT (sector) DO NOTHING;

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS sector_id INTEGER REFERENCES sectors (id) ON DELETE SET NULL;

UPDATE companies AS company
SET sector_id = sector.id
FROM sectors AS sector
WHERE company.sector_id IS NULL
  AND BTRIM(company.act) = sector.sector
  AND NOT EXISTS (
    SELECT 1
    FROM categories AS act
    WHERE act.category = BTRIM(company.act)
  );

CREATE INDEX IF NOT EXISTS idx_companies_sector_id ON companies (sector_id);
