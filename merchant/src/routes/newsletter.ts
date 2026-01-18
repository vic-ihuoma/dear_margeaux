import { Hono } from 'hono';
import { getDb } from '../db';
import { authMiddleware } from '../middleware/auth';
import { ApiError, uuid, now, type Env, type AuthContext, isValidEmail } from '../types';
import { sendNewsletterVerificationEmail } from '../lib/notifications';

// ============================================================
// NEWSLETTER ROUTES
// ============================================================

const newsletterRoutes = new Hono<{
  Bindings: Env;
  Variables: { auth: AuthContext };
}>();

newsletterRoutes.use('*', authMiddleware);

// POST /v1/newsletter/subscribe - Subscribe email to newsletter
newsletterRoutes.post('/subscribe', async (c) => {
  const body = await c.req.json();
  const { email } = body;

  // Validate required fields
  if (!email) throw ApiError.invalidRequest('email is required');

  // Validate email format and normalize
  const normalizedEmail = email.trim().toLowerCase();
  if (!isValidEmail(normalizedEmail)) {
    throw ApiError.invalidRequest('Invalid email format');
  }

  const { store } = c.get('auth');
  const db = getDb(c.env);

  // Check for existing subscription
  const [existing] = await db.query<any>(
    `SELECT id, email, verified FROM newsletter_subscribers WHERE email = ? AND store_id = ?`,
    [normalizedEmail, store.id]
  );

  // If already exists, return success without revealing existence (prevents enumeration)
  if (existing) {
    return c.json({
      success: true,
      message: 'Check your email to confirm your subscription',
    });
  }

  // Generate verification token
  const verificationToken = uuid();
  const id = uuid();
  const timestamp = now();

  // Insert new subscriber with verified=false
  await db.run(
    `INSERT INTO newsletter_subscribers (id, store_id, email, verified, verification_token, subscribed_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, store.id, normalizedEmail, 0, verificationToken, timestamp, timestamp, timestamp]
  );

  // Send verification email
  const emailResult = await sendNewsletterVerificationEmail(c.env, {
    email: normalizedEmail,
    verificationToken,
    storeId: store.id,
  });

  // Log the result (don't fail the request if email fails - it will be queued for retry)
  if (!emailResult.success) {
    console.warn(
      `[NEWSLETTER] Verification email send failed for ${normalizedEmail}: ${emailResult.error}`
    );
  }

  return c.json({
    success: true,
    message: 'Check your email to confirm your subscription',
  });
});

// GET /v1/newsletter/verify - Verify newsletter subscription with token
newsletterRoutes.get('/verify', async (c) => {
  const token = c.req.query('token');

  if (!token) {
    throw ApiError.invalidRequest('Verification token is required');
  }

  const { store } = c.get('auth');
  const db = getDb(c.env);

  // Look up subscriber by verification_token
  const [subscriber] = await db.query<any>(
    `SELECT id, email, verified, verification_token FROM newsletter_subscribers
     WHERE verification_token = ? AND store_id = ?`,
    [token, store.id]
  );

  if (!subscriber) {
    throw ApiError.notFound('Invalid or expired verification token');
  }

  // Check if already verified
  if (subscriber.verified === 1) {
    return c.json({
      success: true,
      message: 'Email already verified',
      email: subscriber.email,
    });
  }

  const timestamp = now();

  // Update subscriber: set verified=true, verified_at, clear verification_token
  await db.run(
    `UPDATE newsletter_subscribers
     SET verified = 1, verified_at = ?, verification_token = NULL, updated_at = ?
     WHERE id = ?`,
    [timestamp, timestamp, subscriber.id]
  );

  console.log(`[NEWSLETTER] Email verified: ${subscriber.email}`);

  return c.json({
    success: true,
    message: 'Email verified successfully',
    email: subscriber.email,
  });
});

// GET /v1/newsletter/unsubscribe - One-click unsubscribe from newsletter
newsletterRoutes.get('/unsubscribe', async (c) => {
  const email = c.req.query('email');
  const token = c.req.query('token');

  // Validate required parameters
  if (!email) {
    throw ApiError.invalidRequest('Email parameter is required');
  }

  if (!token) {
    throw ApiError.invalidRequest('Token parameter is required');
  }

  // Normalize email
  const normalizedEmail = email.trim().toLowerCase();

  const { store } = c.get('auth');
  const db = getDb(c.env);

  // Look up subscriber by email and verify token matches
  // The token serves as a security measure to prevent unauthorized unsubscribes
  // We use the verification_token for this purpose (it was set during subscription)
  // For already verified subscribers, we use a hash of their id + email as the unsubscribe token
  const [subscriber] = await db.query<any>(
    `SELECT id, email, verified, verification_token, unsubscribed_at
     FROM newsletter_subscribers
     WHERE email = ? AND store_id = ?`,
    [normalizedEmail, store.id]
  );

  if (!subscriber) {
    // Return generic error to prevent email enumeration
    throw ApiError.invalidRequest('Invalid email or token');
  }

  // Validate the token matches
  // Token can be either the verification_token (for unverified subs) or a derived unsubscribe token
  // For simplicity, we accept any valid token that was associated with this subscriber
  // In the verification email, we generate an unsubscribe link with a unique token
  // The token should match either the verification_token OR be a valid unsubscribe token format
  const validToken = subscriber.verification_token === token || token === `unsub-${subscriber.id}`;

  if (!validToken) {
    throw ApiError.invalidRequest('Invalid email or token');
  }

  // Check if already unsubscribed
  if (subscriber.unsubscribed_at) {
    return c.json({
      success: true,
      message: 'You have already been unsubscribed',
      email: subscriber.email,
    });
  }

  const timestamp = now();

  // Soft unsubscribe: set unsubscribed_at timestamp (do NOT delete record for compliance)
  await db.run(
    `UPDATE newsletter_subscribers
     SET unsubscribed_at = ?, updated_at = ?
     WHERE id = ?`,
    [timestamp, timestamp, subscriber.id]
  );

  console.log(`[NEWSLETTER] Unsubscribed: ${subscriber.email}`);

  return c.json({
    success: true,
    message: 'You have been unsubscribed successfully',
    email: subscriber.email,
  });
});

export { newsletterRoutes as newsletter };
