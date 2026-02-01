-- Migration 010: Add login rate limiting tables
-- Run with: npx wrangler d1 execute dear-margeaux-db --remote --file=migrations/010-login-rate-limit.sql

-- ============================================================
-- LOGIN ATTEMPTS TABLE
-- ============================================================
-- Tracks failed login attempts for rate limiting
-- Uses identifier (email+ip hash) to prevent brute force attacks

CREATE TABLE IF NOT EXISTS login_attempts (
  id TEXT PRIMARY KEY,
  store_id TEXT NOT NULL REFERENCES stores(id),
  identifier TEXT NOT NULL,           -- Hash of email+IP for privacy
  ip_address TEXT NOT NULL,           -- Raw IP for admin visibility
  email TEXT NOT NULL,                -- Email attempted (for lockout checking)
  attempt_at TEXT NOT NULL DEFAULT (datetime('now')),
  success INTEGER NOT NULL DEFAULT 0  -- 0 = failed, 1 = success
);

-- ============================================================
-- ACCOUNT LOCKOUTS TABLE
-- ============================================================
-- Tracks account lockouts after repeated failures
-- Separate table to allow permanent lockout records for audit

CREATE TABLE IF NOT EXISTS account_lockouts (
  id TEXT PRIMARY KEY,
  store_id TEXT NOT NULL REFERENCES stores(id),
  email TEXT NOT NULL,
  locked_until TEXT NOT NULL,         -- ISO datetime when lockout expires
  reason TEXT NOT NULL,               -- 'rate_limit', 'admin_action', etc.
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(store_id, email)
);

-- ============================================================
-- INDEXES
-- ============================================================

-- For looking up attempts by identifier (quick rate limit check)
CREATE INDEX IF NOT EXISTS idx_login_attempts_identifier ON login_attempts(identifier, attempt_at);

-- For cleanup of old attempts
CREATE INDEX IF NOT EXISTS idx_login_attempts_at ON login_attempts(attempt_at);

-- For checking lockout status
CREATE INDEX IF NOT EXISTS idx_account_lockouts_email ON account_lockouts(store_id, email);

-- For cleanup of expired lockouts
CREATE INDEX IF NOT EXISTS idx_account_lockouts_until ON account_lockouts(locked_until);
