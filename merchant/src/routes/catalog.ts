import { Hono } from 'hono';
import { getDb } from '../db';
import { authMiddleware, adminOnly } from '../middleware/auth';
import { ApiError, uuid, now, type Env, type AuthContext } from '../types';

// ============================================================
// CATALOG ROUTES (Products & Variants)
// ============================================================

/**
 * Normalize tags: trim whitespace, convert to lowercase, and remove duplicates
 */
function normalizeTags(tags: string[] | undefined): string[] {
  if (!tags || !Array.isArray(tags)) return [];
  const normalized = tags.map((tag) => tag.trim().toLowerCase()).filter((tag) => tag.length > 0);
  return [...new Set(normalized)]; // Remove duplicates
}

const catalogRoutes = new Hono<{
  Bindings: Env;
  Variables: { auth: AuthContext };
}>();

catalogRoutes.use('*', authMiddleware);

// GET /v1/products
catalogRoutes.get('/', async (c) => {
  const { store } = c.get('auth');
  const db = getDb(c.env);

  // Pagination params
  const limit = Math.min(parseInt(c.req.query('limit') || '20'), 100);
  const cursor = c.req.query('cursor');
  const status = c.req.query('status'); // Filter by status
  const tag = c.req.query('tag'); // Filter by tag (case-insensitive)

  // Build query (exclude soft-deleted products)
  let query = `SELECT * FROM products WHERE store_id = ? AND deleted_at IS NULL`;
  const params: unknown[] = [store.id];

  if (status) {
    query += ` AND status = ?`;
    params.push(status);
  }

  // Filter by tag using a subquery
  if (tag) {
    const normalizedTag = tag.trim().toLowerCase();
    query += ` AND id IN (SELECT product_id FROM product_tags WHERE LOWER(tag) = ?)`;
    params.push(normalizedTag);
  }

  if (cursor) {
    query += ` AND created_at < ?`;
    params.push(cursor);
  }

  query += ` ORDER BY created_at DESC LIMIT ?`;
  params.push(limit + 1); // Fetch one extra to check for next page

  const products = await db.query<any>(query, params);

  // Check if there's a next page
  const hasMore = products.length > limit;
  if (hasMore) products.pop();

  // Batch fetch all variants for these products (avoids N+1 query)
  const productIds = products.map((p) => p.id);
  const variantsByProduct: Record<string, any[]> = {};
  const tagsByProduct: Record<string, string[]> = {};

  if (productIds.length > 0) {
    const placeholders = productIds.map(() => '?').join(',');
    const allVariants = await db.query<any>(
      `SELECT * FROM variants WHERE product_id IN (${placeholders}) ORDER BY created_at ASC`,
      productIds
    );

    // Group variants by product_id
    for (const v of allVariants) {
      if (!variantsByProduct[v.product_id]) {
        variantsByProduct[v.product_id] = [];
      }
      variantsByProduct[v.product_id].push(v);
    }

    // Batch fetch all tags for these products
    const allTags = await db.query<{ product_id: string; tag: string }>(
      `SELECT product_id, tag FROM product_tags WHERE product_id IN (${placeholders}) ORDER BY created_at ASC`,
      productIds
    );

    // Group tags by product_id
    for (const t of allTags) {
      if (!tagsByProduct[t.product_id]) {
        tagsByProduct[t.product_id] = [];
      }
      tagsByProduct[t.product_id].push(t.tag);
    }
  }

  const items = products.map((p) => ({
    id: p.id,
    title: p.title,
    description: p.description,
    featured_image_url: p.featured_image_url,
    featured_image_alt: p.featured_image_alt,
    drop_id: p.drop_id,
    status: p.status,
    created_at: p.created_at,
    tags: tagsByProduct[p.id] || [],
    variants: (variantsByProduct[p.id] || []).map((v) => ({
      id: v.id,
      sku: v.sku,
      title: v.title,
      price_cents: v.price_cents,
      image_url: v.image_url,
      image_alt: v.image_alt,
      low_stock_threshold: v.low_stock_threshold,
      reorder_point: v.reorder_point,
    })),
  }));

  const nextCursor = hasMore && items.length > 0 ? items[items.length - 1].created_at : null;

  return c.json({
    items,
    pagination: {
      has_more: hasMore,
      next_cursor: nextCursor,
    },
  });
});

// GET /v1/products/tags - Get all unique tags (for filter UI)
catalogRoutes.get('/tags', async (c) => {
  const { store } = c.get('auth');
  const db = getDb(c.env);

  // Get all unique tags from products belonging to this store
  const tags = await db.query<{ tag: string; count: number }>(
    `SELECT pt.tag, COUNT(*) as count
     FROM product_tags pt
     INNER JOIN products p ON pt.product_id = p.id
     WHERE p.store_id = ?
     GROUP BY pt.tag
     ORDER BY pt.tag ASC`,
    [store.id]
  );

  return c.json({
    tags: tags.map((t) => ({ tag: t.tag, count: t.count })),
  });
});

// GET /v1/products/:id
catalogRoutes.get('/:id', async (c) => {
  const { store } = c.get('auth');
  const db = getDb(c.env);
  const id = c.req.param('id');

  const [product] = await db.query<any>(
    `SELECT * FROM products WHERE id = ? AND store_id = ? AND deleted_at IS NULL`,
    [id, store.id]
  );

  if (!product) throw ApiError.notFound('Product not found');

  const variants = await db.query<any>(
    `SELECT * FROM variants WHERE product_id = ? ORDER BY created_at ASC`,
    [id]
  );

  // Fetch tags for this product
  const tags = await db.query<{ tag: string }>(
    `SELECT tag FROM product_tags WHERE product_id = ? ORDER BY created_at ASC`,
    [id]
  );

  return c.json({
    id: product.id,
    title: product.title,
    description: product.description,
    featured_image_url: product.featured_image_url,
    featured_image_alt: product.featured_image_alt,
    drop_id: product.drop_id,
    status: product.status,
    created_at: product.created_at,
    tags: tags.map((t) => t.tag),
    variants: variants.map((v) => ({
      id: v.id,
      sku: v.sku,
      title: v.title,
      price_cents: v.price_cents,
      image_url: v.image_url,
      image_alt: v.image_alt,
      low_stock_threshold: v.low_stock_threshold,
      reorder_point: v.reorder_point,
    })),
  });
});

// POST /v1/products (admin only)
catalogRoutes.post('/', adminOnly, async (c) => {
  const body = await c.req.json();
  const { title, description, featured_image_url, featured_image_alt, tags, drop_id } = body;

  if (!title) throw ApiError.invalidRequest('title is required');

  const { store } = c.get('auth');
  const db = getDb(c.env);

  // Validate drop_id if provided
  if (drop_id) {
    const [drop] = await db.query<{ id: string; store_id: string }>(
      `SELECT id, store_id FROM drops WHERE id = ? AND store_id = ?`,
      [drop_id, store.id]
    );
    if (!drop) throw ApiError.invalidRequest('Invalid drop_id: drop not found');
  }

  const id = uuid();
  const timestamp = now();

  await db.run(
    `INSERT INTO products (id, store_id, title, description, featured_image_url, featured_image_alt, drop_id, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?)`,
    [
      id,
      store.id,
      title,
      description || null,
      featured_image_url || null,
      featured_image_alt || null,
      drop_id || null,
      timestamp,
    ]
  );

  // Insert tags if provided
  const normalizedTags = normalizeTags(tags);
  for (const tag of normalizedTags) {
    await db.run(`INSERT INTO product_tags (id, product_id, tag, created_at) VALUES (?, ?, ?, ?)`, [
      uuid(),
      id,
      tag,
      timestamp,
    ]);
  }

  return c.json(
    {
      id,
      title,
      description: description || null,
      featured_image_url: featured_image_url || null,
      featured_image_alt: featured_image_alt || null,
      drop_id: drop_id || null,
      status: 'active',
      tags: normalizedTags,
      variants: [],
    },
    201
  );
});

// PATCH /v1/products/:id (admin only)
catalogRoutes.patch('/:id', adminOnly, async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const { title, description, status, featured_image_url, featured_image_alt, tags, drop_id } =
    body;

  const { store } = c.get('auth');
  const db = getDb(c.env);

  const [existing] = await db.query<any>(`SELECT * FROM products WHERE id = ? AND store_id = ?`, [
    id,
    store.id,
  ]);

  if (!existing) throw ApiError.notFound('Product not found');

  const updates: string[] = [];
  const params: unknown[] = [];

  if (title !== undefined) {
    updates.push('title = ?');
    params.push(title);
  }
  if (description !== undefined) {
    updates.push('description = ?');
    params.push(description);
  }
  if (status !== undefined) {
    if (!['active', 'draft'].includes(status)) {
      throw ApiError.invalidRequest('status must be active or draft');
    }
    updates.push('status = ?');
    params.push(status);
  }
  if (featured_image_url !== undefined) {
    updates.push('featured_image_url = ?');
    params.push(featured_image_url);
  }
  if (featured_image_alt !== undefined) {
    updates.push('featured_image_alt = ?');
    params.push(featured_image_alt);
  }
  // Handle drop_id update (can be set to a drop or cleared with null)
  if (drop_id !== undefined) {
    // Validate drop_id if it's being set (not cleared)
    if (drop_id !== null) {
      const [drop] = await db.query<{ id: string; store_id: string }>(
        `SELECT id, store_id FROM drops WHERE id = ? AND store_id = ?`,
        [drop_id, store.id]
      );
      if (!drop) throw ApiError.invalidRequest('Invalid drop_id: drop not found');
    }
    updates.push('drop_id = ?');
    params.push(drop_id);
  }

  if (updates.length > 0) {
    params.push(id);
    params.push(store.id);

    await db.run(`UPDATE products SET ${updates.join(', ')} WHERE id = ? AND store_id = ?`, params);
  }

  // Handle tags update (only if tags field is explicitly provided)
  if (tags !== undefined) {
    const timestamp = now();
    // Delete existing tags first
    await db.run(`DELETE FROM product_tags WHERE product_id = ?`, [id]);

    // Insert new tags
    const normalizedTags = normalizeTags(tags);
    for (const tag of normalizedTags) {
      await db.run(
        `INSERT INTO product_tags (id, product_id, tag, created_at) VALUES (?, ?, ?, ?)`,
        [uuid(), id, tag, timestamp]
      );
    }
  }

  const [product] = await db.query<any>(`SELECT * FROM products WHERE id = ? AND store_id = ?`, [
    id,
    store.id,
  ]);

  const variants = await db.query<any>(`SELECT * FROM variants WHERE product_id = ?`, [id]);

  // Fetch updated tags
  const productTags = await db.query<{ tag: string }>(
    `SELECT tag FROM product_tags WHERE product_id = ? ORDER BY created_at ASC`,
    [id]
  );

  return c.json({
    id: product.id,
    title: product.title,
    description: product.description,
    featured_image_url: product.featured_image_url,
    featured_image_alt: product.featured_image_alt,
    drop_id: product.drop_id,
    status: product.status,
    tags: productTags.map((t) => t.tag),
    variants: variants.map((v) => ({
      id: v.id,
      sku: v.sku,
      title: v.title,
      price_cents: v.price_cents,
      image_url: v.image_url,
      image_alt: v.image_alt,
      low_stock_threshold: v.low_stock_threshold,
      reorder_point: v.reorder_point,
    })),
  });
});

// POST /v1/products/:id/variants (admin only)
catalogRoutes.post('/:id/variants', adminOnly, async (c) => {
  const productId = c.req.param('id');
  const body = await c.req.json();
  const { sku, title, price_cents, image_url, image_alt, low_stock_threshold, reorder_point } =
    body;

  if (!sku) throw ApiError.invalidRequest('sku is required');
  if (!title) throw ApiError.invalidRequest('title is required');
  if (typeof price_cents !== 'number' || price_cents < 0) {
    throw ApiError.invalidRequest('price_cents must be a positive number');
  }

  const { store } = c.get('auth');
  const db = getDb(c.env);

  // Check product exists
  const [product] = await db.query<any>(`SELECT * FROM products WHERE id = ? AND store_id = ?`, [
    productId,
    store.id,
  ]);
  if (!product) throw ApiError.notFound('Product not found');

  // Check SKU uniqueness for this store
  const [existingSku] = await db.query<any>(
    `SELECT * FROM variants WHERE sku = ? AND store_id = ?`,
    [sku, store.id]
  );
  if (existingSku) throw ApiError.conflict(`SKU ${sku} already exists`);

  const id = uuid();
  const timestamp = now();

  // Validate low_stock_threshold if provided
  if (low_stock_threshold !== undefined && low_stock_threshold !== null) {
    if (
      typeof low_stock_threshold !== 'number' ||
      low_stock_threshold < 0 ||
      !Number.isInteger(low_stock_threshold)
    ) {
      throw ApiError.invalidRequest('low_stock_threshold must be a non-negative integer');
    }
  }

  // Validate reorder_point if provided
  if (reorder_point !== undefined && reorder_point !== null) {
    if (
      typeof reorder_point !== 'number' ||
      reorder_point < 0 ||
      !Number.isInteger(reorder_point)
    ) {
      throw ApiError.invalidRequest('reorder_point must be a non-negative integer');
    }
  }

  // Insert variant (with required fields)
  await db.run(
    `INSERT INTO variants (id, product_id, store_id, sku, title, price_cents, weight_g, image_url, image_alt, low_stock_threshold, reorder_point, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      productId,
      store.id,
      sku,
      title,
      price_cents,
      0,
      image_url || null,
      image_alt || null,
      low_stock_threshold ?? null,
      reorder_point ?? null,
      timestamp,
    ]
  );

  // Create inventory record
  await db.run(
    `INSERT INTO inventory (id, store_id, sku, on_hand, reserved, updated_at)
     VALUES (?, ?, ?, 0, 0, ?)`,
    [uuid(), store.id, sku, timestamp]
  );

  return c.json(
    {
      id,
      sku,
      title,
      price_cents,
      image_url: image_url || null,
      image_alt: image_alt || null,
      low_stock_threshold: low_stock_threshold ?? null,
      reorder_point: reorder_point ?? null,
    },
    201
  );
});

// PATCH /v1/products/:id/variants/:variantId (admin only)
catalogRoutes.patch('/:id/variants/:variantId', adminOnly, async (c) => {
  const productId = c.req.param('id');
  const variantId = c.req.param('variantId');
  const body = await c.req.json();
  const { sku, title, price_cents, image_url, image_alt, low_stock_threshold, reorder_point } =
    body;

  const { store } = c.get('auth');
  const db = getDb(c.env);

  // Check variant exists and belongs to product/store
  const [existing] = await db.query<any>(
    `SELECT * FROM variants WHERE id = ? AND product_id = ? AND store_id = ?`,
    [variantId, productId, store.id]
  );
  if (!existing) throw ApiError.notFound('Variant not found');

  const updates: string[] = [];
  const params: unknown[] = [];

  if (sku !== undefined) {
    // Check SKU uniqueness (excluding this variant)
    const [existingSku] = await db.query<any>(
      `SELECT * FROM variants WHERE sku = ? AND store_id = ? AND id != ?`,
      [sku, store.id, variantId]
    );
    if (existingSku) throw ApiError.conflict(`SKU ${sku} already exists`);

    // Update inventory SKU as well
    await db.run(`UPDATE inventory SET sku = ? WHERE sku = ? AND store_id = ?`, [
      sku,
      existing.sku,
      store.id,
    ]);

    updates.push('sku = ?');
    params.push(sku);
  }
  if (title !== undefined) {
    updates.push('title = ?');
    params.push(title);
  }
  if (price_cents !== undefined) {
    if (typeof price_cents !== 'number' || price_cents < 0) {
      throw ApiError.invalidRequest('price_cents must be a positive number');
    }
    updates.push('price_cents = ?');
    params.push(price_cents);
  }
  if (image_url !== undefined) {
    updates.push('image_url = ?');
    params.push(image_url);
  }
  if (image_alt !== undefined) {
    updates.push('image_alt = ?');
    params.push(image_alt);
  }
  if (low_stock_threshold !== undefined) {
    // Validate low_stock_threshold if not null
    if (low_stock_threshold !== null) {
      if (
        typeof low_stock_threshold !== 'number' ||
        low_stock_threshold < 0 ||
        !Number.isInteger(low_stock_threshold)
      ) {
        throw ApiError.invalidRequest('low_stock_threshold must be a non-negative integer');
      }
    }
    updates.push('low_stock_threshold = ?');
    params.push(low_stock_threshold);
  }
  if (reorder_point !== undefined) {
    // Validate reorder_point if not null
    if (reorder_point !== null) {
      if (
        typeof reorder_point !== 'number' ||
        reorder_point < 0 ||
        !Number.isInteger(reorder_point)
      ) {
        throw ApiError.invalidRequest('reorder_point must be a non-negative integer');
      }
    }
    updates.push('reorder_point = ?');
    params.push(reorder_point);
  }

  if (updates.length > 0) {
    params.push(variantId);
    await db.run(`UPDATE variants SET ${updates.join(', ')} WHERE id = ?`, params);
  }

  const [variant] = await db.query<any>(`SELECT * FROM variants WHERE id = ?`, [variantId]);

  return c.json({
    id: variant.id,
    sku: variant.sku,
    title: variant.title,
    price_cents: variant.price_cents,
    image_url: variant.image_url,
    image_alt: variant.image_alt,
    low_stock_threshold: variant.low_stock_threshold,
    reorder_point: variant.reorder_point,
  });
});

// DELETE /v1/products/:id (admin only) - Soft delete with undo support
catalogRoutes.delete('/:id', adminOnly, async (c) => {
  const id = c.req.param('id');
  const { store } = c.get('auth');
  const db = getDb(c.env);

  const [product] = await db.query<any>(
    `SELECT * FROM products WHERE id = ? AND store_id = ? AND deleted_at IS NULL`,
    [id, store.id]
  );
  if (!product) throw ApiError.notFound('Product not found');

  // Check if any variants have been used in orders
  const variants = await db.query<any>(`SELECT * FROM variants WHERE product_id = ?`, [id]);

  if (variants.length > 0) {
    const skus = variants.map((v) => v.sku);
    const placeholders = skus.map(() => '?').join(',');
    const [orderItem] = await db.query<any>(
      `SELECT id FROM order_items WHERE sku IN (${placeholders}) LIMIT 1`,
      skus
    );

    if (orderItem) {
      throw ApiError.conflict(
        'Cannot delete product with variants that have been ordered. Set status to draft instead.'
      );
    }
  }

  // Soft delete: set deleted_at timestamp
  const timestamp = now();
  await db.run(`UPDATE products SET deleted_at = ? WHERE id = ?`, [timestamp, id]);

  // Fetch tags for the response
  const tags = await db.query<{ tag: string }>(
    `SELECT tag FROM product_tags WHERE product_id = ? ORDER BY created_at ASC`,
    [id]
  );

  // Return the deleted product data for undo functionality
  return c.json({
    id: product.id,
    title: product.title,
    description: product.description,
    featured_image_url: product.featured_image_url,
    featured_image_alt: product.featured_image_alt,
    drop_id: product.drop_id,
    status: product.status,
    deleted_at: timestamp,
    tags: tags.map((t) => t.tag),
    variants: variants.map((v) => ({
      id: v.id,
      sku: v.sku,
      title: v.title,
      price_cents: v.price_cents,
      image_url: v.image_url,
      image_alt: v.image_alt,
      low_stock_threshold: v.low_stock_threshold,
      reorder_point: v.reorder_point,
    })),
  });
});

// POST /v1/products/:id/restore (admin only) - Restore soft-deleted product
catalogRoutes.post('/:id/restore', adminOnly, async (c) => {
  const id = c.req.param('id');
  const { store } = c.get('auth');
  const db = getDb(c.env);

  // Find the soft-deleted product
  const [product] = await db.query<any>(
    `SELECT * FROM products WHERE id = ? AND store_id = ? AND deleted_at IS NOT NULL`,
    [id, store.id]
  );

  if (!product) {
    // Check if the product exists but isn't deleted
    const [existingProduct] = await db.query<any>(
      `SELECT id FROM products WHERE id = ? AND store_id = ?`,
      [id, store.id]
    );

    if (existingProduct) {
      throw ApiError.invalidRequest('Product is not deleted');
    }

    throw ApiError.notFound('Product not found');
  }

  // Check if the undo window (30 seconds) has expired
  const deletedAt = new Date(product.deleted_at);
  const now_date = new Date();
  const secondsSinceDeletion = (now_date.getTime() - deletedAt.getTime()) / 1000;

  if (secondsSinceDeletion > 30) {
    throw ApiError.invalidRequest('Cannot restore: undo window expired (30 seconds)');
  }

  // Restore the product by clearing deleted_at
  await db.run(`UPDATE products SET deleted_at = NULL WHERE id = ?`, [id]);

  // Fetch updated product with variants and tags
  const variants = await db.query<any>(
    `SELECT * FROM variants WHERE product_id = ? ORDER BY created_at ASC`,
    [id]
  );

  const tags = await db.query<{ tag: string }>(
    `SELECT tag FROM product_tags WHERE product_id = ? ORDER BY created_at ASC`,
    [id]
  );

  return c.json({
    id: product.id,
    title: product.title,
    description: product.description,
    featured_image_url: product.featured_image_url,
    featured_image_alt: product.featured_image_alt,
    drop_id: product.drop_id,
    status: product.status,
    deleted_at: null,
    tags: tags.map((t) => t.tag),
    variants: variants.map((v) => ({
      id: v.id,
      sku: v.sku,
      title: v.title,
      price_cents: v.price_cents,
      image_url: v.image_url,
      image_alt: v.image_alt,
      low_stock_threshold: v.low_stock_threshold,
      reorder_point: v.reorder_point,
    })),
  });
});

// DELETE /v1/products/:id/variants/:variantId (admin only)
catalogRoutes.delete('/:id/variants/:variantId', adminOnly, async (c) => {
  const productId = c.req.param('id');
  const variantId = c.req.param('variantId');
  const { store } = c.get('auth');
  const db = getDb(c.env);

  const [variant] = await db.query<any>(
    `SELECT * FROM variants WHERE id = ? AND product_id = ? AND store_id = ?`,
    [variantId, productId, store.id]
  );
  if (!variant) throw ApiError.notFound('Variant not found');

  // Check if variant has been used in any orders
  const [orderItem] = await db.query<any>(`SELECT id FROM order_items WHERE sku = ? LIMIT 1`, [
    variant.sku,
  ]);

  if (orderItem) {
    throw ApiError.conflict(
      'Cannot delete variant that has been ordered. Set product status to draft instead.'
    );
  }

  // Delete inventory record
  await db.run(`DELETE FROM inventory WHERE sku = ? AND store_id = ?`, [variant.sku, store.id]);

  // Delete variant
  await db.run(`DELETE FROM variants WHERE id = ?`, [variantId]);

  return c.json({ deleted: true });
});

export { catalogRoutes as catalog };
