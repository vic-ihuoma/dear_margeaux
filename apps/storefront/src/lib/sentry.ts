/**
 * Sentry Error Monitoring Configuration
 *
 * This module provides Sentry initialization and utilities for error tracking.
 * The actual Sentry integration is configured via the @sentry/astro integration
 * in astro.config.mjs.
 *
 * Environment Variables:
 * - PUBLIC_SENTRY_DSN: The Sentry Data Source Name (DSN) for the project
 * - PUBLIC_SENTRY_ENVIRONMENT: The environment name (development, staging, production)
 * - SENTRY_AUTH_TOKEN: Auth token for source map uploads (build time only)
 *
 * Usage:
 * - Client-side errors are automatically captured by @sentry/astro
 * - Use captureException() for manual error reporting
 * - Use captureMessage() for logging significant events
 */

import * as Sentry from '@sentry/astro';

/**
 * Sentry configuration options for Dear Margeaux storefront
 */
export interface SentryConfig {
  dsn: string;
  environment: string;
  release?: string;
  tracesSampleRate: number;
  replaysSessionSampleRate: number;
  replaysOnErrorSampleRate: number;
}

/**
 * Default Sentry configuration
 * These values can be overridden via environment variables
 */
export const defaultSentryConfig: SentryConfig = {
  dsn: import.meta.env.PUBLIC_SENTRY_DSN || '',
  environment: import.meta.env.PUBLIC_SENTRY_ENVIRONMENT || 'development',
  release: import.meta.env.PUBLIC_SENTRY_RELEASE,
  // Performance monitoring: sample 10% of transactions in production
  tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
  // Session Replay: sample 1% of sessions, 100% on error
  replaysSessionSampleRate: 0.01,
  replaysOnErrorSampleRate: 1.0,
};

/**
 * Check if Sentry is properly configured
 */
export function isSentryConfigured(): boolean {
  return !!defaultSentryConfig.dsn;
}

/**
 * Capture an exception and send it to Sentry
 *
 * @param error - The error to capture
 * @param context - Additional context to attach to the error
 */
export function captureException(
  error: Error | unknown,
  context?: Record<string, unknown>
): string | undefined {
  if (!isSentryConfigured()) {
    console.error('[Sentry not configured]', error);
    return undefined;
  }

  return Sentry.captureException(error, {
    extra: context,
  });
}

/**
 * Capture a message and send it to Sentry
 *
 * @param message - The message to capture
 * @param level - The severity level (info, warning, error)
 * @param context - Additional context to attach to the message
 */
export function captureMessage(
  message: string,
  level: 'info' | 'warning' | 'error' = 'info',
  context?: Record<string, unknown>
): string | undefined {
  if (!isSentryConfigured()) {
    // Log at the appropriate level when Sentry is not configured
    if (level === 'error') {
      console.error(`[Sentry not configured] ${level}: ${message}`);
    } else {
      console.warn(`[Sentry not configured] ${level}: ${message}`);
    }
    return undefined;
  }

  return Sentry.captureMessage(message, {
    level,
    extra: context,
  });
}

/**
 * Set user information for Sentry error tracking
 *
 * @param user - User information to attach to future errors
 */
export function setUser(
  user: { id?: string; email?: string; username?: string } | null
): void {
  if (!isSentryConfigured()) {
    return;
  }

  Sentry.setUser(user);
}

/**
 * Add a breadcrumb for debugging context
 *
 * @param breadcrumb - The breadcrumb to add
 */
export function addBreadcrumb(breadcrumb: {
  category?: string;
  message?: string;
  level?: 'debug' | 'info' | 'warning' | 'error';
  data?: Record<string, unknown>;
}): void {
  if (!isSentryConfigured()) {
    return;
  }

  Sentry.addBreadcrumb(breadcrumb);
}

/**
 * Set a tag that will be attached to all future events
 *
 * @param key - The tag key
 * @param value - The tag value
 */
export function setTag(key: string, value: string): void {
  if (!isSentryConfigured()) {
    return;
  }

  Sentry.setTag(key, value);
}

/**
 * Set extra context that will be attached to all future events
 *
 * @param key - The context key
 * @param value - The context value
 */
export function setExtra(key: string, value: unknown): void {
  if (!isSentryConfigured()) {
    return;
  }

  Sentry.setExtra(key, value);
}

/**
 * Create a span for performance monitoring
 *
 * @param name - The span name
 * @param operation - The operation type
 * @param callback - The function to execute within the span
 */
export async function withSpan<T>(
  name: string,
  operation: string,
  callback: () => Promise<T>
): Promise<T> {
  if (!isSentryConfigured()) {
    return callback();
  }

  return Sentry.startSpan(
    {
      name,
      op: operation,
    },
    callback
  );
}

// Re-export commonly used Sentry functions for convenience
export { Sentry };
