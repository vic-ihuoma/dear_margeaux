import { Hono } from 'hono';
import Stripe from 'stripe';
import { getDb } from '../db';
import { authMiddleware, adminOnly } from '../middleware/auth';
import { ApiError, uuid, now, generateOrderNumber, type Env, type AuthContext } from '../types';
import { validateDiscount, calculateDiscount, type Discount } from './discounts';
import { dispatchWebhooks, type WebhookEventType } from '../lib/webhooks';
import { sendShippingUpdateEmail } from '../lib/notifications';
import { isValidISODate } from '../lib/validation';

// ============================================================
// DATABASE ROW TYPES
// ============================================================

interface OrderRow {
  id: string;
  store_id: string;
  customer_id: string | null;
  number: string;
  status: string;
  customer_email: string;
  shipping_name: string | null;
  shipping_phone: string | null;
  ship_to: string | null;
  subtotal_cents: number;
  tax_cents: number;
  shipping_cents: number;
  discount_code: string | null;
  discount_id: string | null;
  discount_amount_cents: number | null;
  total_cents: number;
  currency: string;
  tracking_number: string | null;
  tracking_url: string | null;
  shipped_at: string | null;
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;
  created_at: string;
}

interface OrderItemRow {
  id: string;
  order_id: string;
  sku: string;
  title: string;
  qty: number;
  unit_price_cents: number;
}

interface VariantRow {
  id: string;
  store_id: string;
  product_id: string;
  sku: string;
  title: string;
  price_cents: number;
  compare_at_cents: number | null;
  image_url: string | null;
}

interface InventoryRow {
  id: string;
  store_id: string;
  sku: string;
  on_hand: number;
  reserved: number;
}

interface CustomerRow {
  id: string;
  store_id: string;
  email: string;
  order_count: number;
  total_spent_cents: number;
  last_order_at: string | null;
}

interface DiscountUsageRow {
  id: string;
  discount_id: string;
  order_id: string;
  customer_email: string;
  discount_amount_cents: number;
  count?: number;
}

// ============================================================
// ORDER ROUTES
// ============================================================

const ordersRoutes = new Hono<{
  Bindings: Env;
  Variables: { auth: AuthContext };
}>();

ordersRoutes.use('*', authMiddleware, adminOnly);

// GET /v1/orders
ordersRoutes.get('/', async (c) => {
  const { store } = c.get('auth');
  const db = getDb(c.env);

  // Pagination params
  const limit = Math.min(parseInt(c.req.query('limit') || '20'), 100);
  const cursor = c.req.query('cursor');
  const status = c.req.query('status'); // Filter by status
  const email = c.req.query('email'); // Filter by customer email
  const startDate = c.req.query('start_date'); // Filter by start date (inclusive)
  const endDate = c.req.query('end_date'); // Filter by end date (inclusive)

  // Build query
  let query = `SELECT * FROM orders WHERE store_id = ?`;
  const params: unknown[] = [store.id];

  if (status) {
    const validStatuses = [
      'pending',
      'paid',
      'processing',
      'shipped',
      'delivered',
      'refunded',
      'canceled',
    ];
    if (!validStatuses.includes(status)) {
      throw ApiError.invalidRequest(`status must be one of: ${validStatuses.join(', ')}`);
    }
    query += ` AND status = ?`;
    params.push(status);
  }

  if (email) {
    query += ` AND customer_email = ?`;
    params.push(email);
  }

  // Validate and apply date filters
  if (startDate) {
    if (!isValidISODate(startDate)) {
      throw ApiError.invalidRequest('start_date must be a valid ISO 8601 date');
    }
    query += ` AND created_at >= ?`;
    params.push(startDate);
  }

  if (endDate) {
    if (!isValidISODate(endDate)) {
      throw ApiError.invalidRequest('end_date must be a valid ISO 8601 date');
    }
    query += ` AND created_at <= ?`;
    params.push(endDate);
  }

  if (cursor) {
    query += ` AND created_at < ?`;
    params.push(cursor);
  }

  query += ` ORDER BY created_at DESC LIMIT ?`;
  params.push(limit + 1); // Fetch one extra to check for next page

  const orderList = await db.query<OrderRow>(query, params);

  // Check if there's a next page
  const hasMore = orderList.length > limit;
  if (hasMore) orderList.pop();

  // Batch fetch all order items (avoids N+1 query)
  const orderIds = orderList.map((o) => o.id);
  const itemsByOrder: Record<string, OrderItemRow[]> = {};

  if (orderIds.length > 0) {
    const placeholders = orderIds.map(() => '?').join(',');
    const allItems = await db.query<OrderItemRow>(
      `SELECT * FROM order_items WHERE order_id IN (${placeholders})`,
      orderIds
    );

    // Group items by order_id
    for (const item of allItems) {
      if (!itemsByOrder[item.order_id]) {
        itemsByOrder[item.order_id] = [];
      }
      itemsByOrder[item.order_id].push(item);
    }
  }

  const items = orderList.map((order) => formatOrder(order, itemsByOrder[order.id] || []));

  const nextCursor = hasMore && items.length > 0 ? items[items.length - 1].created_at : null;

  return c.json({
    items,
    pagination: {
      has_more: hasMore,
      next_cursor: nextCursor,
    },
  });
});

// GET /v1/orders/:orderId
ordersRoutes.get('/:orderId', async (c) => {
  const orderId = c.req.param('orderId');
  const { store } = c.get('auth');
  const db = getDb(c.env);

  const [order] = await db.query<OrderRow>(`SELECT * FROM orders WHERE id = ? AND store_id = ?`, [
    orderId,
    store.id,
  ]);
  if (!order) throw ApiError.notFound('Order not found');

  const orderItems = await db.query<OrderItemRow>(`SELECT * FROM order_items WHERE order_id = ?`, [
    order.id,
  ]);

  return c.json(formatOrder(order, orderItems));
});

// PATCH /v1/orders/:orderId - Update order status/tracking
ordersRoutes.patch('/:orderId', async (c) => {
  const orderId = c.req.param('orderId');
  const body = await c.req.json().catch(() => ({}));
  const { status, tracking_number, tracking_url } = body;

  const { store } = c.get('auth');
  const db = getDb(c.env);

  const [order] = await db.query<OrderRow>(`SELECT * FROM orders WHERE id = ? AND store_id = ?`, [
    orderId,
    store.id,
  ]);
  if (!order) throw ApiError.notFound('Order not found');

  const validStatuses = [
    'pending',
    'paid',
    'processing',
    'shipped',
    'delivered',
    'refunded',
    'canceled',
  ];
  const updates: string[] = [];
  const params: unknown[] = [];

  if (status !== undefined) {
    if (!validStatuses.includes(status)) {
      throw ApiError.invalidRequest(`status must be one of: ${validStatuses.join(', ')}`);
    }
    updates.push('status = ?');
    params.push(status);

    // Auto-set shipped_at when status changes to shipped
    if (status === 'shipped' && !order.shipped_at) {
      updates.push('shipped_at = ?');
      params.push(now());
    }
  }

  if (tracking_number !== undefined) {
    updates.push('tracking_number = ?');
    params.push(tracking_number || null);
  }

  if (tracking_url !== undefined) {
    updates.push('tracking_url = ?');
    params.push(tracking_url || null);
  }

  if (updates.length === 0) {
    throw ApiError.invalidRequest('No fields to update');
  }

  params.push(orderId);
  params.push(store.id);

  await db.run(`UPDATE orders SET ${updates.join(', ')} WHERE id = ? AND store_id = ?`, params);

  const [updated] = await db.query<OrderRow>(`SELECT * FROM orders WHERE id = ?`, [orderId]);
  const orderItems = await db.query<OrderItemRow>(`SELECT * FROM order_items WHERE order_id = ?`, [
    orderId,
  ]);

  // Dispatch webhooks for status changes
  const formattedOrder = formatOrder(updated, orderItems);

  if (status !== undefined && status !== order.status) {
    // Determine specific event type
    let eventType: WebhookEventType = 'order.updated';
    if (status === 'shipped') eventType = 'order.shipped';

    await dispatchWebhooks(c.env, c.executionCtx, store.id, eventType, {
      order: formattedOrder,
      previous_status: order.status,
    });

    // Send shipping update email when status changes to shipped (non-blocking)
    if (status === 'shipped') {
      c.executionCtx.waitUntil(
        sendShippingUpdateEmail(
          c.env,
          store.id,
          {
            id: updated.id,
            number: updated.number,
            customer_email: updated.customer_email,
            shipping_name: updated.shipping_name,
            ship_to: updated.ship_to,
            subtotal_cents: updated.subtotal_cents,
            tax_cents: updated.tax_cents,
            shipping_cents: updated.shipping_cents,
            discount_amount_cents: updated.discount_amount_cents ?? undefined,
            total_cents: updated.total_cents,
          },
          orderItems.map((i) => ({
            sku: i.sku,
            title: i.title,
            qty: i.qty,
            unit_price_cents: i.unit_price_cents,
            image_url: null,
            variant_title: null,
          })),
          {
            tracking_number: tracking_number || updated.tracking_number,
            tracking_url: tracking_url || updated.tracking_url,
          }
        ).catch((err: unknown) => console.error('Shipping update email failed:', err))
      );
    }
  }

  return c.json(formattedOrder);
});

// POST /v1/orders/:orderId/refund
ordersRoutes.post('/:orderId/refund', async (c) => {
  const orderId = c.req.param('orderId');
  const body = await c.req.json().catch(() => ({}));
  const amountCents = body?.amount_cents;

  const { store } = c.get('auth');
  if (!store.stripe_secret_key) throw ApiError.invalidRequest('Stripe not connected');

  const db = getDb(c.env);

  const [order] = await db.query<OrderRow>(`SELECT * FROM orders WHERE id = ? AND store_id = ?`, [
    orderId,
    store.id,
  ]);
  if (!order) throw ApiError.notFound('Order not found');
  if (order.status === 'refunded') throw ApiError.conflict('Order already refunded');
  if (!order.stripe_payment_intent_id) {
    throw ApiError.invalidRequest('Cannot refund test orders (no Stripe payment)');
  }

  const stripe = new Stripe(store.stripe_secret_key);

  try {
    const refund = await stripe.refunds.create({
      payment_intent: order.stripe_payment_intent_id,
      amount: amountCents,
    });

    await db.run(
      `INSERT INTO refunds (id, order_id, stripe_refund_id, amount_cents, status) VALUES (?, ?, ?, ?, ?)`,
      [uuid(), order.id, refund.id, refund.amount, refund.status ?? 'succeeded']
    );

    if (!amountCents || amountCents >= order.total_cents) {
      await db.run(`UPDATE orders SET status = 'refunded' WHERE id = ?`, [orderId]);

      // Dispatch refund webhook
      const [refundedOrder] = await db.query<OrderRow>(`SELECT * FROM orders WHERE id = ?`, [
        orderId,
      ]);
      const orderItems = await db.query<OrderItemRow>(
        `SELECT * FROM order_items WHERE order_id = ?`,
        [orderId]
      );

      await dispatchWebhooks(c.env, c.executionCtx, store.id, 'order.refunded', {
        order: formatOrder(refundedOrder, orderItems),
        refund: {
          stripe_refund_id: refund.id,
          amount_cents: refund.amount,
        },
      });
    }

    return c.json({ stripe_refund_id: refund.id, status: refund.status });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Refund failed';
    throw ApiError.stripeError(message);
  }
});

// POST /v1/orders/test - Create a test order (skips Stripe, for local testing)
ordersRoutes.post('/test', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const { customer_email, items, discount_code } = body;

  if (!customer_email) throw ApiError.invalidRequest('customer_email is required');
  if (!Array.isArray(items) || items.length === 0) {
    throw ApiError.invalidRequest('items array is required');
  }

  const { store } = c.get('auth');
  const db = getDb(c.env);

  // Validate items and calculate totals
  let subtotal = 0;
  const orderItems = [];

  for (const { sku, qty } of items) {
    if (!sku || !qty || qty < 1) {
      throw ApiError.invalidRequest('Each item needs sku and qty > 0');
    }

    const [variant] = await db.query<VariantRow>(
      `SELECT * FROM variants WHERE store_id = ? AND sku = ?`,
      [store.id, sku]
    );
    if (!variant) throw ApiError.notFound(`SKU not found: ${sku}`);

    // Check inventory
    const [inv] = await db.query<InventoryRow>(
      `SELECT * FROM inventory WHERE store_id = ? AND sku = ?`,
      [store.id, sku]
    );
    const available = (inv?.on_hand ?? 0) - (inv?.reserved ?? 0);
    if (available < qty) throw ApiError.insufficientInventory(sku);

    subtotal += variant.price_cents * qty;
    orderItems.push({
      sku,
      title: variant.title,
      qty,
      unit_price_cents: variant.price_cents,
    });
  }

  // Handle discount if provided
  let discountId = null;
  let discountCode = null;
  let discountAmountCents = 0;
  let discount: Discount | null = null;

  if (discount_code) {
    const normalizedCode = discount_code.toUpperCase().trim();
    const [discountRow] = await db.query<Discount>(
      `SELECT * FROM discounts WHERE code = ? AND store_id = ?`,
      [normalizedCode, store.id]
    );

    if (discountRow) {
      await validateDiscount(db, discountRow, subtotal, customer_email);
      discountAmountCents = calculateDiscount(discountRow, subtotal);
      discountId = discountRow.id;
      discountCode = discountRow.code;
      discount = discountRow;
    } else {
      throw ApiError.notFound('Discount code not found');
    }
  }

  const totalCents = subtotal - discountAmountCents;

  // Upsert customer (same logic as real checkout)
  const timestamp = now();
  let customerId: string | null = null;
  const [existingCustomer] = await db.query<CustomerRow>(
    `SELECT id, order_count, total_spent_cents FROM customers WHERE store_id = ? AND email = ?`,
    [store.id, customer_email]
  );

  if (existingCustomer) {
    customerId = existingCustomer.id;
    await db.run(
      `UPDATE customers SET 
        order_count = order_count + 1,
        total_spent_cents = total_spent_cents + ?,
        last_order_at = ?,
        updated_at = ?
      WHERE id = ?`,
      [totalCents, timestamp, timestamp, customerId]
    );
  } else {
    customerId = uuid();
    await db.run(
      `INSERT INTO customers (id, store_id, email, order_count, total_spent_cents, last_order_at)
       VALUES (?, ?, ?, 1, ?, ?)`,
      [customerId, store.id, customer_email, totalCents, timestamp]
    );
  }

  // Reserve discount usage atomically BEFORE creating order or deducting inventory
  // This ensures that if the reservation fails, no order or inventory changes are committed
  if (discount && discountAmountCents > 0) {
    const currentTime = now();

    // Check per-customer limit first
    // Note: There's a small race condition window here, but for test orders (admin-only),
    // this is acceptable. The unique constraint on discount_usage will prevent duplicates.
    if (discount.usage_limit_per_customer !== null) {
      const [usage] = await db.query<{ count: number }>(
        `SELECT COUNT(*) as count FROM discount_usage WHERE discount_id = ? AND customer_email = ?`,
        [discount.id, customer_email.toLowerCase()]
      );
      if (usage && usage.count >= discount.usage_limit_per_customer) {
        throw ApiError.invalidRequest('You have already used this discount');
      }
    }

    // Atomically increment usage_count only if within global limit
    // This must happen BEFORE order creation to prevent data inconsistency
    if (discount.usage_limit !== null) {
      const result = await db.run(
        `UPDATE discounts 
         SET usage_count = usage_count + 1, updated_at = ? 
         WHERE id = ? 
           AND status = 'active'
           AND (starts_at IS NULL OR starts_at <= ?)
           AND (expires_at IS NULL OR expires_at >= ?)
           AND usage_count < usage_limit`,
        [currentTime, discountId, currentTime, currentTime]
      );

      if (result.changes === 0) {
        throw ApiError.invalidRequest('Discount usage limit reached');
      }
    } else {
      // No usage limit, but validate discount is still active
      const result = await db.run(
        `UPDATE discounts 
         SET updated_at = ? 
         WHERE id = ? 
           AND status = 'active'
           AND (starts_at IS NULL OR starts_at <= ?)
           AND (expires_at IS NULL OR expires_at >= ?)`,
        [currentTime, discountId, currentTime, currentTime]
      );

      if (result.changes === 0) {
        throw ApiError.invalidRequest('Discount is no longer valid');
      }
    }
  }

  // Generate order number (timestamp-based to avoid race conditions)
  const orderNumber = generateOrderNumber();
  const orderId = uuid();

  // Create order (with customer link and discount)
  // Discount usage has already been reserved atomically above
  await db.run(
    `INSERT INTO orders (id, store_id, customer_id, number, status, customer_email, subtotal_cents, tax_cents, shipping_cents, total_cents, discount_code, discount_id, discount_amount_cents, created_at)
     VALUES (?, ?, ?, ?, 'paid', ?, ?, 0, 0, ?, ?, ?, ?, ?)`,
    [
      orderId,
      store.id,
      customerId,
      orderNumber,
      customer_email,
      subtotal,
      totalCents,
      discountCode,
      discountId,
      discountAmountCents,
      timestamp,
    ]
  );

  // Create order items and deduct inventory
  for (const item of orderItems) {
    await db.run(
      `INSERT INTO order_items (id, order_id, sku, title, qty, unit_price_cents) VALUES (?, ?, ?, ?, ?, ?)`,
      [uuid(), orderId, item.sku, item.title, item.qty, item.unit_price_cents]
    );

    // Deduct from on_hand (not reserved since this bypasses checkout)
    await db.run(
      `UPDATE inventory SET on_hand = on_hand - ?, updated_at = ? WHERE store_id = ? AND sku = ?`,
      [item.qty, timestamp, store.id, item.sku]
    );
  }

  // Record discount usage for per-customer tracking and audit purposes
  // The usage_count was already incremented atomically above, this just records the usage
  if (discount && discountAmountCents > 0) {
    const [existingUsage] = await db.query<DiscountUsageRow>(
      `SELECT id FROM discount_usage WHERE order_id = ? AND discount_id = ?`,
      [orderId, discountId]
    );

    if (!existingUsage) {
      await db.run(
        `INSERT INTO discount_usage (id, discount_id, order_id, customer_email, discount_amount_cents)
         VALUES (?, ?, ?, ?, ?)`,
        [uuid(), discountId, orderId, customer_email.toLowerCase(), discountAmountCents]
      );
    }
    // If already exists, silently skip (idempotent)
  }

  const [order] = await db.query<OrderRow>(`SELECT * FROM orders WHERE id = ?`, [orderId]);
  return c.json(formatOrder(order, orderItems));
});

interface FormatOrderItem {
  sku: string;
  title: string;
  qty: number;
  unit_price_cents: number;
}

function formatOrder(order: OrderRow, items: FormatOrderItem[]) {
  return {
    id: order.id,
    number: order.number,
    status: order.status,
    customer_email: order.customer_email,
    customer_id: order.customer_id || null,
    shipping: {
      name: order.shipping_name || null,
      phone: order.shipping_phone || null,
      address: order.ship_to ? JSON.parse(order.ship_to) : null,
    },
    amounts: {
      subtotal_cents: order.subtotal_cents,
      discount_cents: order.discount_amount_cents || 0,
      tax_cents: order.tax_cents,
      shipping_cents: order.shipping_cents,
      total_cents: order.total_cents,
      currency: order.currency,
    },
    discount: order.discount_code
      ? {
          code: order.discount_code,
          amount_cents: order.discount_amount_cents || 0,
        }
      : null,
    tracking: {
      number: order.tracking_number,
      url: order.tracking_url,
      shipped_at: order.shipped_at,
    },
    stripe: {
      checkout_session_id: order.stripe_checkout_session_id,
      payment_intent_id: order.stripe_payment_intent_id,
    },
    items: items.map((i) => ({
      sku: i.sku,
      title: i.title,
      qty: i.qty,
      unit_price_cents: i.unit_price_cents,
    })),
    created_at: order.created_at,
  };
}

export { ordersRoutes as orders };
