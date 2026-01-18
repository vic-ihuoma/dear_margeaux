-- ============================================================
-- Migration 015: Create newsletter_subscribers table
-- Stores general newsletter subscriptions with double opt-in
-- Separate from drop-specific waitlists in waitlist_entries
-- ============================================================

-- Newsletter subscribers for general newsletter subscriptions
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
    id TEXT PRIMARY KEY,
    store_id TEXT NOT NULL,
    email TEXT NOT NULL,
    verified INTEGER NOT NULL DEFAULT 0,
    verification_token TEXT,
    subscribed_at TEXT NOT NULL,
    verified_at TEXT,
    unsubscribed_at TEXT,
    source TEXT NOT NULL DEFAULT 'footer',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    -- Enforce email uniqueness per store
    UNIQUE(store_id, email)
);

-- Index for efficient lookups by store
CREATE INDEX IF NOT EXISTS idx_newsletter_store_id ON newsletter_subscribers(store_id);

-- Index for fast email lookups (for duplicate checking and unsubscribe)
CREATE INDEX IF NOT EXISTS idx_newsletter_email ON newsletter_subscribers(email);

-- Index for finding unverified subscribers (for cleanup)
CREATE INDEX IF NOT EXISTS idx_newsletter_verified ON newsletter_subscribers(verified);

-- Index for looking up by verification token
CREATE INDEX IF NOT EXISTS idx_newsletter_token ON newsletter_subscribers(verification_token);

-- Index for filtering out unsubscribed entries
CREATE INDEX IF NOT EXISTS idx_newsletter_unsubscribed ON newsletter_subscribers(unsubscribed_at);
