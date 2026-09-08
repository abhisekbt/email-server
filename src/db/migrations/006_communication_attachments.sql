-- Migration: 006_communication_attachments.sql
-- Add attachments JSONB column to persist attachments for scheduled dispatches & drafts
ALTER TABLE communications ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;
