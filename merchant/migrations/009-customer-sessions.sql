-- Migration 009: Add customer sessions table for storefront authentication
-- Run with: npx wrangler d1 execute dear-margeaux-db --remote --file=migrations/009-customer-sessions.sql

-- ============================================================
-- CUSTOMER SESSIONS TABLE
-- ============================================================
-- Used for storefront authentication (separate from admin_sessions)

CREATE TABLE IF NOT EXISTS customer_sessions (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL,       -- Unix timestamp (seconds)
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- INDEXES
-- ============================================================

-- For looking up sessions by customer
CREATE INDEX IF NOT EXISTS idx_customer_sessions_customer ON customer_sessions(customer_id);

-- For cleanup of expired sessions
CREATE INDEX IF NOT EXISTS idx_customer_sessions_expires ON customer_sessions(expires_at);
