/**
 * Lucia authentication configuration for Dear Margeaux Admin
 */

import { Lucia, TimeSpan } from 'lucia';
import { createD1Adapter, type D1Database } from './adapter.js';

/**
 * Database user attributes - the raw shape from the adapter
 */
export interface DatabaseUserAttributes {
  email: string;
  name: string | null;
  active: boolean;
}

/**
 * Admin user attributes exposed on the User object
 */
export interface AdminUserAttributes {
  email: string;
  name: string | null;
  active: boolean;
}

/**
 * Session attributes (currently empty, but can be extended)
 */
export interface AdminSessionAttributes {}

/**
 * Creates a new Lucia instance configured for D1
 * Call this with the D1 database binding from your request context
 */
export function createLucia(
  db: D1Database
): Lucia<AdminSessionAttributes, AdminUserAttributes> {
  const adapter = createD1Adapter(db);

  return new Lucia(adapter, {
    sessionExpiresIn: new TimeSpan(30, 'd'), // 30 days
    sessionCookie: {
      name: 'admin_session',
      attributes: {
        secure: true,
        sameSite: 'lax',
        path: '/',
      },
    },
    getUserAttributes: (
      attributes: Record<string, unknown>
    ): AdminUserAttributes => {
      return {
        email: attributes.email as string,
        name: attributes.name as string | null,
        active: attributes.active as boolean,
      };
    },
  });
}

// Re-export types for convenience
export type { User, Session } from 'lucia';
