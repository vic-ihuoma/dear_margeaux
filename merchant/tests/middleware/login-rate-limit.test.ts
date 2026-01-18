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

// Mock uuid and now functions
vi.mock('../../src/types', async () => {
  const actual = await vi.importActual('../../src/types');
  return {
    ...actual,
    uuid: vi.fn(() => 'test-uuid-123'),
    now: vi.fn(() => '2026-01-18T12:00:00.000Z'),
  };
});

// Mock console methods for testing logging
const mockConsoleInfo = vi.spyOn(console, 'info').mockImplementation(() => {});
const mockConsoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});

import {
  checkLoginRateLimit,
  recordLoginAttempt,
  lockAccount,
  unlockAccount,
  cleanupOldAttempts,
  getClientIp,
  setRateLimitHeaders,
  enforceLoginRateLimit,
  defaultLoginRateLimitConfig,
  type LoginRateLimitConfig,
} from '../../src/middleware/login-rate-limit';

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

describe('Login Rate Limit Middleware', () => {
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
      const config: LoginRateLimitConfig = {
        maxAttempts: 5,
        windowMs: 900000,
        lockoutDurationMs: 3600000,
        lockoutThreshold: 3,
      };
      const resetAt = new Date('2026-01-18T12:15:00.000Z');

      setRateLimitHeaders(c, config, 3, resetAt);

      const headers = c.getResponseHeaders();
      expect(headers['X-RateLimit-Limit']).toBe('5');
      expect(headers['X-RateLimit-Remaining']).toBe('3');
      expect(headers['X-RateLimit-Reset']).toBe(String(Math.ceil(resetAt.getTime() / 1000)));
    });
  });

  describe('recordLoginAttempt', () => {
    it('records failed login attempt to database', async () => {
      const env = createMockEnv();

      await recordLoginAttempt(env, 'store-1', 'test@example.com', '1.2.3.4', false);

      expect(mockDbRun).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO login_attempts'),
        expect.arrayContaining([
          'test-uuid-123',
          'store-1',
          expect.any(String), // identifier hash
          '1.2.3.4',
          'test@example.com',
          expect.any(String), // timestamp
          0, // success = false
        ])
      );
    });

    it('records successful login attempt to database', async () => {
      const env = createMockEnv();

      await recordLoginAttempt(env, 'store-1', 'test@example.com', '1.2.3.4', true);

      expect(mockDbRun).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO login_attempts'),
        expect.arrayContaining([
          'test-uuid-123',
          'store-1',
          expect.any(String),
          '1.2.3.4',
          'test@example.com',
          expect.any(String),
          1, // success = true
        ])
      );
    });

    it('normalizes email to lowercase', async () => {
      const env = createMockEnv();

      await recordLoginAttempt(env, 'store-1', 'TEST@EXAMPLE.COM', '1.2.3.4', false);

      expect(mockDbRun).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO login_attempts'),
        expect.arrayContaining(['test@example.com'])
      );
    });

    it('logs login attempt for monitoring', async () => {
      const env = createMockEnv();

      await recordLoginAttempt(env, 'store-1', 'test@example.com', '1.2.3.4', false);

      expect(mockConsoleInfo).toHaveBeenCalledWith(expect.stringContaining('[LOGIN_ATTEMPT]'));
    });
  });

  describe('checkLoginRateLimit', () => {
    it('allows requests under limit', async () => {
      const env = createMockEnv();
      // No lockout
      mockDbQuery.mockResolvedValueOnce([]);
      // 2 failed attempts (under limit of 5)
      mockDbQuery.mockResolvedValueOnce([{ count: 2 }]);

      const result = await checkLoginRateLimit(env, 'store-1', 'test@example.com', '1.2.3.4');

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(3); // 5 - 2 = 3
      expect(result.locked).toBe(false);
    });

    it('blocks after 5 failed attempts', async () => {
      const env = createMockEnv();
      // No lockout
      mockDbQuery.mockResolvedValueOnce([]);
      // 5 failed attempts (at limit)
      mockDbQuery.mockResolvedValueOnce([{ count: 5 }]);
      // Rate limit check for lockout threshold
      mockDbQuery.mockResolvedValueOnce([{ count: 1 }]);

      const result = await checkLoginRateLimit(env, 'store-1', 'test@example.com', '1.2.3.4');

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.locked).toBe(false);
    });

    it('resets counter after window expires (15 minutes)', async () => {
      const env = createMockEnv();
      // No lockout
      mockDbQuery.mockResolvedValueOnce([]);
      // 0 failed attempts (window reset)
      mockDbQuery.mockResolvedValueOnce([{ count: 0 }]);

      const result = await checkLoginRateLimit(env, 'store-1', 'test@example.com', '1.2.3.4');

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(5);
    });

    it('returns locked=true when account is locked', async () => {
      const env = createMockEnv();
      // Active lockout
      mockDbQuery.mockResolvedValueOnce([{ locked_until: '2026-01-18T13:00:00.000Z' }]);

      const result = await checkLoginRateLimit(env, 'store-1', 'test@example.com', '1.2.3.4');

      expect(result.allowed).toBe(false);
      expect(result.locked).toBe(true);
      expect(result.resetAt.toISOString()).toBe('2026-01-18T13:00:00.000Z');
    });

    it('logs rate limit exceeded events', async () => {
      const env = createMockEnv();
      // No lockout
      mockDbQuery.mockResolvedValueOnce([]);
      // At rate limit
      mockDbQuery.mockResolvedValueOnce([{ count: 5 }]);
      // Rate limit check for lockout threshold
      mockDbQuery.mockResolvedValueOnce([{ count: 1 }]);

      await checkLoginRateLimit(env, 'store-1', 'test@example.com', '1.2.3.4');

      expect(mockConsoleWarn).toHaveBeenCalledWith(
        expect.stringContaining('[LOGIN_RATE_LIMIT] Rate limit exceeded')
      );
    });

    it('locks account after repeated rate limit hits', async () => {
      const env = createMockEnv();
      // No lockout
      mockDbQuery.mockResolvedValueOnce([]);
      // At rate limit
      mockDbQuery.mockResolvedValueOnce([{ count: 5 }]);
      // Rate limit hits threshold (3)
      mockDbQuery.mockResolvedValueOnce([{ count: 3 }]);

      await checkLoginRateLimit(env, 'store-1', 'test@example.com', '1.2.3.4');

      // Should have called lockAccount
      expect(mockDbRun).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO account_lockouts'),
        expect.any(Array)
      );
    });
  });

  describe('lockAccount', () => {
    it('creates lockout record in database', async () => {
      const env = createMockEnv();

      await lockAccount(env, 'store-1', 'test@example.com', 3600000, 'rate_limit');

      expect(mockDbRun).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO account_lockouts'),
        expect.arrayContaining([
          'test-uuid-123',
          'store-1',
          'test@example.com',
          expect.stringContaining('2026-01-18T13:00'), // 1 hour from now
          'rate_limit',
        ])
      );
    });

    it('logs account lockout event', async () => {
      const env = createMockEnv();

      await lockAccount(env, 'store-1', 'test@example.com', 3600000, 'rate_limit');

      expect(mockConsoleWarn).toHaveBeenCalledWith(expect.stringContaining('[ACCOUNT_LOCKOUT]'));
    });
  });

  describe('unlockAccount', () => {
    it('removes lockout record from database', async () => {
      const env = createMockEnv();

      await unlockAccount(env, 'store-1', 'test@example.com');

      expect(mockDbRun).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM account_lockouts'),
        ['store-1', 'test@example.com']
      );
    });

    it('logs account unlock event', async () => {
      const env = createMockEnv();

      await unlockAccount(env, 'store-1', 'test@example.com');

      expect(mockConsoleInfo).toHaveBeenCalledWith(expect.stringContaining('[ACCOUNT_UNLOCK]'));
    });
  });

  describe('cleanupOldAttempts', () => {
    it('removes attempts older than specified age', async () => {
      const env = createMockEnv();
      mockDbRun.mockResolvedValueOnce({ changes: 10 });
      mockDbRun.mockResolvedValueOnce({ changes: 2 });

      const deleted = await cleanupOldAttempts(env, 7 * 24 * 60 * 60 * 1000);

      expect(deleted).toBe(10);
      expect(mockDbRun).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM login_attempts'),
        [expect.any(String)]
      );
    });

    it('also cleans up expired lockouts', async () => {
      const env = createMockEnv();
      mockDbRun.mockResolvedValueOnce({ changes: 5 });
      mockDbRun.mockResolvedValueOnce({ changes: 3 });

      await cleanupOldAttempts(env);

      // Verify the second call is for lockouts cleanup (no array params needed)
      expect(mockDbRun).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('DELETE FROM account_lockouts')
      );
    });
  });

  describe('enforceLoginRateLimit', () => {
    it('allows request and sets headers when under limit', async () => {
      const c = createMockContext({ 'CF-Connecting-IP': '1.2.3.4' });
      // No lockout
      mockDbQuery.mockResolvedValueOnce([]);
      // Under limit
      mockDbQuery.mockResolvedValueOnce([{ count: 2 }]);

      const result = await enforceLoginRateLimit(c, 'store-1', 'test@example.com');

      expect(result.remaining).toBe(3);
      const headers = c.getResponseHeaders();
      expect(headers['X-RateLimit-Limit']).toBe('5');
      expect(headers['X-RateLimit-Remaining']).toBe('3');
    });

    it('throws 429 when rate limited', async () => {
      const c = createMockContext({ 'CF-Connecting-IP': '1.2.3.4' });
      // No lockout
      mockDbQuery.mockResolvedValueOnce([]);
      // At limit
      mockDbQuery.mockResolvedValueOnce([{ count: 5 }]);
      // Under lockout threshold
      mockDbQuery.mockResolvedValueOnce([{ count: 1 }]);

      try {
        await enforceLoginRateLimit(c, 'store-1', 'test@example.com');
        // Should not reach here
        expect.fail('Expected error to be thrown');
      } catch (e: any) {
        expect(e.statusCode).toBe(429);
        expect(e.code).toBe('rate_limit_exceeded');
      }
    });

    it('returns 429 with Retry-After header', async () => {
      const c = createMockContext({ 'CF-Connecting-IP': '1.2.3.4' });
      // No lockout
      mockDbQuery.mockResolvedValueOnce([]);
      // At limit
      mockDbQuery.mockResolvedValueOnce([{ count: 5 }]);
      // Under lockout threshold
      mockDbQuery.mockResolvedValueOnce([{ count: 1 }]);

      try {
        await enforceLoginRateLimit(c, 'store-1', 'test@example.com');
      } catch {
        // Expected
      }

      const headers = c.getResponseHeaders();
      expect(headers['Retry-After']).toBeDefined();
    });

    it('throws 423 when account is locked', async () => {
      const c = createMockContext({ 'CF-Connecting-IP': '1.2.3.4' });
      // Active lockout
      mockDbQuery.mockResolvedValueOnce([{ locked_until: '2026-01-18T13:00:00.000Z' }]);

      try {
        await enforceLoginRateLimit(c, 'store-1', 'test@example.com');
        // Should not reach here
        expect.fail('Expected error to be thrown');
      } catch (e: any) {
        expect(e.statusCode).toBe(423);
        expect(e.code).toBe('account_locked');
      }
    });
  });

  describe('defaultLoginRateLimitConfig', () => {
    it('has correct default values', () => {
      expect(defaultLoginRateLimitConfig.maxAttempts).toBe(5);
      expect(defaultLoginRateLimitConfig.windowMs).toBe(15 * 60 * 1000); // 15 minutes
      expect(defaultLoginRateLimitConfig.lockoutDurationMs).toBe(60 * 60 * 1000); // 1 hour
      expect(defaultLoginRateLimitConfig.lockoutThreshold).toBe(3);
    });
  });
});
