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
});
