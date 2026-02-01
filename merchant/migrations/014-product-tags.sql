-- ============================================================
-- Migration 014: Create product_tags table
-- Implements many-to-many relationship between products and tags
-- Tags are stored as normalized strings in a separate table
-- ============================================================

-- Create product_tags table for many-to-many relationship
CREATE TABLE IF NOT EXISTS product_tags (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  -- Ensure no duplicate tags for the same product
  UNIQUE(product_id, tag)
);

-- Index for efficient tag lookups
CREATE INDEX IF NOT EXISTS idx_product_tags_product ON product_tags(product_id);

-- Index for finding products by tag
CREATE INDEX IF NOT EXISTS idx_product_tags_tag ON product_tags(tag);
