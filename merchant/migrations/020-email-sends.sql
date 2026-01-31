-- ============================================================
-- Email Sends Table for notification tracking
-- Logs all sent emails for admin visibility
-- ============================================================

-- Create email_sends table
CREATE TABLE IF NOT EXISTS email_sends (
  id TEXT PRIMARY KEY,
  store_id TEXT NOT NULL REFERENCES stores(id),
  email_type TEXT NOT NULL,  -- 'order_confirmation', 'shipping_update', 'order_status_update', 'drop_launch', 'newsletter_verification', 'newsletter'
  recipient TEXT NOT NULL,
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'queued')),
  error_message TEXT,           -- Error message if failed
  metadata TEXT,                -- JSON: additional context (order_id, order_number, drop_id, etc.)
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_email_sends_store ON email_sends(store_id);
CREATE INDEX IF NOT EXISTS idx_email_sends_type ON email_sends(email_type);
CREATE INDEX IF NOT EXISTS idx_email_sends_created ON email_sends(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_sends_status ON email_sends(status);
CREATE INDEX IF NOT EXISTS idx_email_sends_recipient ON email_sends(recipient);
