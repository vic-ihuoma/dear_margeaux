-- Migration 012: Add email rate limiting tables
-- Run with: npx wrangler d1 execute dear-margeaux-db --remote --file=migrations/012-email-rate-limit.sql

-- ============================================================
-- EMAIL USAGE TABLE
-- ============================================================
-- Tracks email sends per store within time windows for rate limiting
-- Uses hourly windows to enforce rate limits (e.g., 1000 emails/hour)

CREATE TABLE IF NOT EXISTS email_usage (
  id TEXT PRIMARY KEY,
  store_id TEXT NOT NULL REFERENCES stores(id),
  window_start TEXT NOT NULL,            -- ISO datetime of window start (hourly)
  email_count INTEGER NOT NULL DEFAULT 0, -- Number of emails sent in this window
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(store_id, window_start)
);

-- ============================================================
-- EMAIL RATE LIMIT EVENTS TABLE
-- ============================================================
-- Logs when rate limits are hit for auditing and alerting

CREATE TABLE IF NOT EXISTS email_rate_limit_events (
  id TEXT PRIMARY KEY,
  store_id TEXT NOT NULL REFERENCES stores(id),
  event_type TEXT NOT NULL,              -- 'limit_exceeded', 'warning_threshold'
  email_type TEXT,                       -- 'order_confirmation', 'shipping_update', 'drop_launch'
  attempted_recipient TEXT,              -- Email that was blocked
  current_count INTEGER NOT NULL,        -- Count at time of event
  limit_value INTEGER NOT NULL,          -- The limit that was exceeded/approached
  window_start TEXT NOT NULL,            -- The rate limit window
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- INDEXES
-- ============================================================

-- For quick lookup of current window usage
CREATE INDEX IF NOT EXISTS idx_email_usage_store_window ON email_usage(store_id, window_start);

-- For cleanup of old usage records
CREATE INDEX IF NOT EXISTS idx_email_usage_window ON email_usage(window_start);

-- For querying rate limit events by store
CREATE INDEX IF NOT EXISTS idx_email_rate_limit_events_store ON email_rate_limit_events(store_id, created_at);

-- For monitoring/alerting on rate limit events
CREATE INDEX IF NOT EXISTS idx_email_rate_limit_events_type ON email_rate_limit_events(event_type, created_at);
