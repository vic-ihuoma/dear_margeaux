-- Add low stock and reorder point thresholds to variants
ALTER TABLE variants ADD COLUMN low_stock_threshold INTEGER;
ALTER TABLE variants ADD COLUMN reorder_point INTEGER;
