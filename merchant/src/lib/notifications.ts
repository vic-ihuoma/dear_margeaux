/**
 * Email Notification Service
 *
 * Sends email notifications for key events:
 * - Drop launches (to waitlist subscribers)
 * - Order confirmations (to customers)
 * - Shipping updates (to customers)
 *
 * STATUS: Currently stubbed - emails are logged but not sent.
 *
 * TODO: Implement Resend API for email delivery
 * ============================================
 *
 * 1. Sign up at https://resend.com and get an API key
 *
 * 2. Add the secret to Cloudflare:
 *    wrangler secret put RESEND_API_KEY
 *
 * 3. Add to wrangler.jsonc bindings (for type safety):
 *    [vars]
 *    # RESEND_API_KEY is set via `wrangler secret put`
 *
 * 4. Update Env type in types.ts:
 *    RESEND_API_KEY: string;
 *
 * 5. Uncomment the Resend implementation below and remove the stub
 */

import { getDb } from '../db';
import { now, type Env } from '../types';

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
  email: string,
  drop: DropData,
  subscriberName?: string,
  featuredImageUrl?: string
): Promise<NotificationResult> {
  const config = getStoreConfig();
  const dropUrl = `${config.baseUrl}/shop/${drop.slug}`;

  return logEmailStub('DROP_LAUNCH', email, `${drop.name} is now live! Shop before it sells out`, {
    subscriberName: subscriberName || 'there',
    dropName: drop.name,
    dropDescription: drop.description,
    dropUrl,
    featuredImageUrl,
    storeName: config.storeName,
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
  _env: Env,
  _storeId: string,
  order: OrderData,
  items: OrderItemData[]
): Promise<NotificationResult> {
  const config = getStoreConfig();
  const orderUrl = `${config.baseUrl}/account/orders/${order.number}`;

  // eslint-disable-next-line no-console
  console.log(
    `Sending order confirmation email to ${order.customer_email} for order ${order.number}`
  );

  return logEmailStub(
    'ORDER_CONFIRMATION',
    order.customer_email,
    `Order Confirmed - #${order.number}`,
    {
      customerName: order.shipping_name || 'Valued Customer',
      orderNumber: order.number,
      itemCount: items.length,
      subtotal: order.subtotal_cents,
      shipping: order.shipping_cents,
      tax: order.tax_cents,
      discount: order.discount_amount_cents || 0,
      total: order.total_cents,
      orderUrl,
      storeName: config.storeName,
      supportEmail: config.supportEmail,
    }
  );
}

export async function sendShippingUpdateEmail(
  _env: Env,
  _storeId: string,
  order: OrderData,
  items: OrderItemData[],
  tracking: TrackingInfo
): Promise<NotificationResult> {
  const config = getStoreConfig();
  const orderUrl = `${config.baseUrl}/account/orders/${order.number}`;

  // eslint-disable-next-line no-console
  console.log(`Sending shipping update email to ${order.customer_email} for order ${order.number}`);

  return logEmailStub(
    'SHIPPING_UPDATE',
    order.customer_email,
    `Your Order Has Shipped - #${order.number}`,
    {
      customerName: order.shipping_name || 'Valued Customer',
      orderNumber: order.number,
      itemCount: items.length,
      trackingNumber: tracking.tracking_number,
      trackingUrl: tracking.tracking_url,
      carrier: tracking.carrier,
      estimatedDelivery: tracking.estimated_delivery,
      orderUrl,
      storeName: config.storeName,
      supportEmail: config.supportEmail,
    }
  );
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

/*
 * ============================================
 * RESEND API IMPLEMENTATION (uncomment when ready):
 * ============================================
 *
 * interface ResendEmailOptions {
 *   to: string | string[];
 *   subject: string;
 *   html: string;
 *   text?: string;
 *   from?: string;
 *   replyTo?: string;
 * }
 *
 * interface ResendResponse {
 *   id?: string;
 *   error?: { message: string; name: string };
 * }
 *
 * async function sendEmailViaResend(
 *   env: Env,
 *   options: ResendEmailOptions
 * ): Promise<NotificationResult> {
 *   const fromEmail = options.from || 'Dear Margeaux <orders@dearmargeaux.com>';
 *
 *   try {
 *     const response = await fetch('https://api.resend.com/emails', {
 *       method: 'POST',
 *       headers: {
 *         'Authorization': `Bearer ${env.RESEND_API_KEY}`,
 *         'Content-Type': 'application/json',
 *       },
 *       body: JSON.stringify({
 *         from: fromEmail,
 *         to: options.to,
 *         subject: options.subject,
 *         html: options.html,
 *         text: options.text,
 *         reply_to: options.replyTo || 'hello@dearmargeaux.com',
 *       }),
 *     });
 *
 *     const data: ResendResponse = await response.json();
 *
 *     if (!response.ok || data.error) {
 *       console.error('Resend API error:', data.error);
 *       return {
 *         success: false,
 *         error: data.error?.message || 'Unknown Resend error',
 *       };
 *     }
 *
 *     return {
 *       success: true,
 *       messageId: data.id,
 *     };
 *   } catch (error) {
 *     const errorMsg = error instanceof Error ? error.message : String(error);
 *     console.error('Resend send exception:', errorMsg);
 *     return { success: false, error: errorMsg };
 *   }
 * }
 *
 * // HTML Email Templates (inline, no React dependency)
 * // These can be enhanced with better styling as needed
 *
 * function buildOrderConfirmationHtml(data: {
 *   customerName: string;
 *   orderNumber: string;
 *   items: OrderItemData[];
 *   subtotal: number;
 *   shipping: number;
 *   tax: number;
 *   discount: number;
 *   total: number;
 *   orderUrl: string;
 * }): string {
 *   const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`;
 *
 *   const itemsHtml = data.items.map(item => `
 *     <tr>
 *       <td style="padding: 12px; border-bottom: 1px solid #eee;">
 *         ${item.title}${item.variant_title ? ` - ${item.variant_title}` : ''}
 *       </td>
 *       <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">
 *         ${item.qty}
 *       </td>
 *       <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">
 *         ${formatPrice(item.unit_price_cents * item.qty)}
 *       </td>
 *     </tr>
 *   `).join('');
 *
 *   return `
 *     <!DOCTYPE html>
 *     <html>
 *     <head>
 *       <meta charset="utf-8">
 *       <meta name="viewport" content="width=device-width, initial-scale=1.0">
 *     </head>
 *     <body style="font-family: 'Inter', -apple-system, sans-serif; background: #fafafa; padding: 40px 20px;">
 *       <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden;">
 *         <div style="background: #8B4513; color: white; padding: 32px; text-align: center;">
 *           <h1 style="margin: 0; font-size: 24px;">Thank you for your order!</h1>
 *         </div>
 *         <div style="padding: 32px;">
 *           <p style="color: #333; font-size: 16px;">Hi ${data.customerName},</p>
 *           <p style="color: #666;">Your order <strong>#${data.orderNumber}</strong> has been confirmed.</p>
 *
 *           <table style="width: 100%; border-collapse: collapse; margin: 24px 0;">
 *             <thead>
 *               <tr style="background: #f5f5f5;">
 *                 <th style="padding: 12px; text-align: left;">Item</th>
 *                 <th style="padding: 12px; text-align: center;">Qty</th>
 *                 <th style="padding: 12px; text-align: right;">Price</th>
 *               </tr>
 *             </thead>
 *             <tbody>${itemsHtml}</tbody>
 *           </table>
 *
 *           <div style="border-top: 2px solid #eee; padding-top: 16px;">
 *             <p style="display: flex; justify-content: space-between; margin: 8px 0;">
 *               <span>Subtotal:</span> <span>${formatPrice(data.subtotal)}</span>
 *             </p>
 *             <p style="display: flex; justify-content: space-between; margin: 8px 0;">
 *               <span>Shipping:</span> <span>${formatPrice(data.shipping)}</span>
 *             </p>
 *             <p style="display: flex; justify-content: space-between; margin: 8px 0;">
 *               <span>Tax:</span> <span>${formatPrice(data.tax)}</span>
 *             </p>
 *             ${data.discount > 0 ? `
 *             <p style="display: flex; justify-content: space-between; margin: 8px 0; color: #16a34a;">
 *               <span>Discount:</span> <span>-${formatPrice(data.discount)}</span>
 *             </p>
 *             ` : ''}
 *             <p style="display: flex; justify-content: space-between; margin: 16px 0 0; font-size: 18px; font-weight: bold;">
 *               <span>Total:</span> <span>${formatPrice(data.total)}</span>
 *             </p>
 *           </div>
 *
 *           <a href="${data.orderUrl}" style="display: block; background: #8B4513; color: white; text-align: center; padding: 16px; border-radius: 6px; text-decoration: none; margin-top: 24px;">
 *             View Order Details
 *           </a>
 *         </div>
 *         <div style="background: #f5f5f5; padding: 24px; text-align: center; color: #666; font-size: 14px;">
 *           <p style="margin: 0;">Dear Margeaux</p>
 *           <p style="margin: 8px 0 0;">Questions? Reply to this email or contact hello@dearmargeaux.com</p>
 *         </div>
 *       </div>
 *     </body>
 *     </html>
 *   `;
 * }
 *
 * function buildShippingUpdateHtml(data: {
 *   customerName: string;
 *   orderNumber: string;
 *   trackingNumber?: string;
 *   trackingUrl?: string;
 *   carrier?: string;
 *   estimatedDelivery?: string;
 * }): string {
 *   return `
 *     <!DOCTYPE html>
 *     <html>
 *     <head>
 *       <meta charset="utf-8">
 *       <meta name="viewport" content="width=device-width, initial-scale=1.0">
 *     </head>
 *     <body style="font-family: 'Inter', -apple-system, sans-serif; background: #fafafa; padding: 40px 20px;">
 *       <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden;">
 *         <div style="background: #8B4513; color: white; padding: 32px; text-align: center;">
 *           <h1 style="margin: 0; font-size: 24px;">Your order has shipped! 📦</h1>
 *         </div>
 *         <div style="padding: 32px;">
 *           <p style="color: #333; font-size: 16px;">Hi ${data.customerName},</p>
 *           <p style="color: #666;">Great news! Your order <strong>#${data.orderNumber}</strong> is on its way.</p>
 *
 *           <div style="background: #f5f5f5; border-radius: 8px; padding: 24px; margin: 24px 0;">
 *             ${data.carrier ? `<p style="margin: 0 0 8px;"><strong>Carrier:</strong> ${data.carrier}</p>` : ''}
 *             ${data.trackingNumber ? `<p style="margin: 0 0 8px;"><strong>Tracking:</strong> ${data.trackingNumber}</p>` : ''}
 *             ${data.estimatedDelivery ? `<p style="margin: 0;"><strong>Estimated Delivery:</strong> ${data.estimatedDelivery}</p>` : ''}
 *           </div>
 *
 *           ${data.trackingUrl ? `
 *           <a href="${data.trackingUrl}" style="display: block; background: #8B4513; color: white; text-align: center; padding: 16px; border-radius: 6px; text-decoration: none;">
 *             Track Your Package
 *           </a>
 *           ` : ''}
 *         </div>
 *         <div style="background: #f5f5f5; padding: 24px; text-align: center; color: #666; font-size: 14px;">
 *           <p style="margin: 0;">Dear Margeaux</p>
 *         </div>
 *       </div>
 *     </body>
 *     </html>
 *   `;
 * }
 *
 * function buildDropLaunchHtml(data: {
 *   subscriberName: string;
 *   dropName: string;
 *   dropDescription?: string | null;
 *   dropUrl: string;
 *   featuredImageUrl?: string;
 * }): string {
 *   return `
 *     <!DOCTYPE html>
 *     <html>
 *     <head>
 *       <meta charset="utf-8">
 *       <meta name="viewport" content="width=device-width, initial-scale=1.0">
 *     </head>
 *     <body style="font-family: 'Inter', -apple-system, sans-serif; background: #fafafa; padding: 40px 20px;">
 *       <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden;">
 *         <div style="background: #E2725B; color: white; padding: 32px; text-align: center;">
 *           <h1 style="margin: 0; font-size: 24px;">${data.dropName} is NOW LIVE! 🎉</h1>
 *         </div>
 *         ${data.featuredImageUrl ? `
 *         <img src="${data.featuredImageUrl}" alt="${data.dropName}" style="width: 100%; height: auto;">
 *         ` : ''}
 *         <div style="padding: 32px;">
 *           <p style="color: #333; font-size: 16px;">Hey ${data.subscriberName},</p>
 *           <p style="color: #666;">The wait is over! ${data.dropName} is now available.</p>
 *           ${data.dropDescription ? `<p style="color: #666;">${data.dropDescription}</p>` : ''}
 *           <p style="color: #666; font-weight: bold;">Shop now before it sells out!</p>
 *
 *           <a href="${data.dropUrl}" style="display: block; background: #E2725B; color: white; text-align: center; padding: 16px; border-radius: 6px; text-decoration: none; margin-top: 24px; font-weight: bold;">
 *             SHOP THE DROP
 *           </a>
 *         </div>
 *         <div style="background: #f5f5f5; padding: 24px; text-align: center; color: #666; font-size: 14px;">
 *           <p style="margin: 0;">Dear Margeaux</p>
 *         </div>
 *       </div>
 *     </body>
 *     </html>
 *   `;
 * }
 *
 * ============================================
 * END RESEND IMPLEMENTATION
 * ============================================
 */
