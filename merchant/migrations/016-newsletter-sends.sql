-- ============================================================
-- Migration 016: Create newsletter_sends table
-- Tracks newsletter send history for blog-to-newsletter workflow
-- Records which blog posts were sent as newsletters
-- ============================================================

-- Newsletter sends tracking table
CREATE TABLE IF NOT EXISTS newsletter_sends (
    id TEXT PRIMARY KEY,
    store_id TEXT NOT NULL,
    blog_slug TEXT NOT NULL,
    subject TEXT NOT NULL,
    sent_at TEXT NOT NULL,
    recipient_count INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
);

-- Index for looking up sends by blog post
CREATE INDEX IF NOT EXISTS idx_newsletter_sends_blog_slug ON newsletter_sends(blog_slug);

-- Index for chronological queries (recent sends)
CREATE INDEX IF NOT EXISTS idx_newsletter_sends_sent_at ON newsletter_sends(sent_at);

-- Index for store filtering
CREATE INDEX IF NOT EXISTS idx_newsletter_sends_store_id ON newsletter_sends(store_id);
