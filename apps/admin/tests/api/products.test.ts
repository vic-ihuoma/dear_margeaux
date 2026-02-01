import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { APIContext } from 'astro';
import type {
  Product,
  PaginatedResponse,
  ProductListItem,
} from '@dear-margeaux/api';

// Mock the MerchantClient
const mockGetProducts = vi.fn();
const mockGetProduct = vi.fn();
const mockCreateProduct = vi.fn();
const mockUpdateProduct = vi.fn();
const mockDeleteProduct = vi.fn();

vi.mock('@dear-margeaux/api', () => ({
  MerchantClient: vi.fn().mockImplementation(() => ({
    getProducts: mockGetProducts,
    getProduct: mockGetProduct,
    createProduct: mockCreateProduct,
    updateProduct: mockUpdateProduct,
    deleteProduct: mockDeleteProduct,
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
const sampleProduct: Product = {
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
  variants: [
    {
      id: 'var_123',
      product_id: 'prod_123',
      title: 'Default',
      sku: 'TEST-001',
      price_cents: 2999,
      image_url: null,
      image_alt: null,
      low_stock_threshold: null,
      reorder_point: null,
      available: null,
    },
  ],
};

describe('Products API Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/products', () => {
    it('returns product list successfully', async () => {
      const listResponse: PaginatedResponse<ProductListItem> = {
        items: [
          {
            id: sampleProduct.id,
            title: sampleProduct.title,
            description: sampleProduct.description,
            featured_image_url: sampleProduct.featured_image_url,
            featured_image_alt: sampleProduct.featured_image_alt,
            status: sampleProduct.status,
            created_at: sampleProduct.created_at,
            tags: sampleProduct.tags,
            drop_id: sampleProduct.drop_id,
            drop_position: sampleProduct.drop_position,
          },
        ],
        pagination: { has_more: false, next_cursor: null },
      };
      mockGetProducts.mockResolvedValueOnce(listResponse);
      mockGetProduct.mockResolvedValueOnce(sampleProduct);

      const { GET } = await import('../../src/pages/api/products/index.ts');

      const context = createMockContext({
        url: 'http://localhost/api/products',
      });

      const response = await GET(context);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.items).toHaveLength(1);
      expect(data.items[0].title).toBe('Test Product');
    });

    it('passes pagination parameters correctly', async () => {
      const listResponse: PaginatedResponse<ProductListItem> = {
        items: [],
        pagination: { has_more: false, next_cursor: null },
      };
      mockGetProducts.mockResolvedValueOnce(listResponse);

      const { GET } = await import('../../src/pages/api/products/index.ts');

      const context = createMockContext({
        url: 'http://localhost/api/products?limit=50',
      });

      await GET(context);

      expect(mockGetProducts).toHaveBeenCalledWith({
        limit: 50,
      });
    });

    it('passes status filter correctly', async () => {
      const listResponse: PaginatedResponse<ProductListItem> = {
        items: [],
        pagination: { has_more: false, next_cursor: null },
      };
      mockGetProducts.mockResolvedValueOnce(listResponse);

      const { GET } = await import('../../src/pages/api/products/index.ts');

      const context = createMockContext({
        url: 'http://localhost/api/products?status=draft',
      });

      await GET(context);

      expect(mockGetProducts).toHaveBeenCalledWith({
        limit: 100,
        status: 'draft',
      });
    });

    it('handles empty response', async () => {
      const listResponse: PaginatedResponse<ProductListItem> = {
        items: [],
        pagination: { has_more: false, next_cursor: null },
      };
      mockGetProducts.mockResolvedValueOnce(listResponse);

      const { GET } = await import('../../src/pages/api/products/index.ts');

      const context = createMockContext({
        url: 'http://localhost/api/products',
      });

      const response = await GET(context);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.items).toHaveLength(0);
    });

    it('handles API errors gracefully', async () => {
      mockGetProducts.mockRejectedValueOnce(new Error('API Error'));

      const { GET } = await import('../../src/pages/api/products/index.ts');

      const context = createMockContext({
        url: 'http://localhost/api/products',
      });

      const response = await GET(context);
      const data = await parseResponse(response);

      expect(response.status).toBe(400);
      expect(data.error).toBe('API Error');
    });
  });

  describe('POST /api/products', () => {
    it('creates product with valid data', async () => {
      mockCreateProduct.mockResolvedValueOnce(sampleProduct);

      const { POST } = await import('../../src/pages/api/products/index.ts');

      const context = createMockContext({
        method: 'POST',
        body: {
          title: 'Test Product',
          description: 'Test description',
          status: 'active',
        },
      });

      const response = await POST(context);
      const data = await parseResponse(response);

      expect(response.status).toBe(201);
      expect(data.title).toBe('Test Product');
      expect(mockCreateProduct).toHaveBeenCalledWith({
        title: 'Test Product',
        description: 'Test description',
        status: 'active',
      });
    });

    it('handles validation errors', async () => {
      mockCreateProduct.mockRejectedValueOnce(new Error('Title is required'));

      const { POST } = await import('../../src/pages/api/products/index.ts');

      const context = createMockContext({
        method: 'POST',
        body: { title: '' },
      });

      const response = await POST(context);
      const data = await parseResponse(response);

      expect(response.status).toBe(400);
      expect(data.error).toBe('Title is required');
    });
  });

  describe('PATCH /api/products/:id', () => {
    it('updates product successfully', async () => {
      const updatedProduct = { ...sampleProduct, title: 'Updated Product' };
      mockUpdateProduct.mockResolvedValueOnce(updatedProduct);

      const { PATCH } = await import('../../src/pages/api/products/[id].ts');

      const context = createMockContext({
        method: 'PATCH',
        params: { id: 'prod_123' },
        body: { title: 'Updated Product' },
      });

      const response = await PATCH(context);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.title).toBe('Updated Product');
      expect(mockUpdateProduct).toHaveBeenCalledWith('prod_123', {
        title: 'Updated Product',
        description: undefined,
        status: undefined,
      });
    });

    it('returns 400 when product ID is missing', async () => {
      const { PATCH } = await import('../../src/pages/api/products/[id].ts');

      const context = createMockContext({
        method: 'PATCH',
        params: {},
        body: { title: 'Updated Product' },
      });

      const response = await PATCH(context);
      const data = await parseResponse(response);

      expect(response.status).toBe(400);
      expect(data.error).toBe('Product ID is required');
    });

    it('handles not found errors', async () => {
      mockUpdateProduct.mockRejectedValueOnce(new Error('Product not found'));

      const { PATCH } = await import('../../src/pages/api/products/[id].ts');

      const context = createMockContext({
        method: 'PATCH',
        params: { id: 'nonexistent' },
        body: { title: 'Updated Product' },
      });

      const response = await PATCH(context);
      const data = await parseResponse(response);

      expect(response.status).toBe(400);
      expect(data.error).toBe('Product not found');
    });
  });

  describe('DELETE /api/products/:id', () => {
    it('deletes product successfully', async () => {
      const deletedProduct = {
        id: 'prod_123',
        title: 'Test Product',
        deleted_at: new Date().toISOString(),
      };
      mockDeleteProduct.mockResolvedValueOnce(deletedProduct);

      const { DELETE } = await import('../../src/pages/api/products/[id].ts');

      const context = createMockContext({
        method: 'DELETE',
        params: { id: 'prod_123' },
      });

      const response = await DELETE(context);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.id).toBe('prod_123');
      expect(data.deleted_at).toBeDefined();
      expect(mockDeleteProduct).toHaveBeenCalledWith('prod_123');
    });

    it('returns 400 when product ID is missing', async () => {
      const { DELETE } = await import('../../src/pages/api/products/[id].ts');

      const context = createMockContext({
        method: 'DELETE',
        params: {},
      });

      const response = await DELETE(context);
      const data = await parseResponse(response);

      expect(response.status).toBe(400);
      expect(data.error).toBe('Product ID is required');
    });

    it('handles forbidden errors', async () => {
      mockDeleteProduct.mockRejectedValueOnce(
        new Error('Cannot delete product with orders')
      );

      const { DELETE } = await import('../../src/pages/api/products/[id].ts');

      const context = createMockContext({
        method: 'DELETE',
        params: { id: 'prod_123' },
      });

      const response = await DELETE(context);
      const data = await parseResponse(response);

      expect(response.status).toBe(400);
      expect(data.error).toBe('Cannot delete product with orders');
    });
  });
});
