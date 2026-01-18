/**
 * Email Rate Limiter Module
 *
 * Implements per-store rate limiting for email sends.
 * Default limit: 1000 emails per hour per store.
 *
 * Features:
 * - Hourly sliding window tracking
 * - Per-store usage tracking
 * - Rate limit event logging
 * - Usage statistics endpoint support
 */

import { type Database } from '../db';
import { uuid, now } from '../types';
import { type EmailType } from './email-queue';

// ============================================================
// TYPES
// ============================================================

export interface RateLimitResult {
  allowed: boolean;
  currentCount: number;
  limit: number;
  remainingInWindow: number;
  windowResetAt: string;
  error?: string;
}

export interface EmailUsageStats {
  storeId: string;
  currentWindow: {
    start: string;
    end: string;
    count: number;
    limit: number;
    remaining: number;
  };
  last24Hours: {
    total: number;
    byHour: Array<{ windowStart: string; count: number }>;
  };
  rateLimitEvents: {
    last24Hours: number;
    recent: Array<{
      eventType: string;
      emailType: string | null;
      attemptedRecipient: string | null;
      currentCount: number;
      createdAt: string;
    }>;
  };
}

export interface RateLimitConfig {
  limit: number; // emails per window
  windowMs: number; // window size in milliseconds
  warningThreshold?: number; // percentage (0-100) to log warning
}

// ============================================================
// CONFIGURATION
// ============================================================

const DEFAULT_HOURLY_LIMIT = 1000;
const WINDOW_MS = 60 * 60 * 1000; // 1 hour in milliseconds
const WARNING_THRESHOLD_PERCENT = 80; // Log warning at 80% of limit

export const DEFAULT_CONFIG: RateLimitConfig = {
  limit: DEFAULT_HOURLY_LIMIT,
  windowMs: WINDOW_MS,
  warningThreshold: WARNING_THRESHOLD_PERCENT,
};

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

/**
 * Get the start of the current hourly window
 */
export function getCurrentWindowStart(): string {
  const now = new Date();
  now.setMinutes(0, 0, 0);
  return now.toISOString();
}

/**
 * Get the end of the current hourly window
 */
export function getCurrentWindowEnd(): string {
  const now = new Date();
  now.setMinutes(0, 0, 0);
  now.setHours(now.getHours() + 1);
  return now.toISOString();
}

/**
 * Calculate when the current window resets
 */
export function getWindowResetTime(): string {
  return getCurrentWindowEnd();
}

// ============================================================
// RATE LIMITING FUNCTIONS
// ============================================================

/**
 * Check if an email can be sent under the rate limit
 * Does NOT increment the counter - call incrementUsage after successful send
 */
export async function checkRateLimit(
  db: Database,
  storeId: string,
  config: RateLimitConfig = DEFAULT_CONFIG
): Promise<RateLimitResult> {
  const windowStart = getCurrentWindowStart();
  const windowEnd = getCurrentWindowEnd();

  // Get current usage for this window
  const [usage] = await db.query<{ email_count: number }>(
    `SELECT email_count FROM email_usage WHERE store_id = ? AND window_start = ?`,
    [storeId, windowStart]
  );

  const currentCount = usage?.email_count ?? 0;
  const allowed = currentCount < config.limit;
  const remaining = Math.max(0, config.limit - currentCount);

  return {
    allowed,
    currentCount,
    limit: config.limit,
    remainingInWindow: remaining,
    windowResetAt: windowEnd,
  };
}

/**
 * Increment usage counter after a successful email send
 */
export async function incrementUsage(db: Database, storeId: string): Promise<{ newCount: number }> {
  const windowStart = getCurrentWindowStart();
  const currentTime = now();

  // Use INSERT OR REPLACE with COALESCE to handle both new and existing records
  await db.run(
    `INSERT INTO email_usage (id, store_id, window_start, email_count, created_at, updated_at)
     VALUES (?, ?, ?, 1, ?, ?)
     ON CONFLICT(store_id, window_start) DO UPDATE SET
       email_count = email_count + 1,
       updated_at = ?`,
    [uuid(), storeId, windowStart, currentTime, currentTime, currentTime]
  );

  // Get the updated count
  const [usage] = await db.query<{ email_count: number }>(
    `SELECT email_count FROM email_usage WHERE store_id = ? AND window_start = ?`,
    [storeId, windowStart]
  );

  return { newCount: usage?.email_count ?? 1 };
}

/**
 * Log a rate limit event (when limit is exceeded or warning threshold reached)
 */
export async function logRateLimitEvent(
  db: Database,
  storeId: string,
  eventType: 'limit_exceeded' | 'warning_threshold',
  currentCount: number,
  limitValue: number,
  emailType?: EmailType,
  attemptedRecipient?: string
): Promise<void> {
  const windowStart = getCurrentWindowStart();
  const currentTime = now();

  await db.run(
    `INSERT INTO email_rate_limit_events
     (id, store_id, event_type, email_type, attempted_recipient, current_count, limit_value, window_start, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      uuid(),
      storeId,
      eventType,
      emailType ?? null,
      attemptedRecipient ?? null,
      currentCount,
      limitValue,
      windowStart,
      currentTime,
    ]
  );

  // eslint-disable-next-line no-console
  console.log(
    `[EMAIL_RATE_LIMIT] ${eventType.toUpperCase()} for store ${storeId}: ${currentCount}/${limitValue}`
  );
}

/**
 * Check rate limit and optionally log warning if threshold exceeded
 * This is the main function to call before sending an email
 */
export async function checkAndLogRateLimit(
  db: Database,
  storeId: string,
  emailType?: EmailType,
  recipient?: string,
  config: RateLimitConfig = DEFAULT_CONFIG
): Promise<RateLimitResult> {
  const result = await checkRateLimit(db, storeId, config);

  if (!result.allowed) {
    // Log rate limit exceeded event
    await logRateLimitEvent(
      db,
      storeId,
      'limit_exceeded',
      result.currentCount,
      result.limit,
      emailType,
      recipient
    );

    return {
      ...result,
      error: `Rate limit exceeded: ${result.currentCount}/${result.limit} emails in current window. Resets at ${result.windowResetAt}`,
    };
  }

  // Check warning threshold
  const warningThreshold = config.warningThreshold ?? WARNING_THRESHOLD_PERCENT;
  const warningCount = Math.floor((warningThreshold / 100) * config.limit);

  if (result.currentCount === warningCount) {
    // Log warning threshold event (only once when exactly at threshold)
    await logRateLimitEvent(
      db,
      storeId,
      'warning_threshold',
      result.currentCount,
      config.limit,
      emailType,
      recipient
    );
  }

  return result;
}

// ============================================================
// USAGE STATISTICS
// ============================================================

/**
 * Get email usage statistics for a store
 * Used by the admin endpoint GET /v1/email-usage
 */
export async function getEmailUsageStats(
  db: Database,
  storeId: string,
  config: RateLimitConfig = DEFAULT_CONFIG
): Promise<EmailUsageStats> {
  const windowStart = getCurrentWindowStart();
  const windowEnd = getCurrentWindowEnd();

  // Get current window usage
  const [currentUsage] = await db.query<{ email_count: number }>(
    `SELECT email_count FROM email_usage WHERE store_id = ? AND window_start = ?`,
    [storeId, windowStart]
  );

  const currentCount = currentUsage?.email_count ?? 0;

  // Get last 24 hours of usage
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const hourlyUsage = await db.query<{ window_start: string; email_count: number }>(
    `SELECT window_start, email_count FROM email_usage
     WHERE store_id = ? AND window_start >= ?
     ORDER BY window_start ASC`,
    [storeId, twentyFourHoursAgo]
  );

  const total24Hours = hourlyUsage.reduce((sum, row) => sum + row.email_count, 0);

  // Get rate limit events in last 24 hours
  const [eventCount] = await db.query<{ count: number }>(
    `SELECT COUNT(*) as count FROM email_rate_limit_events
     WHERE store_id = ? AND created_at >= ?`,
    [storeId, twentyFourHoursAgo]
  );

  const recentEvents = await db.query<{
    event_type: string;
    email_type: string | null;
    attempted_recipient: string | null;
    current_count: number;
    created_at: string;
  }>(
    `SELECT event_type, email_type, attempted_recipient, current_count, created_at
     FROM email_rate_limit_events
     WHERE store_id = ?
     ORDER BY created_at DESC
     LIMIT 10`,
    [storeId]
  );

  return {
    storeId,
    currentWindow: {
      start: windowStart,
      end: windowEnd,
      count: currentCount,
      limit: config.limit,
      remaining: Math.max(0, config.limit - currentCount),
    },
    last24Hours: {
      total: total24Hours,
      byHour: hourlyUsage.map((row) => ({
        windowStart: row.window_start,
        count: row.email_count,
      })),
    },
    rateLimitEvents: {
      last24Hours: eventCount?.count ?? 0,
      recent: recentEvents.map((row) => ({
        eventType: row.event_type,
        emailType: row.email_type,
        attemptedRecipient: row.attempted_recipient,
        currentCount: row.current_count,
        createdAt: row.created_at,
      })),
    },
  };
}

// ============================================================
// CLEANUP
// ============================================================

/**
 * Clean up old usage records (older than 7 days)
 * Call this from cron job periodically
 */
export async function cleanupOldUsageRecords(db: Database): Promise<{ deleted: number }> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // Clean up old usage records
  const usageResult = await db.run(`DELETE FROM email_usage WHERE window_start < ?`, [
    sevenDaysAgo,
  ]);

  // Clean up old rate limit events (keep 30 days for auditing)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  await db.run(`DELETE FROM email_rate_limit_events WHERE created_at < ?`, [thirtyDaysAgo]);

  // eslint-disable-next-line no-console
  console.log(`[EMAIL_RATE_LIMIT] Cleaned up ${usageResult.changes ?? 0} old usage records`);

  return { deleted: usageResult.changes ?? 0 };
}
