/**
 * @dear-margeaux/auth
 * Authentication utilities for Dear Margeaux admin panel
 */

// Lucia setup
export {
  createLucia,
  type AdminUserAttributes,
  type AdminSessionAttributes,
} from './lucia.js';
export type { User, Session } from 'lucia';

// D1 Adapter
export {
  createD1Adapter,
  type D1Database,
  type AdminUserRow,
  type AdminSessionRow,
} from './adapter.js';

// Password utilities
export { hashPassword, verifyPassword } from './password.js';

// User management
export {
  generateUserId,
  generateSessionId,
  createAdminUser,
  getAdminUserByEmail,
  getAdminUserById,
  validateAdminCredentials,
  updateAdminPassword,
  deactivateAdminUser,
} from './users.js';
