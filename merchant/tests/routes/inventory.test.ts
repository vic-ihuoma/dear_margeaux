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

// Mock uuid and now functions
vi.mock('../../src/types', async (importOriginal) => {
  const original = (await importOriginal()) as Record<string, unknown>;
  return {
    ...original,
    uuid: vi.fn(() => 'test-uuid-123'),
    now: vi.fn(() => '2026-01-18T12:00:00.000Z'),
  };
});

// Mock webhooks
vi.mock('../../src/lib/webhooks', () => ({
  checkLowInventory: vi.fn().mockResolvedValue(undefined),
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

// Dynamically import inventory routes after mocks are set up
async function getInventoryRoutes() {
  const { inventory } = await import('../../src/routes/inventory');
  return inventory;
}

describe('Inventory Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset to admin auth by default
    setAuthContext('admin');
  });

  describe('GET /v1/inventory/:sku/history', () => {
    it('returns history for existing SKU', async () => {
      const app = createTestApp();
      const inventoryRoutes = await getInventoryRoutes();
      app.route('/v1/inventory', inventoryRoutes);

      // Mock inventory exists
      mockDbQuery.mockImplementation((sql: string) => {
        if (sql.includes('FROM inventory WHERE')) {
          return [{ id: 'inv-1', store_id: 'store-1', sku: 'SKU-001', on_hand: 100, reserved: 5 }];
        }
        if (sql.includes('FROM inventory_logs')) {
          return [
            {
              id: 'log-1',
              store_id: 'store-1',
              sku: 'SKU-001',
              delta: 10,
              reason: 'restock',
              admin_id: 'admin-1',
              admin_name: 'John Admin',
              created_at: '2026-01-18T10:00:00.000Z',
            },
            {
              id: 'log-2',
              store_id: 'store-1',
              sku: 'SKU-001',
              delta: -5,
              reason: 'sale',
              admin_id: null,
              admin_name: null,
              created_at: '2026-01-18T09:00:00.000Z',
            },
          ];
        }
        return [];
      });

      const res = await app.request('/v1/inventory/SKU-001/history');
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.items).toHaveLength(2);
      expect(data.items[0].sku).toBe('SKU-001');
      expect(data.items[0].delta).toBe(10);
      expect(data.items[0].reason).toBe('restock');
      expect(data.items[0].admin_name).toBe('John Admin');
      expect(data.items[1].delta).toBe(-5);
      expect(data.items[1].reason).toBe('sale');
      expect(data.items[1].admin_name).toBeNull();
    });

    it('returns 404 for non-existent SKU', async () => {
      const app = createTestApp();
      const inventoryRoutes = await getInventoryRoutes();
      app.route('/v1/inventory', inventoryRoutes);

      mockDbQuery.mockResolvedValue([]);

      const res = await app.request('/v1/inventory/NONEXISTENT/history');
      expect(res.status).toBe(404);

      const data = await res.json();
      expect(data.error).toBe('not_found');
    });

    it('filters by date range', async () => {
      const app = createTestApp();
      const inventoryRoutes = await getInventoryRoutes();
      app.route('/v1/inventory', inventoryRoutes);

      // Mock inventory exists
      mockDbQuery.mockImplementation((sql: string, params?: unknown[]) => {
        if (sql.includes('FROM inventory WHERE')) {
          return [{ id: 'inv-1', store_id: 'store-1', sku: 'SKU-001', on_hand: 100, reserved: 5 }];
        }
        if (sql.includes('FROM inventory_logs')) {
          // Verify date filters are applied
          expect(sql).toContain('created_at >=');
          expect(sql).toContain('created_at <');
          return [
            {
              id: 'log-1',
              store_id: 'store-1',
              sku: 'SKU-001',
              delta: 10,
              reason: 'restock',
              admin_id: null,
              admin_name: null,
              created_at: '2026-01-15T10:00:00.000Z',
            },
          ];
        }
        return [];
      });

      const res = await app.request(
        '/v1/inventory/SKU-001/history?start_date=2026-01-10&end_date=2026-01-20'
      );
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.items).toHaveLength(1);
    });

    it('supports pagination', async () => {
      const app = createTestApp();
      const inventoryRoutes = await getInventoryRoutes();
      app.route('/v1/inventory', inventoryRoutes);

      // Mock inventory exists and return more than limit to test has_more
      mockDbQuery.mockImplementation((sql: string) => {
        if (sql.includes('FROM inventory WHERE')) {
          return [{ id: 'inv-1', store_id: 'store-1', sku: 'SKU-001', on_hand: 100, reserved: 5 }];
        }
        if (sql.includes('FROM inventory_logs')) {
          // Return 6 items to trigger has_more (limit is 5 + 1)
          return Array.from({ length: 6 }, (_, i) => ({
            id: `log-${i}`,
            store_id: 'store-1',
            sku: 'SKU-001',
            delta: i + 1,
            reason: 'restock',
            admin_id: null,
            admin_name: null,
            created_at: `2026-01-18T${10 - i}:00:00.000Z`,
          }));
        }
        return [];
      });

      const res = await app.request('/v1/inventory/SKU-001/history?limit=5');
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.items).toHaveLength(5);
      expect(data.pagination.has_more).toBe(true);
      expect(data.pagination.next_cursor).toBeDefined();
    });
  });

  // Note: The POST /v1/inventory/:sku/adjust endpoint is tested via the admin API tests
  // at apps/admin/tests/api/inventory.test.ts which properly handles the execution context.
  // The history tests above verify the data structure of inventory logs including admin_id/admin_name.
});
