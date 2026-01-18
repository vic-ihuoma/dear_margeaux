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

// Track auth context for tests
let mockAuthRole: 'admin' | 'public' = 'admin';

// Mock auth middleware to bypass actual auth
vi.mock('../../src/middleware/auth', () => {
  return {
    authMiddleware: vi.fn().mockImplementation((c: any, next: any) => {
      c.set('auth', {
        store: {
          id: 'store-1',
          name: 'Test Store',
          status: 'enabled',
          stripe_secret_key: null,
          stripe_webhook_secret: null,
        },
        role: mockAuthRole,
      });
      return next();
    }),
    adminOnly: vi.fn().mockImplementation(async (c: any, next: any) => {
      const auth = c.get('auth');
      if (auth?.role !== 'admin') {
        const types = await import('../../src/types');
        throw types.ApiError.forbidden('Admin access required');
      }
      return next();
    }),
  };
});

import { ApiError } from '../../src/types';

// Helper function to set auth context for a test
function setAuthContext(role: 'admin' | 'public') {
  mockAuthRole = role;
}

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

// Dynamically import counts after mocks are set up
async function getCountsRoutes() {
  const { counts } = await import('../../src/routes/counts');
  return counts;
}

describe('Counts Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset to admin auth by default
    setAuthContext('admin');
  });

  describe('GET /v1/counts/products', () => {
    it('returns total product count', async () => {
      mockDbQuery.mockResolvedValueOnce([{ count: 15 }]);

      const countsRoutes = await getCountsRoutes();
      const app = createTestApp();
      app.route('/v1/counts', countsRoutes);

      const res = await app.request('/v1/counts/products');
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data).toEqual({ count: 15 });
    });

    it('filters by status when provided', async () => {
      mockDbQuery.mockResolvedValueOnce([{ count: 8 }]);

      const countsRoutes = await getCountsRoutes();
      const app = createTestApp();
      app.route('/v1/counts', countsRoutes);

      const res = await app.request('/v1/counts/products?status=active');
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data).toEqual({ count: 8 });

      // Verify the query was called with status filter
      expect(mockDbQuery).toHaveBeenCalledWith(
        expect.stringContaining('status = ?'),
        expect.arrayContaining(['store-1', 'active'])
      );
    });

    it('returns 400 for invalid status', async () => {
      const countsRoutes = await getCountsRoutes();
      const app = createTestApp();
      app.route('/v1/counts', countsRoutes);

      const res = await app.request('/v1/counts/products?status=invalid');
      expect(res.status).toBe(400);

      const data = await res.json();
      expect(data.error).toBe('invalid_request');
    });

    it('returns 0 when no products exist', async () => {
      mockDbQuery.mockResolvedValueOnce([{ count: 0 }]);

      const countsRoutes = await getCountsRoutes();
      const app = createTestApp();
      app.route('/v1/counts', countsRoutes);

      const res = await app.request('/v1/counts/products');
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data).toEqual({ count: 0 });
    });

    it('handles null count result gracefully', async () => {
      mockDbQuery.mockResolvedValueOnce([]);

      const countsRoutes = await getCountsRoutes();
      const app = createTestApp();
      app.route('/v1/counts', countsRoutes);

      const res = await app.request('/v1/counts/products');
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data).toEqual({ count: 0 });
    });
  });

  describe('GET /v1/counts/orders', () => {
    it('returns total order count', async () => {
      mockDbQuery.mockResolvedValueOnce([{ count: 42 }]);

      const countsRoutes = await getCountsRoutes();
      const app = createTestApp();
      app.route('/v1/counts', countsRoutes);

      const res = await app.request('/v1/counts/orders');
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data).toEqual({ count: 42 });
    });

    it('filters by status when provided', async () => {
      mockDbQuery.mockResolvedValueOnce([{ count: 12 }]);

      const countsRoutes = await getCountsRoutes();
      const app = createTestApp();
      app.route('/v1/counts', countsRoutes);

      const res = await app.request('/v1/counts/orders?status=paid');
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data).toEqual({ count: 12 });

      expect(mockDbQuery).toHaveBeenCalledWith(
        expect.stringContaining('status = ?'),
        expect.arrayContaining(['store-1', 'paid'])
      );
    });

    it('filters by date range', async () => {
      mockDbQuery.mockResolvedValueOnce([{ count: 5 }]);

      const countsRoutes = await getCountsRoutes();
      const app = createTestApp();
      app.route('/v1/counts', countsRoutes);

      const res = await app.request('/v1/counts/orders?start_date=2026-01-01&end_date=2026-01-31');
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data).toEqual({ count: 5 });

      expect(mockDbQuery).toHaveBeenCalledWith(
        expect.stringContaining('created_at >= ?'),
        expect.arrayContaining(['store-1', '2026-01-01', '2026-01-31'])
      );
    });

    it('filters by both status and date range', async () => {
      mockDbQuery.mockResolvedValueOnce([{ count: 3 }]);

      const countsRoutes = await getCountsRoutes();
      const app = createTestApp();
      app.route('/v1/counts', countsRoutes);

      const res = await app.request(
        '/v1/counts/orders?status=shipped&start_date=2026-01-01&end_date=2026-01-15'
      );
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data).toEqual({ count: 3 });
    });

    it('returns 400 for invalid status', async () => {
      const countsRoutes = await getCountsRoutes();
      const app = createTestApp();
      app.route('/v1/counts', countsRoutes);

      const res = await app.request('/v1/counts/orders?status=invalid_status');
      expect(res.status).toBe(400);

      const data = await res.json();
      expect(data.error).toBe('invalid_request');
    });

    it('returns 400 for invalid date format', async () => {
      const countsRoutes = await getCountsRoutes();
      const app = createTestApp();
      app.route('/v1/counts', countsRoutes);

      const res = await app.request('/v1/counts/orders?start_date=invalid-date');
      expect(res.status).toBe(400);

      const data = await res.json();
      expect(data.error).toBe('invalid_request');
      expect(data.message).toContain('ISO 8601');
    });

    it('accepts full ISO 8601 datetime format', async () => {
      mockDbQuery.mockResolvedValueOnce([{ count: 7 }]);

      const countsRoutes = await getCountsRoutes();
      const app = createTestApp();
      app.route('/v1/counts', countsRoutes);

      const res = await app.request('/v1/counts/orders?start_date=2026-01-01T00:00:00Z');
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data).toEqual({ count: 7 });
    });
  });

  describe('GET /v1/counts/customers', () => {
    it('returns total customer count', async () => {
      mockDbQuery.mockResolvedValueOnce([{ count: 100 }]);

      const countsRoutes = await getCountsRoutes();
      const app = createTestApp();
      app.route('/v1/counts', countsRoutes);

      const res = await app.request('/v1/counts/customers');
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data).toEqual({ count: 100 });
    });

    it('returns 0 when no customers exist', async () => {
      mockDbQuery.mockResolvedValueOnce([{ count: 0 }]);

      const countsRoutes = await getCountsRoutes();
      const app = createTestApp();
      app.route('/v1/counts', countsRoutes);

      const res = await app.request('/v1/counts/customers');
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data).toEqual({ count: 0 });
    });
  });

  describe('GET /v1/counts/inventory', () => {
    it('returns total inventory count', async () => {
      mockDbQuery.mockResolvedValueOnce([{ count: 50 }]);

      const countsRoutes = await getCountsRoutes();
      const app = createTestApp();
      app.route('/v1/counts', countsRoutes);

      const res = await app.request('/v1/counts/inventory');
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data).toEqual({ count: 50 });
    });

    it('filters for low stock items when low_stock=true', async () => {
      mockDbQuery.mockResolvedValueOnce([{ count: 5 }]);

      const countsRoutes = await getCountsRoutes();
      const app = createTestApp();
      app.route('/v1/counts', countsRoutes);

      const res = await app.request('/v1/counts/inventory?low_stock=true');
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data).toEqual({ count: 5 });

      expect(mockDbQuery).toHaveBeenCalledWith(
        expect.stringContaining('on_hand - reserved'),
        expect.arrayContaining(['store-1'])
      );
    });

    it('does not filter for low stock when low_stock=false', async () => {
      mockDbQuery.mockResolvedValueOnce([{ count: 50 }]);

      const countsRoutes = await getCountsRoutes();
      const app = createTestApp();
      app.route('/v1/counts', countsRoutes);

      const res = await app.request('/v1/counts/inventory?low_stock=false');
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data).toEqual({ count: 50 });

      // Query should not contain low stock filter
      expect(mockDbQuery).toHaveBeenCalledWith(
        expect.not.stringContaining('on_hand - reserved'),
        expect.arrayContaining(['store-1'])
      );
    });
  });

  describe('Authentication', () => {
    it('requires admin access for products count', async () => {
      setAuthContext('public');

      const countsRoutes = await getCountsRoutes();
      const app = createTestApp();
      app.route('/v1/counts', countsRoutes);

      const res = await app.request('/v1/counts/products');
      expect(res.status).toBe(403);
    });

    it('requires admin access for orders count', async () => {
      setAuthContext('public');

      const countsRoutes = await getCountsRoutes();
      const app = createTestApp();
      app.route('/v1/counts', countsRoutes);

      const res = await app.request('/v1/counts/orders');
      expect(res.status).toBe(403);
    });

    it('requires admin access for customers count', async () => {
      setAuthContext('public');

      const countsRoutes = await getCountsRoutes();
      const app = createTestApp();
      app.route('/v1/counts', countsRoutes);

      const res = await app.request('/v1/counts/customers');
      expect(res.status).toBe(403);
    });

    it('requires admin access for inventory count', async () => {
      setAuthContext('public');

      const countsRoutes = await getCountsRoutes();
      const app = createTestApp();
      app.route('/v1/counts', countsRoutes);

      const res = await app.request('/v1/counts/inventory');
      expect(res.status).toBe(403);
    });
  });
});
