-- Migration 017: Add newsletter subscribe rate limiting table
-- Run with: npx wrangler d1 execute dear-margeaux-db --remote --file=migrations/017-newsletter-rate-limit.sql

-- ============================================================
-- NEWSLETTER SUBSCRIBE ATTEMPTS TABLE
-- ============================================================
-- Tracks newsletter subscription attempts for rate limiting
-- Uses IP address to prevent spam subscriptions (5 per hour per IP)

CREATE TABLE IF NOT EXISTS newsletter_subscribe_attempts (
  id TEXT PRIMARY KEY,
  store_id TEXT NOT NULL REFERENCES stores(id),
  ip_address TEXT NOT NULL,
  attempted_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- INDEXES
-- ============================================================

-- For looking up attempts by IP (quick rate limit check)
CREATE INDEX IF NOT EXISTS idx_newsletter_sub_attempts_ip ON newsletter_subscribe_attempts(store_id, ip_address, attempted_at);

-- For cleanup of old attempts
CREATE INDEX IF NOT EXISTS idx_newsletter_sub_attempts_at ON newsletter_subscribe_attempts(attempted_at);
