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

  // If no D1 binding, we're in development without Cloudflare
  // Allow access but set user to null
  if (!db) {
    context.locals.user = null;
    context.locals.session = null;
    return next();
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
