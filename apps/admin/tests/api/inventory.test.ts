import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { InventoryItem } from '@dear-margeaux/api';

// Mock the MerchantClient
const mockAdjustInventory = vi.fn();

vi.mock('@dear-margeaux/api', () => ({
  MerchantClient: vi.fn().mockImplementation(() => ({
    adjustInventory: mockAdjustInventory,
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

// Sample inventory item
const sampleInventoryItem: InventoryItem = {
  sku: 'TEST-001',
  on_hand: 100,
  reserved: 0,
  available: 100,
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

      const response = await POST(context as any);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.on_hand).toBe(110);
      expect(mockAdjustInventory).toHaveBeenCalledWith('TEST-001', {
        delta: 10,
        reason: 'restock',
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

      const response = await POST(context as any);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.on_hand).toBe(95);
      expect(mockAdjustInventory).toHaveBeenCalledWith('TEST-001', {
        delta: -5,
        reason: 'correction',
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

      const response = await POST(context as any);

      expect(response.status).toBe(200);
      expect(mockAdjustInventory).toHaveBeenCalledWith('TEST-001', {
        delta: -2,
        reason: 'damaged',
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

      const response = await POST(context as any);

      expect(response.status).toBe(200);
      expect(mockAdjustInventory).toHaveBeenCalledWith('TEST-001', {
        delta: 1,
        reason: 'return',
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

      const response = await POST(context as any);
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

      const response = await POST(context as any);
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

      const response = await POST(context as any);
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

      const response = await POST(context as any);
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

      const response = await POST(context as any);
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

      const response = await POST(context as any);
      const data = await parseResponse(response);

      expect(response.status).toBe(400);
      expect(data.error).toBe('Cannot reduce inventory below zero');
    });
  });
});
