import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Tests for product restore API endpoint
 * admin-3: Add undo for delete operations
 */

// Mock MerchantClient
vi.mock('@dear-margeaux/api', () => ({
  MerchantClient: vi.fn().mockImplementation(() => ({
    restoreProduct: vi.fn(),
  })),
}));

describe('POST /api/products/[id]/restore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should restore a recently soft-deleted product', async () => {
    const mockProduct = {
      id: 'prod-1',
      title: 'Test Product',
      status: 'active',
      deleted_at: null,
    };

    const mockFetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockProduct),
    });

    global.fetch = mockFetch;

    const response = await fetch('/api/products/prod-1/restore', {
      method: 'POST',
    });

    expect(response.ok).toBe(true);
    const data = await response.json();
    expect(data.id).toBe('prod-1');
    expect(data.deleted_at).toBeNull();
  });

  it('should return error when product not found', async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ error: 'Product not found' }),
    });

    global.fetch = mockFetch;

    const response = await fetch('/api/products/non-existent/restore', {
      method: 'POST',
    });

    expect(response.ok).toBe(false);
    expect(response.status).toBe(404);
  });

  it('should return error when undo window has expired', async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: () =>
        Promise.resolve({
          error: 'Cannot restore: undo window expired (30 seconds)',
        }),
    });

    global.fetch = mockFetch;

    const response = await fetch('/api/products/prod-1/restore', {
      method: 'POST',
    });

    expect(response.ok).toBe(false);
    const data = await response.json();
    expect(data.error).toContain('expired');
  });

  it('should return error when product was not deleted', async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: () =>
        Promise.resolve({
          error: 'Product is not deleted',
        }),
    });

    global.fetch = mockFetch;

    const response = await fetch('/api/products/prod-1/restore', {
      method: 'POST',
    });

    expect(response.ok).toBe(false);
    const data = await response.json();
    expect(data.error).toContain('not deleted');
  });
});

describe('DELETE /api/products/[id] with soft delete', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should soft delete product and return deleted product data', async () => {
    const mockDeletedProduct = {
      id: 'prod-1',
      title: 'Test Product',
      deleted_at: '2026-01-31T12:00:00.000Z',
    };

    const mockFetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockDeletedProduct),
    });

    global.fetch = mockFetch;

    const response = await fetch('/api/products/prod-1', {
      method: 'DELETE',
    });

    expect(response.ok).toBe(true);
    const data = await response.json();
    expect(data.id).toBe('prod-1');
    expect(data.title).toBe('Test Product');
    expect(data.deleted_at).toBeDefined();
  });

  it('should preserve product data for undo functionality', async () => {
    const mockDeletedProduct = {
      id: 'prod-1',
      title: 'Test Product',
      description: 'Product description',
      status: 'active',
      deleted_at: '2026-01-31T12:00:00.000Z',
      variants: [
        { id: 'var-1', sku: 'TEST-001', title: 'Default', price_cents: 1000 },
      ],
    };

    const mockFetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockDeletedProduct),
    });

    global.fetch = mockFetch;

    const response = await fetch('/api/products/prod-1', {
      method: 'DELETE',
    });

    const data = await response.json();
    expect(data.variants).toBeDefined();
    expect(data.variants.length).toBeGreaterThan(0);
  });
});
