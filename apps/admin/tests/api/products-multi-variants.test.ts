import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { APIContext } from 'astro';
import type { Product, Variant } from '@dear-margeaux/api';

// Mock the MerchantClient
const mockCreateProduct = vi.fn();
const mockCreateVariant = vi.fn();

vi.mock('@dear-margeaux/api', () => ({
  MerchantClient: vi.fn().mockImplementation(() => ({
    getProducts: vi.fn(),
    getProduct: vi.fn(),
    createProduct: mockCreateProduct,
    createVariant: mockCreateVariant,
    updateProduct: vi.fn(),
    deleteProduct: vi.fn(),
  })),
}));

// Helper function to create mock APIContext
function createMockContext(options: {
  url?: string;
  method?: string;
  body?: unknown;
  params?: Record<string, string>;
}): APIContext {
  const url = new URL(options.url || 'http://localhost/api/products');
  const request = new Request(url.toString(), {
    method: options.method || 'GET',
    body: options.body ? JSON.stringify(options.body) : undefined,
    headers: options.body ? { 'Content-Type': 'application/json' } : undefined,
  });

  return {
    url,
    request,
    params: options.params || {},
    redirect: vi.fn(),
    locals: {},
    cookies: {
      get: vi.fn(),
      set: vi.fn(),
      delete: vi.fn(),
      has: vi.fn(),
      headers: vi.fn(),
    },
    site: new URL('http://localhost'),
    generator: 'test',
    props: {},
    slots: {},
    clientAddress: '127.0.0.1',
    preferredLocale: undefined,
    preferredLocaleList: undefined,
    currentLocale: undefined,
    getActionResult: vi.fn(),
    callAction: vi.fn(),
    routePattern: '/api/products',
    originPathname: '/api/products',
    rewrite: vi.fn(),
    isPrerendered: false,
    ResponseWithEncoding: Response,
    csp: { nonce: '' },
  } as unknown as APIContext;
}

// Helper to parse response
async function parseResponse(response: Response) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

// Sample product data
const sampleProduct: Omit<Product, 'variants'> = {
  id: 'prod_123',
  title: 'Test Product',
  description: 'Test description',
  featured_image_url: null,
  featured_image_alt: null,
  status: 'active',
  created_at: '2024-01-01T00:00:00Z',
  tags: [],
  drop_id: null,
  drop_position: null,
};

// Sample variant data
const createSampleVariant = (productId: string, index: number): Variant => ({
  id: `var_${index}`,
  product_id: productId,
  title: `Variant ${index}`,
  sku: `SKU-${index}`,
  price_cents: 1000 + index * 100,
  image_url: null,
  image_alt: null,
  low_stock_threshold: null,
  reorder_point: null,
  available: null,
});

describe('Products API - Multiple Variants Support (pm-40)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateProduct.mockResolvedValue({ ...sampleProduct, variants: [] });
  });

  describe('POST /api/products with variants array', () => {
    it('accepts variants array in request body', async () => {
      const variant1 = createSampleVariant('prod_123', 1);
      const variant2 = createSampleVariant('prod_123', 2);
      mockCreateVariant
        .mockResolvedValueOnce(variant1)
        .mockResolvedValueOnce(variant2);

      const { POST } = await import('../../src/pages/api/products/index.ts');

      const context = createMockContext({
        method: 'POST',
        body: {
          title: 'Test Product',
          description: 'Test description',
          variants: [
            { sku: 'SKU-1', title: 'Variant 1', price_cents: 1100 },
            { sku: 'SKU-2', title: 'Variant 2', price_cents: 1200 },
          ],
        },
      });

      const response = await POST(context);
      const data = await parseResponse(response);

      expect(response.status).toBe(201);
      expect(Array.isArray(data.variants)).toBe(true);
    });

    it('creates all variants in the array', async () => {
      const variants = [1, 2, 3].map((i) => createSampleVariant('prod_123', i));
      mockCreateVariant
        .mockResolvedValueOnce(variants[0])
        .mockResolvedValueOnce(variants[1])
        .mockResolvedValueOnce(variants[2]);

      const { POST } = await import('../../src/pages/api/products/index.ts');

      const context = createMockContext({
        method: 'POST',
        body: {
          title: 'Test Product',
          variants: [
            { sku: 'SKU-1', title: 'Variant 1', price_cents: 1100 },
            { sku: 'SKU-2', title: 'Variant 2', price_cents: 1200 },
            { sku: 'SKU-3', title: 'Variant 3', price_cents: 1300 },
          ],
        },
      });

      const response = await POST(context);

      expect(response.status).toBe(201);
      expect(mockCreateVariant).toHaveBeenCalledTimes(3);
    });

    it('response includes all created variants', async () => {
      const variants = [1, 2].map((i) => createSampleVariant('prod_123', i));
      mockCreateVariant
        .mockResolvedValueOnce(variants[0])
        .mockResolvedValueOnce(variants[1]);

      const { POST } = await import('../../src/pages/api/products/index.ts');

      const context = createMockContext({
        method: 'POST',
        body: {
          title: 'Test Product',
          variants: [
            { sku: 'SKU-1', title: 'Variant 1', price_cents: 1100 },
            { sku: 'SKU-2', title: 'Variant 2', price_cents: 1200 },
          ],
        },
      });

      const response = await POST(context);
      const data = await parseResponse(response);

      expect(data.variants).toHaveLength(2);
      expect(data.variants[0].sku).toBe('SKU-1');
      expect(data.variants[1].sku).toBe('SKU-2');
    });

    it('variants have correct product_id foreign key', async () => {
      mockCreateVariant.mockResolvedValueOnce(
        createSampleVariant('prod_123', 1)
      );

      const { POST } = await import('../../src/pages/api/products/index.ts');

      const context = createMockContext({
        method: 'POST',
        body: {
          title: 'Test Product',
          variants: [{ sku: 'SKU-1', title: 'Variant 1', price_cents: 1100 }],
        },
      });

      await POST(context);

      expect(mockCreateVariant).toHaveBeenCalledWith('prod_123', {
        sku: 'SKU-1',
        title: 'Variant 1',
        price_cents: 1100,
        image_url: undefined,
        image_alt: undefined,
      });
    });

    it('returns error if variant creation fails', async () => {
      mockCreateVariant.mockRejectedValueOnce(new Error('Duplicate SKU'));

      const { POST } = await import('../../src/pages/api/products/index.ts');

      const context = createMockContext({
        method: 'POST',
        body: {
          title: 'Test Product',
          variants: [{ sku: 'SKU-1', title: 'Variant 1', price_cents: 1100 }],
        },
      });

      const response = await POST(context);
      const data = await parseResponse(response);

      expect(response.status).toBe(400);
      expect(data.error).toBe('Duplicate SKU');
    });

    it('creates product-only when no variants provided', async () => {
      const { POST } = await import('../../src/pages/api/products/index.ts');

      const context = createMockContext({
        method: 'POST',
        body: {
          title: 'Test Product',
        },
      });

      const response = await POST(context);
      const data = await parseResponse(response);

      expect(response.status).toBe(201);
      expect(mockCreateVariant).not.toHaveBeenCalled();
      expect(data.variants).toEqual([]);
    });

    it('creates product-only when variants is empty array', async () => {
      const { POST } = await import('../../src/pages/api/products/index.ts');

      const context = createMockContext({
        method: 'POST',
        body: {
          title: 'Test Product',
          variants: [],
        },
      });

      const response = await POST(context);
      const data = await parseResponse(response);

      expect(response.status).toBe(201);
      expect(mockCreateVariant).not.toHaveBeenCalled();
      expect(data.variants).toEqual([]);
    });

    it('handles partial variant data with optional fields', async () => {
      mockCreateVariant.mockResolvedValueOnce(
        createSampleVariant('prod_123', 1)
      );

      const { POST } = await import('../../src/pages/api/products/index.ts');

      const context = createMockContext({
        method: 'POST',
        body: {
          title: 'Test Product',
          variants: [
            {
              sku: 'SKU-1',
              title: 'Variant 1',
              price_cents: 1100,
              image_url: 'https://example.com/image.jpg',
              image_alt: 'Product image',
            },
          ],
        },
      });

      await POST(context);

      expect(mockCreateVariant).toHaveBeenCalledWith('prod_123', {
        sku: 'SKU-1',
        title: 'Variant 1',
        price_cents: 1100,
        image_url: 'https://example.com/image.jpg',
        image_alt: 'Product image',
      });
    });
  });

  describe('backwards compatibility with single variant fields', () => {
    it('still accepts legacy single variant fields (sku, variant_title, price_cents)', async () => {
      mockCreateVariant.mockResolvedValueOnce(
        createSampleVariant('prod_123', 1)
      );

      const { POST } = await import('../../src/pages/api/products/index.ts');

      const context = createMockContext({
        method: 'POST',
        body: {
          title: 'Test Product',
          sku: 'LEGACY-SKU',
          variant_title: 'Default',
          price_cents: 2500,
        },
      });

      const response = await POST(context);

      expect(response.status).toBe(201);
      expect(mockCreateVariant).toHaveBeenCalled();
    });

    it('prefers variants array over legacy single variant fields', async () => {
      const variant = createSampleVariant('prod_123', 1);
      mockCreateVariant.mockResolvedValueOnce(variant);

      const { POST } = await import('../../src/pages/api/products/index.ts');

      const context = createMockContext({
        method: 'POST',
        body: {
          title: 'Test Product',
          // Legacy fields
          sku: 'LEGACY-SKU',
          variant_title: 'Default',
          price_cents: 2500,
          // New array format (should take precedence)
          variants: [
            { sku: 'ARRAY-SKU', title: 'From Array', price_cents: 3000 },
          ],
        },
      });

      const response = await POST(context);
      await parseResponse(response);

      expect(response.status).toBe(201);
      // Should only create variant from array, not legacy fields
      expect(mockCreateVariant).toHaveBeenCalledTimes(1);
      expect(mockCreateVariant).toHaveBeenCalledWith('prod_123', {
        sku: 'ARRAY-SKU',
        title: 'From Array',
        price_cents: 3000,
        image_url: undefined,
        image_alt: undefined,
      });
    });
  });

  describe('validation', () => {
    it('validates each variant has required fields', async () => {
      const { POST } = await import('../../src/pages/api/products/index.ts');

      const context = createMockContext({
        method: 'POST',
        body: {
          title: 'Test Product',
          variants: [
            { title: 'Variant 1', price_cents: 1100 }, // Missing sku
          ],
        },
      });

      const response = await POST(context);
      const data = await parseResponse(response);

      expect(response.status).toBe(400);
      expect(data.error).toContain('SKU');
    });

    it('validates variant title is required', async () => {
      const { POST } = await import('../../src/pages/api/products/index.ts');

      const context = createMockContext({
        method: 'POST',
        body: {
          title: 'Test Product',
          variants: [
            { sku: 'SKU-1', price_cents: 1100 }, // Missing title
          ],
        },
      });

      const response = await POST(context);
      const data = await parseResponse(response);

      expect(response.status).toBe(400);
      expect(data.error).toContain('title');
    });

    it('validates variant price is required', async () => {
      const { POST } = await import('../../src/pages/api/products/index.ts');

      const context = createMockContext({
        method: 'POST',
        body: {
          title: 'Test Product',
          variants: [
            { sku: 'SKU-1', title: 'Variant 1' }, // Missing price_cents
          ],
        },
      });

      const response = await POST(context);
      const data = await parseResponse(response);

      expect(response.status).toBe(400);
      expect(data.error).toContain('price');
    });
  });
});
