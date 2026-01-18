import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock uuid and now before importing module
vi.mock('../../src/types', async () => {
  const actual = await vi.importActual('../../src/types');
  return {
    ...actual,
    uuid: vi.fn(() => 'test-uuid-123'),
    now: vi.fn(() => '2026-01-18T12:00:00.000Z'),
  };
});

// Mock db module
const mockDbQuery = vi.fn();
const mockDbRun = vi.fn().mockResolvedValue({ changes: 1 });

const mockDb = {
  query: mockDbQuery,
  run: mockDbRun,
};

vi.mock('../../src/db', () => ({
  getDb: vi.fn(() => mockDb),
}));

import {
  checkRateLimit,
  incrementUsage,
  logRateLimitEvent,
  checkAndLogRateLimit,
  getEmailUsageStats,
  cleanupOldUsageRecords,
  getCurrentWindowStart,
  getCurrentWindowEnd,
  getWindowResetTime,
  DEFAULT_CONFIG,
  type RateLimitConfig,
} from '../../src/lib/email-rate-limiter';

describe('Email Rate Limiter Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDbQuery.mockReset();
    mockDbRun.mockReset().mockResolvedValue({ changes: 1 });
  });

  // ============================================================
  // Utility function tests
  // ============================================================

  describe('getCurrentWindowStart', () => {
    it('should return start of current hour', () => {
      const result = getCurrentWindowStart();
      const date = new Date(result);

      expect(date.getMinutes()).toBe(0);
      expect(date.getSeconds()).toBe(0);
      expect(date.getMilliseconds()).toBe(0);
    });

    it('should return a valid ISO string', () => {
      const result = getCurrentWindowStart();
      expect(() => new Date(result)).not.toThrow();
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
    });
  });

  describe('getCurrentWindowEnd', () => {
    it('should return end of current hour (start of next hour)', () => {
      const start = getCurrentWindowStart();
      const end = getCurrentWindowEnd();

      const startDate = new Date(start);
      const endDate = new Date(end);

      // End should be exactly 1 hour after start
      expect(endDate.getTime() - startDate.getTime()).toBe(60 * 60 * 1000);
    });

    it('should return a valid ISO string', () => {
      const result = getCurrentWindowEnd();
      expect(() => new Date(result)).not.toThrow();
    });
  });

  describe('getWindowResetTime', () => {
    it('should return same as getCurrentWindowEnd', () => {
      const reset = getWindowResetTime();
      const end = getCurrentWindowEnd();
      expect(reset).toBe(end);
    });
  });

  // ============================================================
  // checkRateLimit tests
  // ============================================================

  describe('checkRateLimit', () => {
    it('should allow emails when under limit', async () => {
      mockDbQuery.mockResolvedValueOnce([{ email_count: 500 }]);

      const result = await checkRateLimit(mockDb as any, 'store-123');

      expect(result.allowed).toBe(true);
      expect(result.currentCount).toBe(500);
      expect(result.limit).toBe(1000);
      expect(result.remainingInWindow).toBe(500);
    });

    it('should block emails when at limit', async () => {
      mockDbQuery.mockResolvedValueOnce([{ email_count: 1000 }]);

      const result = await checkRateLimit(mockDb as any, 'store-123');

      expect(result.allowed).toBe(false);
      expect(result.currentCount).toBe(1000);
      expect(result.remainingInWindow).toBe(0);
    });

    it('should block emails when over limit', async () => {
      mockDbQuery.mockResolvedValueOnce([{ email_count: 1500 }]);

      const result = await checkRateLimit(mockDb as any, 'store-123');

      expect(result.allowed).toBe(false);
      expect(result.remainingInWindow).toBe(0);
    });

    it('should treat no usage record as 0 emails', async () => {
      mockDbQuery.mockResolvedValueOnce([]);

      const result = await checkRateLimit(mockDb as any, 'store-123');

      expect(result.allowed).toBe(true);
      expect(result.currentCount).toBe(0);
      expect(result.remainingInWindow).toBe(1000);
    });

    it('should use custom config when provided', async () => {
      mockDbQuery.mockResolvedValueOnce([{ email_count: 50 }]);

      const customConfig: RateLimitConfig = {
        limit: 100,
        windowMs: 60 * 60 * 1000,
      };

      const result = await checkRateLimit(mockDb as any, 'store-123', customConfig);

      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(100);
      expect(result.remainingInWindow).toBe(50);
    });

    it('should include windowResetAt in result', async () => {
      mockDbQuery.mockResolvedValueOnce([{ email_count: 0 }]);

      const result = await checkRateLimit(mockDb as any, 'store-123');

      expect(result.windowResetAt).toBeDefined();
      expect(() => new Date(result.windowResetAt)).not.toThrow();
    });

    it('should query with correct store_id and window_start', async () => {
      mockDbQuery.mockResolvedValueOnce([]);

      await checkRateLimit(mockDb as any, 'store-abc');

      expect(mockDbQuery).toHaveBeenCalledTimes(1);
      const [sql, params] = mockDbQuery.mock.calls[0];
      expect(sql).toContain('SELECT email_count FROM email_usage');
      expect(sql).toContain('store_id = ?');
      expect(sql).toContain('window_start = ?');
      expect(params[0]).toBe('store-abc');
    });
  });

  // ============================================================
  // incrementUsage tests
  // ============================================================

  describe('incrementUsage', () => {
    it('should insert/update usage and return new count', async () => {
      mockDbRun.mockResolvedValueOnce({ changes: 1 });
      mockDbQuery.mockResolvedValueOnce([{ email_count: 1 }]);

      const result = await incrementUsage(mockDb as any, 'store-123');

      expect(result.newCount).toBe(1);
    });

    it('should use INSERT OR REPLACE pattern', async () => {
      mockDbRun.mockResolvedValueOnce({ changes: 1 });
      mockDbQuery.mockResolvedValueOnce([{ email_count: 5 }]);

      await incrementUsage(mockDb as any, 'store-123');

      const [sql] = mockDbRun.mock.calls[0];
      expect(sql).toContain('INSERT INTO email_usage');
      expect(sql).toContain('ON CONFLICT');
      expect(sql).toContain('email_count + 1');
    });

    it('should return 1 if query returns empty', async () => {
      mockDbRun.mockResolvedValueOnce({ changes: 1 });
      mockDbQuery.mockResolvedValueOnce([]);

      const result = await incrementUsage(mockDb as any, 'store-123');

      expect(result.newCount).toBe(1);
    });
  });

  // ============================================================
  // logRateLimitEvent tests
  // ============================================================

  describe('logRateLimitEvent', () => {
    it('should insert rate limit event', async () => {
      await logRateLimitEvent(
        mockDb as any,
        'store-123',
        'limit_exceeded',
        1000,
        1000,
        'order_confirmation',
        'test@example.com'
      );

      expect(mockDbRun).toHaveBeenCalledTimes(1);
      const [sql] = mockDbRun.mock.calls[0];
      expect(sql).toContain('INSERT INTO email_rate_limit_events');
    });

    it('should include all event details', async () => {
      await logRateLimitEvent(
        mockDb as any,
        'store-123',
        'warning_threshold',
        800,
        1000,
        'drop_launch',
        'subscriber@example.com'
      );

      const [, params] = mockDbRun.mock.calls[0];
      expect(params).toContain('store-123');
      expect(params).toContain('warning_threshold');
      expect(params).toContain('drop_launch');
      expect(params).toContain('subscriber@example.com');
      expect(params).toContain(800);
      expect(params).toContain(1000);
    });

    it('should handle null email type and recipient', async () => {
      await logRateLimitEvent(mockDb as any, 'store-123', 'limit_exceeded', 1000, 1000);

      const [, params] = mockDbRun.mock.calls[0];
      expect(params).toContain(null); // email_type
    });
  });

  // ============================================================
  // checkAndLogRateLimit tests
  // ============================================================

  describe('checkAndLogRateLimit', () => {
    it('should return allowed when under limit', async () => {
      mockDbQuery.mockResolvedValueOnce([{ email_count: 500 }]);

      const result = await checkAndLogRateLimit(
        mockDb as any,
        'store-123',
        'order_confirmation',
        'test@example.com'
      );

      expect(result.allowed).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should log event when limit exceeded', async () => {
      mockDbQuery.mockResolvedValueOnce([{ email_count: 1000 }]);
      mockDbRun.mockResolvedValueOnce({ changes: 1 });

      const result = await checkAndLogRateLimit(
        mockDb as any,
        'store-123',
        'order_confirmation',
        'test@example.com'
      );

      expect(result.allowed).toBe(false);
      expect(result.error).toContain('Rate limit exceeded');
      expect(mockDbRun).toHaveBeenCalledTimes(1);

      const [sql, params] = mockDbRun.mock.calls[0];
      expect(sql).toContain('INSERT INTO email_rate_limit_events');
      expect(params).toContain('limit_exceeded');
    });

    it('should log warning at 80% threshold', async () => {
      // 80% of 1000 = 800
      mockDbQuery.mockResolvedValueOnce([{ email_count: 800 }]);
      mockDbRun.mockResolvedValueOnce({ changes: 1 });

      const result = await checkAndLogRateLimit(
        mockDb as any,
        'store-123',
        'order_confirmation',
        'test@example.com'
      );

      expect(result.allowed).toBe(true);
      expect(mockDbRun).toHaveBeenCalledTimes(1);

      const [, params] = mockDbRun.mock.calls[0];
      expect(params).toContain('warning_threshold');
    });

    it('should not log warning below threshold', async () => {
      mockDbQuery.mockResolvedValueOnce([{ email_count: 799 }]);

      await checkAndLogRateLimit(
        mockDb as any,
        'store-123',
        'order_confirmation',
        'test@example.com'
      );

      expect(mockDbRun).not.toHaveBeenCalled();
    });

    it('should not log warning above threshold (only at exact threshold)', async () => {
      mockDbQuery.mockResolvedValueOnce([{ email_count: 801 }]);

      await checkAndLogRateLimit(
        mockDb as any,
        'store-123',
        'order_confirmation',
        'test@example.com'
      );

      expect(mockDbRun).not.toHaveBeenCalled();
    });

    it('should use custom warning threshold from config', async () => {
      // Custom 50% threshold on limit of 100 = 50
      mockDbQuery.mockResolvedValueOnce([{ email_count: 50 }]);
      mockDbRun.mockResolvedValueOnce({ changes: 1 });

      const customConfig: RateLimitConfig = {
        limit: 100,
        windowMs: 60 * 60 * 1000,
        warningThreshold: 50,
      };

      await checkAndLogRateLimit(mockDb as any, 'store-123', undefined, undefined, customConfig);

      expect(mockDbRun).toHaveBeenCalledTimes(1);
    });
  });

  // ============================================================
  // getEmailUsageStats tests
  // ============================================================

  describe('getEmailUsageStats', () => {
    beforeEach(() => {
      // Default mocks for all three queries
      mockDbQuery
        .mockResolvedValueOnce([{ email_count: 250 }]) // current window
        .mockResolvedValueOnce([
          { window_start: '2026-01-18T10:00:00.000Z', email_count: 100 },
          { window_start: '2026-01-18T11:00:00.000Z', email_count: 150 },
        ]) // hourly usage
        .mockResolvedValueOnce([{ count: 2 }]) // event count
        .mockResolvedValueOnce([
          {
            event_type: 'warning_threshold',
            email_type: 'drop_launch',
            attempted_recipient: 'test@example.com',
            current_count: 800,
            created_at: '2026-01-18T11:30:00.000Z',
          },
        ]); // recent events
    });

    it('should return current window statistics', async () => {
      const stats = await getEmailUsageStats(mockDb as any, 'store-123');

      expect(stats.storeId).toBe('store-123');
      expect(stats.currentWindow.count).toBe(250);
      expect(stats.currentWindow.limit).toBe(1000);
      expect(stats.currentWindow.remaining).toBe(750);
    });

    it('should return last 24 hours statistics', async () => {
      const stats = await getEmailUsageStats(mockDb as any, 'store-123');

      expect(stats.last24Hours.total).toBe(250); // 100 + 150
      expect(stats.last24Hours.byHour).toHaveLength(2);
    });

    it('should return rate limit events', async () => {
      const stats = await getEmailUsageStats(mockDb as any, 'store-123');

      expect(stats.rateLimitEvents.last24Hours).toBe(2);
      expect(stats.rateLimitEvents.recent).toHaveLength(1);
      expect(stats.rateLimitEvents.recent[0].eventType).toBe('warning_threshold');
    });

    it('should handle empty results gracefully', async () => {
      mockDbQuery.mockReset();
      mockDbQuery
        .mockResolvedValueOnce([]) // no current usage
        .mockResolvedValueOnce([]) // no hourly data
        .mockResolvedValueOnce([]) // no event count
        .mockResolvedValueOnce([]); // no recent events

      const stats = await getEmailUsageStats(mockDb as any, 'store-123');

      expect(stats.currentWindow.count).toBe(0);
      expect(stats.currentWindow.remaining).toBe(1000);
      expect(stats.last24Hours.total).toBe(0);
      expect(stats.rateLimitEvents.last24Hours).toBe(0);
    });
  });

  // ============================================================
  // cleanupOldUsageRecords tests
  // ============================================================

  describe('cleanupOldUsageRecords', () => {
    it('should delete old usage records', async () => {
      mockDbRun
        .mockResolvedValueOnce({ changes: 10 }) // email_usage delete
        .mockResolvedValueOnce({ changes: 5 }); // events delete

      const result = await cleanupOldUsageRecords(mockDb as any);

      expect(result.deleted).toBe(10);
      expect(mockDbRun).toHaveBeenCalledTimes(2);
    });

    it('should use 7 day threshold for usage records', async () => {
      mockDbRun.mockResolvedValueOnce({ changes: 0 }).mockResolvedValueOnce({ changes: 0 });

      await cleanupOldUsageRecords(mockDb as any);

      const [sql, params] = mockDbRun.mock.calls[0];
      expect(sql).toContain('DELETE FROM email_usage');
      expect(sql).toContain('window_start < ?');

      // Verify the date is roughly 7 days ago
      const threshold = new Date(params[0]);
      const now = new Date();
      const diffDays = (now.getTime() - threshold.getTime()) / (1000 * 60 * 60 * 24);
      expect(diffDays).toBeGreaterThan(6.9);
      expect(diffDays).toBeLessThan(7.1);
    });

    it('should use 30 day threshold for rate limit events', async () => {
      mockDbRun.mockResolvedValueOnce({ changes: 0 }).mockResolvedValueOnce({ changes: 0 });

      await cleanupOldUsageRecords(mockDb as any);

      const [sql, params] = mockDbRun.mock.calls[1];
      expect(sql).toContain('DELETE FROM email_rate_limit_events');

      const threshold = new Date(params[0]);
      const now = new Date();
      const diffDays = (now.getTime() - threshold.getTime()) / (1000 * 60 * 60 * 24);
      expect(diffDays).toBeGreaterThan(29.9);
      expect(diffDays).toBeLessThan(30.1);
    });

    it('should handle null changes', async () => {
      mockDbRun
        .mockResolvedValueOnce({}) // no changes property
        .mockResolvedValueOnce({});

      const result = await cleanupOldUsageRecords(mockDb as any);

      expect(result.deleted).toBe(0);
    });
  });

  // ============================================================
  // DEFAULT_CONFIG tests
  // ============================================================

  describe('DEFAULT_CONFIG', () => {
    it('should have 1000 emails per hour limit', () => {
      expect(DEFAULT_CONFIG.limit).toBe(1000);
    });

    it('should have 1 hour window', () => {
      expect(DEFAULT_CONFIG.windowMs).toBe(60 * 60 * 1000);
    });

    it('should have 80% warning threshold', () => {
      expect(DEFAULT_CONFIG.warningThreshold).toBe(80);
    });
  });
});
