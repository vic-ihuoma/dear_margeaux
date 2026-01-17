-- Migration 005: Add admin users and sessions tables for admin authentication
-- Run with: npx wrangler d1 execute dear-margeaux-db --remote --file=migrations/005-add-admin-users.sql

-- ============================================================
-- ADMIN USERS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS admin_users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,

  -- Authentication
  password_hash TEXT NOT NULL,

  -- Profile
  name TEXT,

  -- Status
  active INTEGER DEFAULT 1,

  -- Timestamps
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- ADMIN SESSIONS TABLE (Lucia-compatible schema)
-- ============================================================

CREATE TABLE IF NOT EXISTS admin_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,

  -- Session expiration
  expires_at INTEGER NOT NULL,

  -- Timestamps
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_user ON admin_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires ON admin_sessions(expires_at);
