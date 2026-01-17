import { Hono } from 'hono';
import { getDb } from '../db';
import { ApiError, type Env, type AuthContext, now, uuid, isValidEmail } from '../types';
import { authMiddleware } from '../middleware/auth';
import { hashPassword, verifyPassword } from '@dear-margeaux/auth';

// Session expiration: 30 days
const SESSION_EXPIRY_SECONDS = 30 * 24 * 60 * 60;

// ============================================================
// CUSTOMER AUTH ROUTES
// ============================================================

export const customerAuth = new Hono<{ Bindings: Env; Variables: { auth: AuthContext } }>();

// All customer auth routes require store context (API key)
customerAuth.use('*', authMiddleware);

// ------------------------------------------------------------
// POST /v1/customers/auth/register - Register new customer account
// ------------------------------------------------------------
customerAuth.post('/register', async (c) => {
  const { store } = c.get('auth');
  const db = getDb(c.env);
  const body = await c.req.json();

  const { email, password, name } = body;

  // Validation
  if (!email) throw ApiError.invalidRequest('email is required');
  if (!password) throw ApiError.invalidRequest('password is required');
  if (password.length < 8) throw ApiError.invalidRequest('password must be at least 8 characters');
  if (!isValidEmail(email)) throw ApiError.invalidRequest('Invalid email format');

  const normalizedEmail = email.toLowerCase().trim();

  // Check if customer with this email already exists
  const [existing] = await db.query<any>(
    `SELECT id, password_hash FROM customers WHERE store_id = ? AND email = ?`,
    [store.id, normalizedEmail]
  );

  if (existing) {
    // If guest customer (no password), upgrade to account
    if (!existing.password_hash) {
      const passwordHash = await hashPassword(password);
      await db.run(
        `UPDATE customers SET password_hash = ?, name = COALESCE(?, name), updated_at = ? WHERE id = ?`,
        [passwordHash, name || null, now(), existing.id]
      );

      // Create session
      const sessionId = generateSessionId();
      const expiresAt = Math.floor(Date.now() / 1000) + SESSION_EXPIRY_SECONDS;

      await db.run(`INSERT INTO customer_sessions (id, customer_id, expires_at) VALUES (?, ?, ?)`, [
        sessionId,
        existing.id,
        expiresAt,
      ]);

      const [customer] = await db.query<any>(`SELECT * FROM customers WHERE id = ?`, [existing.id]);

      return c.json(
        {
          customer: formatCustomer(customer),
          session: {
            id: sessionId,
            expires_at: new Date(expiresAt * 1000).toISOString(),
          },
        },
        201
      );
    }

    throw ApiError.conflict('An account with this email already exists');
  }

  // Create new customer with account
  const customerId = uuid();
  const passwordHash = await hashPassword(password);

  await db.run(
    `INSERT INTO customers (id, store_id, email, name, password_hash) VALUES (?, ?, ?, ?, ?)`,
    [customerId, store.id, normalizedEmail, name || null, passwordHash]
  );

  // Create session
  const sessionId = generateSessionId();
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_EXPIRY_SECONDS;

  await db.run(`INSERT INTO customer_sessions (id, customer_id, expires_at) VALUES (?, ?, ?)`, [
    sessionId,
    customerId,
    expiresAt,
  ]);

  const [customer] = await db.query<any>(`SELECT * FROM customers WHERE id = ?`, [customerId]);

  return c.json(
    {
      customer: formatCustomer(customer),
      session: {
        id: sessionId,
        expires_at: new Date(expiresAt * 1000).toISOString(),
      },
    },
    201
  );
});

// ------------------------------------------------------------
// POST /v1/customers/auth/login - Login to customer account
// ------------------------------------------------------------
customerAuth.post('/login', async (c) => {
  const { store } = c.get('auth');
  const db = getDb(c.env);
  const body = await c.req.json();

  const { email, password } = body;

  if (!email) throw ApiError.invalidRequest('email is required');
  if (!password) throw ApiError.invalidRequest('password is required');

  const normalizedEmail = email.toLowerCase().trim();

  // Find customer with password (has account)
  const [customer] = await db.query<any>(
    `SELECT * FROM customers WHERE store_id = ? AND email = ? AND password_hash IS NOT NULL`,
    [store.id, normalizedEmail]
  );

  if (!customer) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  // Verify password
  const valid = await verifyPassword(password, customer.password_hash);
  if (!valid) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  // Create session
  const sessionId = generateSessionId();
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_EXPIRY_SECONDS;

  await db.run(`INSERT INTO customer_sessions (id, customer_id, expires_at) VALUES (?, ?, ?)`, [
    sessionId,
    customer.id,
    expiresAt,
  ]);

  return c.json({
    customer: formatCustomer(customer),
    session: {
      id: sessionId,
      expires_at: new Date(expiresAt * 1000).toISOString(),
    },
  });
});

// ------------------------------------------------------------
// POST /v1/customers/auth/logout - Logout (invalidate session)
// ------------------------------------------------------------
customerAuth.post('/logout', async (c) => {
  const db = getDb(c.env);
  const sessionId = c.req.header('X-Customer-Session');

  if (!sessionId) {
    return c.json({ success: true });
  }

  await db.run(`DELETE FROM customer_sessions WHERE id = ?`, [sessionId]);

  return c.json({ success: true });
});

// ------------------------------------------------------------
// GET /v1/customers/auth/me - Get current customer (from session)
// ------------------------------------------------------------
customerAuth.get('/me', async (c) => {
  const { store } = c.get('auth');
  const db = getDb(c.env);
  const sessionId = c.req.header('X-Customer-Session');

  if (!sessionId) {
    throw ApiError.unauthorized('No session provided');
  }

  // Get session and customer
  const [session] = await db.query<any>(
    `SELECT s.*, c.* FROM customer_sessions s
     JOIN customers c ON c.id = s.customer_id
     WHERE s.id = ? AND c.store_id = ?`,
    [sessionId, store.id]
  );

  if (!session) {
    throw ApiError.unauthorized('Invalid session');
  }

  // Check expiration
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (session.expires_at < nowSeconds) {
    // Clean up expired session
    await db.run(`DELETE FROM customer_sessions WHERE id = ?`, [sessionId]);
    throw ApiError.unauthorized('Session expired');
  }

  // Extend session if more than half expired
  const halfExpiry = SESSION_EXPIRY_SECONDS / 2;
  const timeRemaining = session.expires_at - nowSeconds;
  if (timeRemaining < halfExpiry) {
    const newExpiry = nowSeconds + SESSION_EXPIRY_SECONDS;
    await db.run(`UPDATE customer_sessions SET expires_at = ? WHERE id = ?`, [
      newExpiry,
      sessionId,
    ]);
  }

  return c.json({
    customer: formatCustomer(session),
    session: {
      id: sessionId,
      expires_at: new Date(session.expires_at * 1000).toISOString(),
    },
  });
});

// ------------------------------------------------------------
// GET /v1/customers/auth/orders - Get current customer's orders
// ------------------------------------------------------------
customerAuth.get('/orders', async (c) => {
  const { store } = c.get('auth');
  const db = getDb(c.env);
  const sessionId = c.req.header('X-Customer-Session');

  if (!sessionId) {
    throw ApiError.unauthorized('No session provided');
  }

  // Validate session
  const [session] = await db.query<any>(
    `SELECT customer_id, expires_at FROM customer_sessions WHERE id = ?`,
    [sessionId]
  );

  if (!session || session.expires_at < Math.floor(Date.now() / 1000)) {
    throw ApiError.unauthorized('Invalid or expired session');
  }

  const customerId = session.customer_id;

  // Pagination
  const limit = Math.min(Number(c.req.query('limit')) || 20, 100);
  const cursor = c.req.query('cursor');

  let query = `SELECT * FROM orders WHERE customer_id = ?`;
  const params: any[] = [customerId];

  if (cursor) {
    query += ` AND created_at < ?`;
    params.push(cursor);
  }

  query += ` ORDER BY created_at DESC LIMIT ?`;
  params.push(limit + 1);

  const rows = await db.query<any>(query, params);
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, -1) : rows;

  // Batch fetch order items
  const orderIds = items.map((o: any) => o.id);
  const itemsByOrder: Record<string, any[]> = {};

  if (orderIds.length > 0) {
    const placeholders = orderIds.map(() => '?').join(',');
    const allItems = await db.query<any>(
      `SELECT * FROM order_items WHERE order_id IN (${placeholders})`,
      orderIds
    );

    for (const item of allItems) {
      if (!itemsByOrder[item.order_id]) {
        itemsByOrder[item.order_id] = [];
      }
      itemsByOrder[item.order_id].push(item);
    }
  }

  const ordersWithItems = items.map((order: any) => ({
    ...order,
    items: itemsByOrder[order.id] || [],
  }));

  return c.json({
    items: ordersWithItems.map(formatOrder),
    pagination: {
      has_more: hasMore,
      next_cursor: hasMore ? items[items.length - 1].created_at : null,
    },
  });
});

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------

function generateSessionId(): string {
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function formatCustomer(c: any) {
  return {
    id: c.id,
    email: c.email,
    name: c.name,
    phone: c.phone,
    accepts_marketing: !!c.accepts_marketing,
    order_count: c.order_count || 0,
    total_spent_cents: c.total_spent_cents || 0,
    last_order_at: c.last_order_at,
    created_at: c.created_at,
  };
}

function formatOrder(o: any) {
  return {
    id: o.id,
    number: o.number,
    status: o.status,
    amounts: {
      subtotal_cents: o.subtotal_cents,
      discount_cents: o.discount_cents,
      tax_cents: o.tax_cents,
      shipping_cents: o.shipping_cents,
      total_cents: o.total_cents,
      currency: o.currency,
    },
    items: (o.items || []).map((i: any) => ({
      sku: i.sku,
      title: i.title,
      qty: i.qty,
      unit_price_cents: i.unit_price_cents,
      image_url: i.image_url || null,
    })),
    tracking: o.tracking_number
      ? {
          number: o.tracking_number,
          url: o.tracking_url,
        }
      : null,
    created_at: o.created_at,
  };
}
