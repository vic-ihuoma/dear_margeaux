import { Hono } from 'hono';
import { getDb } from '../db';
import { authMiddleware, adminOnly } from '../middleware/auth';
import { ApiError, uuid, now, type Env, type AuthContext } from '../types';

// ============================================================
// WAITLIST ROUTES
// ============================================================

const waitlistRoutes = new Hono<{
  Bindings: Env;
  Variables: { auth: AuthContext };
}>();

waitlistRoutes.use('*', authMiddleware);

// Helper to validate email format
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Helper to format waitlist entry response
function formatWaitlistEntry(entry: any) {
  return {
    id: entry.id,
    email: entry.email,
    drop_id: entry.drop_id,
    subscribed_at: entry.subscribed_at,
    notified_at: entry.notified_at,
    unsubscribed: entry.unsubscribed === 1,
  };
}

// POST /v1/waitlist - Subscribe email to drop
waitlistRoutes.post('/', async (c) => {
  const body = await c.req.json();
  const { email, drop_id } = body;

  // Validate required fields
  if (!email) throw ApiError.invalidRequest('email is required');
  if (!drop_id) throw ApiError.invalidRequest('drop_id is required');

  // Validate email format
  const normalizedEmail = email.trim().toLowerCase();
  if (!isValidEmail(normalizedEmail)) {
    throw ApiError.invalidRequest('Invalid email format');
  }

  const { store } = c.get('auth');
  const db = getDb(c.env);

  // Verify drop exists
  const [drop] = await db.query<any>(`SELECT id, status FROM drops WHERE id = ? AND store_id = ?`, [
    drop_id,
    store.id,
  ]);

  if (!drop) throw ApiError.notFound('Drop not found');

  // Check if drop is in a subscribable state (draft or scheduled)
  // Active drops don't need waitlist, ended drops can't accept signups
  if (drop.status === 'ended') {
    throw ApiError.invalidRequest('Cannot subscribe to an ended drop');
  }

  // Check for existing subscription (including soft-unsubscribed)
  const [existing] = await db.query<any>(
    `SELECT id, unsubscribed FROM waitlist_entries WHERE email = ? AND drop_id = ? AND store_id = ?`,
    [normalizedEmail, drop_id, store.id]
  );

  if (existing) {
    if (existing.unsubscribed === 0) {
      // Already subscribed and active
      throw ApiError.conflict('Email already subscribed to this drop');
    } else {
      // Re-subscribe: update the existing entry
      const timestamp = now();
      await db.run(
        `UPDATE waitlist_entries SET unsubscribed = 0, subscribed_at = ?, updated_at = ? WHERE id = ?`,
        [timestamp, timestamp, existing.id]
      );

      const [updated] = await db.query<any>(`SELECT * FROM waitlist_entries WHERE id = ?`, [
        existing.id,
      ]);
      return c.json(formatWaitlistEntry(updated), 200);
    }
  }

  // Create new subscription
  const id = uuid();
  const timestamp = now();

  await db.run(
    `INSERT INTO waitlist_entries (id, store_id, email, drop_id, subscribed_at, notified_at, unsubscribed, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, store.id, normalizedEmail, drop_id, timestamp, null, 0, timestamp, timestamp]
  );

  const [entry] = await db.query<any>(`SELECT * FROM waitlist_entries WHERE id = ?`, [id]);

  return c.json(formatWaitlistEntry(entry), 201);
});

// DELETE /v1/waitlist/:id - Unsubscribe by entry ID
waitlistRoutes.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const { store } = c.get('auth');
  const db = getDb(c.env);

  const [entry] = await db.query<any>(
    `SELECT * FROM waitlist_entries WHERE id = ? AND store_id = ?`,
    [id, store.id]
  );

  if (!entry) throw ApiError.notFound('Waitlist entry not found');

  if (entry.unsubscribed === 1) {
    throw ApiError.invalidRequest('Already unsubscribed');
  }

  // Soft unsubscribe (mark as unsubscribed, don't delete)
  const timestamp = now();
  await db.run(`UPDATE waitlist_entries SET unsubscribed = 1, updated_at = ? WHERE id = ?`, [
    timestamp,
    id,
  ]);

  return c.json({ unsubscribed: true });
});

// GET /v1/waitlist - List subscribers (admin only)
waitlistRoutes.get('/', adminOnly, async (c) => {
  const { store } = c.get('auth');
  const db = getDb(c.env);

  // Query params
  const drop_id = c.req.query('drop_id');
  const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100);
  const cursor = c.req.query('cursor');
  const includeUnsubscribed = c.req.query('include_unsubscribed') === 'true';

  // Build query
  let query = `SELECT * FROM waitlist_entries WHERE store_id = ?`;
  const params: unknown[] = [store.id];

  if (drop_id) {
    query += ` AND drop_id = ?`;
    params.push(drop_id);
  }

  if (!includeUnsubscribed) {
    query += ` AND unsubscribed = 0`;
  }

  if (cursor) {
    query += ` AND subscribed_at < ?`;
    params.push(cursor);
  }

  query += ` ORDER BY subscribed_at DESC LIMIT ?`;
  params.push(limit + 1);

  const entries = await db.query<any>(query, params);

  // Check if there's a next page
  const hasMore = entries.length > limit;
  if (hasMore) entries.pop();

  const items = entries.map((e) => formatWaitlistEntry(e));

  const nextCursor = hasMore && items.length > 0 ? items[items.length - 1].subscribed_at : null;

  return c.json({
    items,
    pagination: {
      has_more: hasMore,
      next_cursor: nextCursor,
    },
  });
});

// GET /v1/waitlist/:id - Get single entry (admin only)
waitlistRoutes.get('/:id', adminOnly, async (c) => {
  const id = c.req.param('id');
  const { store } = c.get('auth');
  const db = getDb(c.env);

  const [entry] = await db.query<any>(
    `SELECT * FROM waitlist_entries WHERE id = ? AND store_id = ?`,
    [id, store.id]
  );

  if (!entry) throw ApiError.notFound('Waitlist entry not found');

  return c.json(formatWaitlistEntry(entry));
});

// POST /v1/waitlist/unsubscribe - Unsubscribe by email (for public unsubscribe links)
waitlistRoutes.post('/unsubscribe', async (c) => {
  const body = await c.req.json();
  const { email, drop_id } = body;

  if (!email) throw ApiError.invalidRequest('email is required');

  const normalizedEmail = email.trim().toLowerCase();
  const { store } = c.get('auth');
  const db = getDb(c.env);

  // Build query - optionally filter by drop_id
  let query = `SELECT id FROM waitlist_entries WHERE email = ? AND store_id = ? AND unsubscribed = 0`;
  const params: unknown[] = [normalizedEmail, store.id];

  if (drop_id) {
    query += ` AND drop_id = ?`;
    params.push(drop_id);
  }

  const entries = await db.query<any>(query, params);

  if (entries.length === 0) {
    // Don't reveal if email exists or not for privacy
    return c.json({ unsubscribed: true });
  }

  // Unsubscribe all matching entries
  const timestamp = now();
  const ids = entries.map((e) => e.id);
  const placeholders = ids.map(() => '?').join(',');

  await db.run(
    `UPDATE waitlist_entries SET unsubscribed = 1, updated_at = ? WHERE id IN (${placeholders})`,
    [timestamp, ...ids]
  );

  return c.json({ unsubscribed: true, count: ids.length });
});

export { waitlistRoutes as waitlist };
