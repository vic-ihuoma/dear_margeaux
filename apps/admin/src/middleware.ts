/**
 * Admin authentication middleware
 * Protects all routes except /login
 */

import { defineMiddleware } from 'astro:middleware';
import { getLucia, validateSession } from './lib/auth';
import type { D1Database } from '@dear-margeaux/auth';

// Routes that don't require authentication
const PUBLIC_ROUTES = ['/login', '/api/auth/login'];

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;

  // Skip auth check for public routes
  if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
    return next();
  }

  // Get D1 database from Cloudflare runtime
  const runtime = context.locals.runtime;
  const db = runtime?.env?.DB as D1Database | undefined;

  // If no D1 binding, authentication cannot be verified
  // Only allow bypass in explicit development mode to prevent security issues
  if (!db) {
    const isDevelopment = import.meta.env.DEV;
    const allowDevBypass = import.meta.env.ALLOW_AUTH_BYPASS === 'true';

    if (isDevelopment && allowDevBypass) {
      // Development mode with explicit bypass enabled
      console.warn(
        'Auth bypass enabled in development mode. Set ALLOW_AUTH_BYPASS=false for production-like testing.'
      );
      context.locals.user = null;
      context.locals.session = null;
      return next();
    }

    // Production or development without explicit bypass - deny access
    console.error(
      'D1 database not available. Authentication cannot be verified.'
    );
    return new Response(
      'Service unavailable - authentication system not configured',
      {
        status: 503,
      }
    );
  }

  // Validate session
  const lucia = getLucia(db);
  const { session, user } = await validateSession(lucia, context.cookies);

  // Store user and session in locals
  // Cast user to include our custom attributes from getUserAttributes
  context.locals.user = user as App.Locals['user'];
  context.locals.session = session;

  // If not authenticated, redirect to login
  if (!user) {
    return context.redirect('/login');
  }

  // Check if user is active (accessing the custom attribute)
  const userWithAttributes = user as { active?: boolean };
  if (!userWithAttributes.active) {
    // Clear session and redirect
    if (session) {
      await lucia.invalidateSession(session.id);
      const blankCookie = lucia.createBlankSessionCookie();
      context.cookies.set(
        blankCookie.name,
        blankCookie.value,
        blankCookie.attributes
      );
    }
    return context.redirect('/login?error=inactive');
  }

  return next();
});
