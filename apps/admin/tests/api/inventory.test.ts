import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { APIContext } from 'astro';
import type { InventoryItem, InventoryLog } from '@dear-margeaux/api';

// Mock the MerchantClient
const mockAdjustInventory = vi.fn();
const mockGetInventoryHistory = vi.fn();

vi.mock('@dear-margeaux/api', () => ({
  MerchantClient: vi.fn().mockImplementation(() => ({
    adjustInventory: mockAdjustInventory,
    getInventoryHistory: mockGetInventoryHistory,
  })),
}));

// Helper function to create mock APIContext
function createMockContext(options: {
  url?: string;
  method?: string;
  body?: unknown;
  params?: Record<string, string>;
}): APIContext {
  const url = new URL(
    options.url || 'http://localhost/api/inventory/TEST-001/adjust'
  );
  const headers: Record<string, string> = options.body
    ? { 'Content-Type': 'application/json' }
    : {};
  const request = new Request(url.toString(), {
    method: options.method || 'POST',
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
    routePattern: '/api/inventory/[sku]/adjust',
    originPathname: '/api/inventory/TEST-001/adjust',
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

// Sample inventory item
const sampleInventoryItem: InventoryItem = {
  sku: 'TEST-001',
  on_hand: 100,
  reserved: 0,
  available: 100,
  low_stock_threshold: null,
  reorder_point: null,
};

describe('Inventory API Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/inventory/:sku/adjust', () => {
    it('adjusts inventory with restock reason', async () => {
      const adjustedItem = {
        ...sampleInventoryItem,
        on_hand: 110,
        available: 110,
      };
      mockAdjustInventory.mockResolvedValueOnce(adjustedItem);

      const { POST } =
        await import('../../src/pages/api/inventory/[sku]/adjust.ts');

      const context = createMockContext({
        method: 'POST',
        params: { sku: 'TEST-001' },
        body: { delta: 10, reason: 'restock' },
      });

      const response = await POST(context);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.on_hand).toBe(110);
      expect(mockAdjustInventory).toHaveBeenCalledWith('TEST-001', {
        delta: 10,
        reason: 'restock',
        admin_id: undefined,
        admin_name: undefined,
      });
    });

    it('passes admin_id and admin_name when provided', async () => {
      const adjustedItem = {
        ...sampleInventoryItem,
        on_hand: 110,
        available: 110,
      };
      mockAdjustInventory.mockResolvedValueOnce(adjustedItem);

      const { POST } =
        await import('../../src/pages/api/inventory/[sku]/adjust.ts');

      const context = createMockContext({
        method: 'POST',
        params: { sku: 'TEST-001' },
        body: {
          delta: 10,
          reason: 'restock',
          admin_id: 'admin-123',
          admin_name: 'John Admin',
        },
      });

      const response = await POST(context);

      expect(response.status).toBe(200);
      expect(mockAdjustInventory).toHaveBeenCalledWith('TEST-001', {
        delta: 10,
        reason: 'restock',
        admin_id: 'admin-123',
        admin_name: 'John Admin',
      });
    });

    it('adjusts inventory with correction reason', async () => {
      const adjustedItem = {
        ...sampleInventoryItem,
        on_hand: 95,
        available: 95,
      };
      mockAdjustInventory.mockResolvedValueOnce(adjustedItem);

      const { POST } =
        await import('../../src/pages/api/inventory/[sku]/adjust.ts');

      const context = createMockContext({
        method: 'POST',
        params: { sku: 'TEST-001' },
        body: { delta: -5, reason: 'correction' },
      });

      const response = await POST(context);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.on_hand).toBe(95);
      expect(mockAdjustInventory).toHaveBeenCalledWith('TEST-001', {
        delta: -5,
        reason: 'correction',
        admin_id: undefined,
        admin_name: undefined,
      });
    });

    it('adjusts inventory with damaged reason', async () => {
      const adjustedItem = {
        ...sampleInventoryItem,
        on_hand: 98,
        available: 98,
      };
      mockAdjustInventory.mockResolvedValueOnce(adjustedItem);

      const { POST } =
        await import('../../src/pages/api/inventory/[sku]/adjust.ts');

      const context = createMockContext({
        method: 'POST',
        params: { sku: 'TEST-001' },
        body: { delta: -2, reason: 'damaged' },
      });

      const response = await POST(context);

      expect(response.status).toBe(200);
      expect(mockAdjustInventory).toHaveBeenCalledWith('TEST-001', {
        delta: -2,
        reason: 'damaged',
        admin_id: undefined,
        admin_name: undefined,
      });
    });

    it('adjusts inventory with return reason', async () => {
      const adjustedItem = {
        ...sampleInventoryItem,
        on_hand: 101,
        available: 101,
      };
      mockAdjustInventory.mockResolvedValueOnce(adjustedItem);

      const { POST } =
        await import('../../src/pages/api/inventory/[sku]/adjust.ts');

      const context = createMockContext({
        method: 'POST',
        params: { sku: 'TEST-001' },
        body: { delta: 1, reason: 'return' },
      });

      const response = await POST(context);

      expect(response.status).toBe(200);
      expect(mockAdjustInventory).toHaveBeenCalledWith('TEST-001', {
        delta: 1,
        reason: 'return',
        admin_id: undefined,
        admin_name: undefined,
      });
    });

    it('returns 400 when SKU is missing', async () => {
      const { POST } =
        await import('../../src/pages/api/inventory/[sku]/adjust.ts');

      const context = createMockContext({
        method: 'POST',
        params: {},
        body: { delta: 10, reason: 'restock' },
      });

      const response = await POST(context);
      const data = await parseResponse(response);

      expect(response.status).toBe(400);
      expect(data.error).toBe('SKU is required');
    });

    it('returns 400 for invalid delta (zero)', async () => {
      const { POST } =
        await import('../../src/pages/api/inventory/[sku]/adjust.ts');

      const context = createMockContext({
        method: 'POST',
        params: { sku: 'TEST-001' },
        body: { delta: 0, reason: 'restock' },
      });

      const response = await POST(context);
      const data = await parseResponse(response);

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid adjustment quantity');
    });

    it('returns 400 for invalid delta (NaN)', async () => {
      const { POST } =
        await import('../../src/pages/api/inventory/[sku]/adjust.ts');

      const context = createMockContext({
        method: 'POST',
        params: { sku: 'TEST-001' },
        body: { delta: 'not-a-number', reason: 'restock' },
      });

      const response = await POST(context);
      const data = await parseResponse(response);

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid adjustment quantity');
    });

    it('returns 400 for invalid reason', async () => {
      const { POST } =
        await import('../../src/pages/api/inventory/[sku]/adjust.ts');

      const context = createMockContext({
        method: 'POST',
        params: { sku: 'TEST-001' },
        body: { delta: 10, reason: 'invalid_reason' },
      });

      const response = await POST(context);
      const data = await parseResponse(response);

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid reason');
      expect(data.error).toContain('restock, correction, damaged, return');
    });

    it('handles API errors gracefully', async () => {
      mockAdjustInventory.mockRejectedValueOnce(new Error('SKU not found'));

      const { POST } =
        await import('../../src/pages/api/inventory/[sku]/adjust.ts');

      const context = createMockContext({
        method: 'POST',
        params: { sku: 'NONEXISTENT' },
        body: { delta: 10, reason: 'restock' },
      });

      const response = await POST(context);
      const data = await parseResponse(response);

      expect(response.status).toBe(400);
      expect(data.error).toBe('SKU not found');
    });

    it('handles negative inventory errors', async () => {
      mockAdjustInventory.mockRejectedValueOnce(
        new Error('Cannot reduce inventory below zero')
      );

      const { POST } =
        await import('../../src/pages/api/inventory/[sku]/adjust.ts');

      const context = createMockContext({
        method: 'POST',
        params: { sku: 'TEST-001' },
        body: { delta: -1000, reason: 'correction' },
      });

      const response = await POST(context);
      const data = await parseResponse(response);

      expect(response.status).toBe(400);
      expect(data.error).toBe('Cannot reduce inventory below zero');
    });
  });

  describe('GET /api/inventory/:sku/history', () => {
    // Sample history item
    const sampleHistoryItem: InventoryLog = {
      id: 'log-1',
      sku: 'TEST-001',
      delta: 10,
      reason: 'restock',
      admin_id: 'admin-123',
      admin_name: 'John Admin',
      created_at: '2026-01-18T10:00:00.000Z',
    };

    it('returns history for a SKU', async () => {
      mockGetInventoryHistory.mockResolvedValueOnce({
        items: [sampleHistoryItem],
        pagination: { has_more: false, next_cursor: null },
      });

      const { GET } =
        await import('../../src/pages/api/inventory/[sku]/history.ts');

      const context = createMockContext({
        url: 'http://localhost/api/inventory/TEST-001/history',
        method: 'GET',
        params: { sku: 'TEST-001' },
      });

      const response = await GET(context);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.items).toHaveLength(1);
      expect(data.items[0].delta).toBe(10);
      expect(data.items[0].reason).toBe('restock');
      expect(data.items[0].admin_name).toBe('John Admin');
      expect(mockGetInventoryHistory).toHaveBeenCalledWith('TEST-001', {});
    });

    it('passes date filters to API', async () => {
      mockGetInventoryHistory.mockResolvedValueOnce({
        items: [sampleHistoryItem],
        pagination: { has_more: false, next_cursor: null },
      });

      const { GET } =
        await import('../../src/pages/api/inventory/[sku]/history.ts');

      const context = createMockContext({
        url: 'http://localhost/api/inventory/TEST-001/history?start_date=2026-01-01&end_date=2026-01-31',
        method: 'GET',
        params: { sku: 'TEST-001' },
      });

      const response = await GET(context);

      expect(response.status).toBe(200);
      expect(mockGetInventoryHistory).toHaveBeenCalledWith('TEST-001', {
        start_date: '2026-01-01',
        end_date: '2026-01-31',
      });
    });

    it('passes pagination params to API', async () => {
      mockGetInventoryHistory.mockResolvedValueOnce({
        items: [sampleHistoryItem],
        pagination: { has_more: true, next_cursor: '2026-01-18T09:00:00.000Z' },
      });

      const { GET } =
        await import('../../src/pages/api/inventory/[sku]/history.ts');

      const context = createMockContext({
        url: 'http://localhost/api/inventory/TEST-001/history?limit=10&cursor=2026-01-18T11:00:00.000Z',
        method: 'GET',
        params: { sku: 'TEST-001' },
      });

      const response = await GET(context);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.pagination.has_more).toBe(true);
      expect(mockGetInventoryHistory).toHaveBeenCalledWith('TEST-001', {
        limit: 10,
        cursor: '2026-01-18T11:00:00.000Z',
      });
    });

    it('returns 400 when SKU is missing', async () => {
      const { GET } =
        await import('../../src/pages/api/inventory/[sku]/history.ts');

      const context = createMockContext({
        url: 'http://localhost/api/inventory//history',
        method: 'GET',
        params: {},
      });

      const response = await GET(context);
      const data = await parseResponse(response);

      expect(response.status).toBe(400);
      expect(data.error).toBe('SKU is required');
    });

    it('returns 404 for non-existent SKU', async () => {
      mockGetInventoryHistory.mockRejectedValueOnce(new Error('SKU not found'));

      const { GET } =
        await import('../../src/pages/api/inventory/[sku]/history.ts');

      const context = createMockContext({
        url: 'http://localhost/api/inventory/NONEXISTENT/history',
        method: 'GET',
        params: { sku: 'NONEXISTENT' },
      });

      const response = await GET(context);
      const data = await parseResponse(response);

      expect(response.status).toBe(404);
      expect(data.error).toBe('SKU not found');
    });

    it('handles API errors gracefully', async () => {
      mockGetInventoryHistory.mockRejectedValueOnce(
        new Error('Internal server error')
      );

      const { GET } =
        await import('../../src/pages/api/inventory/[sku]/history.ts');

      const context = createMockContext({
        url: 'http://localhost/api/inventory/TEST-001/history',
        method: 'GET',
        params: { sku: 'TEST-001' },
      });

      const response = await GET(context);
      const data = await parseResponse(response);

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });
  });
});
