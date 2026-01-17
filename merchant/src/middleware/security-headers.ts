import type { MiddlewareHandler } from 'hono';
import type { Env } from '../types';

/**
 * Security headers middleware for Merchant API
 * Adds essential security headers to all responses
 */
export function securityHeaders(): MiddlewareHandler<{ Bindings: Env }> {
  return async (c, next) => {
    await next();

    // Security headers
    c.header('X-Content-Type-Options', 'nosniff');
    c.header('X-Frame-Options', 'DENY');
    c.header('X-XSS-Protection', '1; mode=block');
    c.header('Referrer-Policy', 'strict-origin-when-cross-origin');

    // CORS and permissions
    c.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

    // Content Security Policy for API responses (JSON)
    c.header('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
  };
}
