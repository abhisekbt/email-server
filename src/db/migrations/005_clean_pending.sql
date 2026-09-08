-- Migration: 005_clean_pending.sql
-- Update any historical pending company statuses to Active
UPDATE companies SET status = 'Active' WHERE status = 'Pending';
