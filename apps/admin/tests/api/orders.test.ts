import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Order } from '@dear-margeaux/api';

// Mock the MerchantClient
const mockUpdateOrder = vi.fn();
const mockRefundOrder = vi.fn();

vi.mock('@dear-margeaux/api', () => ({
  MerchantClient: vi.fn().mockImplementation(() => ({
    updateOrder: mockUpdateOrder,
    refundOrder: mockRefundOrder,
  })),
}));

// Helper function to create mock APIContext
function createMockContext(options: {
  url?: string;
  method?: string;
  body?: unknown;
  params?: Record<string, string>;
  headers?: Record<string, string>;
}) {
  const url = new URL(options.url || 'http://localhost/api/orders/ord_123');
  const headers: Record<string, string> = options.body
    ? { 'Content-Type': 'application/json', ...options.headers }
    : { ...options.headers };
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
    routePattern: '/api/orders/[id]',
    originPathname: '/api/orders/ord_123',
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

// Sample order data
const sampleOrder: Order = {
  id: 'ord_123',
  number: 'ORD-001',
  customer_id: 'cust_123',
  customer_email: 'test@example.com',
  status: 'paid',
  subtotal_cents: 2999,
  shipping_cents: 500,
  tax_cents: 300,
  discount_cents: 0,
  total_cents: 3799,
  discount_code: null,
  stripe_payment_intent_id: 'pi_123',
  stripe_checkout_session_id: null,
  tracking_number: null,
  tracking_url: null,
  items: [
    {
      sku: 'TEST-001',
      title: 'Test Product',
      qty: 1,
      unit_price_cents: 2999,
    },
  ],
  created_at: '2024-01-01T00:00:00Z',
};

describe('Orders API Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('PATCH /api/orders/:id', () => {
    it('updates order status successfully', async () => {
      const updatedOrder = { ...sampleOrder, status: 'shipped' as const };
      mockUpdateOrder.mockResolvedValueOnce(updatedOrder);

      const { PATCH } = await import('../../src/pages/api/orders/[id].ts');

      const context = createMockContext({
        method: 'PATCH',
        params: { id: 'ord_123' },
        body: { status: 'shipped' },
      });

      const response = await PATCH(context as any);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.status).toBe('shipped');
      expect(mockUpdateOrder).toHaveBeenCalledWith('ord_123', {
        status: 'shipped',
      });
    });

    it('updates order with tracking information', async () => {
      const updatedOrder = {
        ...sampleOrder,
        status: 'shipped' as const,
        tracking_number: '1Z999AA10123456784',
        tracking_url: 'https://tracking.example.com/1Z999AA10123456784',
      };
      mockUpdateOrder.mockResolvedValueOnce(updatedOrder);

      const { PATCH } = await import('../../src/pages/api/orders/[id].ts');

      const context = createMockContext({
        method: 'PATCH',
        params: { id: 'ord_123' },
        body: {
          status: 'shipped',
          tracking_number: '1Z999AA10123456784',
          tracking_url: 'https://tracking.example.com/1Z999AA10123456784',
        },
      });

      const response = await PATCH(context as any);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.tracking_number).toBe('1Z999AA10123456784');
      expect(mockUpdateOrder).toHaveBeenCalledWith('ord_123', {
        status: 'shipped',
        tracking_number: '1Z999AA10123456784',
        tracking_url: 'https://tracking.example.com/1Z999AA10123456784',
      });
    });

    it('returns 400 when order ID is missing', async () => {
      const { PATCH } = await import('../../src/pages/api/orders/[id].ts');

      const context = createMockContext({
        method: 'PATCH',
        params: {},
        body: { status: 'shipped' },
      });

      const response = await PATCH(context as any);
      const data = await parseResponse(response);

      expect(response.status).toBe(400);
      expect(data.error).toBe('Order ID is required');
    });

    it('returns 400 for invalid status', async () => {
      const { PATCH } = await import('../../src/pages/api/orders/[id].ts');

      const context = createMockContext({
        method: 'PATCH',
        params: { id: 'ord_123' },
        body: { status: 'invalid_status' },
      });

      const response = await PATCH(context as any);
      const data = await parseResponse(response);

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid status');
    });

    it('returns 400 when no valid fields to update', async () => {
      const { PATCH } = await import('../../src/pages/api/orders/[id].ts');

      const context = createMockContext({
        method: 'PATCH',
        params: { id: 'ord_123' },
        body: { invalid_field: 'value' },
      });

      const response = await PATCH(context as any);
      const data = await parseResponse(response);

      expect(response.status).toBe(400);
      expect(data.error).toBe('No valid fields to update');
    });

    it('validates all valid order statuses', async () => {
      const validStatuses = [
        'pending',
        'paid',
        'processing',
        'shipped',
        'delivered',
        'refunded',
        'canceled',
      ];

      for (const status of validStatuses) {
        vi.clearAllMocks();
        const updatedOrder = { ...sampleOrder, status };
        mockUpdateOrder.mockResolvedValueOnce(updatedOrder);

        const { PATCH } = await import('../../src/pages/api/orders/[id].ts');

        const context = createMockContext({
          method: 'PATCH',
          params: { id: 'ord_123' },
          body: { status },
        });

        const response = await PATCH(context as any);

        expect(response.status).toBe(200);
      }
    });

    it('handles API errors gracefully', async () => {
      mockUpdateOrder.mockRejectedValueOnce(new Error('Order not found'));

      const { PATCH } = await import('../../src/pages/api/orders/[id].ts');

      const context = createMockContext({
        method: 'PATCH',
        params: { id: 'nonexistent' },
        body: { status: 'shipped' },
      });

      const response = await PATCH(context as any);
      const data = await parseResponse(response);

      expect(response.status).toBe(400);
      expect(data.error).toBe('Order not found');
    });
  });

  describe('POST /api/orders/:id/refund', () => {
    it('processes full refund successfully', async () => {
      const refundedOrder = { ...sampleOrder, status: 'refunded' as const };
      mockRefundOrder.mockResolvedValueOnce(refundedOrder);

      const { POST } =
        await import('../../src/pages/api/orders/[id]/refund.ts');

      const context = createMockContext({
        method: 'POST',
        params: { id: 'ord_123' },
      });

      const response = await POST(context as any);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.status).toBe('refunded');
      expect(mockRefundOrder).toHaveBeenCalledWith('ord_123', undefined);
    });

    it('processes partial refund with amount_cents', async () => {
      const refundedOrder = { ...sampleOrder, status: 'refunded' as const };
      mockRefundOrder.mockResolvedValueOnce(refundedOrder);

      const { POST } =
        await import('../../src/pages/api/orders/[id]/refund.ts');

      const context = createMockContext({
        method: 'POST',
        params: { id: 'ord_123' },
        body: { amount_cents: 1000, reason: 'Partial damage' },
      });

      const response = await POST(context as any);

      expect(response.status).toBe(200);
      expect(mockRefundOrder).toHaveBeenCalledWith('ord_123', {
        amount_cents: 1000,
        reason: 'Partial damage',
      });
    });

    it('returns 400 when order ID is missing', async () => {
      const { POST } =
        await import('../../src/pages/api/orders/[id]/refund.ts');

      const context = createMockContext({
        method: 'POST',
        params: {},
      });

      const response = await POST(context as any);
      const data = await parseResponse(response);

      expect(response.status).toBe(400);
      expect(data.error).toBe('Order ID is required');
    });

    it('returns 400 for invalid refund amount', async () => {
      const { POST } =
        await import('../../src/pages/api/orders/[id]/refund.ts');

      const context = createMockContext({
        method: 'POST',
        params: { id: 'ord_123' },
        body: { amount_cents: -100 },
      });

      const response = await POST(context as any);
      const data = await parseResponse(response);

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid refund amount');
    });

    it('returns 400 for zero refund amount', async () => {
      const { POST } =
        await import('../../src/pages/api/orders/[id]/refund.ts');

      const context = createMockContext({
        method: 'POST',
        params: { id: 'ord_123' },
        body: { amount_cents: 0 },
      });

      const response = await POST(context as any);
      const data = await parseResponse(response);

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid refund amount');
    });

    it('handles refund with only reason', async () => {
      const refundedOrder = { ...sampleOrder, status: 'refunded' as const };
      mockRefundOrder.mockResolvedValueOnce(refundedOrder);

      const { POST } =
        await import('../../src/pages/api/orders/[id]/refund.ts');

      const context = createMockContext({
        method: 'POST',
        params: { id: 'ord_123' },
        body: { reason: 'Customer request' },
      });

      const response = await POST(context as any);

      expect(response.status).toBe(200);
      expect(mockRefundOrder).toHaveBeenCalledWith('ord_123', {
        reason: 'Customer request',
      });
    });

    it('handles API errors gracefully', async () => {
      mockRefundOrder.mockRejectedValueOnce(
        new Error('Cannot refund already refunded order')
      );

      const { POST } =
        await import('../../src/pages/api/orders/[id]/refund.ts');

      const context = createMockContext({
        method: 'POST',
        params: { id: 'ord_123' },
      });

      const response = await POST(context as any);
      const data = await parseResponse(response);

      expect(response.status).toBe(400);
      expect(data.error).toBe('Cannot refund already refunded order');
    });
  });
});
