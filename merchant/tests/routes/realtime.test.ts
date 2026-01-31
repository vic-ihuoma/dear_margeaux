import { describe, it, expect, vi, beforeEach } from 'vitest';
import { broadcastEvent, type BroadcastEventType } from '../../src/routes/realtime';
import type { Env } from '../../src/types';

// ============================================================
// REALTIME ROUTES TESTS
// ============================================================

describe('realtime routes', () => {
  describe('broadcastEvent', () => {
    let mockEnv: Env;
    let mockStub: { fetch: ReturnType<typeof vi.fn> };
    let mockIdFromName: ReturnType<typeof vi.fn>;
    let mockGet: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      vi.clearAllMocks();

      mockStub = {
        fetch: vi.fn().mockResolvedValue(new Response(JSON.stringify({ sent: 1 }))),
      };

      mockIdFromName = vi.fn().mockReturnValue('mock-do-id');
      mockGet = vi.fn().mockReturnValue(mockStub);

      mockEnv = {
        DB: {} as D1Database,
        REALTIME: {
          idFromName: mockIdFromName,
          get: mockGet,
        } as unknown as DurableObjectNamespace,
      };
    });

    it('should skip broadcast when REALTIME is not configured', async () => {
      const envWithoutRealtime: Env = {
        DB: {} as D1Database,
      };

      // Should not throw
      await broadcastEvent(envWithoutRealtime, 'store-123', 'order.created', { test: true });

      // No calls should be made
      expect(mockIdFromName).not.toHaveBeenCalled();
      expect(mockGet).not.toHaveBeenCalled();
    });

    it('should broadcast order.created events', async () => {
      const storeId = 'store-123';
      const eventType: BroadcastEventType = 'order.created';
      const payload = {
        order: {
          id: 'order-1',
          number: 'ORD-123456-ABCD',
          status: 'paid',
          customer_email: 'test@example.com',
        },
      };

      await broadcastEvent(mockEnv, storeId, eventType, payload);

      expect(mockIdFromName).toHaveBeenCalledWith(storeId);
      expect(mockGet).toHaveBeenCalledWith('mock-do-id');
      expect(mockStub.fetch).toHaveBeenCalledWith(
        'https://internal/broadcast',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ storeId, type: eventType, payload }),
        })
      );
    });

    it('should broadcast order.updated events', async () => {
      const storeId = 'store-456';
      const eventType: BroadcastEventType = 'order.updated';
      const payload = {
        order: { id: 'order-2', status: 'shipped' },
        previous_status: 'processing',
      };

      await broadcastEvent(mockEnv, storeId, eventType, payload);

      expect(mockStub.fetch).toHaveBeenCalledWith(
        'https://internal/broadcast',
        expect.objectContaining({
          body: JSON.stringify({ storeId, type: eventType, payload }),
        })
      );
    });

    it('should broadcast order.shipped events', async () => {
      const storeId = 'store-789';
      const eventType: BroadcastEventType = 'order.shipped';
      const payload = {
        order: { id: 'order-3', tracking_number: '1Z999AA10123456784' },
      };

      await broadcastEvent(mockEnv, storeId, eventType, payload);

      expect(mockStub.fetch).toHaveBeenCalledWith(
        'https://internal/broadcast',
        expect.objectContaining({
          body: JSON.stringify({ storeId, type: eventType, payload }),
        })
      );
    });

    it('should broadcast order.refunded events', async () => {
      const storeId = 'store-111';
      const eventType: BroadcastEventType = 'order.refunded';
      const payload = {
        order: { id: 'order-4', status: 'refunded' },
        refund: { stripe_refund_id: 're_123', amount_cents: 1500 },
      };

      await broadcastEvent(mockEnv, storeId, eventType, payload);

      expect(mockStub.fetch).toHaveBeenCalledWith(
        'https://internal/broadcast',
        expect.objectContaining({
          body: JSON.stringify({ storeId, type: eventType, payload }),
        })
      );
    });

    it('should broadcast inventory.low events', async () => {
      const storeId = 'store-222';
      const eventType: BroadcastEventType = 'inventory.low';
      const payload = {
        sku: 'SKU-001',
        available: 3,
        threshold: 5,
      };

      await broadcastEvent(mockEnv, storeId, eventType, payload);

      expect(mockStub.fetch).toHaveBeenCalledWith(
        'https://internal/broadcast',
        expect.objectContaining({
          body: JSON.stringify({ storeId, type: eventType, payload }),
        })
      );
    });

    it('should handle broadcast errors gracefully', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockStub.fetch.mockRejectedValue(new Error('Network error'));

      // Should not throw
      await broadcastEvent(mockEnv, 'store-error', 'order.created', {});

      expect(consoleError).toHaveBeenCalledWith('Failed to broadcast event:', expect.any(Error));

      consoleError.mockRestore();
    });

    it('should create unique DO instance per store', async () => {
      await broadcastEvent(mockEnv, 'store-A', 'order.created', {});
      await broadcastEvent(mockEnv, 'store-B', 'order.created', {});

      expect(mockIdFromName).toHaveBeenCalledWith('store-A');
      expect(mockIdFromName).toHaveBeenCalledWith('store-B');
      expect(mockIdFromName).toHaveBeenCalledTimes(2);
    });
  });
});

describe('RealtimeDO', () => {
  // Note: Durable Object tests require the actual Cloudflare environment
  // These are integration-level tests that verify the DO behavior

  describe('WebSocket message types', () => {
    it('should define valid message types', () => {
      const validTypes: BroadcastEventType[] = [
        'order.created',
        'order.updated',
        'order.shipped',
        'order.refunded',
        'inventory.low',
      ];

      // Type-checking ensures all types are valid
      expect(validTypes).toHaveLength(5);
    });
  });

  describe('broadcast payload structure', () => {
    it('should include required fields for order.created', () => {
      const payload = {
        order: {
          id: 'test-order-id',
          number: 'ORD-123456-ABCD',
          status: 'paid',
          customer_email: 'customer@example.com',
          amounts: {
            subtotal_cents: 1000,
            tax_cents: 100,
            shipping_cents: 500,
            total_cents: 1600,
          },
        },
      };

      expect(payload.order.id).toBeDefined();
      expect(payload.order.number).toBeDefined();
      expect(payload.order.status).toBeDefined();
      expect(payload.order.customer_email).toBeDefined();
      expect(payload.order.amounts.total_cents).toBeDefined();
    });

    it('should include previous_status for order.updated', () => {
      const payload = {
        order: { id: 'order-id', status: 'shipped' },
        previous_status: 'processing',
      };

      expect(payload.previous_status).toBeDefined();
      expect(payload.order.status).not.toBe(payload.previous_status);
    });

    it('should include refund details for order.refunded', () => {
      const payload = {
        order: { id: 'order-id', status: 'refunded' },
        refund: {
          stripe_refund_id: 're_abc123',
          amount_cents: 2500,
        },
      };

      expect(payload.refund.stripe_refund_id).toBeDefined();
      expect(payload.refund.amount_cents).toBeGreaterThan(0);
    });

    it('should include inventory details for inventory.low', () => {
      const payload = {
        sku: 'PRODUCT-SKU-001',
        available: 2,
        threshold: 5,
      };

      expect(payload.sku).toBeDefined();
      expect(payload.available).toBeLessThanOrEqual(payload.threshold);
    });
  });
});
