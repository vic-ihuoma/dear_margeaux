-- ============================================================
-- Migration 006: Add drops table
-- Creates the drops table for managing limited-time product drops
-- ============================================================

-- Drops table for managing limited-time product releases
CREATE TABLE IF NOT EXISTS drops (
    id TEXT PRIMARY KEY,
    store_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    slug TEXT NOT NULL,
    start_date TEXT, -- ISO date string for scheduled start
    end_date TEXT,   -- ISO date string for scheduled end
    status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'scheduled', 'active', 'ended')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE(store_id, slug)
);

-- Index for efficient lookups by store
CREATE INDEX IF NOT EXISTS idx_drops_store_id ON drops(store_id);

-- Index for filtering by status (useful for finding active/scheduled drops)
CREATE INDEX IF NOT EXISTS idx_drops_status ON drops(status);

-- Index for ordering by start_date (useful for scheduling features)
CREATE INDEX IF NOT EXISTS idx_drops_start_date ON drops(start_date);
