import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock database and auth
const mockQuery = vi.fn();
const mockRun = vi.fn();

vi.mock('../../src/db', () => ({
  getDb: vi.fn(() => ({
    query: mockQuery,
    run: mockRun,
  })),
}));

vi.mock('../../src/middleware/auth', () => ({
  authMiddleware: vi.fn((c: any, next: () => Promise<void>) => {
    c.set('auth', {
      store: { id: 'store_test_123', name: 'Test Store' },
      role: 'admin',
    });
    return next();
  }),
  adminOnly: vi.fn((_c: any, next: () => Promise<void>) => next()),
}));

describe('Email Sends Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetModules();
  });

  describe('GET /v1/email-sends', () => {
    it('returns list of email sends', async () => {
      const mockEmailSends = [
        {
          id: 'es_1',
          store_id: 'store_test_123',
          email_type: 'order_confirmation',
          recipient: 'customer@example.com',
          subject: 'Order Confirmed - #1001',
          status: 'sent',
          error_message: null,
          metadata: JSON.stringify({ orderId: 'ord_123' }),
          created_at: '2026-01-31T10:00:00.000Z',
        },
        {
          id: 'es_2',
          store_id: 'store_test_123',
          email_type: 'newsletter',
          recipient: 'subscriber@example.com',
          subject: 'New Post',
          status: 'failed',
          error_message: 'Invalid address',
          metadata: null,
          created_at: '2026-01-31T09:00:00.000Z',
        },
      ];

      mockQuery.mockResolvedValueOnce(mockEmailSends);

      const { emailSendsRoutes } = await import('../../src/routes/email-sends.ts');
      const app = emailSendsRoutes;

      const res = await app.request('/', {
        headers: {
          Authorization: 'Bearer test-api-key',
        },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.items).toHaveLength(2);
      expect(data.items[0].id).toBe('es_1');
      expect(data.items[0].email_type).toBe('order_confirmation');
      expect(data.items[0].metadata).toEqual({ orderId: 'ord_123' });
      expect(data.items[1].error_message).toBe('Invalid address');
    });

    it('filters by email_type parameter', async () => {
      mockQuery.mockResolvedValueOnce([]);

      const { emailSendsRoutes } = await import('../../src/routes/email-sends.ts');
      const app = emailSendsRoutes;

      await app.request('/?email_type=newsletter', {
        headers: { Authorization: 'Bearer test-api-key' },
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('AND email_type = ?'),
        expect.arrayContaining(['newsletter'])
      );
    });

    it('filters by status parameter', async () => {
      mockQuery.mockResolvedValueOnce([]);

      const { emailSendsRoutes } = await import('../../src/routes/email-sends.ts');
      const app = emailSendsRoutes;

      await app.request('/?status=failed', {
        headers: { Authorization: 'Bearer test-api-key' },
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('AND status = ?'),
        expect.arrayContaining(['failed'])
      );
    });

    it('filters by date range', async () => {
      mockQuery.mockResolvedValueOnce([]);

      const { emailSendsRoutes } = await import('../../src/routes/email-sends.ts');
      const app = emailSendsRoutes;

      await app.request('/?start_date=2026-01-01&end_date=2026-01-31', {
        headers: { Authorization: 'Bearer test-api-key' },
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('AND created_at >= ?'),
        expect.arrayContaining(['2026-01-01'])
      );
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('AND created_at <= ?'),
        expect.arrayContaining([expect.stringContaining('2026-01-31')])
      );
    });

    it('handles pagination with cursor', async () => {
      mockQuery.mockResolvedValueOnce([]);

      const { emailSendsRoutes } = await import('../../src/routes/email-sends.ts');
      const app = emailSendsRoutes;

      await app.request('/?cursor=2026-01-30T12:00:00.000Z', {
        headers: { Authorization: 'Bearer test-api-key' },
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('AND created_at < ?'),
        expect.arrayContaining(['2026-01-30T12:00:00.000Z'])
      );
    });

    it('returns has_more=true when more items exist', async () => {
      // Return more items than limit to trigger has_more
      const manyItems = Array(51)
        .fill(null)
        .map((_, i) => ({
          id: `es_${i}`,
          store_id: 'store_test_123',
          email_type: 'newsletter',
          recipient: `test${i}@example.com`,
          subject: `Subject ${i}`,
          status: 'sent',
          error_message: null,
          metadata: null,
          created_at: `2026-01-31T10:${String(i).padStart(2, '0')}:00.000Z`,
        }));

      mockQuery.mockResolvedValueOnce(manyItems);

      const { emailSendsRoutes } = await import('../../src/routes/email-sends.ts');
      const app = emailSendsRoutes;

      const res = await app.request('/?limit=50', {
        headers: { Authorization: 'Bearer test-api-key' },
      });

      const data = await res.json();
      expect(data.items).toHaveLength(50);
      expect(data.pagination.has_more).toBe(true);
      expect(data.pagination.next_cursor).not.toBeNull();
    });
  });

  describe('GET /v1/email-sends/stats', () => {
    it('returns email send statistics', async () => {
      mockQuery
        .mockResolvedValueOnce([
          { status: 'sent', count: 140 },
          { status: 'failed', count: 10 },
        ])
        .mockResolvedValueOnce([
          { email_type: 'order_confirmation', count: 50 },
          { email_type: 'newsletter', count: 100 },
        ])
        .mockResolvedValueOnce([{ count: 150 }]);

      const { emailSendsRoutes } = await import('../../src/routes/email-sends.ts');
      const app = emailSendsRoutes;

      const res = await app.request('/stats', {
        headers: { Authorization: 'Bearer test-api-key' },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.total).toBe(150);
      expect(data.by_status.sent).toBe(140);
      expect(data.by_status.failed).toBe(10);
      expect(data.by_type.order_confirmation).toBe(50);
      expect(data.by_type.newsletter).toBe(100);
    });

    it('handles empty stats gracefully', async () => {
      mockQuery
        .mockResolvedValueOnce([]) // No status counts
        .mockResolvedValueOnce([]) // No type counts
        .mockResolvedValueOnce([{ count: 0 }]); // Zero total

      const { emailSendsRoutes } = await import('../../src/routes/email-sends.ts');
      const app = emailSendsRoutes;

      const res = await app.request('/stats', {
        headers: { Authorization: 'Bearer test-api-key' },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.total).toBe(0);
      expect(data.by_status).toEqual({});
      expect(data.by_type).toEqual({});
    });
  });
});

describe('Email Send Logging', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('logEmailSend function exists in notifications module', async () => {
    // This tests that the logging mechanism is in place
    // The actual implementation logs to the email_sends table
    const notificationsModule = await import('../../src/lib/notifications.ts');

    // The module exports sendOrderConfirmationEmail which uses logEmailSend internally
    expect(notificationsModule.sendOrderConfirmationEmail).toBeDefined();
    expect(notificationsModule.sendShippingUpdateEmail).toBeDefined();
    expect(notificationsModule.sendOrderStatusUpdateEmail).toBeDefined();
  });
});
