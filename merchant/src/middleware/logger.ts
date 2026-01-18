import { Context, Next } from 'hono';
import type { Env } from '../types';

// ============================================================
// REQUEST/RESPONSE LOGGING MIDDLEWARE
// ============================================================
// Logs HTTP requests with method, path, status, and duration.
// Redacts sensitive data (passwords, API keys, tokens) from logs.
// Supports configurable log levels (debug, info, warn, error).

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type LogEntry = {
  method: string;
  path: string;
  status: number;
  duration: number;
  timestamp: string;
  ip?: string;
  userAgent?: string;
};

export type LoggerOptions = {
  /** Minimum log level (default: 'info') */
  level?: LogLevel;
  /** Custom format function for log output */
  format?: (entry: LogEntry) => string;
  /** Paths to exclude from logging (e.g., health checks) */
  excludePaths?: string[];
  /** Include request body in debug logs (default: false) */
  includeBody?: boolean;
  /** Include response body in debug logs (default: false) */
  includeResponseBody?: boolean;
};

// Log level hierarchy for comparison
const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// Sensitive field names that should be redacted
const SENSITIVE_FIELDS = new Set([
  // Authentication
  'password',
  'confirm_password',
  'new_password',
  'old_password',
  'current_password',
  // Tokens
  'token',
  'access_token',
  'refresh_token',
  'id_token',
  'session_token',
  // API keys
  'api_key',
  'apikey',
  'apiKey',
  'api-key',
  // Headers (lowercase for comparison)
  'authorization',
  // Secrets
  'secret',
  'client_secret',
  'stripe_secret_key',
  'stripe_webhook_secret',
  'resend_api_key',
  // Credit card info
  'card_number',
  'cvv',
  'cvc',
  'expiry',
]);

/**
 * Check if a log message at the given level should be logged
 * based on the configured minimum level.
 */
export function shouldLog(messageLevel: LogLevel, configuredLevel: LogLevel): boolean {
  return LOG_LEVELS[messageLevel] >= LOG_LEVELS[configuredLevel];
}

/**
 * Recursively redact sensitive data from an object.
 * Returns a new object with sensitive fields replaced with '[REDACTED]'.
 */
export function redactSensitiveData<T extends Record<string, unknown>>(data: T): T {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();

    // Check if this is a sensitive field
    if (SENSITIVE_FIELDS.has(lowerKey) || SENSITIVE_FIELDS.has(key)) {
      // Only redact if value is a non-empty string
      if (typeof value === 'string' && value.length > 0) {
        result[key] = '[REDACTED]';
      } else {
        result[key] = value;
      }
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      // Recursively redact nested objects
      result[key] = redactSensitiveData(value as Record<string, unknown>);
    } else if (Array.isArray(value)) {
      // Handle arrays
      result[key] = value.map((item) =>
        typeof item === 'object' && item !== null
          ? redactSensitiveData(item as Record<string, unknown>)
          : item
      );
    } else {
      result[key] = value;
    }
  }

  return result as T;
}

/**
 * Default log format function.
 * Format: [TIMESTAMP] METHOD PATH STATUS DURATIONms
 */
function defaultFormat(entry: LogEntry): string {
  const { method, path, status, duration, timestamp } = entry;
  return `[${timestamp}] ${method} ${path} ${status} ${duration}ms`;
}

/**
 * Determine the appropriate log level for a status code.
 */
function getLogLevelForStatus(status: number): LogLevel {
  if (status >= 500) {
    return 'error';
  }
  if (status >= 400) {
    return 'warn';
  }
  return 'info';
}

/**
 * Log a message at the appropriate console level.
 */
function logAtLevel(level: LogLevel, message: string): void {
  switch (level) {
    case 'debug':
      console.debug(message);
      break;
    case 'info':
      console.info(message);
      break;
    case 'warn':
      console.warn(message);
      break;
    case 'error':
      console.error(message);
      break;
  }
}

/**
 * Request/response logging middleware for Hono.
 *
 * The log level can be configured via:
 * 1. The `level` option passed to the middleware
 * 2. The `LOG_LEVEL` environment variable (runtime)
 *
 * Usage:
 * ```ts
 * app.use('*', loggerMiddleware());
 *
 * // With options
 * app.use('*', loggerMiddleware({
 *   level: 'debug',
 *   excludePaths: ['/health'],
 *   includeBody: true,
 * }));
 * ```
 */
export function loggerMiddleware(options: LoggerOptions = {}) {
  const {
    level: staticLevel,
    format = defaultFormat,
    excludePaths = [],
    includeBody = false,
  } = options;

  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    const startTime = Date.now();
    const method = c.req.method;
    const path = c.req.path;
    const timestamp = new Date().toISOString();

    // Get log level from env (runtime) or options (static), default to 'info'
    const configuredLevel: LogLevel = staticLevel || c.env.LOG_LEVEL || 'info';

    // Skip excluded paths
    if (excludePaths.some((excluded) => path.startsWith(excluded))) {
      return next();
    }

    // Log request body in debug mode
    if (includeBody && shouldLog('debug', configuredLevel)) {
      try {
        const contentType = c.req.header('content-type') || '';
        if (contentType.includes('application/json')) {
          const body = await c.req.json();
          const redactedBody = redactSensitiveData(body);
          console.debug(`[${timestamp}] Request body: ${JSON.stringify(redactedBody)}`);
        }
      } catch {
        // Ignore body parsing errors
      }
    }

    // Execute the route handler
    await next();

    // Calculate duration
    const duration = Date.now() - startTime;
    const status = c.res.status;

    // Determine log level based on status code
    const messageLevel = getLogLevelForStatus(status);

    // Check if we should log this message
    if (!shouldLog(messageLevel, configuredLevel)) {
      return;
    }

    // Get additional context
    const ip = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For');
    const userAgent = c.req.header('User-Agent');

    // Create log entry
    const entry: LogEntry = {
      method,
      path,
      status,
      duration,
      timestamp,
      ...(ip && { ip }),
      ...(userAgent && { userAgent }),
    };

    // Format and log the message
    const message = format(entry);
    logAtLevel(messageLevel, message);
  };
}
