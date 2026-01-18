import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  loggerMiddleware,
  redactSensitiveData,
  shouldLog,
  type LoggerOptions,
} from '../../src/middleware/logger';
import { Hono, Context, Next } from 'hono';
import type { Env } from '../../src/types';

// Mock console methods
const mockConsoleLog = vi.fn();
const mockConsoleInfo = vi.fn();
const mockConsoleWarn = vi.fn();
const mockConsoleError = vi.fn();
const mockConsoleDebug = vi.fn();

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(mockConsoleLog);
  vi.spyOn(console, 'info').mockImplementation(mockConsoleInfo);
  vi.spyOn(console, 'warn').mockImplementation(mockConsoleWarn);
  vi.spyOn(console, 'error').mockImplementation(mockConsoleError);
  vi.spyOn(console, 'debug').mockImplementation(mockConsoleDebug);
});

afterEach(() => {
  vi.restoreAllMocks();
  mockConsoleLog.mockClear();
  mockConsoleInfo.mockClear();
  mockConsoleWarn.mockClear();
  mockConsoleError.mockClear();
  mockConsoleDebug.mockClear();
});

// Mock env for testing
function createMockEnv(overrides: Partial<Env> = {}): Env {
  return {
    DB: {} as D1Database,
    LOG_LEVEL: undefined,
    ...overrides,
  } as Env;
}

// Helper middleware to set env on context (simulating Cloudflare Workers)
function mockEnvMiddleware(env: Env) {
  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    // Hono may not initialize c.env in test context, so we need to set it
    (c as any).env = env;
    return next();
  };
}

// Helper to create test app with logger middleware
function createTestApp(options?: LoggerOptions, envOverrides: Partial<Env> = {}) {
  const app = new Hono<{ Bindings: Env }>();
  const env = createMockEnv(envOverrides);

  // Add middleware to set env on context (simulating Cloudflare Workers)
  app.use('*', mockEnvMiddleware(env));

  app.use('*', loggerMiddleware(options));
  app.get('/test', (c) => c.json({ ok: true }));
  app.post('/test', async (c) => {
    const body = await c.req.json();
    return c.json({ received: body });
  });
  app.get('/error', () => {
    throw new Error('Test error');
  });
  app.get('/slow', async (c) => {
    await new Promise((resolve) => setTimeout(resolve, 50));
    return c.json({ ok: true });
  });
  return app;
}

describe('Logger Middleware', () => {
  describe('loggerMiddleware', () => {
    it('logs request method and path', async () => {
      const app = createTestApp();
      await app.request('/test', { method: 'GET' });

      expect(mockConsoleInfo).toHaveBeenCalled();
      const logCall = mockConsoleInfo.mock.calls[0][0];
      expect(logCall).toContain('GET');
      expect(logCall).toContain('/test');
    });

    it('logs response status code', async () => {
      const app = createTestApp();
      await app.request('/test', { method: 'GET' });

      expect(mockConsoleInfo).toHaveBeenCalled();
      const logCall = mockConsoleInfo.mock.calls[0][0];
      expect(logCall).toContain('200');
    });

    it('logs request duration in milliseconds', async () => {
      const app = createTestApp();
      await app.request('/slow', { method: 'GET' });

      expect(mockConsoleInfo).toHaveBeenCalled();
      const logCall = mockConsoleInfo.mock.calls[0][0];
      // Should contain a duration like "50ms" or similar
      expect(logCall).toMatch(/\d+ms/);
    });

    it('logs 5xx errors at error level', async () => {
      const app = new Hono<{ Bindings: Env }>();
      app.use('*', mockEnvMiddleware(createMockEnv()));
      app.use('*', loggerMiddleware());
      app.get('/error', (c) => c.json({ error: 'Internal error' }, 500));

      await app.request('/error', { method: 'GET' });

      expect(mockConsoleError).toHaveBeenCalled();
      const logCall = mockConsoleError.mock.calls[0][0];
      expect(logCall).toContain('500');
    });

    it('logs 4xx errors at warn level', async () => {
      const app = new Hono<{ Bindings: Env }>();
      app.use('*', mockEnvMiddleware(createMockEnv()));
      app.use('*', loggerMiddleware());
      app.get('/not-found', (c) => c.json({ error: 'Not found' }, 404));

      await app.request('/not-found', { method: 'GET' });

      expect(mockConsoleWarn).toHaveBeenCalled();
      const logCall = mockConsoleWarn.mock.calls[0][0];
      expect(logCall).toContain('404');
    });
  });

  describe('redactSensitiveData', () => {
    it('redacts Authorization header value', () => {
      const headers = { Authorization: 'Bearer sk_secret_key_12345' };
      const redacted = redactSensitiveData(headers);
      expect(redacted.Authorization).toBe('[REDACTED]');
    });

    it('redacts password fields in body', () => {
      const body = {
        email: 'user@example.com',
        password: 'secret123',
        confirm_password: 'secret123',
      };
      const redacted = redactSensitiveData(body);
      expect(redacted.email).toBe('user@example.com');
      expect(redacted.password).toBe('[REDACTED]');
      expect(redacted.confirm_password).toBe('[REDACTED]');
    });

    it('redacts API key values', () => {
      const data = {
        api_key: 'sk_live_abcd1234',
        apiKey: 'pk_test_efgh5678',
        stripe_secret_key: 'sk_test_xyz',
        resend_api_key: 'resend_abc123',
      };
      const redacted = redactSensitiveData(data);
      expect(redacted.api_key).toBe('[REDACTED]');
      expect(redacted.apiKey).toBe('[REDACTED]');
      expect(redacted.stripe_secret_key).toBe('[REDACTED]');
      expect(redacted.resend_api_key).toBe('[REDACTED]');
    });

    it('handles nested objects', () => {
      const data = {
        user: {
          email: 'user@example.com',
          password: 'secret123',
        },
        config: {
          api_key: 'sk_123',
        },
      };
      const redacted = redactSensitiveData(data);
      expect(redacted.user.email).toBe('user@example.com');
      expect(redacted.user.password).toBe('[REDACTED]');
      expect(redacted.config.api_key).toBe('[REDACTED]');
    });

    it('handles null and undefined values', () => {
      const data = {
        password: null,
        api_key: undefined,
        email: 'test@example.com',
      };
      const redacted = redactSensitiveData(data);
      expect(redacted.password).toBeNull();
      expect(redacted.api_key).toBeUndefined();
      expect(redacted.email).toBe('test@example.com');
    });

    it('redacts token fields', () => {
      const data = {
        access_token: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9',
        refresh_token: 'refresh_abc123',
        token: 'some_token_value',
      };
      const redacted = redactSensitiveData(data);
      expect(redacted.access_token).toBe('[REDACTED]');
      expect(redacted.refresh_token).toBe('[REDACTED]');
      expect(redacted.token).toBe('[REDACTED]');
    });

    it('redacts secret fields', () => {
      const data = {
        client_secret: 'cs_123456',
        stripe_webhook_secret: 'whsec_abc123',
        secret: 'my_secret',
      };
      const redacted = redactSensitiveData(data);
      expect(redacted.client_secret).toBe('[REDACTED]');
      expect(redacted.stripe_webhook_secret).toBe('[REDACTED]');
      expect(redacted.secret).toBe('[REDACTED]');
    });
  });

  describe('shouldLog', () => {
    it('respects configured log level - debug logs all', () => {
      expect(shouldLog('debug', 'debug')).toBe(true);
      expect(shouldLog('info', 'debug')).toBe(true);
      expect(shouldLog('warn', 'debug')).toBe(true);
      expect(shouldLog('error', 'debug')).toBe(true);
    });

    it('respects configured log level - info skips debug', () => {
      expect(shouldLog('debug', 'info')).toBe(false);
      expect(shouldLog('info', 'info')).toBe(true);
      expect(shouldLog('warn', 'info')).toBe(true);
      expect(shouldLog('error', 'info')).toBe(true);
    });

    it('respects configured log level - warn skips debug and info', () => {
      expect(shouldLog('debug', 'warn')).toBe(false);
      expect(shouldLog('info', 'warn')).toBe(false);
      expect(shouldLog('warn', 'warn')).toBe(true);
      expect(shouldLog('error', 'warn')).toBe(true);
    });

    it('respects configured log level - error only logs errors', () => {
      expect(shouldLog('debug', 'error')).toBe(false);
      expect(shouldLog('info', 'error')).toBe(false);
      expect(shouldLog('warn', 'error')).toBe(false);
      expect(shouldLog('error', 'error')).toBe(true);
    });
  });

  describe('Logger options', () => {
    it('skips logging when log level is error and status is 2xx', async () => {
      const app = createTestApp({ level: 'error' });
      await app.request('/test', { method: 'GET' });

      expect(mockConsoleInfo).not.toHaveBeenCalled();
      expect(mockConsoleWarn).not.toHaveBeenCalled();
      expect(mockConsoleError).not.toHaveBeenCalled();
    });

    it('logs with custom format when provided', async () => {
      const customFormat = vi.fn(({ method, path, status, duration }) => {
        return `CUSTOM: ${method} ${path} -> ${status} (${duration}ms)`;
      });

      const app = new Hono<{ Bindings: Env }>();
      app.use('*', mockEnvMiddleware(createMockEnv()));
      app.use('*', loggerMiddleware({ format: customFormat }));
      app.get('/custom', (c) => c.json({ ok: true }));

      await app.request('/custom', { method: 'GET' });

      expect(customFormat).toHaveBeenCalled();
      expect(mockConsoleInfo.mock.calls[0][0]).toContain('CUSTOM:');
    });

    it('excludes paths when specified', async () => {
      const app = createTestApp({ excludePaths: ['/health', '/test'] });
      await app.request('/test', { method: 'GET' });

      expect(mockConsoleInfo).not.toHaveBeenCalled();
    });

    it('includes request body when enabled', async () => {
      const app = new Hono<{ Bindings: Env }>();
      app.use('*', mockEnvMiddleware(createMockEnv()));
      app.use('*', loggerMiddleware({ includeBody: true, level: 'debug' }));
      app.post('/with-body', async (c) => {
        await c.req.json();
        return c.json({ ok: true });
      });

      await app.request('/with-body', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@example.com', password: 'secret' }),
      });

      expect(mockConsoleDebug).toHaveBeenCalled();
      const bodyLogCall = mockConsoleDebug.mock.calls.find((call) =>
        call[0].includes('Request body')
      );
      expect(bodyLogCall).toBeDefined();
      // Password should be redacted
      expect(bodyLogCall[0]).toContain('[REDACTED]');
      expect(bodyLogCall[0]).not.toContain('secret');
    });
  });

  describe('Edge cases', () => {
    it('handles requests with no response body gracefully', async () => {
      const app = new Hono<{ Bindings: Env }>();
      app.use('*', mockEnvMiddleware(createMockEnv()));
      app.use('*', loggerMiddleware());
      app.delete('/item', (c) => c.body(null, 204));

      await app.request('/item', { method: 'DELETE' });

      expect(mockConsoleInfo).toHaveBeenCalled();
      const logCall = mockConsoleInfo.mock.calls[0][0];
      expect(logCall).toContain('204');
    });

    it('handles concurrent requests correctly', async () => {
      const app = createTestApp();

      const requests = await Promise.all([
        app.request('/test?id=1', { method: 'GET' }),
        app.request('/test?id=2', { method: 'GET' }),
        app.request('/test?id=3', { method: 'GET' }),
      ]);

      expect(requests).toHaveLength(3);
      expect(mockConsoleInfo).toHaveBeenCalledTimes(3);
    });
  });

  describe('Environment variable log level', () => {
    it('reads log level from env.LOG_LEVEL', async () => {
      const app = createTestApp({}, { LOG_LEVEL: 'error' });
      await app.request('/test', { method: 'GET' });

      // Should not log 2xx at error level
      expect(mockConsoleInfo).not.toHaveBeenCalled();
      expect(mockConsoleError).not.toHaveBeenCalled();
    });

    it('uses option level over env level when both set', async () => {
      const app = createTestApp({ level: 'info' }, { LOG_LEVEL: 'error' });
      await app.request('/test', { method: 'GET' });

      // Option level (info) should be used, so 2xx gets logged
      expect(mockConsoleInfo).toHaveBeenCalled();
    });
  });
});
