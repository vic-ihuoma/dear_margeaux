/**
 * Email Notification Service
 *
 * Sends email notifications for key events:
 * - Drop launches (to waitlist subscribers)
 * - Order confirmations (to customers)
 * - Shipping updates (to customers)
 *
 * STATUS: Resend API implementation ready.
 *
 * SETUP REQUIRED:
 * ============================================
 *
 * 1. Sign up at https://resend.com and get an API key (task email-1)
 *
 * 2. Add the secret to Cloudflare (task email-2):
 *    wrangler secret put RESEND_API_KEY
 *
 * 3. Configure sending domain in Resend dashboard (task email-11)
 *
 * If RESEND_API_KEY is not configured, emails will be logged but not sent.
 */

import { getDb } from '../db';
import { now, type Env } from '../types';
import { queueFailedEmail, type EmailType } from './email-queue';
import { checkAndLogRateLimit, incrementUsage } from './email-rate-limiter';

// ============================================================
// TYPES
// ============================================================

export interface OrderData {
  id: string;
  number: string;
  customer_email: string;
  shipping_name?: string | null;
  ship_to?: string | null;
  subtotal_cents: number;
  tax_cents: number;
  shipping_cents: number;
  discount_amount_cents?: number;
  total_cents: number;
}

export interface OrderItemData {
  sku: string;
  title: string;
  qty: number;
  unit_price_cents: number;
  image_url?: string | null;
  variant_title?: string | null;
}

export interface DropData {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
}

export interface TrackingInfo {
  carrier?: string;
  tracking_number?: string;
  tracking_url?: string;
  estimated_delivery?: string;
}

export interface NotificationResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface BatchNotificationResult {
  total: number;
  success: number;
  failed: number;
  errors: string[];
}

// ============================================================
// CONFIGURATION
// ============================================================

const STORE_NAME = 'Dear Margeaux';
const SUPPORT_EMAIL = 'hello@dearmargeaux.com';
const BASE_URL = 'https://dearmargeaux.com';

function getStoreConfig() {
  return {
    storeName: STORE_NAME,
    supportEmail: SUPPORT_EMAIL,
    baseUrl: BASE_URL,
  };
}

/**
 * Escape HTML special characters to prevent XSS attacks
 */
function escapeHtml(text: string): string {
  const htmlEntities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (char) => htmlEntities[char]);
}

// ============================================================
// STUB IMPLEMENTATION (replace with Resend when ready)
// ============================================================

/**
 * Stub: Logs email details instead of sending
 * Replace this with sendEmailViaResend() when Resend is configured
 */
function logEmailStub(
  type: string,
  to: string,
  subject: string,
  details: Record<string, unknown>
): NotificationResult {
  // eslint-disable-next-line no-console
  console.log(`[EMAIL STUB] ${type}`);
  // eslint-disable-next-line no-console
  console.log(`  To: ${to}`);
  // eslint-disable-next-line no-console
  console.log(`  Subject: ${subject}`);
  // eslint-disable-next-line no-console
  console.log(`  Details:`, JSON.stringify(details, null, 2));

  return {
    success: true,
    messageId: `stub-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  };
}

// ============================================================
// NOTIFICATION FUNCTIONS
// ============================================================

async function sendDropLaunchToSubscriber(
  env: Env,
  storeId: string,
  email: string,
  drop: DropData,
  subscriberName?: string,
  featuredImageUrl?: string
): Promise<NotificationResult> {
  const config = getStoreConfig();
  const dropUrl = `${config.baseUrl}/shop/${drop.slug}`;

  const html = buildDropLaunchHtml({
    subscriberName: subscriberName || 'there',
    dropName: drop.name,
    dropDescription: drop.description,
    dropUrl,
    featuredImageUrl,
  });

  return sendEmailViaResend(env, {
    to: email,
    subject: `${drop.name} is now live! Shop before it sells out`,
    html,
    queueOnFailure: {
      storeId,
      emailType: 'drop_launch',
      metadata: { dropId: drop.id, dropName: drop.name },
    },
  });
}

export async function sendDropLaunchEmails(
  env: Env,
  storeId: string,
  drop: DropData,
  featuredImageUrl?: string
): Promise<BatchNotificationResult> {
  const db = getDb(env);
  const currentTime = now();

  const subscribers = await db.query<{ id: string; email: string }>(
    `SELECT id, email FROM waitlist_entries
     WHERE store_id = ? AND drop_id = ? AND unsubscribed = 0 AND notified_at IS NULL`,
    [storeId, drop.id]
  );

  const result: BatchNotificationResult = {
    total: subscribers.length,
    success: 0,
    failed: 0,
    errors: [],
  };

  if (subscribers.length === 0) {
    // eslint-disable-next-line no-console
    console.log(`No subscribers to notify for drop ${drop.id}`);
    return result;
  }

  // eslint-disable-next-line no-console
  console.log(`Sending drop launch emails to ${subscribers.length} subscribers for ${drop.name}`);

  const batchSize = 10;
  for (let i = 0; i < subscribers.length; i += batchSize) {
    const batch = subscribers.slice(i, i + batchSize);

    const batchResults = await Promise.all(
      batch.map(async (subscriber) => {
        const sendResult = await sendDropLaunchToSubscriber(
          env,
          storeId,
          subscriber.email,
          drop,
          undefined,
          featuredImageUrl
        );

        if (sendResult.success) {
          await db.run(`UPDATE waitlist_entries SET notified_at = ?, updated_at = ? WHERE id = ?`, [
            currentTime,
            currentTime,
            subscriber.id,
          ]);
        }

        return { email: subscriber.email, ...sendResult };
      })
    );

    for (const r of batchResults) {
      if (r.success) {
        result.success++;
      } else {
        result.failed++;
        result.errors.push(`${r.email}: ${r.error}`);
      }
    }
  }

  // eslint-disable-next-line no-console
  console.log(`Drop launch emails sent: ${result.success} success, ${result.failed} failed`);
  return result;
}

export async function sendOrderConfirmationEmail(
  env: Env,
  storeId: string,
  order: OrderData,
  items: OrderItemData[]
): Promise<NotificationResult> {
  const config = getStoreConfig();
  const orderUrl = `${config.baseUrl}/account/orders/${order.number}`;
  const customerName = order.shipping_name || 'Valued Customer';

  // eslint-disable-next-line no-console
  console.log(
    `Sending order confirmation email to ${order.customer_email} for order ${order.number}`
  );

  const html = buildOrderConfirmationHtml({
    customerName,
    orderNumber: order.number,
    items,
    subtotal: order.subtotal_cents,
    shipping: order.shipping_cents,
    tax: order.tax_cents,
    discount: order.discount_amount_cents || 0,
    total: order.total_cents,
    orderUrl,
  });

  return sendEmailViaResend(env, {
    to: order.customer_email,
    subject: `Order Confirmed - #${order.number}`,
    html,
    queueOnFailure: {
      storeId,
      emailType: 'order_confirmation',
      metadata: { orderId: order.id, orderNumber: order.number },
    },
  });
}

export async function sendShippingUpdateEmail(
  env: Env,
  storeId: string,
  order: OrderData,
  _items: OrderItemData[],
  tracking: TrackingInfo
): Promise<NotificationResult> {
  const customerName = order.shipping_name || 'Valued Customer';

  // eslint-disable-next-line no-console
  console.log(`Sending shipping update email to ${order.customer_email} for order ${order.number}`);

  const html = buildShippingUpdateHtml({
    customerName,
    orderNumber: order.number,
    trackingNumber: tracking.tracking_number,
    trackingUrl: tracking.tracking_url,
    carrier: tracking.carrier,
    estimatedDelivery: tracking.estimated_delivery,
  });

  return sendEmailViaResend(env, {
    to: order.customer_email,
    subject: `Your Order Has Shipped - #${order.number}`,
    html,
    queueOnFailure: {
      storeId,
      emailType: 'shipping_update',
      metadata: { orderId: order.id, orderNumber: order.number },
    },
  });
}

export async function processDropNotifications(env: Env, ctx: ExecutionContext): Promise<void> {
  const db = getDb(env);
  const currentTime = now();

  const dropsToActivate = await db.query<{
    id: string;
    name: string;
    slug: string;
    description: string | null;
    store_id: string;
  }>(
    `SELECT d.*, s.id as store_id
     FROM drops d
     JOIN stores s ON d.store_id = s.id
     WHERE d.status = 'scheduled'
       AND d.start_date IS NOT NULL
       AND d.start_date <= ?`,
    [currentTime]
  );

  for (const drop of dropsToActivate) {
    // eslint-disable-next-line no-console
    console.log(`Activating drop ${drop.id} (${drop.name}) for store ${drop.store_id}`);

    await db.run(`UPDATE drops SET status = 'active', updated_at = ? WHERE id = ?`, [
      currentTime,
      drop.id,
    ]);

    let featuredImageUrl: string | undefined;
    const [firstProduct] = await db.query<{ image_url: string | null }>(
      `SELECT v.image_url
       FROM products p
       JOIN variants v ON v.product_id = p.id
       WHERE p.drop_id = ? AND v.image_url IS NOT NULL
       LIMIT 1`,
      [drop.id]
    );
    if (firstProduct?.image_url) {
      featuredImageUrl = firstProduct.image_url;
    }

    ctx.waitUntil(
      sendDropLaunchEmails(
        env,
        drop.store_id,
        {
          id: drop.id,
          name: drop.name,
          slug: drop.slug,
          description: drop.description,
        },
        featuredImageUrl
      )
    );
  }

  const dropsToEnd = await db.query<{ id: string }>(
    `SELECT id FROM drops
     WHERE status = 'active'
       AND end_date IS NOT NULL
       AND end_date <= ?`,
    [currentTime]
  );

  if (dropsToEnd.length > 0) {
    const ids = dropsToEnd.map((d) => d.id);
    const placeholders = ids.map(() => '?').join(',');
    await db.run(
      `UPDATE drops SET status = 'ended', updated_at = ? WHERE id IN (${placeholders})`,
      [currentTime, ...ids]
    );
    // eslint-disable-next-line no-console
    console.log(`Ended ${dropsToEnd.length} drops`);
  }
}

// ============================================================
// RESEND API IMPLEMENTATION
// ============================================================

interface ResendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
  // Queue options for retry mechanism
  queueOnFailure?: {
    storeId: string;
    emailType: EmailType;
    metadata?: Record<string, unknown>;
  };
}

interface ResendResponse {
  id?: string;
  error?: { message: string; name: string };
}

async function sendEmailViaResend(
  env: Env,
  options: ResendEmailOptions
): Promise<NotificationResult> {
  const fromEmail = options.from || 'Dear Margeaux <orders@dearmargeaux.com>';

  // Check if Resend API key is configured
  if (!env.RESEND_API_KEY) {
    console.warn('[EMAIL] RESEND_API_KEY not configured, using stub');
    return logEmailStub('RESEND_FALLBACK', String(options.to), options.subject, {
      html: options.html.substring(0, 200) + '...',
    });
  }

  const db = getDb(env);
  const recipient = Array.isArray(options.to) ? options.to[0] : options.to;

  // Check rate limit before sending (only if storeId is available)
  if (options.queueOnFailure?.storeId) {
    const rateLimitResult = await checkAndLogRateLimit(
      db,
      options.queueOnFailure.storeId,
      options.queueOnFailure.emailType,
      recipient
    );

    if (!rateLimitResult.allowed) {
      // eslint-disable-next-line no-console
      console.error(`[EMAIL] Rate limit exceeded for store ${options.queueOnFailure.storeId}`);
      return {
        success: false,
        error: rateLimitResult.error,
      };
    }
  }

  let result: NotificationResult;

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
        reply_to: options.replyTo || 'hello@dearmargeaux.com',
      }),
    });

    const data: ResendResponse = await response.json();

    if (!response.ok || data.error) {
      console.error('Resend API error:', data.error);
      result = {
        success: false,
        error: data.error?.message || 'Unknown Resend error',
      };
    } else {
      // Increment usage counter after successful send
      if (options.queueOnFailure?.storeId) {
        await incrementUsage(db, options.queueOnFailure.storeId);
      }
      return {
        success: true,
        messageId: data.id,
      };
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('Resend send exception:', errorMsg);
    result = { success: false, error: errorMsg };
  }

  // Queue failed email for retry if options provided
  if (!result.success && options.queueOnFailure) {
    await queueFailedEmail(db, {
      storeId: options.queueOnFailure.storeId,
      emailType: options.queueOnFailure.emailType,
      recipient,
      subject: options.subject,
      html: options.html,
      metadata: options.queueOnFailure.metadata,
      error: result.error || 'Unknown error',
    });
  }

  return result;
}

// ============================================================
// HTML EMAIL TEMPLATES
// ============================================================

function buildOrderConfirmationHtml(data: {
  customerName: string;
  orderNumber: string;
  items: OrderItemData[];
  subtotal: number;
  shipping: number;
  tax: number;
  discount: number;
  total: number;
  orderUrl: string;
}): string {
  const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  const itemsHtml = data.items
    .map(
      (item) => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #eee;">
        ${item.title}${item.variant_title ? ` - ${item.variant_title}` : ''}
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">
        ${item.qty}
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">
        ${formatPrice(item.unit_price_cents * item.qty)}
      </td>
    </tr>
  `
    )
    .join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: 'Inter', -apple-system, sans-serif; background: #fafafa; padding: 40px 20px;">
      <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden;">
        <div style="background: #8B4513; color: white; padding: 32px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">Thank you for your order!</h1>
        </div>
        <div style="padding: 32px;">
          <p style="color: #333; font-size: 16px;">Hi ${data.customerName},</p>
          <p style="color: #666;">Your order <strong>#${data.orderNumber}</strong> has been confirmed.</p>

          <table style="width: 100%; border-collapse: collapse; margin: 24px 0;">
            <thead>
              <tr style="background: #f5f5f5;">
                <th style="padding: 12px; text-align: left;">Item</th>
                <th style="padding: 12px; text-align: center;">Qty</th>
                <th style="padding: 12px; text-align: right;">Price</th>
              </tr>
            </thead>
            <tbody>${itemsHtml}</tbody>
          </table>

          <div style="border-top: 2px solid #eee; padding-top: 16px;">
            <p style="display: flex; justify-content: space-between; margin: 8px 0;">
              <span>Subtotal:</span> <span>${formatPrice(data.subtotal)}</span>
            </p>
            <p style="display: flex; justify-content: space-between; margin: 8px 0;">
              <span>Shipping:</span> <span>${formatPrice(data.shipping)}</span>
            </p>
            <p style="display: flex; justify-content: space-between; margin: 8px 0;">
              <span>Tax:</span> <span>${formatPrice(data.tax)}</span>
            </p>
            ${
              data.discount > 0
                ? `
            <p style="display: flex; justify-content: space-between; margin: 8px 0; color: #16a34a;">
              <span>Discount:</span> <span>-${formatPrice(data.discount)}</span>
            </p>
            `
                : ''
            }
            <p style="display: flex; justify-content: space-between; margin: 16px 0 0; font-size: 18px; font-weight: bold;">
              <span>Total:</span> <span>${formatPrice(data.total)}</span>
            </p>
          </div>

          <a href="${data.orderUrl}" style="display: block; background: #8B4513; color: white; text-align: center; padding: 16px; border-radius: 6px; text-decoration: none; margin-top: 24px;">
            View Order Details
          </a>
        </div>
        <div style="background: #f5f5f5; padding: 24px; text-align: center; color: #666; font-size: 14px;">
          <p style="margin: 0;">Dear Margeaux</p>
          <p style="margin: 8px 0 0;">Questions? Reply to this email or contact hello@dearmargeaux.com</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function buildShippingUpdateHtml(data: {
  customerName: string;
  orderNumber: string;
  trackingNumber?: string;
  trackingUrl?: string;
  carrier?: string;
  estimatedDelivery?: string;
}): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: 'Inter', -apple-system, sans-serif; background: #fafafa; padding: 40px 20px;">
      <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden;">
        <div style="background: #8B4513; color: white; padding: 32px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">Your order has shipped!</h1>
        </div>
        <div style="padding: 32px;">
          <p style="color: #333; font-size: 16px;">Hi ${data.customerName},</p>
          <p style="color: #666;">Great news! Your order <strong>#${data.orderNumber}</strong> is on its way.</p>

          <div style="background: #f5f5f5; border-radius: 8px; padding: 24px; margin: 24px 0;">
            ${data.carrier ? `<p style="margin: 0 0 8px;"><strong>Carrier:</strong> ${data.carrier}</p>` : ''}
            ${data.trackingNumber ? `<p style="margin: 0 0 8px;"><strong>Tracking:</strong> ${data.trackingNumber}</p>` : ''}
            ${data.estimatedDelivery ? `<p style="margin: 0;"><strong>Estimated Delivery:</strong> ${data.estimatedDelivery}</p>` : ''}
          </div>

          ${
            data.trackingUrl
              ? `
          <a href="${data.trackingUrl}" style="display: block; background: #8B4513; color: white; text-align: center; padding: 16px; border-radius: 6px; text-decoration: none;">
            Track Your Package
          </a>
          `
              : ''
          }
        </div>
        <div style="background: #f5f5f5; padding: 24px; text-align: center; color: #666; font-size: 14px;">
          <p style="margin: 0;">Dear Margeaux</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function buildDropLaunchHtml(data: {
  subscriberName: string;
  dropName: string;
  dropDescription?: string | null;
  dropUrl: string;
  featuredImageUrl?: string;
}): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: 'Inter', -apple-system, sans-serif; background: #fafafa; padding: 40px 20px;">
      <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden;">
        <div style="background: #E2725B; color: white; padding: 32px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">${data.dropName} is NOW LIVE!</h1>
        </div>
        ${
          data.featuredImageUrl
            ? `
        <img src="${data.featuredImageUrl}" alt="${data.dropName}" style="width: 100%; height: auto;">
        `
            : ''
        }
        <div style="padding: 32px;">
          <p style="color: #333; font-size: 16px;">Hey ${data.subscriberName},</p>
          <p style="color: #666;">The wait is over! ${data.dropName} is now available.</p>
          ${data.dropDescription ? `<p style="color: #666;">${data.dropDescription}</p>` : ''}
          <p style="color: #666; font-weight: bold;">Shop now before it sells out!</p>

          <a href="${data.dropUrl}" style="display: block; background: #E2725B; color: white; text-align: center; padding: 16px; border-radius: 6px; text-decoration: none; margin-top: 24px; font-weight: bold;">
            SHOP THE DROP
          </a>
        </div>
        <div style="background: #f5f5f5; padding: 24px; text-align: center; color: #666; font-size: 14px;">
          <p style="margin: 0;">Dear Margeaux</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Build HTML email for newsletter (blog post to subscribers)
 * Used when publishing a blog post with the "send as newsletter" option
 */
function buildNewsletterEmailHtml(data: {
  title: string;
  excerpt: string;
  blogUrl: string;
  unsubscribeUrl: string;
  featuredImageUrl?: string;
  featuredImageAlt?: string;
}): string {
  const config = getStoreConfig();
  const safeTitle = escapeHtml(data.title);
  const safeExcerpt = escapeHtml(data.excerpt);
  const safeAlt = data.featuredImageAlt ? escapeHtml(data.featuredImageAlt) : safeTitle;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${safeTitle}</title>
    </head>
    <body style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #fafafa; padding: 0; margin: 0;">
      <!-- Hidden preheader text for email clients -->
      <div style="display: none; max-height: 0; overflow: hidden;">
        ${safeExcerpt}
      </div>

      <div style="max-width: 600px; margin: 0 auto; background: white;">
        <!-- Header with logo -->
        <div style="background: #8B4513; color: white; padding: 24px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px; font-weight: 600; letter-spacing: 1px;">${config.storeName}</h1>
        </div>

        <!-- Featured Image -->
        ${
          data.featuredImageUrl
            ? `
        <img src="${data.featuredImageUrl}" alt="${safeAlt}" style="width: 100%; height: auto; display: block;">
        `
            : ''
        }

        <!-- Content -->
        <div style="padding: 32px;">
          <h2 style="color: #333; font-size: 22px; font-weight: 600; margin: 0 0 16px; line-height: 1.3;">
            ${safeTitle}
          </h2>

          <p style="color: #666; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
            ${safeExcerpt}
          </p>

          <a href="${data.blogUrl}" style="display: inline-block; background: #E2725B; color: white; text-align: center; padding: 14px 32px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 16px;">
            Read More
          </a>
        </div>

        <!-- Footer -->
        <div style="background: #f5f5f5; padding: 24px; text-align: center; color: #666; font-size: 14px;">
          <p style="margin: 0 0 8px; font-weight: 500;">${config.storeName}</p>
          <p style="margin: 0 0 12px;">
            Questions? Contact <a href="mailto:${config.supportEmail}" style="color: #8B4513;">${config.supportEmail}</a>
          </p>
          <p style="margin: 0;">
            <a href="${data.unsubscribeUrl}" style="color: #999; text-decoration: underline;">Unsubscribe</a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function buildNewsletterVerificationHtml(data: {
  verificationUrl: string;
  unsubscribeUrl?: string;
}): string {
  const config = getStoreConfig();

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: 'Inter', -apple-system, sans-serif; background: #fafafa; padding: 40px 20px;">
      <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden;">
        <div style="background: #8B4513; color: white; padding: 32px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">Confirm Your Subscription</h1>
        </div>
        <div style="padding: 32px;">
          <p style="color: #333; font-size: 16px;">Welcome to ${config.storeName}!</p>
          <p style="color: #666; line-height: 1.6;">
            Thank you for signing up for our newsletter. Please confirm your subscription
            by clicking the button below.
          </p>
          <p style="color: #666; line-height: 1.6;">
            Once confirmed, you'll receive updates about new collections, exclusive drops,
            and behind-the-scenes content.
          </p>

          <a href="${data.verificationUrl}" style="display: block; background: #E2725B; color: white; text-align: center; padding: 16px; border-radius: 6px; text-decoration: none; margin-top: 24px; font-weight: bold;">
            Confirm Subscription
          </a>

          <p style="color: #999; font-size: 14px; margin-top: 24px; text-align: center;">
            This link will expire in 24 hours.
          </p>

          <p style="color: #999; font-size: 14px; margin-top: 16px; line-height: 1.5;">
            If you didn't request this email, you can safely ignore it. You won't be
            subscribed unless you click the confirmation button above.
          </p>
        </div>
        <div style="background: #f5f5f5; padding: 24px; text-align: center; color: #666; font-size: 14px;">
          <p style="margin: 0;">${config.storeName}</p>
          <p style="margin: 8px 0 0;">Questions? Contact ${config.supportEmail}</p>
          ${
            data.unsubscribeUrl
              ? `<p style="margin: 8px 0 0;"><a href="${data.unsubscribeUrl}" style="color: #999;">Unsubscribe</a></p>`
              : ''
          }
        </div>
      </div>
    </body>
    </html>
  `;
}

// ============================================================
// NEWSLETTER SEND TO SUBSCRIBERS
// ============================================================

export interface NewsletterData {
  blogSlug: string;
  title: string;
  excerpt: string;
  featuredImageUrl?: string;
}

export interface SendNewsletterResult {
  success: boolean;
  recipientCount: number;
  sendId?: string;
  errors: string[];
}

/**
 * Send a newsletter to all verified subscribers
 *
 * @param env - The environment with RESEND_API_KEY
 * @param storeId - The store ID
 * @param newsletter - Newsletter data (blog post info)
 * @returns SendNewsletterResult with recipient count and any errors
 */
export async function sendNewsletterToSubscribers(
  env: Env,
  storeId: string,
  newsletter: NewsletterData
): Promise<SendNewsletterResult> {
  const db = getDb(env);
  const config = getStoreConfig();
  const currentTime = now();

  // Fetch all verified, non-unsubscribed subscribers
  const subscribers = await db.query<{ id: string; email: string }>(
    `SELECT id, email FROM newsletter_subscribers
     WHERE store_id = ? AND verified = 1 AND unsubscribed_at IS NULL`,
    [storeId]
  );

  const result: SendNewsletterResult = {
    success: true,
    recipientCount: 0,
    errors: [],
  };

  if (subscribers.length === 0) {
    // eslint-disable-next-line no-console
    console.log(`[NEWSLETTER] No subscribers to send to for blog ${newsletter.blogSlug}`);
    return result;
  }

  // eslint-disable-next-line no-console
  console.log(`[NEWSLETTER] Sending "${newsletter.title}" to ${subscribers.length} subscribers`);

  const blogUrl = `${config.baseUrl}/blog/${newsletter.blogSlug}`;

  // Send in batches of 10 to respect rate limits
  const batchSize = 10;
  let successCount = 0;

  for (let i = 0; i < subscribers.length; i += batchSize) {
    const batch = subscribers.slice(i, i + batchSize);

    const batchResults = await Promise.all(
      batch.map(async (subscriber) => {
        // Generate unsubscribe URL for this subscriber
        const unsubscribeUrl = `${config.baseUrl}/newsletter/unsubscribe?email=${encodeURIComponent(subscriber.email)}&token=unsub-${subscriber.id}`;

        const html = buildNewsletterEmailHtml({
          title: newsletter.title,
          excerpt: newsletter.excerpt,
          blogUrl,
          unsubscribeUrl,
          featuredImageUrl: newsletter.featuredImageUrl,
        });

        const sendResult = await sendEmailViaResend(env, {
          to: subscriber.email,
          subject: newsletter.title,
          html,
          queueOnFailure: {
            storeId,
            emailType: 'newsletter',
            metadata: { blogSlug: newsletter.blogSlug, title: newsletter.title },
          },
        });

        return { email: subscriber.email, ...sendResult };
      })
    );

    for (const r of batchResults) {
      if (r.success) {
        successCount++;
      } else {
        result.errors.push(`${r.email}: ${r.error}`);
      }
    }
  }

  result.recipientCount = successCount;

  // Record the send in newsletter_sends table
  const sendId = `ns_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  await db.run(
    `INSERT INTO newsletter_sends (id, store_id, blog_slug, subject, sent_at, recipient_count, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [sendId, storeId, newsletter.blogSlug, newsletter.title, currentTime, successCount, currentTime]
  );

  result.sendId = sendId;

  // eslint-disable-next-line no-console
  console.log(
    `[NEWSLETTER] Send complete: ${successCount}/${subscribers.length} successful, ${result.errors.length} failed`
  );

  if (result.errors.length > 0) {
    result.success = false;
  }

  return result;
}

// ============================================================
// NEWSLETTER VERIFICATION EMAIL
// ============================================================

export interface SendNewsletterVerificationParams {
  email: string;
  verificationToken: string;
  storeId: string;
}

/**
 * Send a newsletter verification email to a new subscriber
 *
 * @param env - The environment with RESEND_API_KEY
 * @param params - Parameters for the verification email
 * @returns NotificationResult indicating success or failure
 */
export async function sendNewsletterVerificationEmail(
  env: Env,
  params: SendNewsletterVerificationParams
): Promise<NotificationResult> {
  const config = getStoreConfig();

  // Build verification URL
  const verificationUrl = `${config.baseUrl}/newsletter/verify?token=${params.verificationToken}`;

  // Build unsubscribe URL using the verification token for security
  const unsubscribeUrl = `${config.baseUrl}/newsletter/unsubscribe?email=${encodeURIComponent(params.email)}&token=${params.verificationToken}`;

  // eslint-disable-next-line no-console
  console.log(`[EMAIL] Sending newsletter verification to ${params.email}`);

  const html = buildNewsletterVerificationHtml({
    verificationUrl,
    unsubscribeUrl,
  });

  return sendEmailViaResend(env, {
    to: params.email,
    subject: `Confirm your subscription to ${config.storeName}`,
    html,
    queueOnFailure: {
      storeId: params.storeId,
      emailType: 'newsletter_verification',
      metadata: { email: params.email },
    },
  });
}

// Export for testing
export {
  sendEmailViaResend,
  buildOrderConfirmationHtml,
  buildShippingUpdateHtml,
  buildDropLaunchHtml,
  buildNewsletterVerificationHtml,
  buildNewsletterEmailHtml,
};
