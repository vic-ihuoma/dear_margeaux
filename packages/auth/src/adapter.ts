/**
 * Custom D1 adapter for Lucia v3
 * Based on the Lucia adapter interface requirements
 */

import type { Adapter, DatabaseSession, DatabaseUser } from 'lucia';

export interface D1Database {
  prepare(query: string): D1PreparedStatement;
}

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(): Promise<T | null>;
  all<T = unknown>(): Promise<{ results: T[] }>;
  run(): Promise<{ success: boolean }>;
}

export interface AdminUserRow {
  id: string;
  email: string;
  password_hash: string;
  name: string | null;
  active: number;
  created_at: string;
  updated_at: string;
}

export interface AdminSessionRow {
  id: string;
  user_id: string;
  expires_at: number;
  created_at: string;
}

/**
 * Creates a Lucia adapter for Cloudflare D1
 */
export function createD1Adapter(db: D1Database): Adapter {
  return {
    async getSessionAndUser(
      sessionId: string
    ): Promise<[session: DatabaseSession | null, user: DatabaseUser | null]> {
      const sessionResult = await db
        .prepare(
          'SELECT id, user_id, expires_at FROM admin_sessions WHERE id = ?'
        )
        .bind(sessionId)
        .first<AdminSessionRow>();

      if (!sessionResult) {
        return [null, null];
      }

      const userResult = await db
        .prepare('SELECT id, email, name, active FROM admin_users WHERE id = ?')
        .bind(sessionResult.user_id)
        .first<AdminUserRow>();

      if (!userResult) {
        return [null, null];
      }

      const session: DatabaseSession = {
        id: sessionResult.id,
        userId: sessionResult.user_id,
        expiresAt: new Date(sessionResult.expires_at * 1000),
        attributes: {},
      };

      const user: DatabaseUser = {
        id: userResult.id,
        attributes: {
          email: userResult.email,
          name: userResult.name,
          active: userResult.active === 1,
        },
      };

      return [session, user];
    },

    async getUserSessions(userId: string): Promise<DatabaseSession[]> {
      const { results } = await db
        .prepare(
          'SELECT id, user_id, expires_at FROM admin_sessions WHERE user_id = ?'
        )
        .bind(userId)
        .all<AdminSessionRow>();

      return results.map((row) => ({
        id: row.id,
        userId: row.user_id,
        expiresAt: new Date(row.expires_at * 1000),
        attributes: {},
      }));
    },

    async setSession(session: DatabaseSession): Promise<void> {
      await db
        .prepare(
          "INSERT INTO admin_sessions (id, user_id, expires_at, created_at) VALUES (?, ?, ?, datetime('now'))"
        )
        .bind(
          session.id,
          session.userId,
          Math.floor(session.expiresAt.getTime() / 1000)
        )
        .run();
    },

    async updateSessionExpiration(
      sessionId: string,
      expiresAt: Date
    ): Promise<void> {
      await db
        .prepare('UPDATE admin_sessions SET expires_at = ? WHERE id = ?')
        .bind(Math.floor(expiresAt.getTime() / 1000), sessionId)
        .run();
    },

    async deleteSession(sessionId: string): Promise<void> {
      await db
        .prepare('DELETE FROM admin_sessions WHERE id = ?')
        .bind(sessionId)
        .run();
    },

    async deleteUserSessions(userId: string): Promise<void> {
      await db
        .prepare('DELETE FROM admin_sessions WHERE user_id = ?')
        .bind(userId)
        .run();
    },

    async deleteExpiredSessions(): Promise<void> {
      const now = Math.floor(Date.now() / 1000);
      await db
        .prepare('DELETE FROM admin_sessions WHERE expires_at < ?')
        .bind(now)
        .run();
    },
  };
}
