ALTER TABLE communications ALTER COLUMN scheduled_for TYPE TIMESTAMPTZ USING scheduled_for::TIMESTAMPTZ;
