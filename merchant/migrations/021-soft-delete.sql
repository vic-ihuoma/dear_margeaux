-- Add soft delete support for products
ALTER TABLE products ADD COLUMN deleted_at TEXT;
CREATE INDEX IF NOT EXISTS idx_products_deleted ON products(deleted_at);
