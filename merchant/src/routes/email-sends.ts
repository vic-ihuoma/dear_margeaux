import { Hono } from 'hono';
import { getDb } from '../db';
import { authMiddleware, adminOnly } from '../middleware/auth';
import { type Env, type AuthContext } from '../types';

// ============================================================
// EMAIL SENDS ROUTES
// ============================================================

interface EmailSendRow {
  id: string;
  store_id: string;
  email_type: string;
  recipient: string;
  subject: string;
  status: string;
  error_message: string | null;
  metadata: string | null;
  created_at: string;
}

const emailSendsRoutes = new Hono<{
  Bindings: Env;
  Variables: { auth: AuthContext };
}>();

emailSendsRoutes.use('*', authMiddleware, adminOnly);

// GET /v1/email-sends - List email sends with pagination and filters
emailSendsRoutes.get('/', async (c) => {
  const { store } = c.get('auth');
  const db = getDb(c.env);

  // Pagination params
  const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100);
  const cursor = c.req.query('cursor');

  // Filter params
  const emailType = c.req.query('email_type');
  const status = c.req.query('status');
  const startDate = c.req.query('start_date');
  const endDate = c.req.query('end_date');

  // Build query with pagination and filters
  let query = `SELECT * FROM email_sends WHERE store_id = ?`;
  const params: unknown[] = [store.id];

  if (emailType) {
    query += ` AND email_type = ?`;
    params.push(emailType);
  }

  if (status) {
    query += ` AND status = ?`;
    params.push(status);
  }

  if (startDate) {
    query += ` AND created_at >= ?`;
    params.push(startDate);
  }

  if (endDate) {
    // Append time to end date to include the whole day
    const endDateTime = endDate.includes('T') ? endDate : `${endDate}T23:59:59.999Z`;
    query += ` AND created_at <= ?`;
    params.push(endDateTime);
  }

  if (cursor) {
    query += ` AND created_at < ?`;
    params.push(cursor);
  }

  query += ` ORDER BY created_at DESC LIMIT ?`;
  params.push(limit + 1);

  const items = await db.query<EmailSendRow>(query, params);

  // Check for next page
  const hasMore = items.length > limit;
  if (hasMore) items.pop();

  const nextCursor = hasMore && items.length > 0 ? items[items.length - 1].created_at : null;

  return c.json({
    items: items.map((item) => ({
      id: item.id,
      email_type: item.email_type,
      recipient: item.recipient,
      subject: item.subject,
      status: item.status,
      error_message: item.error_message,
      metadata: item.metadata ? JSON.parse(item.metadata) : null,
      created_at: item.created_at,
    })),
    pagination: {
      has_more: hasMore,
      next_cursor: nextCursor,
    },
  });
});

// GET /v1/email-sends/stats - Get email send statistics
emailSendsRoutes.get('/stats', async (c) => {
  const { store } = c.get('auth');
  const db = getDb(c.env);

  // Get counts by status
  const statusCounts = await db.query<{ status: string; count: number }>(
    `SELECT status, COUNT(*) as count FROM email_sends WHERE store_id = ? GROUP BY status`,
    [store.id]
  );

  // Get counts by type
  const typeCounts = await db.query<{ email_type: string; count: number }>(
    `SELECT email_type, COUNT(*) as count FROM email_sends WHERE store_id = ? GROUP BY email_type`,
    [store.id]
  );

  // Total count
  const [totalResult] = await db.query<{ count: number }>(
    `SELECT COUNT(*) as count FROM email_sends WHERE store_id = ?`,
    [store.id]
  );

  // Build stats object
  const byStatus: Record<string, number> = {};
  for (const row of statusCounts) {
    byStatus[row.status] = row.count;
  }

  const byType: Record<string, number> = {};
  for (const row of typeCounts) {
    byType[row.email_type] = row.count;
  }

  return c.json({
    total: totalResult?.count ?? 0,
    by_status: byStatus,
    by_type: byType,
  });
});

export { emailSendsRoutes };
