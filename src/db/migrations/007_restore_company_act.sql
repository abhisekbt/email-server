ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS act TEXT NOT NULL DEFAULT '';

UPDATE companies
SET act = categories[1]
WHERE act = ''
  AND cardinality(categories) > 0;
