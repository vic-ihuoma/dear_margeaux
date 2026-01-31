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

// Sample order row
function createMockOrder(overrides: Partial<any> = {}) {
  return {
    id: 'order-1',
    store_id: 'store-1',
    customer_id: 'customer-1',
    number: 'DM-20260118-001',
    status: 'paid',
    customer_email: 'test@example.com',
    ...overrides,
  };
}

// Sample order note
function createMockOrderNote(overrides: Partial<any> = {}) {
  return {
    id: 'note-1',
    order_id: 'order-1',
    admin_id: 'admin-1',
    admin_name: 'Admin User',
    content: 'This is a test note',
    created_at: '2026-01-15T10:00:00Z',
    updated_at: '2026-01-15T10:00:00Z',
    ...overrides,
  };
}

// Dynamically import orders after mocks are set up
async function getOrdersRoutes() {
  const { orders } = await import('../../src/routes/orders');
  return orders;
}

describe('Order Notes Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /v1/orders/:orderId/notes', () => {
    it('returns list of notes for an order', async () => {
      const mockOrder = createMockOrder();
      const mockNote = createMockOrderNote();

      mockDbQuery
        .mockResolvedValueOnce([mockOrder]) // Order exists check
        .mockResolvedValueOnce([mockNote]); // Notes query

      const ordersRoutes = await getOrdersRoutes();
      const app = createTestApp();
      app.route('/v1/orders', ordersRoutes);

      const res = await app.request('/v1/orders/order-1/notes');
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.items).toHaveLength(1);
      expect(data.items[0].content).toBe('This is a test note');
      expect(data.items[0].admin_name).toBe('Admin User');
    });

    it('returns empty list when no notes exist', async () => {
      const mockOrder = createMockOrder();

      mockDbQuery
        .mockResolvedValueOnce([mockOrder]) // Order exists check
        .mockResolvedValueOnce([]); // Empty notes

      const ordersRoutes = await getOrdersRoutes();
      const app = createTestApp();
      app.route('/v1/orders', ordersRoutes);

      const res = await app.request('/v1/orders/order-1/notes');
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.items).toHaveLength(0);
    });

    it('returns 404 when order does not exist', async () => {
      mockDbQuery.mockResolvedValueOnce([]); // No order found

      const ordersRoutes = await getOrdersRoutes();
      const app = createTestApp();
      app.route('/v1/orders', ordersRoutes);

      const res = await app.request('/v1/orders/nonexistent/notes');
      expect(res.status).toBe(404);

      const data = await res.json();
      expect(data.error).toBe('not_found');
    });

    it('orders notes by created_at descending', async () => {
      const mockOrder = createMockOrder();
      const mockNote1 = createMockOrderNote({ id: 'note-1', created_at: '2026-01-15T10:00:00Z' });
      const mockNote2 = createMockOrderNote({ id: 'note-2', created_at: '2026-01-16T10:00:00Z' });

      mockDbQuery.mockResolvedValueOnce([mockOrder]).mockResolvedValueOnce([mockNote2, mockNote1]); // Note 2 should be first

      const ordersRoutes = await getOrdersRoutes();
      const app = createTestApp();
      app.route('/v1/orders', ordersRoutes);

      const res = await app.request('/v1/orders/order-1/notes');
      expect(res.status).toBe(200);

      // Verify query includes ORDER BY clause
      expect(mockDbQuery).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY created_at DESC'),
        expect.any(Array)
      );
    });
  });

  describe('POST /v1/orders/:orderId/notes', () => {
    it('creates a new note successfully', async () => {
      const mockOrder = createMockOrder();

      mockDbQuery.mockResolvedValueOnce([mockOrder]); // Order exists check
      mockDbRun.mockResolvedValueOnce({ changes: 1 }); // Insert note

      const ordersRoutes = await getOrdersRoutes();
      const app = createTestApp();
      app.route('/v1/orders', ordersRoutes);

      const res = await app.request('/v1/orders/order-1/notes', {
        method: 'POST',
        body: JSON.stringify({
          content: 'New note content',
          admin_id: 'admin-1',
          admin_name: 'Admin User',
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.content).toBe('New note content');
      expect(data.admin_name).toBe('Admin User');
      expect(data.order_id).toBe('order-1');
    });

    it('trims whitespace from content', async () => {
      const mockOrder = createMockOrder();

      mockDbQuery.mockResolvedValueOnce([mockOrder]);
      mockDbRun.mockResolvedValueOnce({ changes: 1 });

      const ordersRoutes = await getOrdersRoutes();
      const app = createTestApp();
      app.route('/v1/orders', ordersRoutes);

      const res = await app.request('/v1/orders/order-1/notes', {
        method: 'POST',
        body: JSON.stringify({
          content: '  Note with whitespace  ',
          admin_id: 'admin-1',
          admin_name: 'Admin User',
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.content).toBe('Note with whitespace');
    });

    it('returns 400 when content is missing', async () => {
      const ordersRoutes = await getOrdersRoutes();
      const app = createTestApp();
      app.route('/v1/orders', ordersRoutes);

      const res = await app.request('/v1/orders/order-1/notes', {
        method: 'POST',
        body: JSON.stringify({
          admin_id: 'admin-1',
          admin_name: 'Admin User',
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      expect(res.status).toBe(400);

      const data = await res.json();
      expect(data.message).toContain('content');
    });

    it('returns 400 when content is empty string', async () => {
      const ordersRoutes = await getOrdersRoutes();
      const app = createTestApp();
      app.route('/v1/orders', ordersRoutes);

      const res = await app.request('/v1/orders/order-1/notes', {
        method: 'POST',
        body: JSON.stringify({
          content: '   ',
          admin_id: 'admin-1',
          admin_name: 'Admin User',
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      expect(res.status).toBe(400);
    });

    it('returns 400 when admin_id is missing', async () => {
      const ordersRoutes = await getOrdersRoutes();
      const app = createTestApp();
      app.route('/v1/orders', ordersRoutes);

      const res = await app.request('/v1/orders/order-1/notes', {
        method: 'POST',
        body: JSON.stringify({
          content: 'Test note',
          admin_name: 'Admin User',
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      expect(res.status).toBe(400);

      const data = await res.json();
      expect(data.message).toContain('admin_id');
    });

    it('returns 400 when admin_name is missing', async () => {
      const ordersRoutes = await getOrdersRoutes();
      const app = createTestApp();
      app.route('/v1/orders', ordersRoutes);

      const res = await app.request('/v1/orders/order-1/notes', {
        method: 'POST',
        body: JSON.stringify({
          content: 'Test note',
          admin_id: 'admin-1',
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      expect(res.status).toBe(400);

      const data = await res.json();
      expect(data.message).toContain('admin_name');
    });

    it('returns 404 when order does not exist', async () => {
      mockDbQuery.mockResolvedValueOnce([]); // No order found

      const ordersRoutes = await getOrdersRoutes();
      const app = createTestApp();
      app.route('/v1/orders', ordersRoutes);

      const res = await app.request('/v1/orders/nonexistent/notes', {
        method: 'POST',
        body: JSON.stringify({
          content: 'Test note',
          admin_id: 'admin-1',
          admin_name: 'Admin User',
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /v1/orders/:orderId/notes/:noteId', () => {
    it('updates note content successfully', async () => {
      const mockOrder = createMockOrder();
      const mockNote = createMockOrderNote();

      mockDbQuery
        .mockResolvedValueOnce([mockOrder]) // Order exists check
        .mockResolvedValueOnce([mockNote]); // Note exists check
      mockDbRun.mockResolvedValueOnce({ changes: 1 }); // Update note

      const ordersRoutes = await getOrdersRoutes();
      const app = createTestApp();
      app.route('/v1/orders', ordersRoutes);

      const res = await app.request('/v1/orders/order-1/notes/note-1', {
        method: 'PATCH',
        body: JSON.stringify({
          content: 'Updated content',
          admin_id: 'admin-1',
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.content).toBe('Updated content');
    });

    it('returns 403 when trying to edit another admin note', async () => {
      const mockOrder = createMockOrder();
      const mockNote = createMockOrderNote({ admin_id: 'different-admin' });

      mockDbQuery.mockResolvedValueOnce([mockOrder]).mockResolvedValueOnce([mockNote]);

      const ordersRoutes = await getOrdersRoutes();
      const app = createTestApp();
      app.route('/v1/orders', ordersRoutes);

      const res = await app.request('/v1/orders/order-1/notes/note-1', {
        method: 'PATCH',
        body: JSON.stringify({
          content: 'Updated content',
          admin_id: 'admin-1',
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      expect(res.status).toBe(403);

      const data = await res.json();
      expect(data.message).toContain('other admins');
    });

    it('returns 404 when note does not exist', async () => {
      const mockOrder = createMockOrder();

      mockDbQuery.mockResolvedValueOnce([mockOrder]).mockResolvedValueOnce([]); // No note found

      const ordersRoutes = await getOrdersRoutes();
      const app = createTestApp();
      app.route('/v1/orders', ordersRoutes);

      const res = await app.request('/v1/orders/order-1/notes/nonexistent', {
        method: 'PATCH',
        body: JSON.stringify({
          content: 'Updated content',
          admin_id: 'admin-1',
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      expect(res.status).toBe(404);
    });

    it('returns 400 when content is missing', async () => {
      const ordersRoutes = await getOrdersRoutes();
      const app = createTestApp();
      app.route('/v1/orders', ordersRoutes);

      const res = await app.request('/v1/orders/order-1/notes/note-1', {
        method: 'PATCH',
        body: JSON.stringify({
          admin_id: 'admin-1',
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      expect(res.status).toBe(400);
    });

    it('returns 400 when admin_id is missing', async () => {
      const ordersRoutes = await getOrdersRoutes();
      const app = createTestApp();
      app.route('/v1/orders', ordersRoutes);

      const res = await app.request('/v1/orders/order-1/notes/note-1', {
        method: 'PATCH',
        body: JSON.stringify({
          content: 'Updated content',
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /v1/orders/:orderId/notes/:noteId', () => {
    it('deletes note successfully', async () => {
      const mockOrder = createMockOrder();
      const mockNote = createMockOrderNote();

      mockDbQuery
        .mockResolvedValueOnce([mockOrder]) // Order exists check
        .mockResolvedValueOnce([mockNote]); // Note exists check
      mockDbRun.mockResolvedValueOnce({ changes: 1 }); // Delete note

      const ordersRoutes = await getOrdersRoutes();
      const app = createTestApp();
      app.route('/v1/orders', ordersRoutes);

      const res = await app.request('/v1/orders/order-1/notes/note-1?admin_id=admin-1', {
        method: 'DELETE',
      });

      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);
    });

    it('returns 403 when trying to delete another admin note', async () => {
      const mockOrder = createMockOrder();
      const mockNote = createMockOrderNote({ admin_id: 'different-admin' });

      mockDbQuery.mockResolvedValueOnce([mockOrder]).mockResolvedValueOnce([mockNote]);

      const ordersRoutes = await getOrdersRoutes();
      const app = createTestApp();
      app.route('/v1/orders', ordersRoutes);

      const res = await app.request('/v1/orders/order-1/notes/note-1?admin_id=admin-1', {
        method: 'DELETE',
      });

      expect(res.status).toBe(403);

      const data = await res.json();
      expect(data.message).toContain('other admins');
    });

    it('returns 404 when note does not exist', async () => {
      const mockOrder = createMockOrder();

      mockDbQuery.mockResolvedValueOnce([mockOrder]).mockResolvedValueOnce([]); // No note found

      const ordersRoutes = await getOrdersRoutes();
      const app = createTestApp();
      app.route('/v1/orders', ordersRoutes);

      const res = await app.request('/v1/orders/order-1/notes/nonexistent?admin_id=admin-1', {
        method: 'DELETE',
      });

      expect(res.status).toBe(404);
    });

    it('returns 400 when admin_id query param is missing', async () => {
      const ordersRoutes = await getOrdersRoutes();
      const app = createTestApp();
      app.route('/v1/orders', ordersRoutes);

      const res = await app.request('/v1/orders/order-1/notes/note-1', {
        method: 'DELETE',
      });

      expect(res.status).toBe(400);

      const data = await res.json();
      expect(data.message).toContain('admin_id');
    });
  });
});
