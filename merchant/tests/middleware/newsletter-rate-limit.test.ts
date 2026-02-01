import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Env } from '../../src/types';

// Create mock database before any imports
const mockDbQuery = vi.fn();
const mockDbRun = vi.fn().mockResolvedValue({ changes: 1 });

const mockDb = {
  query: mockDbQuery,
  run: mockDbRun,
  runWithChanges: vi.fn().mockResolvedValue({ changes: 1 }),
};

// Mock the db module
vi.mock('../../src/db', () => ({
  getDb: vi.fn(() => mockDb),
}));

// Mock uuid function
vi.mock('../../src/types', async () => {
  const actual = await vi.importActual('../../src/types');
  return {
    ...actual,
    uuid: vi.fn(() => 'test-uuid-123'),
  };
});

// Mock console methods for testing logging
const mockConsoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});

import {
  checkNewsletterRateLimit,
  recordNewsletterAttempt,
  cleanupOldNewsletterAttempts,
  getClientIp,
  setRateLimitHeaders,
  enforceNewsletterRateLimit,
  defaultNewsletterRateLimitConfig,
  type NewsletterRateLimitConfig,
} from '../../src/middleware/newsletter-rate-limit';

// Helper to create mock env
function createMockEnv(): Env {
  return {
    DB: {} as D1Database,
  } as Env;
}

// Helper to create mock Hono context
function createMockContext(headers: Record<string, string> = {}): any {
  const responseHeaders = new Map<string, string>();
  return {
    req: {
      header: (name: string) => headers[name],
    },
    header: (name: string, value: string) => {
      responseHeaders.set(name, value);
    },
    env: createMockEnv(),
    getResponseHeaders: () => Object.fromEntries(responseHeaders),
  };
}

describe('Newsletter Rate Limit Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-18T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('getClientIp', () => {
    it('returns CF-Connecting-IP if present', () => {
      const c = createMockContext({ 'CF-Connecting-IP': '1.2.3.4' });
      expect(getClientIp(c)).toBe('1.2.3.4');
    });

    it('falls back to X-Forwarded-For if CF-Connecting-IP not present', () => {
      const c = createMockContext({ 'X-Forwarded-For': '5.6.7.8, 9.10.11.12' });
      expect(getClientIp(c)).toBe('5.6.7.8');
    });

    it('returns unknown if no IP headers present', () => {
      const c = createMockContext({});
      expect(getClientIp(c)).toBe('unknown');
    });
  });

  describe('setRateLimitHeaders', () => {
    it('sets correct rate limit headers', () => {
      const c = createMockContext();
      const config: NewsletterRateLimitConfig = {
        maxAttempts: 5,
        windowMs: 3600000, // 1 hour
      };
      const resetAt = new Date('2026-01-18T13:00:00.000Z');

      setRateLimitHeaders(c, config, 3, resetAt);

      const headers = c.getResponseHeaders();
      expect(headers['X-RateLimit-Limit']).toBe('5');
      expect(headers['X-RateLimit-Remaining']).toBe('3');
      expect(headers['X-RateLimit-Reset']).toBe(String(Math.ceil(resetAt.getTime() / 1000)));
    });
  });

  describe('recordNewsletterAttempt', () => {
    it('records subscribe attempt to database', async () => {
      const env = createMockEnv();

      await recordNewsletterAttempt(env, 'store-1', '1.2.3.4');

      expect(mockDbRun).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO newsletter_subscribe_attempts'),
        expect.arrayContaining([
          'test-uuid-123',
          'store-1',
          '1.2.3.4',
          expect.any(String), // timestamp
        ])
      );
    });
  });

  describe('checkNewsletterRateLimit', () => {
    it('allows requests under limit', async () => {
      const env = createMockEnv();
      // 2 attempts (under limit of 5)
      mockDbQuery.mockResolvedValueOnce([{ count: 2 }]);

      const result = await checkNewsletterRateLimit(env, 'store-1', '1.2.3.4');

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(3); // 5 - 2 = 3
    });

    it('blocks 6th request from same IP (after 5 attempts)', async () => {
      const env = createMockEnv();
      // 5 attempts (at limit)
      mockDbQuery.mockResolvedValueOnce([{ count: 5 }]);

      const result = await checkNewsletterRateLimit(env, 'store-1', '1.2.3.4');

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('resets counter after window expires (1 hour)', async () => {
      const env = createMockEnv();
      // 0 attempts in window (window reset)
      mockDbQuery.mockResolvedValueOnce([{ count: 0 }]);

      const result = await checkNewsletterRateLimit(env, 'store-1', '1.2.3.4');

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(5);
    });

    it('logs rate limit exceeded events', async () => {
      const env = createMockEnv();
      // At rate limit
      mockDbQuery.mockResolvedValueOnce([{ count: 5 }]);

      await checkNewsletterRateLimit(env, 'store-1', '1.2.3.4');

      expect(mockConsoleWarn).toHaveBeenCalledWith(
        expect.stringContaining('[NEWSLETTER_RATE_LIMIT] Rate limit exceeded')
      );
    });

    it('queries correct time window (1 hour)', async () => {
      const env = createMockEnv();
      mockDbQuery.mockResolvedValueOnce([{ count: 0 }]);

      await checkNewsletterRateLimit(env, 'store-1', '1.2.3.4');

      // Check that window start is ~1 hour ago
      expect(mockDbQuery).toHaveBeenCalledWith(
        expect.stringContaining('attempted_at >'),
        expect.arrayContaining([
          'store-1',
          '1.2.3.4',
          expect.stringMatching(/2026-01-18T11:00/), // 1 hour before 12:00
        ])
      );
    });
  });

  describe('enforceNewsletterRateLimit', () => {
    it('allows request, records attempt, and sets headers when under limit', async () => {
      const c = createMockContext({ 'CF-Connecting-IP': '1.2.3.4' });
      // Under limit (2 attempts)
      mockDbQuery.mockResolvedValueOnce([{ count: 2 }]);

      const result = await enforceNewsletterRateLimit(c, 'store-1');

      // Should have remaining = 2 (not 3) because we record the current attempt
      expect(result.remaining).toBe(2);

      const headers = c.getResponseHeaders();
      expect(headers['X-RateLimit-Limit']).toBe('5');
      expect(headers['X-RateLimit-Remaining']).toBe('3');

      // Verify attempt was recorded
      expect(mockDbRun).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO newsletter_subscribe_attempts'),
        expect.any(Array)
      );
    });

    it('throws 429 when rate limited', async () => {
      const c = createMockContext({ 'CF-Connecting-IP': '1.2.3.4' });
      // At limit (5 attempts)
      mockDbQuery.mockResolvedValueOnce([{ count: 5 }]);

      try {
        await enforceNewsletterRateLimit(c, 'store-1');
        // Should not reach here
        expect.fail('Expected error to be thrown');
      } catch (e: any) {
        expect(e.statusCode).toBe(429);
        expect(e.code).toBe('rate_limit_exceeded');
      }
    });

    it('429 response includes Retry-After header', async () => {
      const c = createMockContext({ 'CF-Connecting-IP': '1.2.3.4' });
      // At limit
      mockDbQuery.mockResolvedValueOnce([{ count: 5 }]);

      try {
        await enforceNewsletterRateLimit(c, 'store-1');
      } catch {
        // Expected
      }

      const headers = c.getResponseHeaders();
      expect(headers['Retry-After']).toBeDefined();
      // Should be around 3600 seconds (1 hour)
      expect(parseInt(headers['Retry-After'])).toBeGreaterThan(3500);
    });

    it('does not record attempt when rate limited', async () => {
      const c = createMockContext({ 'CF-Connecting-IP': '1.2.3.4' });
      // At limit
      mockDbQuery.mockResolvedValueOnce([{ count: 5 }]);

      try {
        await enforceNewsletterRateLimit(c, 'store-1');
      } catch {
        // Expected
      }

      // Should NOT have recorded attempt (only one db.run call would be for recording)
      expect(mockDbRun).not.toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO newsletter_subscribe_attempts'),
        expect.any(Array)
      );
    });
  });

  describe('cleanupOldNewsletterAttempts', () => {
    it('removes attempts older than specified age', async () => {
      const env = createMockEnv();
      mockDbRun.mockResolvedValueOnce({ changes: 10 });

      const deleted = await cleanupOldNewsletterAttempts(env, 24 * 60 * 60 * 1000);

      expect(deleted).toBe(10);
      expect(mockDbRun).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM newsletter_subscribe_attempts'),
        [expect.any(String)]
      );
    });

    it('uses default 24 hour max age', async () => {
      const env = createMockEnv();
      mockDbRun.mockResolvedValueOnce({ changes: 5 });

      await cleanupOldNewsletterAttempts(env);

      // Should have been called with cutoff time ~24 hours ago
      expect(mockDbRun).toHaveBeenCalledWith(
        expect.any(String),
        [expect.stringMatching(/2026-01-17T12:00/)] // 24 hours before 2026-01-18T12:00
      );
    });
  });

  describe('defaultNewsletterRateLimitConfig', () => {
    it('has correct default values: 5 requests per hour', () => {
      expect(defaultNewsletterRateLimitConfig.maxAttempts).toBe(5);
      expect(defaultNewsletterRateLimitConfig.windowMs).toBe(60 * 60 * 1000); // 1 hour
    });
  });
});
