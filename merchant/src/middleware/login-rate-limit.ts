import { Context } from 'hono';
import { getDb } from '../db';
import { ApiError, type Env, uuid, now } from '../types';

// ============================================================
// LOGIN RATE LIMITING MIDDLEWARE
// ============================================================
// Protects the login endpoint from brute force attacks
// Uses persistent storage (D1) for tracking attempts
//
// Features:
// - 5 failed attempts per 15 minutes per email/IP
// - Account lockout after repeated failures
// - Retry-After header on rate limit
// - Logs all rate limit events

export type LoginRateLimitConfig = {
  maxAttempts: number; // Max failed attempts before blocking
  windowMs: number; // Time window in milliseconds
  lockoutDurationMs: number; // How long to lock account after lockout
  lockoutThreshold: number; // Number of rate limit hits before lockout
};

// Default configuration
export const defaultLoginRateLimitConfig: LoginRateLimitConfig = {
  maxAttempts: 5, // 5 failed attempts
  windowMs: 15 * 60 * 1000, // 15 minute window
  lockoutDurationMs: 60 * 60 * 1000, // 1 hour lockout
  lockoutThreshold: 3, // Lock after 3 rate limit blocks
};

// Hash function for identifier privacy
async function hashIdentifier(email: string, ip: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`${email.toLowerCase()}:${ip}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Record a login attempt
 */
export async function recordLoginAttempt(
  env: Env,
  storeId: string,
  email: string,
  ip: string,
  success: boolean
): Promise<void> {
  const db = getDb(env);
  const identifier = await hashIdentifier(email, ip);

  await db.run(
    `INSERT INTO login_attempts (id, store_id, identifier, ip_address, email, attempt_at, success)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [uuid(), storeId, identifier, ip, email.toLowerCase(), now(), success ? 1 : 0]
  );

  // Log the attempt for monitoring
  console.info(
    `[LOGIN_ATTEMPT] store=${storeId} email=${email.toLowerCase()} ip=${ip} success=${success}`
  );
}

/**
 * Check if login should be rate limited
 */
export async function checkLoginRateLimit(
  env: Env,
  storeId: string,
  email: string,
  ip: string,
  config: LoginRateLimitConfig = defaultLoginRateLimitConfig
): Promise<{ allowed: boolean; remaining: number; resetAt: Date; locked: boolean }> {
  const db = getDb(env);
  const normalizedEmail = email.toLowerCase();
  const identifier = await hashIdentifier(normalizedEmail, ip);

  // Check for active lockout first
  const [lockout] = await db.query<{ locked_until: string }>(
    `SELECT locked_until FROM account_lockouts
     WHERE store_id = ? AND email = ? AND locked_until > datetime('now')`,
    [storeId, normalizedEmail]
  );

  if (lockout) {
    const lockedUntil = new Date(lockout.locked_until);
    console.warn(
      `[LOGIN_RATE_LIMIT] Account locked: email=${normalizedEmail} until=${lockedUntil.toISOString()}`
    );
    return {
      allowed: false,
      remaining: 0,
      resetAt: lockedUntil,
      locked: true,
    };
  }

  // Calculate window start
  const windowStart = new Date(Date.now() - config.windowMs).toISOString();

  // Count failed attempts in window
  const [result] = await db.query<{ count: number }>(
    `SELECT COUNT(*) as count FROM login_attempts
     WHERE identifier = ? AND attempt_at > ? AND success = 0`,
    [identifier, windowStart]
  );

  const failedAttempts = result?.count || 0;
  const remaining = Math.max(0, config.maxAttempts - failedAttempts);
  const resetAt = new Date(Date.now() + config.windowMs);

  if (failedAttempts >= config.maxAttempts) {
    console.warn(
      `[LOGIN_RATE_LIMIT] Rate limit exceeded: identifier=${identifier.substring(0, 8)}... attempts=${failedAttempts}`
    );

    // Check if we should trigger a lockout
    // Count how many times this email has hit rate limit in the last 24 hours
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const [rateLimitHits] = await db.query<{ count: number }>(
      `SELECT COUNT(*) / ? as count FROM login_attempts
       WHERE email = ? AND store_id = ? AND attempt_at > ? AND success = 0`,
      [config.maxAttempts, normalizedEmail, storeId, dayAgo]
    );

    if ((rateLimitHits?.count || 0) >= config.lockoutThreshold) {
      // Trigger lockout
      await lockAccount(env, storeId, normalizedEmail, config.lockoutDurationMs, 'rate_limit');
    }

    return {
      allowed: false,
      remaining: 0,
      resetAt,
      locked: false,
    };
  }

  return {
    allowed: true,
    remaining,
    resetAt,
    locked: false,
  };
}

/**
 * Lock an account
 */
export async function lockAccount(
  env: Env,
  storeId: string,
  email: string,
  durationMs: number,
  reason: string
): Promise<void> {
  const db = getDb(env);
  const normalizedEmail = email.toLowerCase();
  const lockedUntil = new Date(Date.now() + durationMs).toISOString();

  // Upsert lockout record
  await db.run(
    `INSERT INTO account_lockouts (id, store_id, email, locked_until, reason, created_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT (store_id, email) DO UPDATE SET
       locked_until = excluded.locked_until,
       reason = excluded.reason`,
    [uuid(), storeId, normalizedEmail, lockedUntil, reason, now()]
  );

  console.warn(
    `[ACCOUNT_LOCKOUT] Account locked: email=${normalizedEmail} reason=${reason} until=${lockedUntil}`
  );
}

/**
 * Unlock an account (for admin use)
 */
export async function unlockAccount(env: Env, storeId: string, email: string): Promise<void> {
  const db = getDb(env);
  await db.run(`DELETE FROM account_lockouts WHERE store_id = ? AND email = ?`, [
    storeId,
    email.toLowerCase(),
  ]);

  console.info(`[ACCOUNT_UNLOCK] Account unlocked: email=${email.toLowerCase()}`);
}

/**
 * Clear old login attempts (for cleanup cron job)
 */
export async function cleanupOldAttempts(
  env: Env,
  maxAgeMs: number = 7 * 24 * 60 * 60 * 1000
): Promise<number> {
  const db = getDb(env);
  const cutoff = new Date(Date.now() - maxAgeMs).toISOString();

  const result = await db.run(`DELETE FROM login_attempts WHERE attempt_at < ?`, [cutoff]);

  // Also cleanup expired lockouts
  await db.run(`DELETE FROM account_lockouts WHERE locked_until < datetime('now')`);

  return result.changes;
}

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
 * Set rate limit response headers
 */
export function setRateLimitHeaders(
  c: Context,
  config: LoginRateLimitConfig,
  remaining: number,
  resetAt: Date
): void {
  c.header('X-RateLimit-Limit', String(config.maxAttempts));
  c.header('X-RateLimit-Remaining', String(remaining));
  c.header('X-RateLimit-Reset', String(Math.ceil(resetAt.getTime() / 1000)));
}

/**
 * Check rate limit and throw if exceeded
 * Call this at the start of the login handler after parsing the body
 */
export async function enforceLoginRateLimit<T extends { Bindings: Env }>(
  c: Context<T>,
  storeId: string,
  email: string,
  config: LoginRateLimitConfig = defaultLoginRateLimitConfig
): Promise<{ remaining: number; resetAt: Date }> {
  const ip = getClientIp(c as Context);

  const { allowed, remaining, resetAt, locked } = await checkLoginRateLimit(
    c.env,
    storeId,
    email,
    ip,
    config
  );

  // Set rate limit headers
  setRateLimitHeaders(c as Context, config, remaining, resetAt);

  if (!allowed) {
    const retryAfter = Math.ceil((resetAt.getTime() - Date.now()) / 1000);
    c.header('Retry-After', String(retryAfter));

    if (locked) {
      throw new ApiError(
        'account_locked',
        423,
        `Account is temporarily locked due to too many failed login attempts. Please try again later or reset your password.`
      );
    }

    throw new ApiError(
      'rate_limit_exceeded',
      429,
      `Too many login attempts. Please try again in ${Math.ceil(retryAfter / 60)} minutes.`
    );
  }

  return { remaining, resetAt };
}
