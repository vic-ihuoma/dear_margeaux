-- ============================================================
-- Migration 018: Add cover_image to drops table
-- Adds cover image support for drops in the admin panel
-- ============================================================

-- Add cover_image column to drops table
ALTER TABLE drops ADD COLUMN cover_image TEXT;
