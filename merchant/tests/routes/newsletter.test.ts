import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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
let mockAuthRole: 'admin' | 'public' = 'public';

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
    adminOnly: vi.fn().mockImplementation((c: any, next: any) => {
      const auth = c.get('auth');
      if (auth.role !== 'admin') {
        return c.json({ error: 'forbidden', message: 'Admin access required' }, 403);
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

// Mock sendNewsletterVerificationEmail and sendNewsletterToSubscribers to prevent actual email sending
const mockSendNewsletterToSubscribers = vi.fn();

vi.mock('../../src/lib/notifications', () => ({
  sendNewsletterVerificationEmail: vi.fn().mockResolvedValue({
    success: true,
    messageId: 'mock-message-id',
  }),
  sendNewsletterToSubscribers: mockSendNewsletterToSubscribers,
}));

// Mock the newsletter rate limit middleware to avoid needing to mock the DB table
vi.mock('../../src/middleware/newsletter-rate-limit', () => ({
  enforceNewsletterRateLimit: vi.fn().mockResolvedValue({ remaining: 4, resetAt: new Date() }),
}));

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

// Dynamically import newsletter after mocks are set up
async function getNewsletterRoutes() {
  const { newsletter } = await import('../../src/routes/newsletter');
  return newsletter;
}

describe('Newsletter Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default to public auth since subscribe is a public endpoint
    setAuthContext('public');
  });

  afterEach(() => {
    vi.resetModules();
  });

  describe('POST /v1/newsletter/subscribe - Subscribe to newsletter', () => {
    it('returns 200 for valid email', async () => {
      const app = createTestApp();
      const newsletter = await getNewsletterRoutes();
      app.route('/v1/newsletter', newsletter);

      // Mock: no existing subscriber
      mockDbQuery.mockResolvedValueOnce([]);

      const res = await app.request('/v1/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@example.com' }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.message).toContain('subscription');
    });

    it('normalizes email to lowercase', async () => {
      const app = createTestApp();
      const newsletter = await getNewsletterRoutes();
      app.route('/v1/newsletter', newsletter);

      // Mock: no existing subscriber
      mockDbQuery.mockResolvedValueOnce([]);

      const res = await app.request('/v1/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'TEST@EXAMPLE.COM' }),
      });

      expect(res.status).toBe(200);

      // Check that the INSERT was called with lowercase email
      expect(mockDbRun).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO newsletter_subscribers'),
        expect.arrayContaining(['test@example.com'])
      );
    });

    it('returns 400 for invalid email format', async () => {
      const app = createTestApp();
      const newsletter = await getNewsletterRoutes();
      app.route('/v1/newsletter', newsletter);

      const res = await app.request('/v1/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'invalid-email' }),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe('invalid_request');
      expect(body.message).toContain('email');
    });

    it('returns 400 for missing email', async () => {
      const app = createTestApp();
      const newsletter = await getNewsletterRoutes();
      app.route('/v1/newsletter', newsletter);

      const res = await app.request('/v1/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe('invalid_request');
      expect(body.message).toContain('email');
    });

    it('generates verification token', async () => {
      const app = createTestApp();
      const newsletter = await getNewsletterRoutes();
      app.route('/v1/newsletter', newsletter);

      // Mock: no existing subscriber
      mockDbQuery.mockResolvedValueOnce([]);

      await app.request('/v1/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@example.com' }),
      });

      // Check that INSERT was called with a verification token
      expect(mockDbRun).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO newsletter_subscribers'),
        expect.arrayContaining(['test-uuid-123']) // The mocked uuid
      );
    });

    it('inserts subscriber with verified=false', async () => {
      const app = createTestApp();
      const newsletter = await getNewsletterRoutes();
      app.route('/v1/newsletter', newsletter);

      // Mock: no existing subscriber
      mockDbQuery.mockResolvedValueOnce([]);

      await app.request('/v1/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@example.com' }),
      });

      // Check that INSERT was called with verified = 0
      expect(mockDbRun).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO newsletter_subscribers'),
        expect.arrayContaining([0]) // verified = false (0 in SQLite)
      );
    });

    it('returns same response for existing email (no leak)', async () => {
      const app = createTestApp();
      const newsletter = await getNewsletterRoutes();
      app.route('/v1/newsletter', newsletter);

      // Mock: existing subscriber found
      mockDbQuery.mockResolvedValueOnce([
        {
          id: 'existing-id',
          email: 'test@example.com',
          verified: 0,
          verification_token: 'old-token',
        },
      ]);

      const res = await app.request('/v1/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@example.com' }),
      });

      // Should return 200 with success message (not 409 conflict)
      // This prevents email enumeration attacks
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);

      // Should NOT insert a new record
      expect(mockDbRun).not.toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO newsletter_subscribers'),
        expect.any(Array)
      );
    });

    it('handles already verified email the same way', async () => {
      const app = createTestApp();
      const newsletter = await getNewsletterRoutes();
      app.route('/v1/newsletter', newsletter);

      // Mock: existing verified subscriber
      mockDbQuery.mockResolvedValueOnce([
        {
          id: 'existing-id',
          email: 'test@example.com',
          verified: 1,
          verification_token: null,
        },
      ]);

      const res = await app.request('/v1/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@example.com' }),
      });

      // Should return 200 success (no leak about verification status)
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
    });

    it('trims whitespace from email', async () => {
      const app = createTestApp();
      const newsletter = await getNewsletterRoutes();
      app.route('/v1/newsletter', newsletter);

      // Mock: no existing subscriber
      mockDbQuery.mockResolvedValueOnce([]);

      const res = await app.request('/v1/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: '  test@example.com  ' }),
      });

      expect(res.status).toBe(200);

      // Check that query checked for trimmed email
      expect(mockDbQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        expect.arrayContaining(['test@example.com'])
      );
    });

    it('rejects emails without TLD', async () => {
      const app = createTestApp();
      const newsletter = await getNewsletterRoutes();
      app.route('/v1/newsletter', newsletter);

      const res = await app.request('/v1/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@localhost' }),
      });

      expect(res.status).toBe(400);
    });

    it('rejects emails with spaces', async () => {
      const app = createTestApp();
      const newsletter = await getNewsletterRoutes();
      app.route('/v1/newsletter', newsletter);

      const res = await app.request('/v1/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test @example.com' }),
      });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /v1/newsletter/verify - Verify subscription', () => {
    it('returns success for valid token', async () => {
      const app = createTestApp();
      const newsletter = await getNewsletterRoutes();
      app.route('/v1/newsletter', newsletter);

      // Mock: subscriber found with matching token
      mockDbQuery.mockResolvedValueOnce([
        {
          id: 'sub-123',
          email: 'test@example.com',
          verified: 0,
          verification_token: 'valid-token-123',
        },
      ]);

      const res = await app.request('/v1/newsletter/verify?token=valid-token-123', {
        method: 'GET',
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.message).toContain('verified');
      expect(body.email).toBe('test@example.com');
    });

    it('sets verified=true after verification', async () => {
      const app = createTestApp();
      const newsletter = await getNewsletterRoutes();
      app.route('/v1/newsletter', newsletter);

      // Mock: subscriber found
      mockDbQuery.mockResolvedValueOnce([
        {
          id: 'sub-123',
          email: 'test@example.com',
          verified: 0,
          verification_token: 'valid-token-123',
        },
      ]);

      await app.request('/v1/newsletter/verify?token=valid-token-123', {
        method: 'GET',
      });

      // Check that UPDATE sets verified = 1 (literal value in SQL, not a parameter)
      expect(mockDbRun).toHaveBeenCalledWith(
        expect.stringContaining('SET verified = 1'),
        expect.any(Array)
      );
    });

    it('sets verified_at timestamp', async () => {
      const app = createTestApp();
      const newsletter = await getNewsletterRoutes();
      app.route('/v1/newsletter', newsletter);

      // Mock: subscriber found
      mockDbQuery.mockResolvedValueOnce([
        {
          id: 'sub-123',
          email: 'test@example.com',
          verified: 0,
          verification_token: 'valid-token-123',
        },
      ]);

      await app.request('/v1/newsletter/verify?token=valid-token-123', {
        method: 'GET',
      });

      // Check that UPDATE was called with verified_at timestamp
      expect(mockDbRun).toHaveBeenCalledWith(
        expect.stringContaining('SET verified = 1, verified_at = ?'),
        expect.arrayContaining(['2026-01-18T12:00:00.000Z']) // The mocked now()
      );
    });

    it('clears verification token after use', async () => {
      const app = createTestApp();
      const newsletter = await getNewsletterRoutes();
      app.route('/v1/newsletter', newsletter);

      // Mock: subscriber found
      mockDbQuery.mockResolvedValueOnce([
        {
          id: 'sub-123',
          email: 'test@example.com',
          verified: 0,
          verification_token: 'valid-token-123',
        },
      ]);

      await app.request('/v1/newsletter/verify?token=valid-token-123', {
        method: 'GET',
      });

      // Check that UPDATE sets verification_token = NULL
      expect(mockDbRun).toHaveBeenCalledWith(
        expect.stringContaining('verification_token = NULL'),
        expect.any(Array)
      );
    });

    it('returns 404 for invalid token', async () => {
      const app = createTestApp();
      const newsletter = await getNewsletterRoutes();
      app.route('/v1/newsletter', newsletter);

      // Mock: no subscriber found
      mockDbQuery.mockResolvedValueOnce([]);

      const res = await app.request('/v1/newsletter/verify?token=invalid-token', {
        method: 'GET',
      });

      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.error).toBe('not_found');
      expect(body.message).toContain('Invalid');
    });

    it('returns 400 when token query param is missing', async () => {
      const app = createTestApp();
      const newsletter = await getNewsletterRoutes();
      app.route('/v1/newsletter', newsletter);

      const res = await app.request('/v1/newsletter/verify', {
        method: 'GET',
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe('invalid_request');
      expect(body.message).toContain('token');
    });

    it('handles already verified subscriber gracefully', async () => {
      const app = createTestApp();
      const newsletter = await getNewsletterRoutes();
      app.route('/v1/newsletter', newsletter);

      // Mock: already verified subscriber
      mockDbQuery.mockResolvedValueOnce([
        {
          id: 'sub-123',
          email: 'test@example.com',
          verified: 1,
          verification_token: 'some-token',
        },
      ]);

      const res = await app.request('/v1/newsletter/verify?token=some-token', {
        method: 'GET',
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.message).toContain('already verified');

      // Should NOT call UPDATE since already verified
      expect(mockDbRun).not.toHaveBeenCalled();
    });

    it('does not update when subscriber not found', async () => {
      const app = createTestApp();
      const newsletter = await getNewsletterRoutes();
      app.route('/v1/newsletter', newsletter);

      // Mock: no subscriber found
      mockDbQuery.mockResolvedValueOnce([]);

      await app.request('/v1/newsletter/verify?token=invalid-token', {
        method: 'GET',
      });

      // Should NOT call UPDATE
      expect(mockDbRun).not.toHaveBeenCalledWith(
        expect.stringContaining('UPDATE newsletter_subscribers'),
        expect.any(Array)
      );
    });

    it('returns subscriber email in response', async () => {
      const app = createTestApp();
      const newsletter = await getNewsletterRoutes();
      app.route('/v1/newsletter', newsletter);

      // Mock: subscriber found
      mockDbQuery.mockResolvedValueOnce([
        {
          id: 'sub-123',
          email: 'verified@example.com',
          verified: 0,
          verification_token: 'valid-token',
        },
      ]);

      const res = await app.request('/v1/newsletter/verify?token=valid-token', {
        method: 'GET',
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.email).toBe('verified@example.com');
    });
  });

  describe('GET /v1/newsletter/unsubscribe - One-click unsubscribe', () => {
    it('returns success for valid email and token', async () => {
      const app = createTestApp();
      const newsletter = await getNewsletterRoutes();
      app.route('/v1/newsletter', newsletter);

      // Mock: subscriber found with matching verification_token
      mockDbQuery.mockResolvedValueOnce([
        {
          id: 'sub-123',
          email: 'test@example.com',
          verified: 1,
          verification_token: 'valid-token-123',
          unsubscribed_at: null,
        },
      ]);

      const res = await app.request(
        '/v1/newsletter/unsubscribe?email=test@example.com&token=valid-token-123',
        { method: 'GET' }
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.message).toContain('unsubscribed');
      expect(body.email).toBe('test@example.com');
    });

    it('sets unsubscribed_at timestamp', async () => {
      const app = createTestApp();
      const newsletter = await getNewsletterRoutes();
      app.route('/v1/newsletter', newsletter);

      // Mock: subscriber found
      mockDbQuery.mockResolvedValueOnce([
        {
          id: 'sub-123',
          email: 'test@example.com',
          verified: 1,
          verification_token: 'valid-token-123',
          unsubscribed_at: null,
        },
      ]);

      await app.request('/v1/newsletter/unsubscribe?email=test@example.com&token=valid-token-123', {
        method: 'GET',
      });

      // Check that UPDATE was called with unsubscribed_at timestamp
      expect(mockDbRun).toHaveBeenCalledWith(
        expect.stringContaining('SET unsubscribed_at = ?'),
        expect.arrayContaining(['2026-01-18T12:00:00.000Z']) // The mocked now()
      );
    });

    it('returns error for invalid token', async () => {
      const app = createTestApp();
      const newsletter = await getNewsletterRoutes();
      app.route('/v1/newsletter', newsletter);

      // Mock: subscriber found but with different token
      mockDbQuery.mockResolvedValueOnce([
        {
          id: 'sub-123',
          email: 'test@example.com',
          verified: 1,
          verification_token: 'correct-token',
          unsubscribed_at: null,
        },
      ]);

      const res = await app.request(
        '/v1/newsletter/unsubscribe?email=test@example.com&token=wrong-token',
        { method: 'GET' }
      );

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe('invalid_request');
      expect(body.message).toContain('Invalid');
    });

    it('returns error for non-existent email', async () => {
      const app = createTestApp();
      const newsletter = await getNewsletterRoutes();
      app.route('/v1/newsletter', newsletter);

      // Mock: no subscriber found
      mockDbQuery.mockResolvedValueOnce([]);

      const res = await app.request(
        '/v1/newsletter/unsubscribe?email=unknown@example.com&token=any-token',
        { method: 'GET' }
      );

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe('invalid_request');
      expect(body.message).toContain('Invalid');
    });

    it('record is not deleted (soft unsubscribe)', async () => {
      const app = createTestApp();
      const newsletter = await getNewsletterRoutes();
      app.route('/v1/newsletter', newsletter);

      // Mock: subscriber found
      mockDbQuery.mockResolvedValueOnce([
        {
          id: 'sub-123',
          email: 'test@example.com',
          verified: 1,
          verification_token: 'valid-token',
          unsubscribed_at: null,
        },
      ]);

      await app.request('/v1/newsletter/unsubscribe?email=test@example.com&token=valid-token', {
        method: 'GET',
      });

      // Should call UPDATE, NOT DELETE
      expect(mockDbRun).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE newsletter_subscribers'),
        expect.any(Array)
      );
      expect(mockDbRun).not.toHaveBeenCalledWith(
        expect.stringContaining('DELETE'),
        expect.any(Array)
      );
    });

    it('returns 400 when email parameter is missing', async () => {
      const app = createTestApp();
      const newsletter = await getNewsletterRoutes();
      app.route('/v1/newsletter', newsletter);

      const res = await app.request('/v1/newsletter/unsubscribe?token=some-token', {
        method: 'GET',
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe('invalid_request');
      expect(body.message).toContain('Email');
    });

    it('returns 400 when token parameter is missing', async () => {
      const app = createTestApp();
      const newsletter = await getNewsletterRoutes();
      app.route('/v1/newsletter', newsletter);

      const res = await app.request('/v1/newsletter/unsubscribe?email=test@example.com', {
        method: 'GET',
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe('invalid_request');
      expect(body.message).toContain('Token');
    });

    it('handles already unsubscribed user gracefully', async () => {
      const app = createTestApp();
      const newsletter = await getNewsletterRoutes();
      app.route('/v1/newsletter', newsletter);

      // Mock: subscriber already unsubscribed
      mockDbQuery.mockResolvedValueOnce([
        {
          id: 'sub-123',
          email: 'test@example.com',
          verified: 1,
          verification_token: 'valid-token',
          unsubscribed_at: '2026-01-17T12:00:00.000Z',
        },
      ]);

      const res = await app.request(
        '/v1/newsletter/unsubscribe?email=test@example.com&token=valid-token',
        { method: 'GET' }
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.message).toContain('already');

      // Should NOT call UPDATE since already unsubscribed
      expect(mockDbRun).not.toHaveBeenCalled();
    });

    it('normalizes email to lowercase', async () => {
      const app = createTestApp();
      const newsletter = await getNewsletterRoutes();
      app.route('/v1/newsletter', newsletter);

      // Mock: subscriber found
      mockDbQuery.mockResolvedValueOnce([
        {
          id: 'sub-123',
          email: 'test@example.com',
          verified: 1,
          verification_token: 'valid-token',
          unsubscribed_at: null,
        },
      ]);

      await app.request('/v1/newsletter/unsubscribe?email=TEST@EXAMPLE.COM&token=valid-token', {
        method: 'GET',
      });

      // Check that query used lowercase email
      expect(mockDbQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        expect.arrayContaining(['test@example.com'])
      );
    });

    it('accepts unsub-{id} token format', async () => {
      const app = createTestApp();
      const newsletter = await getNewsletterRoutes();
      app.route('/v1/newsletter', newsletter);

      // Mock: verified subscriber with cleared verification_token
      mockDbQuery.mockResolvedValueOnce([
        {
          id: 'sub-123',
          email: 'test@example.com',
          verified: 1,
          verification_token: null, // Cleared after verification
          unsubscribed_at: null,
        },
      ]);

      const res = await app.request(
        '/v1/newsletter/unsubscribe?email=test@example.com&token=unsub-sub-123',
        { method: 'GET' }
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
    });
  });

  describe('GET /v1/newsletter/subscribers/count - Get subscriber count', () => {
    it('returns 403 for non-admin users', async () => {
      setAuthContext('public');

      const app = createTestApp();
      const newsletter = await getNewsletterRoutes();
      app.route('/v1/newsletter', newsletter);

      const res = await app.request('/v1/newsletter/subscribers/count', {
        method: 'GET',
      });

      expect(res.status).toBe(403);
    });

    it('returns count of verified active subscribers for admin', async () => {
      setAuthContext('admin');

      const app = createTestApp();
      const newsletter = await getNewsletterRoutes();
      app.route('/v1/newsletter', newsletter);

      // Mock: return count of 42
      mockDbQuery.mockResolvedValueOnce([{ count: 42 }]);

      const res = await app.request('/v1/newsletter/subscribers/count', {
        method: 'GET',
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.count).toBe(42);
    });

    it('returns 0 when no subscribers exist', async () => {
      setAuthContext('admin');

      const app = createTestApp();
      const newsletter = await getNewsletterRoutes();
      app.route('/v1/newsletter', newsletter);

      // Mock: return count of 0
      mockDbQuery.mockResolvedValueOnce([{ count: 0 }]);

      const res = await app.request('/v1/newsletter/subscribers/count', {
        method: 'GET',
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.count).toBe(0);
    });

    it('queries only verified and non-unsubscribed subscribers', async () => {
      setAuthContext('admin');

      const app = createTestApp();
      const newsletter = await getNewsletterRoutes();
      app.route('/v1/newsletter', newsletter);

      mockDbQuery.mockResolvedValueOnce([{ count: 15 }]);

      await app.request('/v1/newsletter/subscribers/count', {
        method: 'GET',
      });

      // Verify the SQL query checks verified = 1 AND unsubscribed_at IS NULL
      expect(mockDbQuery).toHaveBeenCalledWith(
        expect.stringContaining('verified = 1'),
        expect.anything()
      );
      expect(mockDbQuery).toHaveBeenCalledWith(
        expect.stringContaining('unsubscribed_at IS NULL'),
        expect.anything()
      );
    });

    it('filters by store_id', async () => {
      setAuthContext('admin');

      const app = createTestApp();
      const newsletter = await getNewsletterRoutes();
      app.route('/v1/newsletter', newsletter);

      mockDbQuery.mockResolvedValueOnce([{ count: 10 }]);

      await app.request('/v1/newsletter/subscribers/count', {
        method: 'GET',
      });

      // Verify the SQL query includes store_id filter
      expect(mockDbQuery).toHaveBeenCalledWith(
        expect.stringContaining('store_id = ?'),
        expect.arrayContaining(['store-1'])
      );
    });
  });

  describe('POST /v1/newsletter/send - Send newsletter', () => {
    beforeEach(() => {
      mockSendNewsletterToSubscribers.mockReset();
    });

    it('returns 403 for non-admin users', async () => {
      setAuthContext('public');

      const app = createTestApp();
      const newsletter = await getNewsletterRoutes();
      app.route('/v1/newsletter', newsletter);

      const res = await app.request('/v1/newsletter/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blog_slug: 'my-post',
          title: 'My Post',
          excerpt: 'A great post',
        }),
      });

      expect(res.status).toBe(403);
      expect(mockSendNewsletterToSubscribers).not.toHaveBeenCalled();
    });

    it('returns 400 when blog_slug is missing', async () => {
      setAuthContext('admin');

      const app = createTestApp();
      const newsletter = await getNewsletterRoutes();
      app.route('/v1/newsletter', newsletter);

      const res = await app.request('/v1/newsletter/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'My Post',
          excerpt: 'A great post',
        }),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe('invalid_request');
      expect(body.message).toContain('blog_slug');
    });

    it('returns 400 when title is missing', async () => {
      setAuthContext('admin');

      const app = createTestApp();
      const newsletter = await getNewsletterRoutes();
      app.route('/v1/newsletter', newsletter);

      const res = await app.request('/v1/newsletter/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blog_slug: 'my-post',
          excerpt: 'A great post',
        }),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe('invalid_request');
      expect(body.message).toContain('title');
    });

    it('returns 400 when excerpt is missing', async () => {
      setAuthContext('admin');

      const app = createTestApp();
      const newsletter = await getNewsletterRoutes();
      app.route('/v1/newsletter', newsletter);

      const res = await app.request('/v1/newsletter/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blog_slug: 'my-post',
          title: 'My Post',
        }),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe('invalid_request');
      expect(body.message).toContain('excerpt');
    });

    it('sends newsletter to subscribers and returns success', async () => {
      setAuthContext('admin');

      mockSendNewsletterToSubscribers.mockResolvedValueOnce({
        success: true,
        recipientCount: 25,
        sendId: 'ns_123_abc',
        errors: [],
      });

      const app = createTestApp();
      const newsletter = await getNewsletterRoutes();
      app.route('/v1/newsletter', newsletter);

      const res = await app.request('/v1/newsletter/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blog_slug: 'my-post',
          title: 'My Post',
          excerpt: 'A great post about something',
        }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.recipient_count).toBe(25);
      expect(body.send_id).toBe('ns_123_abc');
      expect(body.errors).toBeUndefined();
    });

    it('passes featured_image_url to send function when provided', async () => {
      setAuthContext('admin');

      mockSendNewsletterToSubscribers.mockResolvedValueOnce({
        success: true,
        recipientCount: 10,
        sendId: 'ns_456_xyz',
        errors: [],
      });

      const app = createTestApp();
      const newsletter = await getNewsletterRoutes();
      app.route('/v1/newsletter', newsletter);

      await app.request('/v1/newsletter/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blog_slug: 'my-post',
          title: 'My Post',
          excerpt: 'A great post',
          featured_image_url: 'https://example.com/image.jpg',
        }),
      });

      // Check the call was made with the right data (env can be undefined in test context)
      expect(mockSendNewsletterToSubscribers).toHaveBeenCalledTimes(1);
      const callArgs = mockSendNewsletterToSubscribers.mock.calls[0];
      expect(callArgs[1]).toBe('store-1');
      expect(callArgs[2]).toEqual(
        expect.objectContaining({
          blogSlug: 'my-post',
          title: 'My Post',
          excerpt: 'A great post',
          featuredImageUrl: 'https://example.com/image.jpg',
        })
      );
    });

    it('returns errors when some sends fail', async () => {
      setAuthContext('admin');

      mockSendNewsletterToSubscribers.mockResolvedValueOnce({
        success: false,
        recipientCount: 8,
        sendId: 'ns_789_def',
        errors: ['user@bad.com: Rate limit exceeded', 'other@bad.com: Invalid email'],
      });

      const app = createTestApp();
      const newsletter = await getNewsletterRoutes();
      app.route('/v1/newsletter', newsletter);

      const res = await app.request('/v1/newsletter/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blog_slug: 'my-post',
          title: 'My Post',
          excerpt: 'A great post',
        }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.recipient_count).toBe(8);
      expect(body.errors).toHaveLength(2);
      expect(body.errors[0]).toContain('Rate limit exceeded');
    });

    it('records send in newsletter_sends table (via sendNewsletterToSubscribers)', async () => {
      setAuthContext('admin');

      mockSendNewsletterToSubscribers.mockResolvedValueOnce({
        success: true,
        recipientCount: 5,
        sendId: 'ns_record_test',
        errors: [],
      });

      const app = createTestApp();
      const newsletter = await getNewsletterRoutes();
      app.route('/v1/newsletter', newsletter);

      const res = await app.request('/v1/newsletter/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blog_slug: 'test-slug',
          title: 'Test Title',
          excerpt: 'Test excerpt',
        }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.send_id).toBe('ns_record_test');
    });
  });
});
