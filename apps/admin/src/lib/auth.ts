/**
 * Auth utilities for the admin app
 */

import { createLucia, type D1Database } from '@dear-margeaux/auth';
import type { AstroCookies } from 'astro';
import type { Lucia, Session, User } from 'lucia';

/**
 * Gets or creates a Lucia instance for the current request
 */
export function getLucia(db: D1Database): Lucia {
  return createLucia(db);
}

/**
 * Validates a session from cookies
 */
export async function validateSession(
  lucia: Lucia,
  cookies: AstroCookies
): Promise<{ session: Session | null; user: User | null }> {
  const sessionId = cookies.get(lucia.sessionCookieName)?.value ?? null;

  if (!sessionId) {
    return { session: null, user: null };
  }

  const result = await lucia.validateSession(sessionId);

  // If session is fresh (extended), update the cookie
  if (result.session?.fresh) {
    const sessionCookie = lucia.createSessionCookie(result.session.id);
    cookies.set(
      sessionCookie.name,
      sessionCookie.value,
      sessionCookie.attributes
    );
  }

  return result;
}

/**
 * Creates a session for a user
 */
export async function createSession(
  lucia: Lucia,
  userId: string,
  cookies: AstroCookies
): Promise<Session> {
  const session = await lucia.createSession(userId, {});
  const sessionCookie = lucia.createSessionCookie(session.id);
  cookies.set(
    sessionCookie.name,
    sessionCookie.value,
    sessionCookie.attributes
  );
  return session;
}

/**
 * Destroys the current session
 */
export async function destroySession(
  lucia: Lucia,
  sessionId: string,
  cookies: AstroCookies
): Promise<void> {
  await lucia.invalidateSession(sessionId);
  const blankCookie = lucia.createBlankSessionCookie();
  cookies.set(blankCookie.name, blankCookie.value, blankCookie.attributes);
}
