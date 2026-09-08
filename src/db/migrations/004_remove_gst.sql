-- Migration: 004_remove_gst.sql
-- Remove gst column from companies table
ALTER TABLE companies DROP COLUMN IF EXISTS gst;
