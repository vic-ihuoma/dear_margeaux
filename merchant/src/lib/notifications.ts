/**
 * Email Notification Service
 *
 * Sends email notifications for key events:
 * - Drop launches (to waitlist subscribers)
 * - Order confirmations (to customers)
 * - Shipping updates (to customers)
 *
 * Uses AWS SES for email delivery.
 * All functions are async and non-blocking - email failures don't block the response.
 */

import * as React from 'react';
import {
  DropLaunchEmail,
  OrderConfirmationEmail,
  ShippingUpdateEmail,
  renderEmailTemplate,
  sendEmail,
  type SendEmailOptions,
  type OrderItem as EmailOrderItem,
  type ShippingItem,
} from '@dear-margeaux/email';
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
  ship_to?: string | null; // JSON string of address
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
// HELPER FUNCTIONS
// ============================================================

/**
 * Formats a shipping address from JSON to multiline string
 */
function formatShippingAddress(shipTo: string | null | undefined): string | undefined {
  if (!shipTo) return undefined;

  try {
    const addr = JSON.parse(shipTo);
    const lines = [];
    if (addr.line1) lines.push(addr.line1);
    if (addr.line2) lines.push(addr.line2);
    if (addr.city || addr.state || addr.postal_code) {
      lines.push(`${addr.city || ''}, ${addr.state || ''} ${addr.postal_code || ''}`.trim());
    }
    if (addr.country) lines.push(addr.country);
    return lines.join('\n');
  } catch {
    return undefined;
  }
}

/**
 * Safely sends an email, logging errors but not throwing
 */
async function safeSendEmail(options: SendEmailOptions): Promise<NotificationResult> {
  try {
    const result = await sendEmail(options);
    if (result.success) {
      return { success: true, messageId: result.messageId };
    } else {
      const errorMsg = result.error?.message || 'Unknown error';
      console.error(`Email send failed: ${errorMsg}`);
      return { success: false, error: errorMsg };
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`Email send exception: ${errorMsg}`);
    return { success: false, error: errorMsg };
  }
}

// ============================================================
// NOTIFICATION FUNCTIONS
// ============================================================

/**
 * Send drop launch email to a single subscriber
 */
async function sendDropLaunchToSubscriber(
  email: string,
  drop: DropData,
  subscriberName?: string,
  featuredImageUrl?: string
): Promise<NotificationResult> {
  const config = getStoreConfig();
  const dropUrl = `${config.baseUrl}/shop/${drop.slug}`;
  const unsubscribeUrl = `${config.baseUrl}/unsubscribe?email=${encodeURIComponent(email)}&drop=${drop.id}`;

  const { html, text } = await renderEmailTemplate(
    React.createElement(DropLaunchEmail, {
      subscriberName: subscriberName || 'there',
      dropName: drop.name,
      dropDescription: drop.description || undefined,
      dropUrl,
      featuredImageUrl,
      storeName: config.storeName,
      unsubscribeUrl,
    })
  );

  return safeSendEmail({
    to: email,
    subject: `${drop.name} is now live! Shop before it sells out`,
    html,
    text,
  });
}

/**
 * Send drop launch emails to all waitlist subscribers
 *
 * @param env - Worker environment bindings
 * @param storeId - Store ID
 * @param drop - Drop data
 * @param featuredImageUrl - Optional featured image URL
 * @returns Result with counts of successful/failed sends
 */
export async function sendDropLaunchEmails(
  env: Env,
  storeId: string,
  drop: DropData,
  featuredImageUrl?: string
): Promise<BatchNotificationResult> {
  const db = getDb(env);
  const currentTime = now();

  // Get all active subscribers for this drop
  const subscribers = await db.query<any>(
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
    console.log(`No subscribers to notify for drop ${drop.id}`);
    return result;
  }

  console.log(`Sending drop launch emails to ${subscribers.length} subscribers for ${drop.name}`);

  // Send emails in parallel with rate limiting (10 at a time)
  const batchSize = 10;
  for (let i = 0; i < subscribers.length; i += batchSize) {
    const batch = subscribers.slice(i, i + batchSize);

    const batchResults = await Promise.all(
      batch.map(async (subscriber) => {
        const sendResult = await sendDropLaunchToSubscriber(
          subscriber.email,
          drop,
          undefined, // No subscriber name in current schema
          featuredImageUrl
        );

        // Update notified_at on success
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

  console.log(`Drop launch emails sent: ${result.success} success, ${result.failed} failed`);
  return result;
}

/**
 * Send order confirmation email to customer
 *
 * @param env - Worker environment bindings
 * @param storeId - Store ID
 * @param order - Order data
 * @param items - Order items
 * @returns Result of email send
 */
export async function sendOrderConfirmationEmail(
  env: Env,
  storeId: string,
  order: OrderData,
  items: OrderItemData[]
): Promise<NotificationResult> {
  const config = getStoreConfig();
  const orderUrl = `${config.baseUrl}/account/orders/${order.number}`;

  // Map items to email format
  const emailItems: EmailOrderItem[] = items.map((item) => ({
    title: item.title,
    variantTitle: item.variant_title || undefined,
    quantity: item.qty,
    unitPrice: item.unit_price_cents,
    imageUrl: item.image_url || undefined,
  }));

  const { html, text } = await renderEmailTemplate(
    React.createElement(OrderConfirmationEmail, {
      customerName: order.shipping_name || 'Valued Customer',
      customerEmail: order.customer_email,
      orderNumber: order.number,
      items: emailItems,
      subtotal: order.subtotal_cents,
      shipping: order.shipping_cents,
      tax: order.tax_cents,
      discount: order.discount_amount_cents || 0,
      total: order.total_cents,
      shippingAddress: formatShippingAddress(order.ship_to),
      orderUrl,
      storeName: config.storeName,
      supportEmail: config.supportEmail,
    })
  );

  console.log(
    `Sending order confirmation email to ${order.customer_email} for order ${order.number}`
  );

  return safeSendEmail({
    to: order.customer_email,
    subject: `Order Confirmed - #${order.number}`,
    html,
    text,
  });
}

/**
 * Send shipping update email to customer
 *
 * @param env - Worker environment bindings
 * @param storeId - Store ID
 * @param order - Order data
 * @param items - Order items
 * @param tracking - Tracking information
 * @returns Result of email send
 */
export async function sendShippingUpdateEmail(
  env: Env,
  storeId: string,
  order: OrderData,
  items: OrderItemData[],
  tracking: TrackingInfo
): Promise<NotificationResult> {
  const config = getStoreConfig();
  const orderUrl = `${config.baseUrl}/account/orders/${order.number}`;

  // Map items to shipping email format
  const shippingItems: ShippingItem[] = items.map((item) => ({
    title: item.title,
    variantTitle: item.variant_title || undefined,
    quantity: item.qty,
    imageUrl: item.image_url || undefined,
  }));

  const { html, text } = await renderEmailTemplate(
    React.createElement(ShippingUpdateEmail, {
      customerName: order.shipping_name || 'Valued Customer',
      orderNumber: order.number,
      items: shippingItems,
      trackingNumber: tracking.tracking_number || '',
      trackingUrl: tracking.tracking_url,
      carrier: tracking.carrier,
      estimatedDelivery: tracking.estimated_delivery,
      shippingAddress: formatShippingAddress(order.ship_to),
      orderUrl,
      storeName: config.storeName,
      supportEmail: config.supportEmail,
    })
  );

  console.log(`Sending shipping update email to ${order.customer_email} for order ${order.number}`);

  return safeSendEmail({
    to: order.customer_email,
    subject: `Your Order Has Shipped - #${order.number}`,
    html,
    text,
  });
}

/**
 * Process drops that have become active and send notifications
 * This is intended to be called from a cron job
 *
 * @param env - Worker environment bindings
 * @param ctx - Execution context for async operations
 */
export async function processDropNotifications(env: Env, ctx: ExecutionContext): Promise<void> {
  const db = getDb(env);
  const currentTime = now();

  // Find all stores with drops that just became active
  // Look for drops where:
  // - status is 'scheduled'
  // - start_date has passed (or is now)
  // This query finds drops that need to be activated
  const dropsToActivate = await db.query<any>(
    `SELECT d.*, s.id as store_id
     FROM drops d
     JOIN stores s ON d.store_id = s.id
     WHERE d.status = 'scheduled'
       AND d.start_date IS NOT NULL
       AND d.start_date <= ?`,
    [currentTime]
  );

  for (const drop of dropsToActivate) {
    console.log(`Activating drop ${drop.id} (${drop.name}) for store ${drop.store_id}`);

    // Update drop status to active
    await db.run(`UPDATE drops SET status = 'active', updated_at = ? WHERE id = ?`, [
      currentTime,
      drop.id,
    ]);

    // Get featured image from first product in drop
    let featuredImageUrl: string | undefined;
    const [firstProduct] = await db.query<any>(
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

    // Send notifications asynchronously (non-blocking)
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

  // Also handle drops that should end
  const dropsToEnd = await db.query<any>(
    `SELECT id FROM drops
     WHERE status = 'active'
       AND end_date IS NOT NULL
       AND end_date <= ?`,
    [currentTime]
  );

  if (dropsToEnd.length > 0) {
    const ids = dropsToEnd.map((d: any) => d.id);
    const placeholders = ids.map(() => '?').join(',');
    await db.run(
      `UPDATE drops SET status = 'ended', updated_at = ? WHERE id IN (${placeholders})`,
      [currentTime, ...ids]
    );
    console.log(`Ended ${dropsToEnd.length} drops`);
  }
}
