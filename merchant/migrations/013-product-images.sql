-- ============================================================
-- Migration 013: Add product image fields
-- Adds featured_image_url and featured_image_alt to products table
-- Adds image_alt to variants table for accessibility
-- ============================================================

-- Add featured image fields to products table
-- Note: image_url column already exists, we're adding specific featured image fields
ALTER TABLE products ADD COLUMN featured_image_url TEXT;
ALTER TABLE products ADD COLUMN featured_image_alt TEXT;

-- Add image alt text field to variants table for accessibility
ALTER TABLE variants ADD COLUMN image_alt TEXT;
