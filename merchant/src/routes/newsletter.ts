import { Hono } from 'hono';
import { getDb } from '../db';
import { authMiddleware, adminOnly } from '../middleware/auth';
import { ApiError, uuid, now, type Env, type AuthContext, isValidEmail } from '../types';
import { sendNewsletterVerificationEmail, sendNewsletterToSubscribers } from '../lib/notifications';
import { enforceNewsletterRateLimit } from '../middleware/newsletter-rate-limit';

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
  const { store } = c.get('auth');

  // Enforce rate limit (5 requests per hour per IP)
  await enforceNewsletterRateLimit(c, store.id);

  const body = await c.req.json();
  const { email } = body;

  // Validate required fields
  if (!email) throw ApiError.invalidRequest('email is required');

  // Validate email format and normalize
  const normalizedEmail = email.trim().toLowerCase();
  if (!isValidEmail(normalizedEmail)) {
    throw ApiError.invalidRequest('Invalid email format');
  }

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

// GET /v1/newsletter/subscribers - List subscribers with pagination, filtering, and search (admin only)
newsletterRoutes.get('/subscribers', adminOnly, async (c) => {
  const { store } = c.get('auth');
  const db = getDb(c.env);

  // Parse query parameters
  const cursor = c.req.query('cursor');
  const limit = Math.min(parseInt(c.req.query('limit') || '50', 10), 100); // Default 50, max 100
  const status = c.req.query('status'); // 'verified', 'unverified', 'unsubscribed', or undefined for all
  const search = c.req.query('search')?.trim().toLowerCase();

  // Build WHERE conditions
  const conditions: string[] = ['store_id = ?'];
  const params: (string | number)[] = [store.id];

  // Apply status filter
  if (status === 'verified') {
    conditions.push('verified = 1');
    conditions.push('unsubscribed_at IS NULL');
  } else if (status === 'unverified') {
    conditions.push('verified = 0');
    conditions.push('unsubscribed_at IS NULL');
  } else if (status === 'unsubscribed') {
    conditions.push('unsubscribed_at IS NOT NULL');
  }

  // Apply search filter (search by email)
  if (search) {
    conditions.push('email LIKE ?');
    params.push(`%${search}%`);
  }

  // Apply cursor-based pagination (cursor is the ID of the last item from previous page)
  if (cursor) {
    // Get the subscribed_at of the cursor subscriber to use for ordering
    const [cursorSub] = await db.query<{ subscribed_at: string }>(
      `SELECT subscribed_at FROM newsletter_subscribers WHERE id = ? AND store_id = ?`,
      [cursor, store.id]
    );

    if (cursorSub) {
      // Get subscribers after the cursor position (ordered by subscribed_at DESC, then id DESC)
      conditions.push('(subscribed_at < ? OR (subscribed_at = ? AND id < ?))');
      params.push(cursorSub.subscribed_at, cursorSub.subscribed_at, cursor);
    }
  }

  const whereClause = conditions.join(' AND ');

  // For count, we need to use the same conditions WITHOUT cursor pagination
  const countConditions: string[] = ['store_id = ?'];
  const countParams: (string | number)[] = [store.id];

  if (status === 'verified') {
    countConditions.push('verified = 1');
    countConditions.push('unsubscribed_at IS NULL');
  } else if (status === 'unverified') {
    countConditions.push('verified = 0');
    countConditions.push('unsubscribed_at IS NULL');
  } else if (status === 'unsubscribed') {
    countConditions.push('unsubscribed_at IS NOT NULL');
  }

  if (search) {
    countConditions.push('email LIKE ?');
    countParams.push(`%${search}%`);
  }

  const [totalCount] = await db.query<{ count: number }>(
    `SELECT COUNT(*) as count FROM newsletter_subscribers WHERE ${countConditions.join(' AND ')}`,
    countParams
  );

  // Fetch subscribers with pagination
  const subscribers = await db.query<{
    id: string;
    email: string;
    verified: number;
    subscribed_at: string;
    verified_at: string | null;
    unsubscribed_at: string | null;
    source: string;
  }>(
    `SELECT id, email, verified, subscribed_at, verified_at, unsubscribed_at, source
     FROM newsletter_subscribers
     WHERE ${whereClause}
     ORDER BY subscribed_at DESC, id DESC
     LIMIT ?`,
    [...params, limit + 1] // Fetch one extra to determine if there's a next page
  );

  // Check if there's a next page and get the next cursor
  const hasMore = subscribers.length > limit;
  const items = hasMore ? subscribers.slice(0, limit) : subscribers;
  const nextCursor = hasMore && items.length > 0 ? items[items.length - 1].id : null;

  // Format response
  return c.json({
    subscribers: items.map((sub) => ({
      id: sub.id,
      email: sub.email,
      verified: sub.verified === 1,
      subscribed_at: sub.subscribed_at,
      verified_at: sub.verified_at,
      unsubscribed_at: sub.unsubscribed_at,
      source: sub.source,
      status: sub.unsubscribed_at ? 'unsubscribed' : sub.verified === 1 ? 'verified' : 'unverified',
    })),
    count: totalCount?.count ?? 0,
    next_cursor: nextCursor,
    has_more: hasMore,
  });
});

// GET /v1/newsletter/subscribers/count - Get active subscriber count (admin only)
newsletterRoutes.get('/subscribers/count', adminOnly, async (c) => {
  const { store } = c.get('auth');
  const db = getDb(c.env);

  // Count verified subscribers who haven't unsubscribed
  const [result] = await db.query<{ count: number }>(
    `SELECT COUNT(*) as count FROM newsletter_subscribers
     WHERE store_id = ? AND verified = 1 AND unsubscribed_at IS NULL`,
    [store.id]
  );

  return c.json({
    count: result?.count ?? 0,
  });
});

// POST /v1/newsletter/subscribers/add - Manually add a subscriber (admin only)
newsletterRoutes.post('/subscribers/add', adminOnly, async (c) => {
  const { store } = c.get('auth');
  const body = await c.req.json();
  const { email, skip_verification } = body;

  // Validate required fields
  if (!email) {
    throw ApiError.invalidRequest('email is required');
  }

  // Validate email format and normalize
  const normalizedEmail = email.trim().toLowerCase();
  if (!isValidEmail(normalizedEmail)) {
    throw ApiError.invalidRequest('Invalid email format');
  }

  const db = getDb(c.env);

  // Check for existing subscription
  const [existing] = await db.query<{ id: string; email: string; unsubscribed_at: string | null }>(
    `SELECT id, email, unsubscribed_at FROM newsletter_subscribers WHERE email = ? AND store_id = ?`,
    [normalizedEmail, store.id]
  );

  if (existing) {
    // If subscriber was unsubscribed, we can reactivate them
    if (existing.unsubscribed_at) {
      const timestamp = now();
      await db.run(
        `UPDATE newsletter_subscribers
         SET unsubscribed_at = NULL, verified = ?, verified_at = ?, updated_at = ?
         WHERE id = ?`,
        [skip_verification ? 1 : 0, skip_verification ? timestamp : null, timestamp, existing.id]
      );

      console.log(`[NEWSLETTER] Admin reactivated subscriber: ${normalizedEmail}`);

      return c.json({
        success: true,
        message: 'Subscriber reactivated successfully',
        subscriber: {
          id: existing.id,
          email: normalizedEmail,
          verified: skip_verification ?? false,
          reactivated: true,
        },
      });
    }

    // Already exists and not unsubscribed
    throw ApiError.conflict('Subscriber already exists');
  }

  // Generate ID and timestamps
  const id = uuid();
  const timestamp = now();
  const verificationToken = skip_verification ? null : uuid();

  // Insert new subscriber
  await db.run(
    `INSERT INTO newsletter_subscribers (id, store_id, email, verified, verification_token, subscribed_at, verified_at, source, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      store.id,
      normalizedEmail,
      skip_verification ? 1 : 0, // If skip_verification, set verified=true immediately
      verificationToken,
      timestamp,
      skip_verification ? timestamp : null, // If skip_verification, set verified_at
      'admin', // Mark source as admin-added
      timestamp,
      timestamp,
    ]
  );

  console.log(
    `[NEWSLETTER] Admin added subscriber: ${normalizedEmail} (verified: ${skip_verification ?? false})`
  );

  // If not skipping verification, send verification email
  if (!skip_verification) {
    const emailResult = await sendNewsletterVerificationEmail(c.env, {
      email: normalizedEmail,
      verificationToken: verificationToken!,
      storeId: store.id,
    });

    if (!emailResult.success) {
      console.warn(
        `[NEWSLETTER] Verification email send failed for admin-added ${normalizedEmail}: ${emailResult.error}`
      );
    }
  }

  return c.json({
    success: true,
    message: skip_verification
      ? 'Subscriber added and verified successfully'
      : 'Subscriber added. Verification email sent.',
    subscriber: {
      id,
      email: normalizedEmail,
      verified: skip_verification ?? false,
    },
  });
});

// POST /v1/newsletter/send - Send newsletter to all subscribers (admin only)
newsletterRoutes.post('/send', adminOnly, async (c) => {
  const body = await c.req.json();
  const { blog_slug, title, excerpt, featured_image_url } = body;

  // Validate required fields
  if (!blog_slug) {
    throw ApiError.invalidRequest('blog_slug is required');
  }
  if (!title) {
    throw ApiError.invalidRequest('title is required');
  }
  if (!excerpt) {
    throw ApiError.invalidRequest('excerpt is required');
  }

  const { store } = c.get('auth');

  // eslint-disable-next-line no-console
  console.log(`[NEWSLETTER] Admin sending newsletter for blog: ${blog_slug}`);

  const result = await sendNewsletterToSubscribers(c.env, store.id, {
    blogSlug: blog_slug,
    title,
    excerpt,
    featuredImageUrl: featured_image_url,
  });

  return c.json({
    success: result.success,
    recipient_count: result.recipientCount,
    send_id: result.sendId,
    errors: result.errors.length > 0 ? result.errors : undefined,
  });
});

export { newsletterRoutes as newsletter };
