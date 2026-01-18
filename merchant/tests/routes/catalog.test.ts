import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import type { AuthContext, Env } from '../../src/types';

// Create mock database before any imports
const mockDbQuery = vi.fn();
const mockDbRun = vi.fn().mockResolvedValue({ changes: 1 });

const mockDb = {
  query: mockDbQuery,
  run: mockDbRun,
};

// Mock the db module
vi.mock('../../src/db', () => ({
  getDb: vi.fn(() => mockDb),
}));

// Mock uuid and now functions
vi.mock('../../src/types', async (importOriginal) => {
  const original = (await importOriginal()) as Record<string, unknown>;
  return {
    ...original,
    uuid: vi.fn(() => 'test-uuid-123'),
    now: vi.fn(() => '2026-01-18T12:00:00.000Z'),
  };
});

// Track auth context for tests
let mockAuthRole: 'admin' | 'public' = 'admin';

// Mock auth middleware to bypass actual auth
vi.mock('../../src/middleware/auth', () => {
  return {
    authMiddleware: vi.fn().mockImplementation((c: any, next: any) => {
      c.set('auth', {
        store: {
          id: 'store-1',
          name: 'Test Store',
          status: 'enabled',
          stripe_secret_key: null,
          stripe_webhook_secret: null,
        },
        role: mockAuthRole,
      });
      return next();
    }),
    adminOnly: vi.fn().mockImplementation(async (c: any, next: any) => {
      const auth = c.get('auth');
      if (auth?.role !== 'admin') {
        const types = await import('../../src/types');
        throw types.ApiError.forbidden('Admin access required');
      }
      return next();
    }),
  };
});

import { ApiError } from '../../src/types';

// Helper function to set auth context for a test
function setAuthContext(role: 'admin' | 'public') {
  mockAuthRole = role;
}

// Helper to create test app
function createTestApp() {
  const app = new Hono<{
    Bindings: Env;
    Variables: { auth: AuthContext };
  }>();

  // Error handler
  app.onError((err, c) => {
    if (err instanceof ApiError) {
      return c.json(
        { error: err.code, message: err.message, details: err.details },
        err.statusCode as any
      );
    }
    return c.json({ error: 'internal_error', message: err.message }, 500);
  });

  return app;
}

// Dynamically import catalog after mocks are set up
async function getCatalogRoutes() {
  const { catalog } = await import('../../src/routes/catalog');
  return catalog;
}

describe('Catalog Routes - Product Image Fields', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset to admin auth by default
    setAuthContext('admin');
  });

  describe('POST /v1/products - Create Product', () => {
    it('creates product with featured_image_url', async () => {
      mockDbRun.mockResolvedValueOnce({ changes: 1 });

      const catalogRoutes = await getCatalogRoutes();
      const app = createTestApp();
      app.route('/v1/products', catalogRoutes);

      const res = await app.request('/v1/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Test Product',
          description: 'A test product',
          featured_image_url: 'https://example.com/image.jpg',
        }),
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.featured_image_url).toBe('https://example.com/image.jpg');
      expect(body.featured_image_alt).toBe(null);
    });

    it('creates product with featured_image_alt', async () => {
      mockDbRun.mockResolvedValueOnce({ changes: 1 });

      const catalogRoutes = await getCatalogRoutes();
      const app = createTestApp();
      app.route('/v1/products', catalogRoutes);

      const res = await app.request('/v1/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Test Product',
          featured_image_url: 'https://example.com/image.jpg',
          featured_image_alt: 'A beautiful product image',
        }),
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.featured_image_url).toBe('https://example.com/image.jpg');
      expect(body.featured_image_alt).toBe('A beautiful product image');
    });

    it('creates product without featured image fields', async () => {
      mockDbRun.mockResolvedValueOnce({ changes: 1 });

      const catalogRoutes = await getCatalogRoutes();
      const app = createTestApp();
      app.route('/v1/products', catalogRoutes);

      const res = await app.request('/v1/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Test Product',
        }),
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.featured_image_url).toBe(null);
      expect(body.featured_image_alt).toBe(null);
    });
  });

  describe('GET /v1/products - List Products', () => {
    it('returns products with featured image fields', async () => {
      mockDbQuery
        .mockResolvedValueOnce([
          {
            id: 'prod-1',
            title: 'Product 1',
            description: 'Description 1',
            featured_image_url: 'https://example.com/prod1.jpg',
            featured_image_alt: 'Product 1 image',
            status: 'active',
            created_at: '2026-01-18T10:00:00.000Z',
          },
          {
            id: 'prod-2',
            title: 'Product 2',
            description: 'Description 2',
            featured_image_url: null,
            featured_image_alt: null,
            status: 'active',
            created_at: '2026-01-18T09:00:00.000Z',
          },
        ])
        .mockResolvedValueOnce([
          {
            id: 'var-1',
            product_id: 'prod-1',
            sku: 'SKU-001',
            title: 'Default',
            price_cents: 1999,
            image_url: 'https://example.com/var1.jpg',
            image_alt: 'Variant 1 alt text',
          },
        ])
        .mockResolvedValueOnce([]); // tags (empty for this test)

      const catalogRoutes = await getCatalogRoutes();
      const app = createTestApp();
      app.route('/v1/products', catalogRoutes);

      const res = await app.request('/v1/products');
      expect(res.status).toBe(200);
      const body = await res.json();

      expect(body.items).toHaveLength(2);
      expect(body.items[0].featured_image_url).toBe('https://example.com/prod1.jpg');
      expect(body.items[0].featured_image_alt).toBe('Product 1 image');
      expect(body.items[0].variants[0].image_alt).toBe('Variant 1 alt text');
      expect(body.items[1].featured_image_url).toBe(null);
      expect(body.items[1].featured_image_alt).toBe(null);
    });
  });

  describe('GET /v1/products/:id - Get Product', () => {
    it('returns product with featured image fields', async () => {
      mockDbQuery
        .mockResolvedValueOnce([
          {
            id: 'prod-1',
            title: 'Test Product',
            description: 'A test product',
            featured_image_url: 'https://example.com/featured.jpg',
            featured_image_alt: 'Featured product image',
            status: 'active',
            created_at: '2026-01-18T10:00:00.000Z',
          },
        ])
        .mockResolvedValueOnce([
          {
            id: 'var-1',
            sku: 'SKU-001',
            title: 'Default',
            price_cents: 2999,
            image_url: 'https://example.com/variant.jpg',
            image_alt: 'Variant image description',
          },
        ])
        .mockResolvedValueOnce([]); // tags (empty for this test)

      const catalogRoutes = await getCatalogRoutes();
      const app = createTestApp();
      app.route('/v1/products', catalogRoutes);

      const res = await app.request('/v1/products/prod-1');
      expect(res.status).toBe(200);
      const body = await res.json();

      expect(body.featured_image_url).toBe('https://example.com/featured.jpg');
      expect(body.featured_image_alt).toBe('Featured product image');
      expect(body.variants[0].image_alt).toBe('Variant image description');
    });
  });

  describe('PATCH /v1/products/:id - Update Product', () => {
    it('updates featured_image_url', async () => {
      mockDbQuery
        .mockResolvedValueOnce([{ id: 'prod-1', store_id: 'store-1' }]) // Check product exists
        .mockResolvedValueOnce([
          {
            id: 'prod-1',
            title: 'Test Product',
            description: 'A test',
            featured_image_url: 'https://example.com/new-image.jpg',
            featured_image_alt: null,
            status: 'active',
          },
        ]) // Fetch updated product
        .mockResolvedValueOnce([]) // Fetch variants
        .mockResolvedValueOnce([]); // Fetch tags

      mockDbRun.mockResolvedValueOnce({ changes: 1 });

      const catalogRoutes = await getCatalogRoutes();
      const app = createTestApp();
      app.route('/v1/products', catalogRoutes);

      const res = await app.request('/v1/products/prod-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          featured_image_url: 'https://example.com/new-image.jpg',
        }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.featured_image_url).toBe('https://example.com/new-image.jpg');
    });

    it('updates featured_image_alt', async () => {
      mockDbQuery
        .mockResolvedValueOnce([{ id: 'prod-1', store_id: 'store-1' }])
        .mockResolvedValueOnce([
          {
            id: 'prod-1',
            title: 'Test Product',
            description: 'A test',
            featured_image_url: 'https://example.com/image.jpg',
            featured_image_alt: 'Updated alt text',
            status: 'active',
          },
        ])
        .mockResolvedValueOnce([]) // variants
        .mockResolvedValueOnce([]); // tags

      mockDbRun.mockResolvedValueOnce({ changes: 1 });

      const catalogRoutes = await getCatalogRoutes();
      const app = createTestApp();
      app.route('/v1/products', catalogRoutes);

      const res = await app.request('/v1/products/prod-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          featured_image_alt: 'Updated alt text',
        }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.featured_image_alt).toBe('Updated alt text');
    });

    it('clears featured_image_url with null', async () => {
      mockDbQuery
        .mockResolvedValueOnce([{ id: 'prod-1', store_id: 'store-1' }])
        .mockResolvedValueOnce([
          {
            id: 'prod-1',
            title: 'Test Product',
            description: 'A test',
            featured_image_url: null,
            featured_image_alt: null,
            status: 'active',
          },
        ])
        .mockResolvedValueOnce([]) // variants
        .mockResolvedValueOnce([]); // tags

      mockDbRun.mockResolvedValueOnce({ changes: 1 });

      const catalogRoutes = await getCatalogRoutes();
      const app = createTestApp();
      app.route('/v1/products', catalogRoutes);

      const res = await app.request('/v1/products/prod-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          featured_image_url: null,
        }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.featured_image_url).toBe(null);
    });
  });
});

describe('Catalog Routes - Variant Image Fields', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setAuthContext('admin');
  });

  describe('POST /v1/products/:id/variants - Create Variant', () => {
    it('creates variant with image_alt', async () => {
      mockDbQuery
        .mockResolvedValueOnce([{ id: 'prod-1', store_id: 'store-1' }]) // Check product exists
        .mockResolvedValueOnce([]); // Check SKU uniqueness

      mockDbRun
        .mockResolvedValueOnce({ changes: 1 }) // Insert variant
        .mockResolvedValueOnce({ changes: 1 }); // Insert inventory

      const catalogRoutes = await getCatalogRoutes();
      const app = createTestApp();
      app.route('/v1/products', catalogRoutes);

      const res = await app.request('/v1/products/prod-1/variants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sku: 'SKU-001',
          title: 'Small',
          price_cents: 1999,
          image_url: 'https://example.com/variant.jpg',
          image_alt: 'Small size variant image',
        }),
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.image_alt).toBe('Small size variant image');
      expect(body.image_url).toBe('https://example.com/variant.jpg');
    });

    it('creates variant without image_alt', async () => {
      mockDbQuery
        .mockResolvedValueOnce([{ id: 'prod-1', store_id: 'store-1' }])
        .mockResolvedValueOnce([]);

      mockDbRun.mockResolvedValueOnce({ changes: 1 }).mockResolvedValueOnce({ changes: 1 });

      const catalogRoutes = await getCatalogRoutes();
      const app = createTestApp();
      app.route('/v1/products', catalogRoutes);

      const res = await app.request('/v1/products/prod-1/variants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sku: 'SKU-001',
          title: 'Small',
          price_cents: 1999,
        }),
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.image_alt).toBe(null);
      expect(body.image_url).toBe(null);
    });
  });

  describe('PATCH /v1/products/:id/variants/:variantId - Update Variant', () => {
    it('updates variant image_alt', async () => {
      mockDbQuery
        .mockResolvedValueOnce([
          { id: 'var-1', product_id: 'prod-1', store_id: 'store-1', sku: 'SKU-001' },
        ])
        .mockResolvedValueOnce([
          {
            id: 'var-1',
            sku: 'SKU-001',
            title: 'Small',
            price_cents: 1999,
            image_url: 'https://example.com/variant.jpg',
            image_alt: 'Updated alt text for variant',
          },
        ]);

      mockDbRun.mockResolvedValueOnce({ changes: 1 });

      const catalogRoutes = await getCatalogRoutes();
      const app = createTestApp();
      app.route('/v1/products', catalogRoutes);

      const res = await app.request('/v1/products/prod-1/variants/var-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_alt: 'Updated alt text for variant',
        }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.image_alt).toBe('Updated alt text for variant');
    });

    it('clears variant image_alt with null', async () => {
      mockDbQuery
        .mockResolvedValueOnce([
          { id: 'var-1', product_id: 'prod-1', store_id: 'store-1', sku: 'SKU-001' },
        ])
        .mockResolvedValueOnce([
          {
            id: 'var-1',
            sku: 'SKU-001',
            title: 'Small',
            price_cents: 1999,
            image_url: 'https://example.com/variant.jpg',
            image_alt: null,
          },
        ]);

      mockDbRun.mockResolvedValueOnce({ changes: 1 });

      const catalogRoutes = await getCatalogRoutes();
      const app = createTestApp();
      app.route('/v1/products', catalogRoutes);

      const res = await app.request('/v1/products/prod-1/variants/var-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_alt: null,
        }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.image_alt).toBe(null);
    });

    it('returns variant with image_alt in response', async () => {
      mockDbQuery
        .mockResolvedValueOnce([
          { id: 'var-1', product_id: 'prod-1', store_id: 'store-1', sku: 'SKU-001' },
        ])
        .mockResolvedValueOnce([
          {
            id: 'var-1',
            sku: 'SKU-001',
            title: 'Small',
            price_cents: 2499,
            image_url: 'https://example.com/variant.jpg',
            image_alt: 'Original alt text',
          },
        ]);

      mockDbRun.mockResolvedValueOnce({ changes: 1 });

      const catalogRoutes = await getCatalogRoutes();
      const app = createTestApp();
      app.route('/v1/products', catalogRoutes);

      const res = await app.request('/v1/products/prod-1/variants/var-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          price_cents: 2499,
        }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty('image_alt');
      expect(body.image_alt).toBe('Original alt text');
    });
  });
});

describe('Catalog Routes - Product Tags', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setAuthContext('admin');
  });

  describe('POST /v1/products - Create Product with Tags', () => {
    it('creates product with tags', async () => {
      mockDbRun
        .mockResolvedValueOnce({ changes: 1 }) // Insert product
        .mockResolvedValueOnce({ changes: 1 }) // Insert tag 1
        .mockResolvedValueOnce({ changes: 1 }); // Insert tag 2

      const catalogRoutes = await getCatalogRoutes();
      const app = createTestApp();
      app.route('/v1/products', catalogRoutes);

      const res = await app.request('/v1/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Tagged Product',
          description: 'A product with tags',
          tags: ['summer', 'new-arrival'],
        }),
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.tags).toEqual(['summer', 'new-arrival']);
    });

    it('creates product without tags', async () => {
      mockDbRun.mockResolvedValueOnce({ changes: 1 });

      const catalogRoutes = await getCatalogRoutes();
      const app = createTestApp();
      app.route('/v1/products', catalogRoutes);

      const res = await app.request('/v1/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'No Tags Product',
        }),
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.tags).toEqual([]);
    });

    it('creates product with empty tags array', async () => {
      mockDbRun.mockResolvedValueOnce({ changes: 1 });

      const catalogRoutes = await getCatalogRoutes();
      const app = createTestApp();
      app.route('/v1/products', catalogRoutes);

      const res = await app.request('/v1/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Empty Tags Product',
          tags: [],
        }),
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.tags).toEqual([]);
    });

    it('normalizes tags to lowercase and trims whitespace', async () => {
      mockDbRun
        .mockResolvedValueOnce({ changes: 1 })
        .mockResolvedValueOnce({ changes: 1 })
        .mockResolvedValueOnce({ changes: 1 });

      const catalogRoutes = await getCatalogRoutes();
      const app = createTestApp();
      app.route('/v1/products', catalogRoutes);

      const res = await app.request('/v1/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Normalized Tags Product',
          tags: ['  SUMMER  ', 'New-Arrival'],
        }),
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.tags).toEqual(['summer', 'new-arrival']);
    });

    it('removes duplicate tags', async () => {
      mockDbRun
        .mockResolvedValueOnce({ changes: 1 }) // Insert product
        .mockResolvedValueOnce({ changes: 1 }); // Insert single unique tag

      const catalogRoutes = await getCatalogRoutes();
      const app = createTestApp();
      app.route('/v1/products', catalogRoutes);

      const res = await app.request('/v1/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Duplicate Tags Product',
          tags: ['summer', 'SUMMER', 'summer'],
        }),
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.tags).toEqual(['summer']);
    });
  });

  describe('GET /v1/products - List Products with Tags', () => {
    it('returns products with tags', async () => {
      // First query: get products
      mockDbQuery
        .mockResolvedValueOnce([
          {
            id: 'prod-1',
            title: 'Product 1',
            description: 'Description 1',
            featured_image_url: null,
            featured_image_alt: null,
            status: 'active',
            created_at: '2026-01-18T10:00:00.000Z',
          },
          {
            id: 'prod-2',
            title: 'Product 2',
            description: 'Description 2',
            featured_image_url: null,
            featured_image_alt: null,
            status: 'active',
            created_at: '2026-01-18T09:00:00.000Z',
          },
        ])
        // Second query: get variants
        .mockResolvedValueOnce([])
        // Third query: get tags for all products
        .mockResolvedValueOnce([
          { product_id: 'prod-1', tag: 'summer' },
          { product_id: 'prod-1', tag: 'sale' },
          { product_id: 'prod-2', tag: 'new-arrival' },
        ]);

      const catalogRoutes = await getCatalogRoutes();
      const app = createTestApp();
      app.route('/v1/products', catalogRoutes);

      const res = await app.request('/v1/products');
      expect(res.status).toBe(200);
      const body = await res.json();

      expect(body.items).toHaveLength(2);
      expect(body.items[0].tags).toEqual(['summer', 'sale']);
      expect(body.items[1].tags).toEqual(['new-arrival']);
    });

    it('returns empty tags array for products without tags', async () => {
      mockDbQuery
        .mockResolvedValueOnce([
          {
            id: 'prod-1',
            title: 'Product 1',
            description: 'Description 1',
            featured_image_url: null,
            featured_image_alt: null,
            status: 'active',
            created_at: '2026-01-18T10:00:00.000Z',
          },
        ])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]); // No tags

      const catalogRoutes = await getCatalogRoutes();
      const app = createTestApp();
      app.route('/v1/products', catalogRoutes);

      const res = await app.request('/v1/products');
      expect(res.status).toBe(200);
      const body = await res.json();

      expect(body.items[0].tags).toEqual([]);
    });
  });

  describe('GET /v1/products/:id - Get Product with Tags', () => {
    it('returns product with tags', async () => {
      mockDbQuery
        .mockResolvedValueOnce([
          {
            id: 'prod-1',
            title: 'Test Product',
            description: 'A test product',
            featured_image_url: null,
            featured_image_alt: null,
            status: 'active',
            created_at: '2026-01-18T10:00:00.000Z',
          },
        ])
        .mockResolvedValueOnce([]) // variants
        .mockResolvedValueOnce([{ tag: 'summer' }, { tag: 'bestseller' }]); // tags

      const catalogRoutes = await getCatalogRoutes();
      const app = createTestApp();
      app.route('/v1/products', catalogRoutes);

      const res = await app.request('/v1/products/prod-1');
      expect(res.status).toBe(200);
      const body = await res.json();

      expect(body.tags).toEqual(['summer', 'bestseller']);
    });

    it('returns empty tags array when product has no tags', async () => {
      mockDbQuery
        .mockResolvedValueOnce([
          {
            id: 'prod-1',
            title: 'Test Product',
            description: 'A test product',
            featured_image_url: null,
            featured_image_alt: null,
            status: 'active',
            created_at: '2026-01-18T10:00:00.000Z',
          },
        ])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]); // No tags

      const catalogRoutes = await getCatalogRoutes();
      const app = createTestApp();
      app.route('/v1/products', catalogRoutes);

      const res = await app.request('/v1/products/prod-1');
      expect(res.status).toBe(200);
      const body = await res.json();

      expect(body.tags).toEqual([]);
    });
  });

  describe('PATCH /v1/products/:id - Update Product Tags', () => {
    it('updates product tags (syncs by delete+insert)', async () => {
      mockDbQuery
        .mockResolvedValueOnce([{ id: 'prod-1', store_id: 'store-1' }]) // Check product exists
        .mockResolvedValueOnce([
          {
            id: 'prod-1',
            title: 'Test Product',
            description: 'A test',
            featured_image_url: null,
            featured_image_alt: null,
            status: 'active',
          },
        ])
        .mockResolvedValueOnce([]) // variants
        .mockResolvedValueOnce([{ tag: 'winter' }, { tag: 'clearance' }]); // tags after update

      mockDbRun
        .mockResolvedValueOnce({ changes: 0 }) // No field updates (only tags)
        .mockResolvedValueOnce({ changes: 2 }) // Delete old tags
        .mockResolvedValueOnce({ changes: 1 }) // Insert new tag 1
        .mockResolvedValueOnce({ changes: 1 }); // Insert new tag 2

      const catalogRoutes = await getCatalogRoutes();
      const app = createTestApp();
      app.route('/v1/products', catalogRoutes);

      const res = await app.request('/v1/products/prod-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tags: ['winter', 'clearance'],
        }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.tags).toEqual(['winter', 'clearance']);
    });

    it('clears all tags with empty array', async () => {
      mockDbQuery
        .mockResolvedValueOnce([{ id: 'prod-1', store_id: 'store-1' }])
        .mockResolvedValueOnce([
          {
            id: 'prod-1',
            title: 'Test Product',
            description: 'A test',
            featured_image_url: null,
            featured_image_alt: null,
            status: 'active',
          },
        ])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]); // No tags after clear

      mockDbRun.mockResolvedValueOnce({ changes: 3 }); // Delete old tags

      const catalogRoutes = await getCatalogRoutes();
      const app = createTestApp();
      app.route('/v1/products', catalogRoutes);

      const res = await app.request('/v1/products/prod-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tags: [],
        }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.tags).toEqual([]);
    });

    it('updates tags along with other fields', async () => {
      mockDbQuery
        .mockResolvedValueOnce([{ id: 'prod-1', store_id: 'store-1' }])
        .mockResolvedValueOnce([
          {
            id: 'prod-1',
            title: 'Updated Title',
            description: 'A test',
            featured_image_url: null,
            featured_image_alt: null,
            status: 'active',
          },
        ])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ tag: 'featured' }]);

      mockDbRun
        .mockResolvedValueOnce({ changes: 1 }) // Update title
        .mockResolvedValueOnce({ changes: 1 }) // Delete old tags
        .mockResolvedValueOnce({ changes: 1 }); // Insert new tag

      const catalogRoutes = await getCatalogRoutes();
      const app = createTestApp();
      app.route('/v1/products', catalogRoutes);

      const res = await app.request('/v1/products/prod-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Updated Title',
          tags: ['featured'],
        }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.title).toBe('Updated Title');
      expect(body.tags).toEqual(['featured']);
    });

    it('preserves existing tags when tags field not provided', async () => {
      mockDbQuery
        .mockResolvedValueOnce([{ id: 'prod-1', store_id: 'store-1' }])
        .mockResolvedValueOnce([
          {
            id: 'prod-1',
            title: 'Updated Title',
            description: 'A test',
            featured_image_url: null,
            featured_image_alt: null,
            status: 'active',
          },
        ])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ tag: 'existing-tag' }]); // Existing tags preserved

      mockDbRun.mockResolvedValueOnce({ changes: 1 }); // Only title update

      const catalogRoutes = await getCatalogRoutes();
      const app = createTestApp();
      app.route('/v1/products', catalogRoutes);

      const res = await app.request('/v1/products/prod-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Updated Title',
          // Note: no tags field provided
        }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.tags).toEqual(['existing-tag']);
    });
  });

  describe('DELETE /v1/products/:id - Delete Product with Tags', () => {
    it('deletes product and its tags are cascaded', async () => {
      mockDbQuery
        .mockResolvedValueOnce([{ id: 'prod-1', store_id: 'store-1' }]) // Product exists
        .mockResolvedValueOnce([]); // No variants

      mockDbRun
        .mockResolvedValueOnce({ changes: 1 }) // Delete product (tags cascade automatically)
        .mockResolvedValueOnce({ changes: 0 }); // Delete variants (none)

      const catalogRoutes = await getCatalogRoutes();
      const app = createTestApp();
      app.route('/v1/products', catalogRoutes);

      const res = await app.request('/v1/products/prod-1', {
        method: 'DELETE',
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.deleted).toBe(true);
    });
  });
});
