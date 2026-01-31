import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import type { AuthContext, Env } from '../../src/types';

// Create mock database before any imports
const mockDbQuery = vi.fn();
const mockDbRun = vi.fn().mockResolvedValue({ changes: 1 });

const mockDb = {
  query: mockDbQuery,
  run: mockDbRun,
};

// Mock the db module
vi.mock('../../src/db', () => ({
  getDb: vi.fn(() => mockDb),
}));

// Mock auth middleware to bypass actual auth
vi.mock('../../src/middleware/auth', () => {
  return {
    authMiddleware: vi.fn().mockImplementation((c: any, next: any) => {
      c.set('auth', {
        store: {
          id: 'store-1',
          name: 'Test Store',
          status: 'enabled',
          stripe_secret_key: 'sk_test_123',
          stripe_webhook_secret: null,
        },
        role: 'admin',
      });
      return next();
    }),
    adminOnly: vi.fn().mockImplementation(async (c: any, next: any) => {
      return next();
    }),
  };
});

// Mock webhooks
vi.mock('../../src/lib/webhooks', () => ({
  dispatchWebhooks: vi.fn(),
}));

// Mock notifications
vi.mock('../../src/lib/notifications', () => ({
  sendShippingUpdateEmail: vi.fn().mockResolvedValue({ success: true }),
  sendOrderStatusUpdateEmail: vi.fn().mockResolvedValue({ success: true }),
}));

import { ApiError } from '../../src/types';

// Helper to create test app
function createTestApp() {
  const app = new Hono<{
    Bindings: Env;
    Variables: { auth: AuthContext };
  }>();

  // Error handler
  app.onError((err, c) => {
    if (err instanceof ApiError) {
      return c.json(
        { error: err.code, message: err.message, details: err.details },
        err.statusCode as any
      );
    }
    return c.json({ error: 'internal_error', message: err.message }, 500);
  });

  return app;
}

// Sample order rows
function createMockOrder(overrides: Partial<any> = {}) {
  return {
    id: 'order-1',
    store_id: 'store-1',
    customer_id: 'customer-1',
    number: 'DM-20260118-001',
    status: 'paid',
    customer_email: 'test@example.com',
    shipping_name: 'John Doe',
    shipping_phone: '+1234567890',
    ship_to: JSON.stringify({
      line1: '123 Main St',
      city: 'New York',
      state: 'NY',
      postal_code: '10001',
      country: 'US',
    }),
    subtotal_cents: 10000,
    tax_cents: 800,
    shipping_cents: 500,
    discount_code: null,
    discount_id: null,
    discount_amount_cents: null,
    total_cents: 11300,
    currency: 'USD',
    tracking_number: null,
    tracking_url: null,
    shipped_at: null,
    stripe_checkout_session_id: 'cs_test_123',
    stripe_payment_intent_id: 'pi_test_123',
    created_at: '2026-01-15T10:00:00Z',
    ...overrides,
  };
}

function createMockOrderItem(overrides: Partial<any> = {}) {
  return {
    id: 'item-1',
    order_id: 'order-1',
    sku: 'TEST-001',
    title: 'Test Product',
    qty: 1,
    unit_price_cents: 10000,
    ...overrides,
  };
}

// Dynamically import orders after mocks are set up
async function getOrdersRoutes() {
  const { orders } = await import('../../src/routes/orders');
  return orders;
}

describe('Orders Routes - Date Filtering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /v1/orders', () => {
    it('returns orders without date filter', async () => {
      const mockOrder = createMockOrder();
      const mockItem = createMockOrderItem();

      mockDbQuery
        .mockResolvedValueOnce([mockOrder]) // Orders query
        .mockResolvedValueOnce([mockItem]); // Order items query

      const ordersRoutes = await getOrdersRoutes();
      const app = createTestApp();
      app.route('/v1/orders', ordersRoutes);

      const res = await app.request('/v1/orders');
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.items).toHaveLength(1);
      expect(data.items[0].id).toBe('order-1');
    });

    it('filters orders by start_date', async () => {
      const mockOrder = createMockOrder({ created_at: '2026-01-15T10:00:00Z' });
      const mockItem = createMockOrderItem();

      mockDbQuery
        .mockResolvedValueOnce([mockOrder]) // Orders query
        .mockResolvedValueOnce([mockItem]); // Order items query

      const ordersRoutes = await getOrdersRoutes();
      const app = createTestApp();
      app.route('/v1/orders', ordersRoutes);

      const res = await app.request('/v1/orders?start_date=2026-01-01');
      expect(res.status).toBe(200);

      // Verify the query was called with start_date filter
      expect(mockDbQuery).toHaveBeenCalledWith(
        expect.stringContaining('created_at >= ?'),
        expect.arrayContaining(['store-1', '2026-01-01'])
      );
    });

    it('filters orders by end_date', async () => {
      const mockOrder = createMockOrder({ created_at: '2026-01-15T10:00:00Z' });
      const mockItem = createMockOrderItem();

      mockDbQuery
        .mockResolvedValueOnce([mockOrder]) // Orders query
        .mockResolvedValueOnce([mockItem]); // Order items query

      const ordersRoutes = await getOrdersRoutes();
      const app = createTestApp();
      app.route('/v1/orders', ordersRoutes);

      const res = await app.request('/v1/orders?end_date=2026-01-31');
      expect(res.status).toBe(200);

      // Verify the query was called with end_date filter
      expect(mockDbQuery).toHaveBeenCalledWith(
        expect.stringContaining('created_at <= ?'),
        expect.arrayContaining(['store-1', '2026-01-31'])
      );
    });

    it('filters orders by both start_date and end_date', async () => {
      const mockOrder = createMockOrder({ created_at: '2026-01-15T10:00:00Z' });
      const mockItem = createMockOrderItem();

      mockDbQuery
        .mockResolvedValueOnce([mockOrder]) // Orders query
        .mockResolvedValueOnce([mockItem]); // Order items query

      const ordersRoutes = await getOrdersRoutes();
      const app = createTestApp();
      app.route('/v1/orders', ordersRoutes);

      const res = await app.request('/v1/orders?start_date=2026-01-01&end_date=2026-01-31');
      expect(res.status).toBe(200);

      // Verify the query was called with both date filters
      const queryCalls = mockDbQuery.mock.calls;
      const orderQuery = queryCalls[0][0];
      expect(orderQuery).toContain('created_at >= ?');
      expect(orderQuery).toContain('created_at <= ?');
    });

    it('returns 400 for invalid start_date format', async () => {
      const ordersRoutes = await getOrdersRoutes();
      const app = createTestApp();
      app.route('/v1/orders', ordersRoutes);

      const res = await app.request('/v1/orders?start_date=invalid-date');
      expect(res.status).toBe(400);

      const data = await res.json();
      expect(data.error).toBe('invalid_request');
      expect(data.message).toContain('ISO 8601');
    });

    it('returns 400 for invalid end_date format', async () => {
      const ordersRoutes = await getOrdersRoutes();
      const app = createTestApp();
      app.route('/v1/orders', ordersRoutes);

      const res = await app.request('/v1/orders?end_date=01/31/2026');
      expect(res.status).toBe(400);

      const data = await res.json();
      expect(data.error).toBe('invalid_request');
      expect(data.message).toContain('ISO 8601');
    });

    it('accepts full ISO 8601 datetime format for start_date', async () => {
      const mockOrder = createMockOrder();
      const mockItem = createMockOrderItem();

      mockDbQuery.mockResolvedValueOnce([mockOrder]).mockResolvedValueOnce([mockItem]);

      const ordersRoutes = await getOrdersRoutes();
      const app = createTestApp();
      app.route('/v1/orders', ordersRoutes);

      const res = await app.request('/v1/orders?start_date=2026-01-01T00:00:00Z');
      expect(res.status).toBe(200);

      expect(mockDbQuery).toHaveBeenCalledWith(
        expect.stringContaining('created_at >= ?'),
        expect.arrayContaining(['store-1', '2026-01-01T00:00:00Z'])
      );
    });

    it('accepts full ISO 8601 datetime format for end_date', async () => {
      const mockOrder = createMockOrder();
      const mockItem = createMockOrderItem();

      mockDbQuery.mockResolvedValueOnce([mockOrder]).mockResolvedValueOnce([mockItem]);

      const ordersRoutes = await getOrdersRoutes();
      const app = createTestApp();
      app.route('/v1/orders', ordersRoutes);

      const res = await app.request('/v1/orders?end_date=2026-01-31T23:59:59Z');
      expect(res.status).toBe(200);

      expect(mockDbQuery).toHaveBeenCalledWith(
        expect.stringContaining('created_at <= ?'),
        expect.arrayContaining(['store-1', '2026-01-31T23:59:59Z'])
      );
    });

    it('combines date filter with status filter', async () => {
      const mockOrder = createMockOrder({ status: 'shipped' });
      const mockItem = createMockOrderItem();

      mockDbQuery.mockResolvedValueOnce([mockOrder]).mockResolvedValueOnce([mockItem]);

      const ordersRoutes = await getOrdersRoutes();
      const app = createTestApp();
      app.route('/v1/orders', ordersRoutes);

      const res = await app.request(
        '/v1/orders?status=shipped&start_date=2026-01-01&end_date=2026-01-31'
      );
      expect(res.status).toBe(200);

      const queryCalls = mockDbQuery.mock.calls;
      const orderQuery = queryCalls[0][0];
      expect(orderQuery).toContain('status = ?');
      expect(orderQuery).toContain('created_at >= ?');
      expect(orderQuery).toContain('created_at <= ?');
    });

    it('combines date filter with email filter', async () => {
      const mockOrder = createMockOrder({ customer_email: 'test@example.com' });
      const mockItem = createMockOrderItem();

      mockDbQuery.mockResolvedValueOnce([mockOrder]).mockResolvedValueOnce([mockItem]);

      const ordersRoutes = await getOrdersRoutes();
      const app = createTestApp();
      app.route('/v1/orders', ordersRoutes);

      const res = await app.request('/v1/orders?email=test@example.com&start_date=2026-01-01');
      expect(res.status).toBe(200);

      const queryCalls = mockDbQuery.mock.calls;
      const orderQuery = queryCalls[0][0];
      expect(orderQuery).toContain('customer_email = ?');
      expect(orderQuery).toContain('created_at >= ?');
    });

    it('returns empty list when no orders match date range', async () => {
      mockDbQuery.mockResolvedValueOnce([]); // Empty orders

      const ordersRoutes = await getOrdersRoutes();
      const app = createTestApp();
      app.route('/v1/orders', ordersRoutes);

      const res = await app.request('/v1/orders?start_date=2025-01-01&end_date=2025-12-31');
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.items).toHaveLength(0);
      expect(data.pagination.has_more).toBe(false);
    });

    it('returns 400 for invalid status', async () => {
      const ordersRoutes = await getOrdersRoutes();
      const app = createTestApp();
      app.route('/v1/orders', ordersRoutes);

      const res = await app.request('/v1/orders?status=invalid_status');
      expect(res.status).toBe(400);

      const data = await res.json();
      expect(data.error).toBe('invalid_request');
      expect(data.message).toContain('status must be one of');
    });

    it('date filtering preserves pagination behavior', async () => {
      // Create 21 mock orders to trigger pagination
      const mockOrders = Array.from({ length: 21 }, (_, i) =>
        createMockOrder({
          id: `order-${i + 1}`,
          created_at: `2026-01-${String(15 - Math.floor(i / 2)).padStart(2, '0')}T10:00:00Z`,
        })
      );
      const mockItem = createMockOrderItem();

      mockDbQuery.mockResolvedValueOnce(mockOrders).mockResolvedValueOnce(Array(21).fill(mockItem));

      const ordersRoutes = await getOrdersRoutes();
      const app = createTestApp();
      app.route('/v1/orders', ordersRoutes);

      const res = await app.request('/v1/orders?start_date=2026-01-01&limit=20');
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.items).toHaveLength(20); // Should return limit, not 21
      expect(data.pagination.has_more).toBe(true);
    });
  });
});
