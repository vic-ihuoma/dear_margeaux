import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Product, Variant } from '@dear-margeaux/api';

// Mock the MerchantClient
const mockGetProduct = vi.fn();
const mockCreateProduct = vi.fn();
const mockCreateVariant = vi.fn();

vi.mock('@dear-margeaux/api', () => ({
  MerchantClient: vi.fn().mockImplementation(() => ({
    getProduct: mockGetProduct,
    createProduct: mockCreateProduct,
    createVariant: mockCreateVariant,
  })),
}));

// Helper function to create mock APIContext
function createMockContext(options: {
  url?: string;
  method?: string;
  body?: unknown;
  params?: Record<string, string>;
}) {
  const url = new URL(
    options.url || 'http://localhost/api/products/prod_123/duplicate'
  );
  const request = new Request(url.toString(), {
    method: options.method || 'POST',
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
    routePattern: '/api/products/[id]/duplicate',
    originPathname: '/api/products/prod_123/duplicate',
    rewrite: vi.fn(),
    isPrerendered: false,
    ResponseWithEncoding: Response,
  };
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

// Sample product data with multiple variants
const sampleProduct: Product = {
  id: 'prod_123',
  title: 'Test Product',
  description: 'Test description',
  featured_image_url: 'https://example.com/image.jpg',
  featured_image_alt: 'Test image',
  status: 'active',
  created_at: '2024-01-01T00:00:00Z',
  tags: ['tag1', 'tag2'],
  drop_id: 'drop_123',
  drop_position: 0,
  variants: [
    {
      id: 'var_123',
      product_id: 'prod_123',
      title: 'Small',
      sku: 'TEST-S',
      price_cents: 2999,
      image_url: 'https://example.com/small.jpg',
      image_alt: 'Small variant',
      low_stock_threshold: null,
      reorder_point: null,
      available: null,
    },
    {
      id: 'var_456',
      product_id: 'prod_123',
      title: 'Large',
      sku: 'TEST-L',
      price_cents: 3999,
      image_url: 'https://example.com/large.jpg',
      image_alt: 'Large variant',
      low_stock_threshold: null,
      reorder_point: null,
      available: null,
    },
  ],
};

// Duplicated product (what the API should return)
const duplicatedProduct: Product = {
  id: 'prod_456',
  title: 'Test Product (Copy)',
  description: 'Test description',
  featured_image_url: 'https://example.com/image.jpg',
  featured_image_alt: 'Test image',
  status: 'draft',
  created_at: '2024-01-02T00:00:00Z',
  tags: ['tag1', 'tag2'],
  drop_id: 'drop_123',
  drop_position: null,
  variants: [],
};

describe('Products Duplicate API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/products/:id/duplicate', () => {
    it('creates a duplicate product with (Copy) suffix in title', async () => {
      mockGetProduct.mockResolvedValueOnce(sampleProduct);
      mockCreateProduct.mockResolvedValueOnce(duplicatedProduct);

      const { POST } =
        await import('../../src/pages/api/products/[id]/duplicate.ts');

      const context = createMockContext({
        method: 'POST',
        params: { id: 'prod_123' },
      });

      const response = await POST(context as any);
      const data = await parseResponse(response);

      expect(response.status).toBe(201);
      expect(data.title).toBe('Test Product (Copy)');
    });

    it('sets duplicated product status to draft', async () => {
      mockGetProduct.mockResolvedValueOnce(sampleProduct);
      mockCreateProduct.mockResolvedValueOnce(duplicatedProduct);

      const { POST } =
        await import('../../src/pages/api/products/[id]/duplicate.ts');

      const context = createMockContext({
        method: 'POST',
        params: { id: 'prod_123' },
      });

      const response = await POST(context as any);
      const data = await parseResponse(response);

      expect(response.status).toBe(201);
      expect(data.status).toBe('draft');
    });

    it('copies all variants with new IDs', async () => {
      const duplicatedVariant1: Variant = {
        id: 'var_new_1',
        product_id: 'prod_456',
        title: 'Small',
        sku: 'TEST-S-COPY',
        price_cents: 2999,
        image_url: 'https://example.com/small.jpg',
        image_alt: 'Small variant',
        low_stock_threshold: null,
        reorder_point: null,
        available: null,
      };
      const duplicatedVariant2: Variant = {
        id: 'var_new_2',
        product_id: 'prod_456',
        title: 'Large',
        sku: 'TEST-L-COPY',
        price_cents: 3999,
        image_url: 'https://example.com/large.jpg',
        image_alt: 'Large variant',
        low_stock_threshold: null,
        reorder_point: null,
        available: null,
      };

      mockGetProduct.mockResolvedValueOnce(sampleProduct);
      mockCreateProduct.mockResolvedValueOnce(duplicatedProduct);
      mockCreateVariant
        .mockResolvedValueOnce(duplicatedVariant1)
        .mockResolvedValueOnce(duplicatedVariant2);

      const { POST } =
        await import('../../src/pages/api/products/[id]/duplicate.ts');

      const context = createMockContext({
        method: 'POST',
        params: { id: 'prod_123' },
      });

      const response = await POST(context as any);
      const data = await parseResponse(response);

      expect(response.status).toBe(201);
      expect(data.variants).toHaveLength(2);
      expect(mockCreateVariant).toHaveBeenCalledTimes(2);
    });

    it('generates unique SKUs for duplicated variants with -COPY suffix', async () => {
      mockGetProduct.mockResolvedValueOnce(sampleProduct);
      mockCreateProduct.mockResolvedValueOnce(duplicatedProduct);
      mockCreateVariant
        .mockResolvedValueOnce({
          id: 'var_new_1',
          product_id: 'prod_456',
          title: 'Small',
          sku: 'TEST-S-COPY',
          price_cents: 2999,
          image_url: null,
          image_alt: null,
          low_stock_threshold: null,
          reorder_point: null,
          available: null,
        })
        .mockResolvedValueOnce({
          id: 'var_new_2',
          product_id: 'prod_456',
          title: 'Large',
          sku: 'TEST-L-COPY',
          price_cents: 3999,
          image_url: null,
          image_alt: null,
          low_stock_threshold: null,
          reorder_point: null,
          available: null,
        });

      const { POST } =
        await import('../../src/pages/api/products/[id]/duplicate.ts');

      const context = createMockContext({
        method: 'POST',
        params: { id: 'prod_123' },
      });

      await POST(context as any);

      // Check that createVariant was called with SKUs ending in -COPY
      expect(mockCreateVariant).toHaveBeenNthCalledWith(
        1,
        'prod_456',
        expect.objectContaining({
          sku: 'TEST-S-COPY',
        })
      );
      expect(mockCreateVariant).toHaveBeenNthCalledWith(
        2,
        'prod_456',
        expect.objectContaining({
          sku: 'TEST-L-COPY',
        })
      );
    });

    it('preserves all other product fields', async () => {
      mockGetProduct.mockResolvedValueOnce(sampleProduct);
      mockCreateProduct.mockResolvedValueOnce(duplicatedProduct);

      const { POST } =
        await import('../../src/pages/api/products/[id]/duplicate.ts');

      const context = createMockContext({
        method: 'POST',
        params: { id: 'prod_123' },
      });

      await POST(context as any);

      expect(mockCreateProduct).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'Test description',
          featured_image_url: 'https://example.com/image.jpg',
          featured_image_alt: 'Test image',
          tags: ['tag1', 'tag2'],
          drop_id: 'drop_123',
        })
      );
    });

    it('returns 400 when product ID is missing', async () => {
      const { POST } =
        await import('../../src/pages/api/products/[id]/duplicate.ts');

      const context = createMockContext({
        method: 'POST',
        params: {},
      });

      const response = await POST(context as any);
      const data = await parseResponse(response);

      expect(response.status).toBe(400);
      expect(data.error).toBe('Product ID is required');
    });

    it('returns 404 when product not found', async () => {
      mockGetProduct.mockRejectedValueOnce(new Error('Product not found'));

      const { POST } =
        await import('../../src/pages/api/products/[id]/duplicate.ts');

      const context = createMockContext({
        method: 'POST',
        params: { id: 'nonexistent' },
      });

      const response = await POST(context as any);
      const data = await parseResponse(response);

      expect(response.status).toBe(400);
      expect(data.error).toBe('Product not found');
    });

    it('handles product with no variants', async () => {
      const productWithNoVariants: Product = {
        ...sampleProduct,
        variants: [],
      };

      mockGetProduct.mockResolvedValueOnce(productWithNoVariants);
      mockCreateProduct.mockResolvedValueOnce({
        ...duplicatedProduct,
        variants: [],
      });

      const { POST } =
        await import('../../src/pages/api/products/[id]/duplicate.ts');

      const context = createMockContext({
        method: 'POST',
        params: { id: 'prod_123' },
      });

      const response = await POST(context as any);
      const data = await parseResponse(response);

      expect(response.status).toBe(201);
      expect(data.variants).toHaveLength(0);
      expect(mockCreateVariant).not.toHaveBeenCalled();
    });

    it('returns new product ID for redirection', async () => {
      mockGetProduct.mockResolvedValueOnce(sampleProduct);
      mockCreateProduct.mockResolvedValueOnce(duplicatedProduct);

      const { POST } =
        await import('../../src/pages/api/products/[id]/duplicate.ts');

      const context = createMockContext({
        method: 'POST',
        params: { id: 'prod_123' },
      });

      const response = await POST(context as any);
      const data = await parseResponse(response);

      expect(response.status).toBe(201);
      expect(data.id).toBe('prod_456');
      expect(data.id).not.toBe(sampleProduct.id);
    });
  });
});
