-- ============================================================
-- Migration 007: Link products to drops
-- Adds drop_id foreign key to products table
-- ============================================================

-- Add drop_id column to products table
-- NULL means the product is not part of any drop (evergreen product)
ALTER TABLE products ADD COLUMN drop_id TEXT REFERENCES drops(id);

-- Index for efficient filtering of products by drop
CREATE INDEX IF NOT EXISTS idx_products_drop_id ON products(drop_id);
