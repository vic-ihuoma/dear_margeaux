-- Migration 011: Add email queue tables for retry mechanism
-- Run with: npx wrangler d1 execute dear-margeaux-db --remote --file=migrations/011-email-queue.sql

-- ============================================================
-- EMAIL QUEUE TABLE
-- ============================================================
-- Stores failed emails for retry with exponential backoff
-- Emails are moved to dead_letter after max_retries (default 3)

CREATE TABLE IF NOT EXISTS email_queue (
  id TEXT PRIMARY KEY,
  store_id TEXT NOT NULL REFERENCES stores(id),
  email_type TEXT NOT NULL,              -- 'order_confirmation', 'shipping_update', 'drop_launch'
  recipient TEXT NOT NULL,               -- Email address
  subject TEXT NOT NULL,
  html TEXT NOT NULL,                    -- Full HTML content
  metadata TEXT,                         -- JSON: order_id, drop_id, etc. for context
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  last_error TEXT,                       -- Last error message
  next_retry_at TEXT NOT NULL,           -- ISO datetime for next retry
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- EMAIL DEAD LETTER TABLE
-- ============================================================
-- Stores emails that failed after max retries
-- Kept for debugging and manual intervention

CREATE TABLE IF NOT EXISTS email_dead_letter (
  id TEXT PRIMARY KEY,
  store_id TEXT NOT NULL REFERENCES stores(id),
  email_type TEXT NOT NULL,
  recipient TEXT NOT NULL,
  subject TEXT NOT NULL,
  html TEXT NOT NULL,
  metadata TEXT,
  retry_count INTEGER NOT NULL,
  last_error TEXT NOT NULL,
  failed_at TEXT NOT NULL DEFAULT (datetime('now')),
  original_created_at TEXT NOT NULL      -- When the email was first queued
);

-- ============================================================
-- INDEXES
-- ============================================================

-- For finding emails ready to retry
CREATE INDEX IF NOT EXISTS idx_email_queue_next_retry ON email_queue(next_retry_at);

-- For filtering by store
CREATE INDEX IF NOT EXISTS idx_email_queue_store ON email_queue(store_id);

-- For dead letter lookup by store
CREATE INDEX IF NOT EXISTS idx_email_dead_letter_store ON email_dead_letter(store_id);

-- For dead letter lookup by date (for cleanup/analysis)
CREATE INDEX IF NOT EXISTS idx_email_dead_letter_failed_at ON email_dead_letter(failed_at);
