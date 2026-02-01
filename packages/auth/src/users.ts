/**
 * Admin user management functions
 */

import type { D1Database, AdminUserRow } from './adapter.js';
import { hashPassword, verifyPassword } from './password.js';

/**
 * Generates a unique ID for admin users
 */
export function generateUserId(): string {
  return crypto.randomUUID();
}

/**
 * Generates a unique ID for sessions
 */
export function generateSessionId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(20));
  return Array.from(bytes as unknown as number[])
    .map((b: number) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Creates a new admin user
 */
export async function createAdminUser(
  db: D1Database,
  data: {
    email: string;
    password: string;
    name?: string;
  }
): Promise<{ id: string; email: string; name: string | null }> {
  const id = generateUserId();
  const passwordHash = await hashPassword(data.password);

  await db
    .prepare(
      `INSERT INTO admin_users (id, email, password_hash, name, active, created_at, updated_at)
       VALUES (?, ?, ?, ?, 1, datetime('now'), datetime('now'))`
    )
    .bind(id, data.email.toLowerCase(), passwordHash, data.name || null)
    .run();

  return {
    id,
    email: data.email.toLowerCase(),
    name: data.name || null,
  };
}

/**
 * Gets an admin user by email
 */
export async function getAdminUserByEmail(
  db: D1Database,
  email: string
): Promise<AdminUserRow | null> {
  return db
    .prepare('SELECT * FROM admin_users WHERE email = ? AND active = 1')
    .bind(email.toLowerCase())
    .first<AdminUserRow>();
}

/**
 * Gets an admin user by ID
 */
export async function getAdminUserById(
  db: D1Database,
  id: string
): Promise<AdminUserRow | null> {
  return db
    .prepare('SELECT * FROM admin_users WHERE id = ? AND active = 1')
    .bind(id)
    .first<AdminUserRow>();
}

/**
 * Validates admin credentials and returns user if valid
 */
export async function validateAdminCredentials(
  db: D1Database,
  email: string,
  password: string
): Promise<AdminUserRow | null> {
  const user = await getAdminUserByEmail(db, email);
  if (!user) {
    return null;
  }

  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) {
    return null;
  }

  return user;
}

/**
 * Updates an admin user's password
 */
export async function updateAdminPassword(
  db: D1Database,
  userId: string,
  newPassword: string
): Promise<void> {
  const passwordHash = await hashPassword(newPassword);

  await db
    .prepare(
      `UPDATE admin_users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?`
    )
    .bind(passwordHash, userId)
    .run();
}

/**
 * Deactivates an admin user
 */
export async function deactivateAdminUser(
  db: D1Database,
  userId: string
): Promise<void> {
  await db
    .prepare(
      `UPDATE admin_users SET active = 0, updated_at = datetime('now') WHERE id = ?`
    )
    .bind(userId)
    .run();
}
