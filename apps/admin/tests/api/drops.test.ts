import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { APIContext } from 'astro';
import type { Drop, PaginatedResponse } from '@dear-margeaux/api';

// Mock the MerchantClient methods
const mockGetDrops = vi.fn();
const mockGetDrop = vi.fn();
const mockCreateDrop = vi.fn();
const mockUpdateDrop = vi.fn();
const mockDeleteDrop = vi.fn();
const mockAssignDropProducts = vi.fn();

// Mock the merchant lib's getAdminMerchantClient function
vi.mock('../../src/lib/merchant', () => ({
  getAdminMerchantClient: vi.fn(() => ({
    getDrops: mockGetDrops,
    getDrop: mockGetDrop,
    createDrop: mockCreateDrop,
    updateDrop: mockUpdateDrop,
    deleteDrop: mockDeleteDrop,
    assignDropProducts: mockAssignDropProducts,
  })),
}));

// Helper function to create mock APIContext
function createMockContext(options: {
  url?: string;
  method?: string;
  body?: unknown;
  params?: Record<string, string>;
}): APIContext {
  const url = new URL(options.url || 'http://localhost/api/drops');
  const headers: Record<string, string> = options.body
    ? { 'Content-Type': 'application/json' }
    : {};
  const request = new Request(url.toString(), {
    method: options.method || 'GET',
    body: options.body ? JSON.stringify(options.body) : undefined,
    headers,
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
    routePattern: '/api/drops',
    originPathname: '/api/drops',
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

// Sample drop data
const sampleDrop: Drop = {
  id: 'drop_123',
  name: 'Spring Collection',
  slug: 'spring-collection',
  description: 'Our spring collection featuring vibrant colors',
  cover_image: 'https://example.com/cover.jpg',
  status: 'active',
  start_date: '2024-03-01T00:00:00Z',
  end_date: '2024-04-01T00:00:00Z',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

describe('Drops API Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/drops', () => {
    it('returns drops list successfully', async () => {
      const listResponse: PaginatedResponse<Drop> = {
        items: [sampleDrop],
        pagination: { has_more: false, next_cursor: null },
      };
      mockGetDrops.mockResolvedValueOnce(listResponse);

      const { GET } = await import('../../src/pages/api/drops/index.ts');

      const context = createMockContext({
        url: 'http://localhost/api/drops',
      });

      const response = await GET(context);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.items).toHaveLength(1);
      expect(data.items[0].name).toBe('Spring Collection');
    });

    it('passes status filter correctly', async () => {
      const listResponse: PaginatedResponse<Drop> = {
        items: [],
        pagination: { has_more: false, next_cursor: null },
      };
      mockGetDrops.mockResolvedValueOnce(listResponse);

      const { GET } = await import('../../src/pages/api/drops/index.ts');

      const context = createMockContext({
        url: 'http://localhost/api/drops?status=scheduled',
      });

      await GET(context);

      expect(mockGetDrops).toHaveBeenCalledWith({
        limit: 100,
        status: 'scheduled',
      });
    });

    it('passes limit parameter correctly', async () => {
      const listResponse: PaginatedResponse<Drop> = {
        items: [],
        pagination: { has_more: false, next_cursor: null },
      };
      mockGetDrops.mockResolvedValueOnce(listResponse);

      const { GET } = await import('../../src/pages/api/drops/index.ts');

      const context = createMockContext({
        url: 'http://localhost/api/drops?limit=10',
      });

      await GET(context);

      expect(mockGetDrops).toHaveBeenCalledWith({ limit: 10 });
    });

    it('handles API errors gracefully', async () => {
      mockGetDrops.mockRejectedValueOnce(new Error('Database error'));

      const { GET } = await import('../../src/pages/api/drops/index.ts');

      const context = createMockContext({
        url: 'http://localhost/api/drops',
      });

      const response = await GET(context);
      const data = await parseResponse(response);

      expect(response.status).toBe(400);
      expect(data.error).toBe('Database error');
    });
  });

  describe('POST /api/drops', () => {
    it('creates drop with valid data', async () => {
      mockCreateDrop.mockResolvedValueOnce(sampleDrop);

      const { POST } = await import('../../src/pages/api/drops/index.ts');

      const context = createMockContext({
        method: 'POST',
        body: {
          name: 'Spring Collection',
          slug: 'spring-collection',
          description: 'Our spring collection',
          status: 'draft',
          start_date: '2024-03-01T00:00:00Z',
          end_date: '2024-04-01T00:00:00Z',
        },
      });

      const response = await POST(context);
      const data = await parseResponse(response);

      expect(response.status).toBe(201);
      expect(data.name).toBe('Spring Collection');
      expect(mockCreateDrop).toHaveBeenCalledWith({
        name: 'Spring Collection',
        slug: 'spring-collection',
        description: 'Our spring collection',
        cover_image: undefined,
        status: 'draft',
        start_date: '2024-03-01T00:00:00Z',
        end_date: '2024-04-01T00:00:00Z',
      });
    });

    it('creates drop with cover_image', async () => {
      const dropWithCover = {
        ...sampleDrop,
        cover_image: 'https://example.com/new-cover.jpg',
      };
      mockCreateDrop.mockResolvedValueOnce(dropWithCover);

      const { POST } = await import('../../src/pages/api/drops/index.ts');

      const context = createMockContext({
        method: 'POST',
        body: {
          name: 'Spring Collection',
          slug: 'spring-collection',
          cover_image: 'https://example.com/new-cover.jpg',
          status: 'draft',
        },
      });

      const response = await POST(context);
      const data = await parseResponse(response);

      expect(response.status).toBe(201);
      expect(data.cover_image).toBe('https://example.com/new-cover.jpg');
      expect(mockCreateDrop).toHaveBeenCalledWith(
        expect.objectContaining({
          cover_image: 'https://example.com/new-cover.jpg',
        })
      );
    });

    it('handles validation errors', async () => {
      mockCreateDrop.mockRejectedValueOnce(new Error('Name is required'));

      const { POST } = await import('../../src/pages/api/drops/index.ts');

      const context = createMockContext({
        method: 'POST',
        body: { slug: 'test-drop' },
      });

      const response = await POST(context);
      const data = await parseResponse(response);

      expect(response.status).toBe(400);
      expect(data.error).toBe('Name is required');
    });
  });

  describe('GET /api/drops/:id', () => {
    it('returns single drop successfully', async () => {
      mockGetDrop.mockResolvedValueOnce(sampleDrop);

      const { GET } = await import('../../src/pages/api/drops/[id].ts');

      const context = createMockContext({
        params: { id: 'drop_123' },
      });

      const response = await GET(context);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.name).toBe('Spring Collection');
      expect(mockGetDrop).toHaveBeenCalledWith('drop_123');
    });

    it('returns 400 when drop ID is missing', async () => {
      const { GET } = await import('../../src/pages/api/drops/[id].ts');

      const context = createMockContext({
        params: {},
      });

      const response = await GET(context);
      const data = await parseResponse(response);

      expect(response.status).toBe(400);
      expect(data.error).toBe('Drop ID is required');
    });

    it('returns 404 when drop not found', async () => {
      mockGetDrop.mockRejectedValueOnce(new Error('Drop not found'));

      const { GET } = await import('../../src/pages/api/drops/[id].ts');

      const context = createMockContext({
        params: { id: 'nonexistent' },
      });

      const response = await GET(context);
      const data = await parseResponse(response);

      expect(response.status).toBe(404);
      expect(data.error).toBe('Drop not found');
    });
  });

  describe('PATCH /api/drops/:id', () => {
    it('updates drop successfully', async () => {
      const updatedDrop = { ...sampleDrop, name: 'Summer Collection' };
      mockUpdateDrop.mockResolvedValueOnce(updatedDrop);

      const { PATCH } = await import('../../src/pages/api/drops/[id].ts');

      const context = createMockContext({
        method: 'PATCH',
        params: { id: 'drop_123' },
        body: { name: 'Summer Collection' },
      });

      const response = await PATCH(context);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.name).toBe('Summer Collection');
    });

    it('updates cover_image successfully', async () => {
      const updatedDrop = {
        ...sampleDrop,
        cover_image: 'https://example.com/updated-cover.jpg',
      };
      mockUpdateDrop.mockResolvedValueOnce(updatedDrop);

      const { PATCH } = await import('../../src/pages/api/drops/[id].ts');

      const context = createMockContext({
        method: 'PATCH',
        params: { id: 'drop_123' },
        body: { cover_image: 'https://example.com/updated-cover.jpg' },
      });

      const response = await PATCH(context);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.cover_image).toBe('https://example.com/updated-cover.jpg');
      expect(mockUpdateDrop).toHaveBeenCalledWith(
        'drop_123',
        expect.objectContaining({
          cover_image: 'https://example.com/updated-cover.jpg',
        })
      );
    });

    it('clears cover_image when set to null', async () => {
      const updatedDrop = { ...sampleDrop, cover_image: null };
      mockUpdateDrop.mockResolvedValueOnce(updatedDrop);

      const { PATCH } = await import('../../src/pages/api/drops/[id].ts');

      const context = createMockContext({
        method: 'PATCH',
        params: { id: 'drop_123' },
        body: { cover_image: null },
      });

      const response = await PATCH(context);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.cover_image).toBeNull();
    });

    it('returns 400 when drop ID is missing', async () => {
      const { PATCH } = await import('../../src/pages/api/drops/[id].ts');

      const context = createMockContext({
        method: 'PATCH',
        params: {},
        body: { name: 'Updated Drop' },
      });

      const response = await PATCH(context);
      const data = await parseResponse(response);

      expect(response.status).toBe(400);
      expect(data.error).toBe('Drop ID is required');
    });

    it('handles not found errors', async () => {
      mockUpdateDrop.mockRejectedValueOnce(new Error('Drop not found'));

      const { PATCH } = await import('../../src/pages/api/drops/[id].ts');

      const context = createMockContext({
        method: 'PATCH',
        params: { id: 'nonexistent' },
        body: { name: 'Updated Drop' },
      });

      const response = await PATCH(context);
      const data = await parseResponse(response);

      expect(response.status).toBe(400);
      expect(data.error).toBe('Drop not found');
    });
  });

  describe('DELETE /api/drops/:id', () => {
    it('deletes drop successfully', async () => {
      mockDeleteDrop.mockResolvedValueOnce(undefined);

      const { DELETE } = await import('../../src/pages/api/drops/[id].ts');

      const context = createMockContext({
        method: 'DELETE',
        params: { id: 'drop_123' },
      });

      const response = await DELETE(context);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockDeleteDrop).toHaveBeenCalledWith('drop_123');
    });

    it('returns 400 when drop ID is missing', async () => {
      const { DELETE } = await import('../../src/pages/api/drops/[id].ts');

      const context = createMockContext({
        method: 'DELETE',
        params: {},
      });

      const response = await DELETE(context);
      const data = await parseResponse(response);

      expect(response.status).toBe(400);
      expect(data.error).toBe('Drop ID is required');
    });

    it('handles deletion errors', async () => {
      mockDeleteDrop.mockRejectedValueOnce(
        new Error('Cannot delete drop with active orders')
      );

      const { DELETE } = await import('../../src/pages/api/drops/[id].ts');

      const context = createMockContext({
        method: 'DELETE',
        params: { id: 'drop_123' },
      });

      const response = await DELETE(context);
      const data = await parseResponse(response);

      expect(response.status).toBe(400);
      expect(data.error).toBe('Cannot delete drop with active orders');
    });
  });

  describe('PUT /api/drops/:id/products', () => {
    it('assigns products to drop successfully', async () => {
      const result = { drop_id: 'drop_123', product_ids: ['prod_1', 'prod_2'] };
      mockAssignDropProducts.mockResolvedValueOnce(result);

      const { PUT } =
        await import('../../src/pages/api/drops/[id]/products.ts');

      const context = createMockContext({
        method: 'PUT',
        params: { id: 'drop_123' },
        body: { productIds: ['prod_1', 'prod_2'] },
      });

      const response = await PUT(context);

      expect(response.status).toBe(200);
      expect(mockAssignDropProducts).toHaveBeenCalledWith('drop_123', [
        'prod_1',
        'prod_2',
      ]);
    });

    it('assigns empty product list (removes all products)', async () => {
      const result = { drop_id: 'drop_123', product_ids: [] };
      mockAssignDropProducts.mockResolvedValueOnce(result);

      const { PUT } =
        await import('../../src/pages/api/drops/[id]/products.ts');

      const context = createMockContext({
        method: 'PUT',
        params: { id: 'drop_123' },
        body: { productIds: [] },
      });

      const response = await PUT(context);

      expect(response.status).toBe(200);
      expect(mockAssignDropProducts).toHaveBeenCalledWith('drop_123', []);
    });

    it('returns 400 when drop ID is missing', async () => {
      const { PUT } =
        await import('../../src/pages/api/drops/[id]/products.ts');

      const context = createMockContext({
        method: 'PUT',
        params: {},
        body: { productIds: ['prod_1'] },
      });

      const response = await PUT(context);
      const data = await parseResponse(response);

      expect(response.status).toBe(400);
      expect(data.error).toBe('Drop ID is required');
    });

    it('returns 400 when productIds is not an array', async () => {
      const { PUT } =
        await import('../../src/pages/api/drops/[id]/products.ts');

      const context = createMockContext({
        method: 'PUT',
        params: { id: 'drop_123' },
        body: { productIds: 'not-an-array' },
      });

      const response = await PUT(context);
      const data = await parseResponse(response);

      expect(response.status).toBe(400);
      expect(data.error).toBe('productIds must be an array');
    });

    it('handles API errors gracefully', async () => {
      mockAssignDropProducts.mockRejectedValueOnce(
        new Error('Product not found')
      );

      const { PUT } =
        await import('../../src/pages/api/drops/[id]/products.ts');

      const context = createMockContext({
        method: 'PUT',
        params: { id: 'drop_123' },
        body: { productIds: ['nonexistent'] },
      });

      const response = await PUT(context);
      const data = await parseResponse(response);

      expect(response.status).toBe(400);
      expect(data.error).toBe('Product not found');
    });
  });
});
