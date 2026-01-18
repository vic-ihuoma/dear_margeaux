/**
 * Unit tests for MerchantClient
 * @see prd.json test-1
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  MerchantClient,
  MerchantApiError,
  AuthenticationError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ValidationError,
  NetworkError,
} from '../merchant-client.js';

// Mock fetch response helpers
function createMockResponse(data: unknown, status = 200, ok = true): Response {
  return {
    ok,
    status,
    json: vi.fn().mockResolvedValue(data),
    headers: new Headers(),
    statusText: ok ? 'OK' : 'Error',
  } as unknown as Response;
}

function createErrorResponse(
  status: number,
  code: string,
  message: string,
  details?: Record<string, unknown>
): Response {
  return createMockResponse(
    { error: { code, message, details } },
    status,
    false
  );
}

describe('MerchantClient', () => {
  let client: MerchantClient;
  let mockFetch: ReturnType<typeof vi.fn>;

  const baseUrl = 'https://api.test.com';
  const apiKey = 'sk_test_12345';

  beforeEach(() => {
    mockFetch = vi.fn();
    client = new MerchantClient({
      baseUrl,
      apiKey,
      fetch: mockFetch,
    });
  });

  // ============================================================================
  // Client Configuration Tests
  // ============================================================================

  describe('Client Configuration', () => {
    it('strips trailing slash from baseUrl', () => {
      const clientWithSlash = new MerchantClient({
        baseUrl: 'https://api.test.com/',
        apiKey,
        fetch: mockFetch,
      });

      mockFetch.mockResolvedValue(
        createMockResponse({
          items: [],
          pagination: { has_more: false, next_cursor: null },
        })
      );

      clientWithSlash.getProducts();
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('https://api.test.com/v1/products'),
        expect.any(Object)
      );
    });

    it('includes Authorization header with Bearer token', async () => {
      mockFetch.mockResolvedValue(
        createMockResponse({
          items: [],
          pagination: { has_more: false, next_cursor: null },
        })
      );

      await client.getProducts();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${apiKey}`,
          }),
        })
      );
    });

    it('includes Content-Type header for POST requests with body', async () => {
      mockFetch.mockResolvedValue(
        createMockResponse({
          id: '1',
          title: 'Test',
          status: 'draft',
          variants: [],
        })
      );

      await client.createProduct({ title: 'Test Product' });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify({ title: 'Test Product' }),
        })
      );
    });
  });

  // ============================================================================
  // Products Tests
  // ============================================================================

  describe('Products', () => {
    describe('getProducts', () => {
      it('fetches products list successfully', async () => {
        const mockProducts = {
          items: [
            {
              id: '1',
              title: 'Product 1',
              status: 'active',
              created_at: '2024-01-01',
            },
            {
              id: '2',
              title: 'Product 2',
              status: 'draft',
              created_at: '2024-01-02',
            },
          ],
          pagination: { has_more: false, next_cursor: null },
        };
        mockFetch.mockResolvedValue(createMockResponse(mockProducts));

        const result = await client.getProducts();

        expect(result.items).toHaveLength(2);
        expect(result.items[0].title).toBe('Product 1');
        expect(mockFetch).toHaveBeenCalledWith(
          `${baseUrl}/v1/products`,
          expect.objectContaining({ method: 'GET' })
        );
      });

      it('passes pagination parameters correctly', async () => {
        mockFetch.mockResolvedValue(
          createMockResponse({
            items: [],
            pagination: { has_more: false, next_cursor: null },
          })
        );

        await client.getProducts({ limit: 10, cursor: 'abc123' });

        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('limit=10'),
          expect.any(Object)
        );
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('cursor=abc123'),
          expect.any(Object)
        );
      });

      it('passes status filter parameter', async () => {
        mockFetch.mockResolvedValue(
          createMockResponse({
            items: [],
            pagination: { has_more: false, next_cursor: null },
          })
        );

        await client.getProducts({ status: 'active' });

        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('status=active'),
          expect.any(Object)
        );
      });

      it('handles empty response', async () => {
        mockFetch.mockResolvedValue(
          createMockResponse({
            items: [],
            pagination: { has_more: false, next_cursor: null },
          })
        );

        const result = await client.getProducts();

        expect(result.items).toHaveLength(0);
        expect(result.pagination.has_more).toBe(false);
      });
    });

    describe('getProduct', () => {
      it('fetches single product by ID', async () => {
        const mockProduct = {
          id: 'prod_123',
          title: 'Test Product',
          description: 'A test product',
          status: 'active',
          created_at: '2024-01-01',
          variants: [
            {
              id: 'var_1',
              sku: 'SKU-001',
              title: 'Default',
              price_cents: 1999,
            },
          ],
        };
        mockFetch.mockResolvedValue(createMockResponse(mockProduct));

        const result = await client.getProduct('prod_123');

        expect(result.id).toBe('prod_123');
        expect(result.title).toBe('Test Product');
        expect(result.variants).toHaveLength(1);
        expect(mockFetch).toHaveBeenCalledWith(
          `${baseUrl}/v1/products/prod_123`,
          expect.objectContaining({ method: 'GET' })
        );
      });

      it('throws NotFoundError on 404', async () => {
        mockFetch.mockResolvedValue(
          createErrorResponse(404, 'not_found', 'Product not found')
        );

        await expect(client.getProduct('nonexistent')).rejects.toThrow(
          NotFoundError
        );
      });
    });

    describe('createProduct', () => {
      it('creates product with valid data', async () => {
        const mockProduct = {
          id: 'prod_new',
          title: 'New Product',
          description: null,
          status: 'draft',
          created_at: '2024-01-01',
          variants: [],
        };
        mockFetch.mockResolvedValue(createMockResponse(mockProduct));

        const result = await client.createProduct({ title: 'New Product' });

        expect(result.id).toBe('prod_new');
        expect(result.title).toBe('New Product');
        expect(mockFetch).toHaveBeenCalledWith(
          `${baseUrl}/v1/products`,
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({ title: 'New Product' }),
          })
        );
      });

      it('throws ValidationError on 400 validation error', async () => {
        mockFetch.mockResolvedValue(
          createErrorResponse(400, 'invalid_request', 'Title is required', {
            field: 'title',
          })
        );

        await expect(client.createProduct({ title: '' })).rejects.toThrow(
          ValidationError
        );
      });

      it('throws ConflictError on 409 conflict (duplicate)', async () => {
        mockFetch.mockResolvedValue(
          createErrorResponse(
            409,
            'conflict',
            'Product with this slug already exists'
          )
        );

        await expect(
          client.createProduct({ title: 'Existing Product' })
        ).rejects.toThrow(ConflictError);
      });
    });

    describe('updateProduct', () => {
      it('updates product fields', async () => {
        const mockProduct = {
          id: 'prod_123',
          title: 'Updated Title',
          description: 'Updated desc',
          status: 'active',
          created_at: '2024-01-01',
          variants: [],
        };
        mockFetch.mockResolvedValue(createMockResponse(mockProduct));

        const result = await client.updateProduct('prod_123', {
          title: 'Updated Title',
          description: 'Updated desc',
        });

        expect(result.title).toBe('Updated Title');
        expect(mockFetch).toHaveBeenCalledWith(
          `${baseUrl}/v1/products/prod_123`,
          expect.objectContaining({ method: 'PATCH' })
        );
      });

      it('throws NotFoundError on 404 not found', async () => {
        mockFetch.mockResolvedValue(
          createErrorResponse(404, 'not_found', 'Product not found')
        );

        await expect(
          client.updateProduct('nonexistent', { title: 'New' })
        ).rejects.toThrow(NotFoundError);
      });
    });

    describe('deleteProduct', () => {
      it('deletes product successfully', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          status: 204,
          json: vi.fn(),
        } as unknown as Response);

        await expect(client.deleteProduct('prod_123')).resolves.toBeUndefined();
        expect(mockFetch).toHaveBeenCalledWith(
          `${baseUrl}/v1/products/prod_123`,
          expect.objectContaining({ method: 'DELETE' })
        );
      });

      it('throws ForbiddenError on 403 forbidden', async () => {
        mockFetch.mockResolvedValue(
          createErrorResponse(
            403,
            'forbidden',
            'Cannot delete product with active orders'
          )
        );

        await expect(client.deleteProduct('prod_123')).rejects.toThrow(
          ForbiddenError
        );
      });
    });
  });

  // ============================================================================
  // Variants Tests
  // ============================================================================

  describe('Variants', () => {
    it('creates variant for product', async () => {
      const mockVariant = {
        id: 'var_new',
        sku: 'SKU-NEW',
        title: 'Size Large',
        price_cents: 2999,
        image_url: null,
        product_id: 'prod_123',
      };
      mockFetch.mockResolvedValue(createMockResponse(mockVariant));

      const result = await client.createVariant('prod_123', {
        sku: 'SKU-NEW',
        title: 'Size Large',
        price_cents: 2999,
      });

      expect(result.sku).toBe('SKU-NEW');
      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/v1/products/prod_123/variants`,
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('updates variant', async () => {
      const mockVariant = {
        id: 'var_123',
        sku: 'SKU-001',
        title: 'Updated Title',
        price_cents: 3499,
        image_url: null,
        product_id: 'prod_123',
      };
      mockFetch.mockResolvedValue(createMockResponse(mockVariant));

      const result = await client.updateVariant('prod_123', 'var_123', {
        title: 'Updated Title',
        price_cents: 3499,
      });

      expect(result.price_cents).toBe(3499);
      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/v1/products/prod_123/variants/var_123`,
        expect.objectContaining({ method: 'PATCH' })
      );
    });

    it('deletes variant', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 204,
        json: vi.fn(),
      } as unknown as Response);

      await expect(
        client.deleteVariant('prod_123', 'var_123')
      ).resolves.toBeUndefined();
    });
  });

  // ============================================================================
  // Inventory Tests
  // ============================================================================

  describe('Inventory', () => {
    it('fetches inventory list', async () => {
      const mockInventory = {
        items: [
          { sku: 'SKU-001', on_hand: 100, reserved: 5, available: 95 },
          { sku: 'SKU-002', on_hand: 50, reserved: 0, available: 50 },
        ],
        pagination: { has_more: false, next_cursor: null },
      };
      mockFetch.mockResolvedValue(createMockResponse(mockInventory));

      const result = await client.getInventory();

      expect(result.items).toHaveLength(2);
      expect(result.items[0].sku).toBe('SKU-001');
    });

    it('adjusts inventory', async () => {
      const mockInventory = {
        sku: 'SKU-001',
        on_hand: 110,
        reserved: 5,
        available: 105,
      };
      mockFetch.mockResolvedValue(createMockResponse(mockInventory));

      const result = await client.adjustInventory('SKU-001', {
        delta: 10,
        reason: 'restock',
      });

      expect(result.on_hand).toBe(110);
      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/v1/inventory/SKU-001/adjust`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ delta: 10, reason: 'restock' }),
        })
      );
    });
  });

  // ============================================================================
  // Cart Tests
  // ============================================================================

  describe('Cart', () => {
    it('creates cart', async () => {
      const mockCart = {
        id: 'cart_123',
        customer_email: 'test@example.com',
        status: 'open',
        expires_at: null,
        currency: 'USD',
        items: [],
        discount: null,
        totals: {
          subtotal_cents: 0,
          discount_cents: 0,
          shipping_cents: 0,
          tax_cents: 0,
          total_cents: 0,
        },
      };
      mockFetch.mockResolvedValue(createMockResponse(mockCart));

      const result = await client.createCart({
        customer_email: 'test@example.com',
      });

      expect(result.id).toBe('cart_123');
      expect(result.customer_email).toBe('test@example.com');
    });

    it('adds items to cart', async () => {
      const mockCart = {
        id: 'cart_123',
        customer_email: null,
        status: 'open',
        expires_at: null,
        currency: 'USD',
        items: [
          {
            sku: 'SKU-001',
            title: 'Test Item',
            qty: 2,
            unit_price_cents: 1999,
          },
        ],
        discount: null,
        totals: {
          subtotal_cents: 3998,
          discount_cents: 0,
          shipping_cents: 0,
          tax_cents: 0,
          total_cents: 3998,
        },
      };
      mockFetch.mockResolvedValue(createMockResponse(mockCart));

      const result = await client.addToCart('cart_123', {
        sku: 'SKU-001',
        qty: 2,
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].qty).toBe(2);
    });

    it('applies discount to cart', async () => {
      const mockResult = {
        discount: { code: 'SAVE10', type: 'percentage', amount_cents: 500 },
        totals: {
          subtotal_cents: 5000,
          discount_cents: 500,
          shipping_cents: 0,
          tax_cents: 0,
          total_cents: 4500,
        },
      };
      mockFetch.mockResolvedValue(createMockResponse(mockResult));

      const result = await client.applyDiscount('cart_123', 'SAVE10');

      expect(result.discount?.code).toBe('SAVE10');
      expect(result.totals.discount_cents).toBe(500);
    });

    it('initiates checkout', async () => {
      const mockResult = {
        checkout_url: 'https://checkout.stripe.com/session_xxx',
        stripe_checkout_session_id: 'cs_xxx',
      };
      mockFetch.mockResolvedValue(createMockResponse(mockResult));

      const result = await client.checkout('cart_123', {
        success_url: 'https://example.com/success',
        cancel_url: 'https://example.com/cancel',
      });

      expect(result.checkout_url).toContain('stripe.com');
      expect(result.stripe_checkout_session_id).toBe('cs_xxx');
    });
  });

  // ============================================================================
  // Orders Tests
  // ============================================================================

  describe('Orders', () => {
    it('fetches orders list', async () => {
      const mockOrders = {
        items: [
          {
            id: 'ord_1',
            number: 'DM-001',
            status: 'paid',
            customer_email: 'a@test.com',
            total_cents: 5000,
            created_at: '2024-01-01',
          },
          {
            id: 'ord_2',
            number: 'DM-002',
            status: 'shipped',
            customer_email: 'b@test.com',
            total_cents: 7500,
            created_at: '2024-01-02',
          },
        ],
        pagination: { has_more: true, next_cursor: 'cursor_abc' },
      };
      mockFetch.mockResolvedValue(createMockResponse(mockOrders));

      const result = await client.getOrders();

      expect(result.items).toHaveLength(2);
      expect(result.pagination.has_more).toBe(true);
    });

    it('fetches orders with status filter', async () => {
      mockFetch.mockResolvedValue(
        createMockResponse({
          items: [],
          pagination: { has_more: false, next_cursor: null },
        })
      );

      await client.getOrders({ status: 'shipped' });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('status=shipped'),
        expect.any(Object)
      );
    });

    it('fetches single order', async () => {
      const mockOrder = {
        id: 'ord_123',
        number: 'DM-001',
        status: 'paid',
        customer_email: 'test@example.com',
        customer_id: 'cus_123',
        subtotal_cents: 5000,
        tax_cents: 500,
        shipping_cents: 1000,
        discount_cents: 0,
        total_cents: 6500,
        discount_code: null,
        stripe_payment_intent_id: 'pi_xxx',
        stripe_checkout_session_id: 'cs_xxx',
        tracking_number: null,
        tracking_url: null,
        created_at: '2024-01-01',
        items: [
          { sku: 'SKU-001', title: 'Product', qty: 1, unit_price_cents: 5000 },
        ],
      };
      mockFetch.mockResolvedValue(createMockResponse(mockOrder));

      const result = await client.getOrder('ord_123');

      expect(result.id).toBe('ord_123');
      expect(result.items).toHaveLength(1);
    });

    it('updates order status', async () => {
      const mockOrder = {
        id: 'ord_123',
        number: 'DM-001',
        status: 'shipped',
        customer_email: 'test@example.com',
        customer_id: 'cus_123',
        subtotal_cents: 5000,
        tax_cents: 500,
        shipping_cents: 1000,
        discount_cents: 0,
        total_cents: 6500,
        discount_code: null,
        stripe_payment_intent_id: 'pi_xxx',
        stripe_checkout_session_id: 'cs_xxx',
        tracking_number: 'TRACK123',
        tracking_url: 'https://tracking.com/TRACK123',
        created_at: '2024-01-01',
        items: [],
      };
      mockFetch.mockResolvedValue(createMockResponse(mockOrder));

      const result = await client.updateOrder('ord_123', {
        status: 'shipped',
        tracking_number: 'TRACK123',
        tracking_url: 'https://tracking.com/TRACK123',
      });

      expect(result.status).toBe('shipped');
      expect(result.tracking_number).toBe('TRACK123');
    });

    it('refunds order', async () => {
      const mockOrder = {
        id: 'ord_123',
        number: 'DM-001',
        status: 'refunded',
        customer_email: 'test@example.com',
        customer_id: null,
        subtotal_cents: 5000,
        tax_cents: 500,
        shipping_cents: 1000,
        discount_cents: 0,
        total_cents: 6500,
        discount_code: null,
        stripe_payment_intent_id: 'pi_xxx',
        stripe_checkout_session_id: 'cs_xxx',
        tracking_number: null,
        tracking_url: null,
        created_at: '2024-01-01',
        items: [],
      };
      mockFetch.mockResolvedValue(createMockResponse(mockOrder));

      const result = await client.refundOrder('ord_123', {
        amount_cents: 5000,
      });

      expect(result.status).toBe('refunded');
    });
  });

  // ============================================================================
  // Customers Tests
  // ============================================================================

  describe('Customers', () => {
    it('fetches customers list', async () => {
      const mockCustomers = {
        items: [
          {
            id: 'cus_1',
            email: 'a@test.com',
            name: 'Alice',
            phone: null,
            accepts_marketing: true,
            order_count: 5,
            total_spent_cents: 50000,
            last_order_at: '2024-01-01',
            metadata: null,
          },
        ],
        pagination: { has_more: false, next_cursor: null },
      };
      mockFetch.mockResolvedValue(createMockResponse(mockCustomers));

      const result = await client.getCustomers();

      expect(result.items).toHaveLength(1);
      expect(result.items[0].email).toBe('a@test.com');
    });

    it('fetches single customer', async () => {
      const mockCustomer = {
        id: 'cus_123',
        email: 'test@example.com',
        name: 'Test User',
        phone: '+1234567890',
        accepts_marketing: false,
        order_count: 3,
        total_spent_cents: 25000,
        last_order_at: '2024-01-15',
        metadata: { vip: true },
      };
      mockFetch.mockResolvedValue(createMockResponse(mockCustomer));

      const result = await client.getCustomer('cus_123');

      expect(result.id).toBe('cus_123');
      expect(result.name).toBe('Test User');
    });

    it('updates customer', async () => {
      const mockCustomer = {
        id: 'cus_123',
        email: 'test@example.com',
        name: 'Updated Name',
        phone: '+1234567890',
        accepts_marketing: true,
        order_count: 3,
        total_spent_cents: 25000,
        last_order_at: '2024-01-15',
        metadata: null,
      };
      mockFetch.mockResolvedValue(createMockResponse(mockCustomer));

      const result = await client.updateCustomer('cus_123', {
        name: 'Updated Name',
        accepts_marketing: true,
      });

      expect(result.name).toBe('Updated Name');
      expect(result.accepts_marketing).toBe(true);
    });
  });

  // ============================================================================
  // Drops Tests
  // ============================================================================

  describe('Drops', () => {
    it('fetches drops list', async () => {
      const mockDrops = {
        items: [
          {
            id: 'drop_1',
            name: 'Summer Collection',
            description: null,
            slug: 'summer',
            start_date: null,
            end_date: null,
            status: 'active',
            created_at: '2024-01-01',
            updated_at: '2024-01-01',
          },
        ],
        pagination: { has_more: false, next_cursor: null },
      };
      mockFetch.mockResolvedValue(createMockResponse(mockDrops));

      const result = await client.getDrops();

      expect(result.items).toHaveLength(1);
      expect(result.items[0].name).toBe('Summer Collection');
    });

    it('creates drop', async () => {
      const mockDrop = {
        id: 'drop_new',
        name: 'New Drop',
        description: 'A new collection',
        slug: 'new-drop',
        start_date: '2024-06-01T00:00:00Z',
        end_date: null,
        status: 'scheduled',
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      };
      mockFetch.mockResolvedValue(createMockResponse(mockDrop));

      const result = await client.createDrop({
        name: 'New Drop',
        slug: 'new-drop',
        description: 'A new collection',
        start_date: '2024-06-01T00:00:00Z',
        status: 'scheduled',
      });

      expect(result.name).toBe('New Drop');
      expect(result.status).toBe('scheduled');
    });

    it('updates drop', async () => {
      const mockDrop = {
        id: 'drop_123',
        name: 'Updated Drop',
        description: 'Updated description',
        slug: 'summer',
        start_date: null,
        end_date: null,
        status: 'active',
        created_at: '2024-01-01',
        updated_at: '2024-01-15',
      };
      mockFetch.mockResolvedValue(createMockResponse(mockDrop));

      const result = await client.updateDrop('drop_123', {
        name: 'Updated Drop',
        status: 'active',
      });

      expect(result.name).toBe('Updated Drop');
    });

    it('deletes drop', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 204,
        json: vi.fn(),
      } as unknown as Response);

      await expect(client.deleteDrop('drop_123')).resolves.toBeUndefined();
    });

    it('assigns products to drop', async () => {
      mockFetch.mockResolvedValue(
        createMockResponse({ success: true, assigned_count: 3 })
      );

      const result = await client.assignDropProducts('drop_123', [
        'prod_1',
        'prod_2',
        'prod_3',
      ]);

      expect(result.success).toBe(true);
      expect(result.assigned_count).toBe(3);
    });
  });

  // ============================================================================
  // Waitlist Tests
  // ============================================================================

  describe('Waitlist', () => {
    it('subscribes to waitlist', async () => {
      const mockEntry = {
        id: 'wait_123',
        email: 'test@example.com',
        drop_id: 'drop_123',
        subscribed_at: '2024-01-01T00:00:00Z',
        notified_at: null,
        unsubscribed: false,
      };
      mockFetch.mockResolvedValue(createMockResponse(mockEntry));

      const result = await client.subscribeToWaitlist({
        email: 'test@example.com',
        drop_id: 'drop_123',
      });

      expect(result.email).toBe('test@example.com');
      expect(result.drop_id).toBe('drop_123');
    });

    it('unsubscribes from waitlist', async () => {
      mockFetch.mockResolvedValue(createMockResponse({ unsubscribed: true }));

      const result = await client.unsubscribeFromWaitlist('wait_123');

      expect(result.unsubscribed).toBe(true);
    });

    it('fetches waitlist entries', async () => {
      const mockEntries = {
        items: [
          {
            id: 'wait_1',
            email: 'a@test.com',
            drop_id: 'drop_123',
            subscribed_at: '2024-01-01',
            notified_at: null,
            unsubscribed: false,
          },
          {
            id: 'wait_2',
            email: 'b@test.com',
            drop_id: 'drop_123',
            subscribed_at: '2024-01-02',
            notified_at: null,
            unsubscribed: false,
          },
        ],
        pagination: { has_more: false, next_cursor: null },
      };
      mockFetch.mockResolvedValue(createMockResponse(mockEntries));

      const result = await client.getWaitlistEntries({ drop_id: 'drop_123' });

      expect(result.items).toHaveLength(2);
    });
  });

  // ============================================================================
  // Customer Auth Tests
  // ============================================================================

  describe('Customer Auth', () => {
    it('registers customer', async () => {
      const mockAuth = {
        customer: {
          id: 'cus_new',
          email: 'new@example.com',
          name: 'New User',
          phone: null,
          accepts_marketing: false,
          order_count: 0,
          total_spent_cents: 0,
          last_order_at: null,
          created_at: '2024-01-01',
        },
        session: {
          id: 'sess_123',
          expires_at: '2024-02-01T00:00:00Z',
        },
      };
      mockFetch.mockResolvedValue(createMockResponse(mockAuth));

      const result = await client.registerCustomer({
        email: 'new@example.com',
        password: 'securepassword',
        name: 'New User',
      });

      expect(result.customer.email).toBe('new@example.com');
      expect(result.session.id).toBe('sess_123');
    });

    it('logs in customer', async () => {
      const mockAuth = {
        customer: {
          id: 'cus_123',
          email: 'test@example.com',
          name: 'Test User',
          phone: null,
          accepts_marketing: false,
          order_count: 5,
          total_spent_cents: 50000,
          last_order_at: '2024-01-15',
          created_at: '2023-06-01',
        },
        session: {
          id: 'sess_456',
          expires_at: '2024-02-15T00:00:00Z',
        },
      };
      mockFetch.mockResolvedValue(createMockResponse(mockAuth));

      const result = await client.loginCustomer({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.customer.id).toBe('cus_123');
      expect(result.session).toBeDefined();
    });

    it('logs out customer', async () => {
      mockFetch.mockResolvedValue(createMockResponse({ success: true }));

      const result = await client.logoutCustomer('sess_123');

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/v1/customers/auth/logout`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'X-Customer-Session': 'sess_123',
          }),
        })
      );
    });

    it('gets current customer', async () => {
      const mockAuth = {
        customer: {
          id: 'cus_123',
          email: 'test@example.com',
          name: 'Test User',
          phone: null,
          accepts_marketing: false,
          order_count: 5,
          total_spent_cents: 50000,
          last_order_at: '2024-01-15',
          created_at: '2023-06-01',
        },
        session: {
          id: 'sess_123',
          expires_at: '2024-02-15T00:00:00Z',
        },
      };
      mockFetch.mockResolvedValue(createMockResponse(mockAuth));

      const result = await client.getCurrentCustomer('sess_123');

      expect(result.customer.id).toBe('cus_123');
      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/v1/customers/auth/me`,
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Customer-Session': 'sess_123',
          }),
        })
      );
    });

    it('gets customer orders', async () => {
      const mockOrders = {
        items: [
          {
            id: 'ord_1',
            number: 'DM-001',
            status: 'delivered',
            amounts: {
              subtotal_cents: 5000,
              discount_cents: 0,
              tax_cents: 500,
              shipping_cents: 1000,
              total_cents: 6500,
              currency: 'USD',
            },
            items: [
              {
                sku: 'SKU-001',
                title: 'Product',
                qty: 1,
                unit_price_cents: 5000,
                image_url: null,
              },
            ],
            tracking: { number: 'TRACK123', url: 'https://tracking.com' },
            created_at: '2024-01-01',
          },
        ],
        pagination: { has_more: false, next_cursor: null },
      };
      mockFetch.mockResolvedValue(createMockResponse(mockOrders));

      const result = await client.getMyOrders('sess_123', { limit: 10 });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].number).toBe('DM-001');
    });
  });

  // ============================================================================
  // Discounts Tests
  // ============================================================================

  describe('Discounts', () => {
    it('fetches discounts list', async () => {
      const mockDiscounts = [
        {
          id: 'disc_1',
          code: 'SAVE10',
          type: 'percentage',
          value: 10,
          status: 'active',
          min_purchase_cents: null,
          max_discount_cents: null,
          starts_at: null,
          expires_at: null,
          usage_limit: null,
          usage_limit_per_customer: null,
          usage_count: 5,
          stripe_coupon_id: null,
          stripe_promotion_code_id: null,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        },
      ];
      mockFetch.mockResolvedValue(createMockResponse(mockDiscounts));

      const result = await client.getDiscounts();

      expect(result).toHaveLength(1);
      expect(result[0].code).toBe('SAVE10');
    });

    it('creates discount', async () => {
      const mockDiscount = {
        id: 'disc_new',
        code: 'NEWCODE',
        type: 'fixed_amount',
        value: 1000,
        status: 'active',
        min_purchase_cents: 5000,
        max_discount_cents: null,
        starts_at: null,
        expires_at: '2024-12-31T23:59:59Z',
        usage_limit: 100,
        usage_limit_per_customer: 1,
        usage_count: 0,
        stripe_coupon_id: null,
        stripe_promotion_code_id: null,
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      };
      mockFetch.mockResolvedValue(createMockResponse(mockDiscount));

      const result = await client.createDiscount({
        code: 'NEWCODE',
        type: 'fixed_amount',
        value: 1000,
        min_purchase_cents: 5000,
        expires_at: '2024-12-31T23:59:59Z',
        usage_limit: 100,
        usage_limit_per_customer: 1,
      });

      expect(result.code).toBe('NEWCODE');
      expect(result.type).toBe('fixed_amount');
    });
  });

  // ============================================================================
  // Webhooks Tests
  // ============================================================================

  describe('Webhooks', () => {
    it('fetches webhooks list', async () => {
      const mockWebhooks = [
        {
          id: 'wh_1',
          url: 'https://example.com/webhook',
          events: ['order.created'],
          active: true,
          secret: 'whsec_xxx',
          created_at: '2024-01-01',
        },
      ];
      mockFetch.mockResolvedValue(createMockResponse(mockWebhooks));

      const result = await client.getWebhooks();

      expect(result).toHaveLength(1);
      expect(result[0].url).toBe('https://example.com/webhook');
    });

    it('creates webhook', async () => {
      const mockWebhook = {
        id: 'wh_new',
        url: 'https://example.com/new-webhook',
        events: ['order.created', 'order.shipped'],
        active: true,
        secret: 'whsec_yyy',
        created_at: '2024-01-01',
      };
      mockFetch.mockResolvedValue(createMockResponse(mockWebhook));

      const result = await client.createWebhook({
        url: 'https://example.com/new-webhook',
        events: ['order.created', 'order.shipped'],
      });

      expect(result.url).toBe('https://example.com/new-webhook');
      expect(result.events).toContain('order.created');
    });
  });

  // ============================================================================
  // Error Handling Tests
  // ============================================================================

  describe('Error Handling', () => {
    describe('HTTP Status Errors', () => {
      it('throws ValidationError on 400', async () => {
        mockFetch.mockResolvedValue(
          createErrorResponse(400, 'invalid_request', 'Invalid input', {
            field: 'email',
          })
        );

        try {
          await client.createProduct({ title: '' });
          expect.fail('Should have thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(ValidationError);
          expect((error as ValidationError).status).toBe(400);
          expect((error as ValidationError).message).toBe('Invalid input');
          expect((error as ValidationError).details).toEqual({
            field: 'email',
          });
        }
      });

      it('throws AuthenticationError on 401', async () => {
        mockFetch.mockResolvedValue(
          createErrorResponse(401, 'unauthorized', 'Invalid API key')
        );

        try {
          await client.getProducts();
          expect.fail('Should have thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(AuthenticationError);
          expect((error as AuthenticationError).status).toBe(401);
        }
      });

      it('throws ForbiddenError on 403', async () => {
        mockFetch.mockResolvedValue(
          createErrorResponse(403, 'forbidden', 'Insufficient permissions')
        );

        try {
          await client.deleteProduct('prod_123');
          expect.fail('Should have thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(ForbiddenError);
          expect((error as ForbiddenError).status).toBe(403);
        }
      });

      it('throws NotFoundError on 404', async () => {
        mockFetch.mockResolvedValue(
          createErrorResponse(404, 'not_found', 'Resource not found')
        );

        try {
          await client.getProduct('nonexistent');
          expect.fail('Should have thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(NotFoundError);
          expect((error as NotFoundError).status).toBe(404);
        }
      });

      it('throws ConflictError on 409', async () => {
        mockFetch.mockResolvedValue(
          createErrorResponse(409, 'conflict', 'Resource already exists', {
            duplicate: true,
          })
        );

        try {
          await client.createProduct({ title: 'Duplicate' });
          expect.fail('Should have thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(ConflictError);
          expect((error as ConflictError).status).toBe(409);
          expect((error as ConflictError).details).toEqual({ duplicate: true });
        }
      });

      it('throws MerchantApiError on other status codes', async () => {
        mockFetch.mockResolvedValue(
          createErrorResponse(500, 'internal_error', 'Server error')
        );

        try {
          await client.getProducts();
          expect.fail('Should have thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(MerchantApiError);
          expect((error as MerchantApiError).status).toBe(500);
        }
      });

      it('handles non-JSON error response', async () => {
        mockFetch.mockResolvedValue({
          ok: false,
          status: 502,
          json: vi.fn().mockRejectedValue(new Error('Invalid JSON')),
        } as unknown as Response);

        try {
          await client.getProducts();
          expect.fail('Should have thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(MerchantApiError);
          expect((error as MerchantApiError).status).toBe(502);
          expect((error as MerchantApiError).message).toContain('502');
        }
      });

      it('all methods throw AuthenticationError on 401 unauthorized', async () => {
        mockFetch.mockResolvedValue(
          createErrorResponse(401, 'unauthorized', 'Unauthorized')
        );

        await expect(client.getProducts()).rejects.toThrow(AuthenticationError);
        await expect(client.getProduct('id')).rejects.toThrow(
          AuthenticationError
        );
        await expect(client.createProduct({ title: 'x' })).rejects.toThrow(
          AuthenticationError
        );
        await expect(client.updateProduct('id', {})).rejects.toThrow(
          AuthenticationError
        );
        await expect(client.deleteProduct('id')).rejects.toThrow(
          AuthenticationError
        );
        await expect(client.getOrders()).rejects.toThrow(AuthenticationError);
        await expect(client.getCustomers()).rejects.toThrow(
          AuthenticationError
        );
      });
    });

    describe('Network Errors', () => {
      it('throws NetworkError on network failure', async () => {
        mockFetch.mockRejectedValue(new Error('Network request failed'));

        try {
          await client.getProducts();
          expect.fail('Should have thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(NetworkError);
          expect((error as NetworkError).message).toBe(
            'Failed to connect to the Merchant API'
          );
          expect((error as NetworkError).cause).toBeInstanceOf(Error);
        }
      });

      it('throws NetworkError on timeout', async () => {
        mockFetch.mockRejectedValue(new Error('Request timed out'));

        try {
          await client.getProduct('prod_123');
          expect.fail('Should have thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(NetworkError);
        }
      });

      it('handles non-Error rejection', async () => {
        mockFetch.mockRejectedValue('string error');

        try {
          await client.getProducts();
          expect.fail('Should have thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(NetworkError);
          expect((error as NetworkError).cause).toBeUndefined();
        }
      });
    });
  });

  // ============================================================================
  // Images Tests
  // ============================================================================

  describe('Images', () => {
    it('uploads image', async () => {
      const mockResult = {
        url: 'https://cdn.example.com/images/abc123.jpg',
        key: 'abc123.jpg',
      };
      mockFetch.mockResolvedValue(createMockResponse(mockResult));

      const file = new Blob(['fake image content'], { type: 'image/jpeg' });
      const result = await client.uploadImage(file, 'test.jpg');

      expect(result.url).toContain('abc123');
      expect(result.key).toBe('abc123.jpg');
    });

    it('returns image URL for key', () => {
      const url = client.getImageUrl('abc123.jpg');
      expect(url).toBe(`${baseUrl}/v1/images/abc123.jpg`);
    });

    it('deletes image', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 204,
        json: vi.fn(),
      } as unknown as Response);

      await expect(client.deleteImage('abc123.jpg')).resolves.toBeUndefined();
    });

    it('throws NetworkError on upload failure', async () => {
      mockFetch.mockRejectedValue(new Error('Upload failed'));

      const file = new Blob(['content'], { type: 'image/jpeg' });

      await expect(client.uploadImage(file, 'test.jpg')).rejects.toThrow(
        NetworkError
      );
    });
  });

  // ============================================================================
  // Counts Tests
  // ============================================================================

  describe('Counts', () => {
    describe('getProductsCount', () => {
      it('returns product count', async () => {
        mockFetch.mockResolvedValue(createMockResponse({ count: 15 }));

        const result = await client.getProductsCount();

        expect(result).toEqual({ count: 15 });
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/v1/counts/products'),
          expect.any(Object)
        );
      });

      it('passes status filter', async () => {
        mockFetch.mockResolvedValue(createMockResponse({ count: 8 }));

        const result = await client.getProductsCount({ status: 'active' });

        expect(result).toEqual({ count: 8 });
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('status=active'),
          expect.any(Object)
        );
      });
    });

    describe('getOrdersCount', () => {
      it('returns order count', async () => {
        mockFetch.mockResolvedValue(createMockResponse({ count: 42 }));

        const result = await client.getOrdersCount();

        expect(result).toEqual({ count: 42 });
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/v1/counts/orders'),
          expect.any(Object)
        );
      });

      it('passes status filter', async () => {
        mockFetch.mockResolvedValue(createMockResponse({ count: 12 }));

        const result = await client.getOrdersCount({ status: 'paid' });

        expect(result).toEqual({ count: 12 });
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('status=paid'),
          expect.any(Object)
        );
      });

      it('passes date range filters', async () => {
        mockFetch.mockResolvedValue(createMockResponse({ count: 5 }));

        const result = await client.getOrdersCount({
          start_date: '2026-01-01',
          end_date: '2026-01-31',
        });

        expect(result).toEqual({ count: 5 });
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('start_date=2026-01-01'),
          expect.any(Object)
        );
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('end_date=2026-01-31'),
          expect.any(Object)
        );
      });

      it('passes all filters together', async () => {
        mockFetch.mockResolvedValue(createMockResponse({ count: 3 }));

        const result = await client.getOrdersCount({
          status: 'shipped',
          start_date: '2026-01-01',
          end_date: '2026-01-15',
        });

        expect(result).toEqual({ count: 3 });
      });
    });

    describe('getCustomersCount', () => {
      it('returns customer count', async () => {
        mockFetch.mockResolvedValue(createMockResponse({ count: 100 }));

        const result = await client.getCustomersCount();

        expect(result).toEqual({ count: 100 });
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/v1/counts/customers'),
          expect.any(Object)
        );
      });
    });

    describe('getInventoryCount', () => {
      it('returns inventory count', async () => {
        mockFetch.mockResolvedValue(createMockResponse({ count: 50 }));

        const result = await client.getInventoryCount();

        expect(result).toEqual({ count: 50 });
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/v1/counts/inventory'),
          expect.any(Object)
        );
      });

      it('passes low_stock filter', async () => {
        mockFetch.mockResolvedValue(createMockResponse({ count: 5 }));

        const result = await client.getInventoryCount({ low_stock: true });

        expect(result).toEqual({ count: 5 });
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('low_stock=true'),
          expect.any(Object)
        );
      });
    });
  });
});
