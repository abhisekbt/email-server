-- Migration: Rename 'act' to 'acts' in companies table and 'categories' array to 'acts' array
-- Renames "Industries" terminology to "Acts" (plural)

-- 1. Rename 'act' column to 'acts' in companies table
ALTER TABLE companies RENAME COLUMN act TO acts;

-- 2. Rename 'categories' array column to 'acts' array in companies table
ALTER TABLE companies RENAME COLUMN categories TO acts;

-- 3. Update index to reflect new column names
CREATE INDEX IF NOT EXISTS idx_companies_acts ON companies USING GIN (acts);

-- Note: The 'category' column in categories table (singular) remains unchanged
-- as it represents individual category names within the categories table
-- The 'act' column was the primary act/sector for companies, now called 'acts'
-- The 'categories' array holds the list of acts for each company