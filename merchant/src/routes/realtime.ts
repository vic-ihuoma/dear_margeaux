import { Hono } from 'hono';
import { getDb } from '../db';
import { ApiError, type Env } from '../types';
import { hashKey } from '../middleware/auth';

// ============================================================
// REALTIME WEBSOCKET ROUTES
// ============================================================

export const realtime = new Hono<{ Bindings: Env }>();

/**
 * GET /v1/realtime/ws
 * WebSocket upgrade endpoint for real-time updates
 * Requires admin API key in query param (for WebSocket auth)
 */
realtime.get('/ws', async (c) => {
  // Check if Durable Objects are configured
  if (!c.env.REALTIME) {
    throw ApiError.invalidRequest('Real-time updates not configured');
  }

  // WebSocket connections use query param auth (can't use headers in WS upgrade)
  const apiKey = c.req.query('apiKey');
  if (!apiKey) {
    throw ApiError.unauthorized('Missing apiKey query parameter');
  }

  // Validate API key
  const db = getDb(c.env);
  const keyHash = await hashKey(apiKey);

  const result = await db.query<{
    id: string;
    status: string;
    role: string;
  }>(
    `SELECT s.id, s.status, k.role
     FROM api_keys k
     JOIN stores s ON k.store_id = s.id
     WHERE k.key_hash = ?
     LIMIT 1`,
    [keyHash]
  );

  if (result.length === 0) {
    throw ApiError.unauthorized('Invalid API key');
  }

  const { id: storeId, status, role } = result[0];

  if (status === 'disabled') {
    throw ApiError.forbidden('Store is disabled');
  }

  // Require admin role for real-time updates
  if (role !== 'admin') {
    throw ApiError.forbidden('Admin access required for real-time updates');
  }

  // Get or create the Durable Object instance for this store
  // Using store ID as the DO ID ensures each store has its own instance
  const doId = c.env.REALTIME.idFromName(storeId);
  const stub = c.env.REALTIME.get(doId);

  // Forward the WebSocket upgrade to the Durable Object
  const url = new URL(c.req.url);
  url.pathname = '/ws';
  url.searchParams.set('apiKey', apiKey);
  url.searchParams.set('storeId', storeId);

  return stub.fetch(url.toString(), {
    headers: c.req.raw.headers,
  });
});

/**
 * GET /v1/realtime/health
 * Health check for WebSocket connections
 */
realtime.get('/health', async (c) => {
  if (!c.env.REALTIME) {
    return c.json({ configured: false, message: 'Real-time updates not configured' });
  }

  return c.json({ configured: true, message: 'Real-time updates available' });
});

// ============================================================
// HELPER: Broadcast to WebSocket connections
// ============================================================

export type BroadcastEventType =
  | 'order.created'
  | 'order.updated'
  | 'order.shipped'
  | 'order.refunded'
  | 'inventory.low';

/**
 * Broadcast an event to all connected WebSocket clients for a store
 * This is called from the webhook dispatcher or directly from route handlers
 */
export async function broadcastEvent(
  env: Env,
  storeId: string,
  type: BroadcastEventType,
  payload: Record<string, unknown>
): Promise<void> {
  if (!env.REALTIME) {
    // Real-time not configured, silently skip
    return;
  }

  try {
    const doId = env.REALTIME.idFromName(storeId);
    const stub = env.REALTIME.get(doId);

    await stub.fetch('https://internal/broadcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storeId, type, payload }),
    });
  } catch (error) {
    // Log but don't fail the request if broadcast fails
    console.error('Failed to broadcast event:', error);
  }
}
