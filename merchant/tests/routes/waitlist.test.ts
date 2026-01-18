import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Hono } from 'hono';
import type { AuthContext, Env } from '../../src/types';

// Create mock database before any imports
const mockDbQuery = vi.fn();
const mockDbRun = vi.fn().mockResolvedValue({ changes: 1 });
const mockDbRunWithChanges = vi.fn().mockResolvedValue({ changes: 1 });

const mockDb = {
  query: mockDbQuery,
  run: mockDbRun,
  runWithChanges: mockDbRunWithChanges,
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
        // Import ApiError dynamically to avoid circular issues
        const types = await import('../../src/types');
        throw types.ApiError.forbidden('Admin access required');
      }
      return next();
    }),
  };
});

// Mock uuid and now functions
vi.mock('../../src/types', async () => {
  const actual = await vi.importActual('../../src/types');
  return {
    ...actual,
    uuid: vi.fn(() => 'test-uuid-123'),
    now: vi.fn(() => '2026-01-18T12:00:00.000Z'),
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

// Dynamically import waitlist after mocks are set up
async function getWaitlistRoutes() {
  const { waitlist } = await import('../../src/routes/waitlist');
  return waitlist;
}

describe('Waitlist Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset to admin auth by default
    setAuthContext('admin');
  });

  afterEach(() => {
    vi.resetModules();
  });

  describe('POST /v1/waitlist - Subscribe', () => {
    it('creates subscription for valid email', async () => {
      const app = createTestApp();
      const waitlist = await getWaitlistRoutes();
      app.route('/v1/waitlist', waitlist);

      // Mock drop exists
      mockDbQuery
        .mockResolvedValueOnce([{ id: 'drop-1', status: 'scheduled' }]) // Drop exists
        .mockResolvedValueOnce([]) // No existing subscription
        .mockResolvedValueOnce([
          {
            // Return created entry
            id: 'test-uuid-123',
            email: 'test@example.com',
            drop_id: 'drop-1',
            subscribed_at: '2026-01-18T12:00:00.000Z',
            notified_at: null,
            unsubscribed: 0,
          },
        ]);

      const res = await app.request('/v1/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@example.com', drop_id: 'drop-1' }),
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.email).toBe('test@example.com');
      expect(body.drop_id).toBe('drop-1');
      expect(body.unsubscribed).toBe(false);
    });

    it('returns 400 for invalid email format', async () => {
      const app = createTestApp();
      const waitlist = await getWaitlistRoutes();
      app.route('/v1/waitlist', waitlist);

      // No mocks needed - validation fails before DB call

      const res = await app.request('/v1/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'invalid-email', drop_id: 'drop-1' }),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe('invalid_request');
      expect(body.message).toContain('Invalid email');
    });

    it('returns 400 for missing drop_id', async () => {
      const app = createTestApp();
      const waitlist = await getWaitlistRoutes();
      app.route('/v1/waitlist', waitlist);

      const res = await app.request('/v1/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@example.com' }),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe('invalid_request');
      expect(body.message).toContain('drop_id is required');
    });

    it('returns 400 for missing email', async () => {
      const app = createTestApp();
      const waitlist = await getWaitlistRoutes();
      app.route('/v1/waitlist', waitlist);

      const res = await app.request('/v1/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ drop_id: 'drop-1' }),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe('invalid_request');
      expect(body.message).toContain('email is required');
    });

    it('returns 409 for duplicate email on same drop', async () => {
      const app = createTestApp();
      const waitlist = await getWaitlistRoutes();
      app.route('/v1/waitlist', waitlist);

      // Mock drop exists and existing active subscription
      mockDbQuery
        .mockResolvedValueOnce([{ id: 'drop-1', status: 'scheduled' }]) // Drop exists
        .mockResolvedValueOnce([{ id: 'existing-entry', unsubscribed: 0 }]); // Already subscribed

      const res = await app.request('/v1/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@example.com', drop_id: 'drop-1' }),
      });

      expect(res.status).toBe(409);
      const body = await res.json();
      expect(body.error).toBe('conflict');
      expect(body.message).toContain('already subscribed');
    });

    it('normalizes email to lowercase', async () => {
      const app = createTestApp();
      const waitlist = await getWaitlistRoutes();
      app.route('/v1/waitlist', waitlist);

      // Mock drop exists
      mockDbQuery
        .mockResolvedValueOnce([{ id: 'drop-1', status: 'scheduled' }])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          {
            id: 'test-uuid-123',
            email: 'test@example.com', // normalized
            drop_id: 'drop-1',
            subscribed_at: '2026-01-18T12:00:00.000Z',
            notified_at: null,
            unsubscribed: 0,
          },
        ]);

      const res = await app.request('/v1/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'TEST@EXAMPLE.COM', drop_id: 'drop-1' }),
      });

      expect(res.status).toBe(201);

      // Check that the INSERT was called with lowercase email
      expect(mockDbRun).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO waitlist_entries'),
        expect.arrayContaining(['test@example.com'])
      );
    });

    it('returns 404 for non-existent drop', async () => {
      const app = createTestApp();
      const waitlist = await getWaitlistRoutes();
      app.route('/v1/waitlist', waitlist);

      // Mock drop not found
      mockDbQuery.mockResolvedValueOnce([]);

      const res = await app.request('/v1/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@example.com', drop_id: 'nonexistent' }),
      });

      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.message).toContain('Drop not found');
    });

    it('returns 400 for ended drop', async () => {
      const app = createTestApp();
      const waitlist = await getWaitlistRoutes();
      app.route('/v1/waitlist', waitlist);

      // Mock drop is ended
      mockDbQuery.mockResolvedValueOnce([{ id: 'drop-1', status: 'ended' }]);

      const res = await app.request('/v1/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@example.com', drop_id: 'drop-1' }),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.message).toContain('Cannot subscribe to an ended drop');
    });

    it('resubscribes previously unsubscribed email', async () => {
      const app = createTestApp();
      const waitlist = await getWaitlistRoutes();
      app.route('/v1/waitlist', waitlist);

      // Mock drop exists and existing unsubscribed entry
      mockDbQuery
        .mockResolvedValueOnce([{ id: 'drop-1', status: 'scheduled' }])
        .mockResolvedValueOnce([{ id: 'existing-entry', unsubscribed: 1 }])
        .mockResolvedValueOnce([
          {
            id: 'existing-entry',
            email: 'test@example.com',
            drop_id: 'drop-1',
            subscribed_at: '2026-01-18T12:00:00.000Z',
            notified_at: null,
            unsubscribed: 0,
          },
        ]);

      const res = await app.request('/v1/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@example.com', drop_id: 'drop-1' }),
      });

      expect(res.status).toBe(200);

      // Should update existing entry, not create new
      expect(mockDbRun).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE waitlist_entries SET unsubscribed = 0'),
        expect.any(Array)
      );
    });
  });

  describe('DELETE /v1/waitlist/:id - Unsubscribe by ID', () => {
    it('removes subscription', async () => {
      const app = createTestApp();
      const waitlist = await getWaitlistRoutes();
      app.route('/v1/waitlist', waitlist);

      // Mock entry exists
      mockDbQuery.mockResolvedValueOnce([
        {
          id: 'entry-1',
          email: 'test@example.com',
          unsubscribed: 0,
        },
      ]);

      const res = await app.request('/v1/waitlist/entry-1', {
        method: 'DELETE',
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.unsubscribed).toBe(true);
    });

    it('returns 404 for non-existent subscription', async () => {
      const app = createTestApp();
      const waitlist = await getWaitlistRoutes();
      app.route('/v1/waitlist', waitlist);

      // Mock entry not found
      mockDbQuery.mockResolvedValueOnce([]);

      const res = await app.request('/v1/waitlist/nonexistent', {
        method: 'DELETE',
      });

      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.message).toContain('not found');
    });

    it('returns 400 if already unsubscribed', async () => {
      const app = createTestApp();
      const waitlist = await getWaitlistRoutes();
      app.route('/v1/waitlist', waitlist);

      // Mock entry already unsubscribed
      mockDbQuery.mockResolvedValueOnce([
        {
          id: 'entry-1',
          email: 'test@example.com',
          unsubscribed: 1,
        },
      ]);

      const res = await app.request('/v1/waitlist/entry-1', {
        method: 'DELETE',
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.message).toContain('Already unsubscribed');
    });
  });

  describe('POST /v1/waitlist/unsubscribe - Unsubscribe by email', () => {
    it('unsubscribes by email', async () => {
      const app = createTestApp();
      const waitlist = await getWaitlistRoutes();
      app.route('/v1/waitlist', waitlist);

      // Mock entries found
      mockDbQuery.mockResolvedValueOnce([{ id: 'entry-1' }, { id: 'entry-2' }]);

      const res = await app.request('/v1/waitlist/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@example.com' }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.unsubscribed).toBe(true);
      expect(body.count).toBe(2);
    });

    it('unsubscribes by email and drop_id', async () => {
      const app = createTestApp();
      const waitlist = await getWaitlistRoutes();
      app.route('/v1/waitlist', waitlist);

      // Mock single entry found for specific drop
      mockDbQuery.mockResolvedValueOnce([{ id: 'entry-1' }]);

      const res = await app.request('/v1/waitlist/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@example.com', drop_id: 'drop-1' }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.count).toBe(1);

      // Check query included drop_id filter
      expect(mockDbQuery).toHaveBeenCalledWith(
        expect.stringContaining('drop_id = ?'),
        expect.arrayContaining(['drop-1'])
      );
    });

    it('returns success even for non-existent email (privacy)', async () => {
      const app = createTestApp();
      const waitlist = await getWaitlistRoutes();
      app.route('/v1/waitlist', waitlist);

      // Mock no entries found
      mockDbQuery.mockResolvedValueOnce([]);

      const res = await app.request('/v1/waitlist/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'nonexistent@example.com' }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.unsubscribed).toBe(true);
      // No count field when nothing was unsubscribed
    });

    it('returns 400 for missing email', async () => {
      const app = createTestApp();
      const waitlist = await getWaitlistRoutes();
      app.route('/v1/waitlist', waitlist);

      const res = await app.request('/v1/waitlist/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.message).toContain('email is required');
    });
  });

  describe('GET /v1/waitlist - List subscribers', () => {
    it('returns subscribers (admin only)', async () => {
      setAuthContext('admin');
      const app = createTestApp();
      const waitlist = await getWaitlistRoutes();
      app.route('/v1/waitlist', waitlist);

      // Mock entries returned
      mockDbQuery.mockResolvedValueOnce([
        {
          id: 'entry-1',
          email: 'test1@example.com',
          drop_id: 'drop-1',
          subscribed_at: '2026-01-17T10:00:00.000Z',
          notified_at: null,
          unsubscribed: 0,
        },
        {
          id: 'entry-2',
          email: 'test2@example.com',
          drop_id: 'drop-1',
          subscribed_at: '2026-01-18T10:00:00.000Z',
          notified_at: null,
          unsubscribed: 0,
        },
      ]);

      const res = await app.request('/v1/waitlist');

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.items).toHaveLength(2);
      expect(body.items[0].email).toBe('test1@example.com');
      expect(body.pagination).toBeDefined();
    });

    it('returns 403 without admin role', async () => {
      setAuthContext('public');
      const app = createTestApp();
      const waitlist = await getWaitlistRoutes();
      app.route('/v1/waitlist', waitlist);

      const res = await app.request('/v1/waitlist');

      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error).toBe('forbidden');
    });

    it('supports pagination', async () => {
      setAuthContext('admin');
      const app = createTestApp();
      const waitlist = await getWaitlistRoutes();
      app.route('/v1/waitlist', waitlist);

      // Mock more entries than limit (3 entries, limit=2 means has_more=true)
      mockDbQuery.mockResolvedValueOnce([
        {
          id: 'entry-1',
          email: 'test1@example.com',
          drop_id: 'drop-1',
          subscribed_at: '2026-01-18T12:00:00.000Z',
          notified_at: null,
          unsubscribed: 0,
        },
        {
          id: 'entry-2',
          email: 'test2@example.com',
          drop_id: 'drop-1',
          subscribed_at: '2026-01-18T11:00:00.000Z',
          notified_at: null,
          unsubscribed: 0,
        },
        {
          id: 'entry-3',
          email: 'test3@example.com',
          drop_id: 'drop-1',
          subscribed_at: '2026-01-18T10:00:00.000Z',
          notified_at: null,
          unsubscribed: 0,
        },
      ]);

      const res = await app.request('/v1/waitlist?limit=2');

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.items).toHaveLength(2);
      expect(body.pagination.has_more).toBe(true);
      expect(body.pagination.next_cursor).toBe('2026-01-18T11:00:00.000Z');
    });

    it('filters by drop_id', async () => {
      setAuthContext('admin');
      const app = createTestApp();
      const waitlist = await getWaitlistRoutes();
      app.route('/v1/waitlist', waitlist);

      mockDbQuery.mockResolvedValueOnce([]);

      const res = await app.request('/v1/waitlist?drop_id=drop-1');

      expect(res.status).toBe(200);
      expect(mockDbQuery).toHaveBeenCalledWith(
        expect.stringContaining('drop_id = ?'),
        expect.arrayContaining(['drop-1'])
      );
    });

    it('supports cursor-based pagination', async () => {
      setAuthContext('admin');
      const app = createTestApp();
      const waitlist = await getWaitlistRoutes();
      app.route('/v1/waitlist', waitlist);

      mockDbQuery.mockResolvedValueOnce([
        {
          id: 'entry-3',
          email: 'test3@example.com',
          drop_id: 'drop-1',
          subscribed_at: '2026-01-18T09:00:00.000Z',
          notified_at: null,
          unsubscribed: 0,
        },
      ]);

      const res = await app.request('/v1/waitlist?cursor=2026-01-18T10:00:00.000Z');

      expect(res.status).toBe(200);
      expect(mockDbQuery).toHaveBeenCalledWith(
        expect.stringContaining('subscribed_at < ?'),
        expect.arrayContaining(['2026-01-18T10:00:00.000Z'])
      );
    });

    it('filters unsubscribed by default', async () => {
      setAuthContext('admin');
      const app = createTestApp();
      const waitlist = await getWaitlistRoutes();
      app.route('/v1/waitlist', waitlist);

      mockDbQuery.mockResolvedValueOnce([]);

      const res = await app.request('/v1/waitlist');

      expect(res.status).toBe(200);
      expect(mockDbQuery).toHaveBeenCalledWith(
        expect.stringContaining('unsubscribed = 0'),
        expect.any(Array)
      );
    });

    it('can include unsubscribed entries', async () => {
      setAuthContext('admin');
      const app = createTestApp();
      const waitlist = await getWaitlistRoutes();
      app.route('/v1/waitlist', waitlist);

      mockDbQuery.mockResolvedValueOnce([
        {
          id: 'entry-1',
          email: 'test1@example.com',
          drop_id: 'drop-1',
          subscribed_at: '2026-01-18T12:00:00.000Z',
          notified_at: null,
          unsubscribed: 1,
        },
      ]);

      const res = await app.request('/v1/waitlist?include_unsubscribed=true');

      expect(res.status).toBe(200);
      // Query should NOT include unsubscribed = 0 filter
      expect(mockDbQuery).toHaveBeenCalledWith(
        expect.not.stringContaining('unsubscribed = 0'),
        expect.any(Array)
      );
    });
  });

  describe('GET /v1/waitlist/:id - Get single entry', () => {
    it('returns single entry (admin only)', async () => {
      setAuthContext('admin');
      const app = createTestApp();
      const waitlist = await getWaitlistRoutes();
      app.route('/v1/waitlist', waitlist);

      mockDbQuery.mockResolvedValueOnce([
        {
          id: 'entry-1',
          email: 'test@example.com',
          drop_id: 'drop-1',
          subscribed_at: '2026-01-18T12:00:00.000Z',
          notified_at: null,
          unsubscribed: 0,
        },
      ]);

      const res = await app.request('/v1/waitlist/entry-1');

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.id).toBe('entry-1');
      expect(body.email).toBe('test@example.com');
    });

    it('returns 404 for non-existent entry', async () => {
      setAuthContext('admin');
      const app = createTestApp();
      const waitlist = await getWaitlistRoutes();
      app.route('/v1/waitlist', waitlist);

      mockDbQuery.mockResolvedValueOnce([]);

      const res = await app.request('/v1/waitlist/nonexistent');

      expect(res.status).toBe(404);
    });

    it('returns 403 without admin role', async () => {
      setAuthContext('public');
      const app = createTestApp();
      const waitlist = await getWaitlistRoutes();
      app.route('/v1/waitlist', waitlist);

      const res = await app.request('/v1/waitlist/entry-1');

      expect(res.status).toBe(403);
    });
  });
});
