import { Hono } from 'hono';
import { getDb } from '../db';
import { authMiddleware, adminOnly } from '../middleware/auth';
import { ApiError, uuid, now, type Env, type AuthContext } from '../types';
import { sendDropLaunchEmails } from '../lib/notifications';

// ============================================================
// DROPS ROUTES
// ============================================================

const dropsRoutes = new Hono<{
  Bindings: Env;
  Variables: { auth: AuthContext };
}>();

dropsRoutes.use('*', authMiddleware);

// Valid drop statuses
const VALID_STATUSES = ['draft', 'scheduled', 'active', 'ended'] as const;
type DropStatus = (typeof VALID_STATUSES)[number];

function isValidStatus(status: string): status is DropStatus {
  return VALID_STATUSES.includes(status as DropStatus);
}

// Helper to validate and normalize slug
function normalizeSlug(slug: string): string {
  return slug
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

// Helper to format drop response
function formatDrop(drop: any, products?: any[]) {
  return {
    id: drop.id,
    name: drop.name,
    description: drop.description,
    slug: drop.slug,
    cover_image: drop.cover_image,
    start_date: drop.start_date,
    end_date: drop.end_date,
    status: drop.status,
    created_at: drop.created_at,
    updated_at: drop.updated_at,
    ...(products !== undefined && { products }),
  };
}

// GET /v1/drops - List all drops
dropsRoutes.get('/', async (c) => {
  const { store } = c.get('auth');
  const db = getDb(c.env);

  // Pagination params
  const limit = Math.min(parseInt(c.req.query('limit') || '20'), 100);
  const cursor = c.req.query('cursor');
  const status = c.req.query('status');

  // Build query
  let query = `SELECT * FROM drops WHERE store_id = ?`;
  const params: unknown[] = [store.id];

  if (status) {
    if (!isValidStatus(status)) {
      throw ApiError.invalidRequest(`Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`);
    }
    query += ` AND status = ?`;
    params.push(status);
  }

  if (cursor) {
    query += ` AND created_at < ?`;
    params.push(cursor);
  }

  query += ` ORDER BY created_at DESC LIMIT ?`;
  params.push(limit + 1);

  const drops = await db.query<any>(query, params);

  // Check if there's a next page
  const hasMore = drops.length > limit;
  if (hasMore) drops.pop();

  const items = drops.map((d) => formatDrop(d));

  const nextCursor = hasMore && items.length > 0 ? items[items.length - 1].created_at : null;

  return c.json({
    items,
    pagination: {
      has_more: hasMore,
      next_cursor: nextCursor,
    },
  });
});

// GET /v1/drops/:id - Get single drop
dropsRoutes.get('/:id', async (c) => {
  const { store } = c.get('auth');
  const db = getDb(c.env);
  const id = c.req.param('id');

  const [drop] = await db.query<any>(`SELECT * FROM drops WHERE id = ? AND store_id = ?`, [
    id,
    store.id,
  ]);

  if (!drop) throw ApiError.notFound('Drop not found');

  return c.json(formatDrop(drop));
});

// GET /v1/drops/:slug/products - Get products in drop by slug
dropsRoutes.get('/:slug/products', async (c) => {
  const { store } = c.get('auth');
  const db = getDb(c.env);
  const slug = c.req.param('slug');

  // Find drop by slug
  const [drop] = await db.query<any>(`SELECT * FROM drops WHERE slug = ? AND store_id = ?`, [
    slug,
    store.id,
  ]);

  if (!drop) throw ApiError.notFound('Drop not found');

  // Pagination params
  const limit = Math.min(parseInt(c.req.query('limit') || '20'), 100);
  const cursor = c.req.query('cursor');

  // Get products for this drop, ordered by drop_position (NULL last), then created_at
  let productQuery = `SELECT * FROM products WHERE drop_id = ? AND store_id = ? AND deleted_at IS NULL`;
  const productParams: unknown[] = [drop.id, store.id];

  if (cursor) {
    // For pagination, use drop_position as cursor if available
    productQuery += ` AND (drop_position > ? OR (drop_position IS NULL AND created_at < ?))`;
    productParams.push(cursor, cursor);
  }

  productQuery += ` ORDER BY CASE WHEN drop_position IS NULL THEN 1 ELSE 0 END, drop_position ASC, created_at DESC LIMIT ?`;
  productParams.push(limit + 1);

  const products = await db.query<any>(productQuery, productParams);

  // Check if there's a next page
  const hasMore = products.length > limit;
  if (hasMore) products.pop();

  // Batch fetch variants for products
  const productIds = products.map((p) => p.id);
  const variantsByProduct: Record<string, any[]> = {};

  if (productIds.length > 0) {
    const placeholders = productIds.map(() => '?').join(',');
    const allVariants = await db.query<any>(
      `SELECT * FROM variants WHERE product_id IN (${placeholders}) ORDER BY created_at ASC`,
      productIds
    );

    for (const v of allVariants) {
      if (!variantsByProduct[v.product_id]) {
        variantsByProduct[v.product_id] = [];
      }
      variantsByProduct[v.product_id].push(v);
    }
  }

  const items = products.map((p) => ({
    id: p.id,
    title: p.title,
    description: p.description,
    status: p.status,
    drop_id: p.drop_id,
    drop_position: p.drop_position,
    created_at: p.created_at,
    variants: (variantsByProduct[p.id] || []).map((v) => ({
      id: v.id,
      sku: v.sku,
      title: v.title,
      price_cents: v.price_cents,
      image_url: v.image_url,
    })),
  }));

  // Use drop_position as cursor if available, otherwise created_at
  const lastItem = items.length > 0 ? items[items.length - 1] : null;
  const nextCursor =
    hasMore && lastItem
      ? lastItem.drop_position !== null
        ? String(lastItem.drop_position)
        : lastItem.created_at
      : null;

  return c.json({
    drop: formatDrop(drop),
    items,
    pagination: {
      has_more: hasMore,
      next_cursor: nextCursor,
    },
  });
});

// POST /v1/drops - Create drop (admin only)
dropsRoutes.post('/', adminOnly, async (c) => {
  const body = await c.req.json();
  const { name, description, slug, cover_image, start_date, end_date, status } = body;

  if (!name) throw ApiError.invalidRequest('name is required');
  if (!slug) throw ApiError.invalidRequest('slug is required');

  const normalizedSlug = normalizeSlug(slug);
  if (!normalizedSlug) {
    throw ApiError.invalidRequest('slug must contain at least one valid character');
  }

  // Validate status if provided
  const dropStatus = status || 'draft';
  if (!isValidStatus(dropStatus)) {
    throw ApiError.invalidRequest(`Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`);
  }

  // Validate dates if provided
  if (start_date && isNaN(Date.parse(start_date))) {
    throw ApiError.invalidRequest('start_date must be a valid ISO date');
  }
  if (end_date && isNaN(Date.parse(end_date))) {
    throw ApiError.invalidRequest('end_date must be a valid ISO date');
  }
  if (start_date && end_date && new Date(end_date) <= new Date(start_date)) {
    throw ApiError.invalidRequest('end_date must be after start_date');
  }

  const { store } = c.get('auth');
  const db = getDb(c.env);

  // Check slug uniqueness for this store
  const [existingSlug] = await db.query<any>(
    `SELECT id FROM drops WHERE slug = ? AND store_id = ?`,
    [normalizedSlug, store.id]
  );
  if (existingSlug) {
    throw ApiError.conflict(`Drop with slug "${normalizedSlug}" already exists`);
  }

  const id = uuid();
  const timestamp = now();

  await db.run(
    `INSERT INTO drops (id, store_id, name, description, slug, cover_image, start_date, end_date, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      store.id,
      name,
      description || null,
      normalizedSlug,
      cover_image || null,
      start_date || null,
      end_date || null,
      dropStatus,
      timestamp,
      timestamp,
    ]
  );

  const [drop] = await db.query<any>(`SELECT * FROM drops WHERE id = ?`, [id]);

  return c.json(formatDrop(drop), 201);
});

// PATCH /v1/drops/:id - Update drop (admin only)
dropsRoutes.patch('/:id', adminOnly, async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const { name, description, slug, cover_image, start_date, end_date, status } = body;

  const { store } = c.get('auth');
  const db = getDb(c.env);

  const [existing] = await db.query<any>(`SELECT * FROM drops WHERE id = ? AND store_id = ?`, [
    id,
    store.id,
  ]);

  if (!existing) throw ApiError.notFound('Drop not found');

  const updates: string[] = [];
  const params: unknown[] = [];

  if (name !== undefined) {
    if (!name) throw ApiError.invalidRequest('name cannot be empty');
    updates.push('name = ?');
    params.push(name);
  }

  if (description !== undefined) {
    updates.push('description = ?');
    params.push(description || null);
  }

  if (slug !== undefined) {
    const normalizedSlug = normalizeSlug(slug);
    if (!normalizedSlug) {
      throw ApiError.invalidRequest('slug must contain at least one valid character');
    }

    // Check slug uniqueness (excluding this drop)
    const [existingSlug] = await db.query<any>(
      `SELECT id FROM drops WHERE slug = ? AND store_id = ? AND id != ?`,
      [normalizedSlug, store.id, id]
    );
    if (existingSlug) {
      throw ApiError.conflict(`Drop with slug "${normalizedSlug}" already exists`);
    }

    updates.push('slug = ?');
    params.push(normalizedSlug);
  }

  if (cover_image !== undefined) {
    updates.push('cover_image = ?');
    params.push(cover_image || null);
  }

  if (start_date !== undefined) {
    if (start_date !== null && isNaN(Date.parse(start_date))) {
      throw ApiError.invalidRequest('start_date must be a valid ISO date');
    }
    updates.push('start_date = ?');
    params.push(start_date || null);
  }

  if (end_date !== undefined) {
    if (end_date !== null && isNaN(Date.parse(end_date))) {
      throw ApiError.invalidRequest('end_date must be a valid ISO date');
    }
    updates.push('end_date = ?');
    params.push(end_date || null);
  }

  // Validate date range if both are being set or one is being updated
  const newStartDate = start_date !== undefined ? start_date : existing.start_date;
  const newEndDate = end_date !== undefined ? end_date : existing.end_date;
  if (newStartDate && newEndDate && new Date(newEndDate) <= new Date(newStartDate)) {
    throw ApiError.invalidRequest('end_date must be after start_date');
  }

  if (status !== undefined) {
    if (!isValidStatus(status)) {
      throw ApiError.invalidRequest(`Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`);
    }
    updates.push('status = ?');
    params.push(status);
  }

  if (updates.length > 0) {
    updates.push('updated_at = ?');
    params.push(now());

    params.push(id);
    params.push(store.id);

    await db.run(`UPDATE drops SET ${updates.join(', ')} WHERE id = ? AND store_id = ?`, params);
  }

  const [drop] = await db.query<any>(`SELECT * FROM drops WHERE id = ? AND store_id = ?`, [
    id,
    store.id,
  ]);

  // Send drop launch emails when status changes to 'active' (non-blocking)
  if (status === 'active' && existing.status !== 'active') {
    // Get featured image from first product in drop
    const [firstProduct] = await db.query<any>(
      `SELECT v.image_url
       FROM products p
       JOIN variants v ON v.product_id = p.id
       WHERE p.drop_id = ? AND v.image_url IS NOT NULL
       LIMIT 1`,
      [id]
    );
    const featuredImageUrl = firstProduct?.image_url || undefined;

    c.executionCtx.waitUntil(
      sendDropLaunchEmails(
        c.env,
        store.id,
        {
          id: drop.id,
          name: drop.name,
          slug: drop.slug,
          description: drop.description,
        },
        featuredImageUrl
      ).catch((err: unknown) => console.error('Drop launch emails failed:', err))
    );
  }

  return c.json(formatDrop(drop));
});

// PUT /v1/drops/:id/products - Assign products to drop (admin only)
// Accepts: { productIds: string[] } - array of product IDs in desired order
// Products will be assigned with drop_position based on their index in the array
dropsRoutes.put('/:id/products', adminOnly, async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const { productIds } = body;

  if (!Array.isArray(productIds)) {
    throw ApiError.invalidRequest('productIds must be an array');
  }

  const { store } = c.get('auth');
  const db = getDb(c.env);

  // Verify drop exists
  const [drop] = await db.query<any>(`SELECT * FROM drops WHERE id = ? AND store_id = ?`, [
    id,
    store.id,
  ]);

  if (!drop) throw ApiError.notFound('Drop not found');

  // First, unassign all products currently assigned to this drop and clear their position
  await db.run(
    `UPDATE products SET drop_id = NULL, drop_position = NULL WHERE drop_id = ? AND store_id = ?`,
    [id, store.id]
  );

  // Now assign the new products to this drop with positions based on array order
  if (productIds.length > 0) {
    // Verify all products exist and belong to this store
    const placeholders = productIds.map(() => '?').join(',');
    const products = await db.query<any>(
      `SELECT id FROM products WHERE id IN (${placeholders}) AND store_id = ? AND deleted_at IS NULL`,
      [...productIds, store.id]
    );

    const validProductIds = new Set(products.map((p) => p.id));
    const invalidIds = productIds.filter((pid) => !validProductIds.has(pid));

    if (invalidIds.length > 0) {
      throw ApiError.invalidRequest(`Products not found: ${invalidIds.join(', ')}`);
    }

    // Update each product's drop_id and drop_position based on array index
    for (let i = 0; i < productIds.length; i++) {
      const productId = productIds[i];
      await db.run(
        `UPDATE products SET drop_id = ?, drop_position = ? WHERE id = ? AND store_id = ?`,
        [
          id,
          i, // Position is 0-indexed based on array order
          productId,
          store.id,
        ]
      );
    }
  }

  return c.json({ success: true, assigned_count: productIds.length });
});

// DELETE /v1/drops/:id - Delete drop (admin only)
dropsRoutes.delete('/:id', adminOnly, async (c) => {
  const id = c.req.param('id');
  const { store } = c.get('auth');
  const db = getDb(c.env);

  const [drop] = await db.query<any>(`SELECT * FROM drops WHERE id = ? AND store_id = ?`, [
    id,
    store.id,
  ]);

  if (!drop) throw ApiError.notFound('Drop not found');

  // Unassign all products from this drop before deleting
  await db.run(`UPDATE products SET drop_id = NULL WHERE drop_id = ? AND store_id = ?`, [
    id,
    store.id,
  ]);

  await db.run(`DELETE FROM drops WHERE id = ? AND store_id = ?`, [id, store.id]);

  return c.json({ deleted: true });
});

export { dropsRoutes as drops };
