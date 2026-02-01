-- Migration: Add position column for product ordering within drops
-- Products can be ordered within a drop using drop_position

-- Add drop_position column (NULL for products not in drops, 0-based position for products in drops)
ALTER TABLE products ADD COLUMN drop_position INTEGER DEFAULT NULL;

-- Create index for efficient ordering within drops
CREATE INDEX IF NOT EXISTS idx_products_drop_position ON products(drop_id, drop_position);
