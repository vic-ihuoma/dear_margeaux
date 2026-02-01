-- ============================================================
-- Migration 008: Add waitlist_entries table
-- Stores email subscriptions for drop notifications
-- ============================================================

-- Waitlist entries for drop notification subscriptions
CREATE TABLE IF NOT EXISTS waitlist_entries (
    id TEXT PRIMARY KEY,
    store_id TEXT NOT NULL,
    email TEXT NOT NULL,
    drop_id TEXT NOT NULL REFERENCES drops(id),
    subscribed_at TEXT NOT NULL,
    notified_at TEXT, -- NULL until notification sent
    unsubscribed INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    -- Enforce email uniqueness per drop per store
    UNIQUE(store_id, email, drop_id)
);

-- Index for efficient lookups by store
CREATE INDEX IF NOT EXISTS idx_waitlist_store_id ON waitlist_entries(store_id);

-- Index for filtering by drop (for sending notifications)
CREATE INDEX IF NOT EXISTS idx_waitlist_drop_id ON waitlist_entries(drop_id);

-- Index for filtering by email (for managing subscriptions)
CREATE INDEX IF NOT EXISTS idx_waitlist_email ON waitlist_entries(email);

-- Index for finding unnotified subscribers
CREATE INDEX IF NOT EXISTS idx_waitlist_notified ON waitlist_entries(notified_at);

-- Index for filtering out unsubscribed entries
CREATE INDEX IF NOT EXISTS idx_waitlist_unsubscribed ON waitlist_entries(unsubscribed);
