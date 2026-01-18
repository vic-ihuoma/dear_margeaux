import { Context } from 'hono';
import { getDb } from '../db';
import { ApiError, type Env, uuid } from '../types';

// ============================================================
// NEWSLETTER SUBSCRIBE RATE LIMITING
// ============================================================
// Protects the newsletter subscribe endpoint from spam
// Uses persistent storage (D1) for tracking attempts
//
// Features:
// - 5 subscription attempts per hour per IP
// - Returns 429 with Retry-After header when limit exceeded
// - Logs all rate limit events

export type NewsletterRateLimitConfig = {
  maxAttempts: number; // Max attempts before blocking
  windowMs: number; // Time window in milliseconds
};

// Default configuration: 5 requests per hour per IP
export const defaultNewsletterRateLimitConfig: NewsletterRateLimitConfig = {
  maxAttempts: 5,
  windowMs: 60 * 60 * 1000, // 1 hour
};

/**
 * Get client IP address from request context
 */
export function getClientIp(c: Context): string {
  return (
    c.req.header('CF-Connecting-IP') ||
    c.req.header('X-Forwarded-For')?.split(',')[0]?.trim() ||
    'unknown'
  );
}

/**
 * Record a newsletter subscribe attempt
 */
export async function recordNewsletterAttempt(
  env: Env,
  storeId: string,
  ip: string
): Promise<void> {
  const db = getDb(env);
  const timestamp = new Date().toISOString();

  await db.run(
    `INSERT INTO newsletter_subscribe_attempts (id, store_id, ip_address, attempted_at)
     VALUES (?, ?, ?, ?)`,
    [uuid(), storeId, ip, timestamp]
  );
}

/**
 * Check if newsletter subscribe should be rate limited
 */
export async function checkNewsletterRateLimit(
  env: Env,
  storeId: string,
  ip: string,
  config: NewsletterRateLimitConfig = defaultNewsletterRateLimitConfig
): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
  const db = getDb(env);

  // Calculate window start
  const windowStart = new Date(Date.now() - config.windowMs).toISOString();

  // Count attempts in window
  const [result] = await db.query<{ count: number }>(
    `SELECT COUNT(*) as count FROM newsletter_subscribe_attempts
     WHERE store_id = ? AND ip_address = ? AND attempted_at > ?`,
    [storeId, ip, windowStart]
  );

  const attempts = result?.count || 0;
  const remaining = Math.max(0, config.maxAttempts - attempts);
  const resetAt = new Date(Date.now() + config.windowMs);

  if (attempts >= config.maxAttempts) {
    console.warn(
      `[NEWSLETTER_RATE_LIMIT] Rate limit exceeded: ip=${ip.substring(0, 10)}... attempts=${attempts}`
    );

    return {
      allowed: false,
      remaining: 0,
      resetAt,
    };
  }

  return {
    allowed: true,
    remaining,
    resetAt,
  };
}

/**
 * Set rate limit response headers
 */
export function setRateLimitHeaders(
  c: Context,
  config: NewsletterRateLimitConfig,
  remaining: number,
  resetAt: Date
): void {
  c.header('X-RateLimit-Limit', String(config.maxAttempts));
  c.header('X-RateLimit-Remaining', String(remaining));
  c.header('X-RateLimit-Reset', String(Math.ceil(resetAt.getTime() / 1000)));
}

/**
 * Enforce newsletter subscribe rate limit
 * Call this at the start of the subscribe handler
 * Records the attempt and throws 429 if limit exceeded
 */
export async function enforceNewsletterRateLimit<T extends { Bindings: Env }>(
  c: Context<T>,
  storeId: string,
  config: NewsletterRateLimitConfig = defaultNewsletterRateLimitConfig
): Promise<{ remaining: number; resetAt: Date }> {
  const ip = getClientIp(c as Context);

  const { allowed, remaining, resetAt } = await checkNewsletterRateLimit(
    c.env,
    storeId,
    ip,
    config
  );

  // Set rate limit headers
  setRateLimitHeaders(c as Context, config, remaining, resetAt);

  if (!allowed) {
    const retryAfter = Math.ceil((resetAt.getTime() - Date.now()) / 1000);
    c.header('Retry-After', String(retryAfter));

    throw new ApiError(
      'rate_limit_exceeded',
      429,
      `Too many subscription attempts. Please try again in ${Math.ceil(retryAfter / 60)} minutes.`
    );
  }

  // Record this attempt
  await recordNewsletterAttempt(c.env, storeId, ip);

  return { remaining: remaining - 1, resetAt };
}

/**
 * Clear old newsletter subscribe attempts (for cleanup cron job)
 */
export async function cleanupOldNewsletterAttempts(
  env: Env,
  maxAgeMs: number = 24 * 60 * 60 * 1000 // Default 24 hours
): Promise<number> {
  const db = getDb(env);
  const cutoff = new Date(Date.now() - maxAgeMs).toISOString();

  const result = await db.run(`DELETE FROM newsletter_subscribe_attempts WHERE attempted_at < ?`, [
    cutoff,
  ]);

  return result.changes;
}
