import { Hono } from 'hono';
import { getDb } from '../db';
import { authMiddleware, adminOnly } from '../middleware/auth';
import { ApiError, type Env, type AuthContext } from '../types';
import { isValidISODate } from '../lib/validation';

// ============================================================
// COUNT ROUTES
// Efficient count endpoints for dashboard statistics
// ============================================================

const countsRoutes = new Hono<{
  Bindings: Env;
  Variables: { auth: AuthContext };
}>();

countsRoutes.use('*', authMiddleware, adminOnly);

// GET /v1/counts/products - Get product count with optional status filter
countsRoutes.get('/products', async (c) => {
  const { store } = c.get('auth');
  const db = getDb(c.env);

  const status = c.req.query('status');

  let query = `SELECT COUNT(*) as count FROM products WHERE store_id = ?`;
  const params: unknown[] = [store.id];

  if (status) {
    if (!['active', 'draft'].includes(status)) {
      throw ApiError.invalidRequest('status must be active or draft');
    }
    query += ` AND status = ?`;
    params.push(status);
  }

  const [result] = await db.query<{ count: number }>(query, params);

  return c.json({ count: result?.count ?? 0 });
});

// GET /v1/counts/orders - Get order count with optional status and date filters
countsRoutes.get('/orders', async (c) => {
  const { store } = c.get('auth');
  const db = getDb(c.env);

  const status = c.req.query('status');
  const startDate = c.req.query('start_date');
  const endDate = c.req.query('end_date');

  let query = `SELECT COUNT(*) as count FROM orders WHERE store_id = ?`;
  const params: unknown[] = [store.id];

  if (status) {
    const validStatuses = [
      'pending',
      'paid',
      'processing',
      'shipped',
      'delivered',
      'refunded',
      'canceled',
    ];
    if (!validStatuses.includes(status)) {
      throw ApiError.invalidRequest(`status must be one of: ${validStatuses.join(', ')}`);
    }
    query += ` AND status = ?`;
    params.push(status);
  }

  // Validate and apply date filters
  if (startDate) {
    if (!isValidISODate(startDate)) {
      throw ApiError.invalidRequest('start_date must be a valid ISO 8601 date');
    }
    query += ` AND created_at >= ?`;
    params.push(startDate);
  }

  if (endDate) {
    if (!isValidISODate(endDate)) {
      throw ApiError.invalidRequest('end_date must be a valid ISO 8601 date');
    }
    query += ` AND created_at <= ?`;
    params.push(endDate);
  }

  const [result] = await db.query<{ count: number }>(query, params);

  return c.json({ count: result?.count ?? 0 });
});

// GET /v1/counts/customers - Get customer count
countsRoutes.get('/customers', async (c) => {
  const { store } = c.get('auth');
  const db = getDb(c.env);

  const [result] = await db.query<{ count: number }>(
    `SELECT COUNT(*) as count FROM customers WHERE store_id = ?`,
    [store.id]
  );

  return c.json({ count: result?.count ?? 0 });
});

// GET /v1/counts/inventory - Get inventory count (unique SKUs)
countsRoutes.get('/inventory', async (c) => {
  const { store } = c.get('auth');
  const db = getDb(c.env);

  const lowStock = c.req.query('low_stock') === 'true';

  let query = `SELECT COUNT(*) as count FROM inventory WHERE store_id = ?`;
  const params: unknown[] = [store.id];

  if (lowStock) {
    query += ` AND (on_hand - reserved) <= 10`;
  }

  const [result] = await db.query<{ count: number }>(query, params);

  return c.json({ count: result?.count ?? 0 });
});

export { countsRoutes as counts };
