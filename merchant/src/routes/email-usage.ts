import { Hono } from 'hono';
import { getDb } from '../db';
import { authMiddleware, adminOnly } from '../middleware/auth';
import { type Env, type AuthContext } from '../types';
import { getEmailUsageStats, DEFAULT_CONFIG } from '../lib/email-rate-limiter';

// ============================================================
// EMAIL USAGE ROUTES
// Admin endpoint for viewing email usage and rate limit status
// ============================================================

const emailUsageRoutes = new Hono<{
  Bindings: Env;
  Variables: { auth: AuthContext };
}>();

emailUsageRoutes.use('*', authMiddleware, adminOnly);

// GET /v1/email-usage - Get email usage statistics for the current store
emailUsageRoutes.get('/', async (c) => {
  const { store } = c.get('auth');
  const db = getDb(c.env);

  const stats = await getEmailUsageStats(db, store.id, DEFAULT_CONFIG);

  return c.json(stats);
});

export { emailUsageRoutes as emailUsage };
