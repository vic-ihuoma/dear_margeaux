import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Env } from '../../src/types';

// ============================================================
// MOCKS
// ============================================================

// Mock fetch for Resend API calls
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock database
const mockDbQuery = vi.fn();
const mockDbRun = vi.fn().mockResolvedValue({ changes: 1 });

const mockDb = {
  query: mockDbQuery,
  run: mockDbRun,
};

// Mock the db module
vi.mock('../../src/db', () => ({
  getDb: vi.fn(() => mockDb),
}));

// Mock uuid and now functions
vi.mock('../../src/types', async () => {
  const actual = await vi.importActual('../../src/types');
  return {
    ...actual,
    uuid: vi.fn(() => 'test-uuid-123'),
    now: vi.fn(() => '2026-01-18T12:00:00.000Z'),
  };
});

// Mock email rate limiter to always allow emails in tests
vi.mock('../../src/lib/email-rate-limiter', () => ({
  checkAndLogRateLimit: vi.fn().mockResolvedValue({
    allowed: true,
    currentCount: 0,
    limit: 1000,
    remainingInWindow: 1000,
    windowResetAt: '2026-01-18T13:00:00.000Z',
  }),
  incrementUsage: vi.fn().mockResolvedValue({ newCount: 1 }),
}));

// Import after mocks are set up
import {
  sendOrderConfirmationEmail,
  sendShippingUpdateEmail,
  sendOrderStatusUpdateEmail,
  sendDropLaunchEmails,
  sendEmailViaResend,
  sendNewsletterVerificationEmail,
  buildOrderConfirmationHtml,
  buildShippingUpdateHtml,
  buildOrderStatusUpdateHtml,
  buildDropLaunchHtml,
  buildNewsletterVerificationHtml,
  type OrderData,
  type OrderItemData,
  type DropData,
  type TrackingInfo,
  type OrderStatusType,
} from '../../src/lib/notifications';

// ============================================================
// TEST HELPERS
// ============================================================

function createMockEnv(withApiKey = true): Env {
  return {
    DATABASE: {} as D1Database,
    IMAGES: {} as R2Bucket,
    RESEND_API_KEY: withApiKey ? 'test-resend-api-key' : undefined,
    STRIPE_SECRET_KEY: 'test-stripe-key',
    STRIPE_WEBHOOK_SECRET: 'test-webhook-secret',
    MERCHANT_ADMIN_KEY: 'test-admin-key',
  } as Env;
}

function createMockOrder(overrides: Partial<OrderData> = {}): OrderData {
  return {
    id: 'order-123',
    number: 'ORD-001',
    customer_email: 'customer@example.com',
    shipping_name: 'John Doe',
    ship_to: '123 Main St, City, ST 12345',
    subtotal_cents: 5000,
    tax_cents: 400,
    shipping_cents: 500,
    total_cents: 5900,
    ...overrides,
  };
}

function createMockOrderItems(): OrderItemData[] {
  return [
    {
      sku: 'SKU-001',
      title: 'Vintage Dress',
      qty: 1,
      unit_price_cents: 3000,
      image_url: 'https://example.com/dress.jpg',
      variant_title: 'Small',
    },
    {
      sku: 'SKU-002',
      title: 'Handmade Scarf',
      qty: 2,
      unit_price_cents: 1000,
      image_url: null,
      variant_title: null,
    },
  ];
}

function createMockDrop(overrides: Partial<DropData> = {}): DropData {
  return {
    id: 'drop-123',
    name: 'Spring Collection',
    slug: 'spring-collection',
    description: 'Our beautiful new spring collection',
    ...overrides,
  };
}

function createMockTrackingInfo(overrides: Partial<TrackingInfo> = {}): TrackingInfo {
  return {
    carrier: 'USPS',
    tracking_number: '9400111899223456789012',
    tracking_url: 'https://tools.usps.com/go/TrackConfirmAction?tLabels=9400111899223456789012',
    estimated_delivery: 'January 22, 2026',
    ...overrides,
  };
}

function createMockResendSuccess(messageId = 'resend-msg-123') {
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ id: messageId }),
  });
}

function createMockResendError(message: string, statusCode = 400) {
  return Promise.resolve({
    ok: false,
    status: statusCode,
    json: () => Promise.resolve({ error: { message, name: 'validation_error' } }),
  });
}

function createMockNetworkError(message: string) {
  return Promise.reject(new Error(message));
}

// ============================================================
// TESTS: sendEmailViaResend
// ============================================================

describe('sendEmailViaResend', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends email successfully with valid API key', async () => {
    mockFetch.mockImplementationOnce(() => createMockResendSuccess('msg-abc123'));

    const env = createMockEnv(true);
    const result = await sendEmailViaResend(env, {
      to: 'test@example.com',
      subject: 'Test Subject',
      html: '<p>Test body</p>',
    });

    expect(result.success).toBe(true);
    expect(result.messageId).toBe('msg-abc123');
    expect(mockFetch).toHaveBeenCalledWith('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer test-resend-api-key',
        'Content-Type': 'application/json',
      },
      body: expect.any(String),
    });
  });

  it('falls back to stub when API key is missing', async () => {
    const env = createMockEnv(false);
    const result = await sendEmailViaResend(env, {
      to: 'test@example.com',
      subject: 'Test Subject',
      html: '<p>Test body</p>',
    });

    expect(result.success).toBe(true);
    expect(result.messageId).toMatch(/^stub-/);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('returns error on Resend API failure', async () => {
    mockFetch.mockImplementationOnce(() => createMockResendError('Invalid email address'));

    const env = createMockEnv(true);
    const result = await sendEmailViaResend(env, {
      to: 'invalid-email',
      subject: 'Test',
      html: '<p>Test</p>',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid email address');
  });

  it('returns error on network failure', async () => {
    mockFetch.mockImplementationOnce(() => createMockNetworkError('Network timeout'));

    const env = createMockEnv(true);
    const result = await sendEmailViaResend(env, {
      to: 'test@example.com',
      subject: 'Test',
      html: '<p>Test</p>',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Network timeout');
  });

  it('includes correct headers (Authorization, Content-Type)', async () => {
    mockFetch.mockImplementationOnce(() => createMockResendSuccess());

    const env = createMockEnv(true);
    await sendEmailViaResend(env, {
      to: 'test@example.com',
      subject: 'Test',
      html: '<p>Test</p>',
    });

    const [, options] = mockFetch.mock.calls[0];
    expect(options.headers['Authorization']).toBe('Bearer test-resend-api-key');
    expect(options.headers['Content-Type']).toBe('application/json');
  });

  it('handles 401 unauthorized error', async () => {
    mockFetch.mockImplementationOnce(() => createMockResendError('Invalid API key', 401));

    const env = createMockEnv(true);
    const result = await sendEmailViaResend(env, {
      to: 'test@example.com',
      subject: 'Test',
      html: '<p>Test</p>',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid API key');
  });
});

// ============================================================
// TESTS: sendOrderConfirmationEmail
// ============================================================

describe('sendOrderConfirmationEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends email successfully with valid order data', async () => {
    mockFetch.mockImplementationOnce(() => createMockResendSuccess('order-msg-123'));

    const env = createMockEnv(true);
    const order = createMockOrder();
    const items = createMockOrderItems();

    const result = await sendOrderConfirmationEmail(env, 'store-1', order, items);

    expect(result.success).toBe(true);
    expect(result.messageId).toBe('order-msg-123');
  });

  it('uses customer email as recipient', async () => {
    mockFetch.mockImplementationOnce(() => createMockResendSuccess());

    const env = createMockEnv(true);
    const order = createMockOrder({ customer_email: 'specific@customer.com' });
    const items = createMockOrderItems();

    await sendOrderConfirmationEmail(env, 'store-1', order, items);

    const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(requestBody.to).toBe('specific@customer.com');
  });

  it('sets correct subject line with order number', async () => {
    mockFetch.mockImplementationOnce(() => createMockResendSuccess());

    const env = createMockEnv(true);
    const order = createMockOrder({ number: 'ORD-42069' });
    const items = createMockOrderItems();

    await sendOrderConfirmationEmail(env, 'store-1', order, items);

    const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(requestBody.subject).toBe('Order Confirmed - #ORD-42069');
  });

  it('returns success on successful send', async () => {
    mockFetch.mockImplementationOnce(() => createMockResendSuccess('success-id'));

    const env = createMockEnv(true);
    const result = await sendOrderConfirmationEmail(
      env,
      'store-1',
      createMockOrder(),
      createMockOrderItems()
    );

    expect(result).toEqual({
      success: true,
      messageId: 'success-id',
    });
  });

  it('returns error on failed send', async () => {
    mockFetch.mockImplementationOnce(() => createMockResendError('Rate limit exceeded', 429));

    const env = createMockEnv(true);
    const result = await sendOrderConfirmationEmail(
      env,
      'store-1',
      createMockOrder(),
      createMockOrderItems()
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe('Rate limit exceeded');
  });

  it('includes correct order data in HTML', async () => {
    mockFetch.mockImplementationOnce(() => createMockResendSuccess());

    const env = createMockEnv(true);
    const order = createMockOrder({
      number: 'ORD-999',
      shipping_name: 'Jane Doe',
      total_cents: 12500,
    });
    const items = createMockOrderItems();

    await sendOrderConfirmationEmail(env, 'store-1', order, items);

    const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(requestBody.html).toContain('ORD-999');
    expect(requestBody.html).toContain('Jane Doe');
    expect(requestBody.html).toContain('$125.00');
  });
});

// ============================================================
// TESTS: sendShippingUpdateEmail
// ============================================================

describe('sendShippingUpdateEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends email with tracking information', async () => {
    mockFetch.mockImplementationOnce(() => createMockResendSuccess('ship-msg-123'));

    const env = createMockEnv(true);
    const order = createMockOrder();
    const items = createMockOrderItems();
    const tracking = createMockTrackingInfo();

    const result = await sendShippingUpdateEmail(env, 'store-1', order, items, tracking);

    expect(result.success).toBe(true);
    expect(result.messageId).toBe('ship-msg-123');
  });

  it('sets subject line with shipped status', async () => {
    mockFetch.mockImplementationOnce(() => createMockResendSuccess());

    const env = createMockEnv(true);
    const order = createMockOrder({ number: 'ORD-555' });

    await sendShippingUpdateEmail(env, 'store-1', order, [], createMockTrackingInfo());

    const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(requestBody.subject).toBe('Your Order Has Shipped - #ORD-555');
  });

  it('includes tracking info in email body', async () => {
    mockFetch.mockImplementationOnce(() => createMockResendSuccess());

    const env = createMockEnv(true);
    const tracking = createMockTrackingInfo({
      carrier: 'FedEx',
      tracking_number: '1234567890',
      tracking_url: 'https://fedex.com/track/1234567890',
    });

    await sendShippingUpdateEmail(env, 'store-1', createMockOrder(), [], tracking);

    const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(requestBody.html).toContain('FedEx');
    expect(requestBody.html).toContain('1234567890');
    expect(requestBody.html).toContain('https://fedex.com/track/1234567890');
  });

  it('handles order without tracking info gracefully', async () => {
    mockFetch.mockImplementationOnce(() => createMockResendSuccess());

    const env = createMockEnv(true);
    const emptyTracking: TrackingInfo = {};

    const result = await sendShippingUpdateEmail(
      env,
      'store-1',
      createMockOrder(),
      [],
      emptyTracking
    );

    expect(result.success).toBe(true);
  });
});

// ============================================================
// TESTS: sendDropLaunchEmails (batch sending)
// ============================================================

describe('sendDropLaunchEmails', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends email to all waitlist subscribers', async () => {
    // Mock subscribers
    mockDbQuery.mockResolvedValueOnce([
      { id: 'sub-1', email: 'subscriber1@example.com' },
      { id: 'sub-2', email: 'subscriber2@example.com' },
      { id: 'sub-3', email: 'subscriber3@example.com' },
    ]);

    // Mock successful email sends
    mockFetch
      .mockImplementationOnce(() => createMockResendSuccess('msg-1'))
      .mockImplementationOnce(() => createMockResendSuccess('msg-2'))
      .mockImplementationOnce(() => createMockResendSuccess('msg-3'));

    const env = createMockEnv(true);
    const drop = createMockDrop();

    const result = await sendDropLaunchEmails(env, 'store-1', drop);

    expect(result.total).toBe(3);
    expect(result.success).toBe(3);
    expect(result.failed).toBe(0);
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it('updates notified_at for each subscriber after email sent', async () => {
    mockDbQuery.mockResolvedValueOnce([{ id: 'sub-1', email: 'subscriber1@example.com' }]);
    mockFetch.mockImplementationOnce(() => createMockResendSuccess('msg-1'));

    const env = createMockEnv(true);
    const drop = createMockDrop();

    await sendDropLaunchEmails(env, 'store-1', drop);

    // Check that notified_at was updated
    expect(mockDbRun).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE waitlist_entries SET notified_at'),
      expect.arrayContaining(['2026-01-18T12:00:00.000Z', 'sub-1'])
    );
  });

  it('handles partial failures gracefully', async () => {
    mockDbQuery.mockResolvedValueOnce([
      { id: 'sub-1', email: 'subscriber1@example.com' },
      { id: 'sub-2', email: 'invalid-email' },
      { id: 'sub-3', email: 'subscriber3@example.com' },
    ]);

    // First and third succeed, second fails
    mockFetch
      .mockImplementationOnce(() => createMockResendSuccess('msg-1'))
      .mockImplementationOnce(() => createMockResendError('Invalid email'))
      .mockImplementationOnce(() => createMockResendSuccess('msg-3'));

    const env = createMockEnv(true);
    const drop = createMockDrop();

    const result = await sendDropLaunchEmails(env, 'store-1', drop);

    expect(result.total).toBe(3);
    expect(result.success).toBe(2);
    expect(result.failed).toBe(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('invalid-email');
  });

  it('does not update notified_at for failed emails', async () => {
    mockDbQuery.mockResolvedValueOnce([{ id: 'sub-fail', email: 'fail@example.com' }]);
    mockFetch.mockImplementationOnce(() => createMockResendError('Send failed'));

    const env = createMockEnv(true);
    const drop = createMockDrop();

    await sendDropLaunchEmails(env, 'store-1', drop);

    // Verify notified_at was NOT updated for failed send
    expect(mockDbRun).not.toHaveBeenCalledWith(
      expect.stringContaining('UPDATE waitlist_entries SET notified_at'),
      expect.arrayContaining(['sub-fail'])
    );
  });

  it('handles empty subscriber list', async () => {
    mockDbQuery.mockResolvedValueOnce([]);

    const env = createMockEnv(true);
    const drop = createMockDrop();

    const result = await sendDropLaunchEmails(env, 'store-1', drop);

    expect(result.total).toBe(0);
    expect(result.success).toBe(0);
    expect(result.failed).toBe(0);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('processes subscribers in batches', async () => {
    // Create 15 subscribers to test batching (batch size is 10)
    const subscribers = Array.from({ length: 15 }, (_, i) => ({
      id: `sub-${i}`,
      email: `subscriber${i}@example.com`,
    }));
    mockDbQuery.mockResolvedValueOnce(subscribers);

    // Mock all successful sends
    for (let i = 0; i < 15; i++) {
      mockFetch.mockImplementationOnce(() => createMockResendSuccess(`msg-${i}`));
    }

    const env = createMockEnv(true);
    const drop = createMockDrop();

    const result = await sendDropLaunchEmails(env, 'store-1', drop);

    expect(result.total).toBe(15);
    expect(result.success).toBe(15);
    expect(mockFetch).toHaveBeenCalledTimes(15);
  });
});

// ============================================================
// TESTS: sendOrderStatusUpdateEmail (admin-11)
// ============================================================

describe('sendOrderStatusUpdateEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends processing status email successfully', async () => {
    mockFetch.mockImplementationOnce(() => createMockResendSuccess('status-msg-123'));

    const env = createMockEnv(true);
    const order = createMockOrder();
    const items = createMockOrderItems();

    const result = await sendOrderStatusUpdateEmail(env, 'store-1', order, items, 'processing');

    expect(result.success).toBe(true);
    expect(result.messageId).toBe('status-msg-123');
  });

  it('sends delivered status email successfully', async () => {
    mockFetch.mockImplementationOnce(() => createMockResendSuccess('delivered-msg-456'));

    const env = createMockEnv(true);
    const order = createMockOrder();
    const items = createMockOrderItems();
    const tracking = createMockTrackingInfo();

    const result = await sendOrderStatusUpdateEmail(
      env,
      'store-1',
      order,
      items,
      'delivered',
      tracking
    );

    expect(result.success).toBe(true);
    expect(result.messageId).toBe('delivered-msg-456');
  });

  it('sets correct subject line for processing status', async () => {
    mockFetch.mockImplementationOnce(() => createMockResendSuccess());

    const env = createMockEnv(true);
    const order = createMockOrder({ number: 'ORD-TEST-001' });
    const items = createMockOrderItems();

    await sendOrderStatusUpdateEmail(env, 'store-1', order, items, 'processing');

    const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(requestBody.subject).toBe('Your Order Is Being Prepared - #ORD-TEST-001');
  });

  it('sets correct subject line for delivered status', async () => {
    mockFetch.mockImplementationOnce(() => createMockResendSuccess());

    const env = createMockEnv(true);
    const order = createMockOrder({ number: 'ORD-TEST-002' });
    const items = createMockOrderItems();

    await sendOrderStatusUpdateEmail(env, 'store-1', order, items, 'delivered');

    const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(requestBody.subject).toBe('Your Order Has Been Delivered - #ORD-TEST-002');
  });

  it('includes order items in email body', async () => {
    mockFetch.mockImplementationOnce(() => createMockResendSuccess());

    const env = createMockEnv(true);
    const order = createMockOrder();
    const items = createMockOrderItems();

    await sendOrderStatusUpdateEmail(env, 'store-1', order, items, 'processing');

    const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(requestBody.html).toContain('Vintage Dress');
    expect(requestBody.html).toContain('Handmade Scarf');
  });

  it('includes tracking info for delivered status', async () => {
    mockFetch.mockImplementationOnce(() => createMockResendSuccess());

    const env = createMockEnv(true);
    const order = createMockOrder();
    const items = createMockOrderItems();
    const tracking = createMockTrackingInfo({
      tracking_number: 'TRACK-12345',
      tracking_url: 'https://track.example.com/12345',
    });

    await sendOrderStatusUpdateEmail(env, 'store-1', order, items, 'delivered', tracking);

    const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(requestBody.html).toContain('TRACK-12345');
    expect(requestBody.html).toContain('https://track.example.com/12345');
  });

  it('handles missing tracking info for delivered status', async () => {
    mockFetch.mockImplementationOnce(() => createMockResendSuccess());

    const env = createMockEnv(true);
    const order = createMockOrder();
    const items = createMockOrderItems();

    const result = await sendOrderStatusUpdateEmail(env, 'store-1', order, items, 'delivered');

    expect(result.success).toBe(true);
  });

  it('returns error on failed send', async () => {
    mockFetch.mockImplementationOnce(() => createMockResendError('Rate limit exceeded', 429));

    const env = createMockEnv(true);
    const result = await sendOrderStatusUpdateEmail(
      env,
      'store-1',
      createMockOrder(),
      createMockOrderItems(),
      'processing'
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe('Rate limit exceeded');
  });

  it('uses customer email as recipient', async () => {
    mockFetch.mockImplementationOnce(() => createMockResendSuccess());

    const env = createMockEnv(true);
    const order = createMockOrder({ customer_email: 'customer@test.com' });
    const items = createMockOrderItems();

    await sendOrderStatusUpdateEmail(env, 'store-1', order, items, 'processing');

    const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(requestBody.to).toBe('customer@test.com');
  });

  it('queues email for retry with order_status_update type on failure', async () => {
    mockFetch.mockImplementationOnce(() => createMockResendError('Service unavailable', 503));

    const env = createMockEnv(true);
    await sendOrderStatusUpdateEmail(
      env,
      'store-1',
      createMockOrder({ id: 'order-xyz', number: 'ORD-123' }),
      createMockOrderItems(),
      'processing'
    );

    const queueCall = mockDbRun.mock.calls.find((call) =>
      call[0].includes('INSERT INTO email_queue')
    );
    expect(queueCall).toBeDefined();
    if (queueCall) {
      expect(queueCall[1]).toContain('order_status_update');
    }
  });
});

// ============================================================
// TESTS: buildOrderStatusUpdateHtml (admin-11)
// ============================================================

describe('buildOrderStatusUpdateHtml', () => {
  it('includes customer name in greeting', () => {
    const html = buildOrderStatusUpdateHtml({
      customerName: 'Jane Smith',
      orderNumber: 'ORD-001',
      status: 'processing',
    });

    expect(html).toContain('Jane Smith');
  });

  it('includes order number', () => {
    const html = buildOrderStatusUpdateHtml({
      customerName: 'Test',
      orderNumber: 'ORD-SPECIAL-42',
      status: 'processing',
    });

    expect(html).toContain('ORD-SPECIAL-42');
  });

  it('shows correct title for processing status', () => {
    const html = buildOrderStatusUpdateHtml({
      customerName: 'Test',
      orderNumber: 'ORD-001',
      status: 'processing',
    });

    expect(html).toContain('Your Order Is Being Prepared');
  });

  it('shows correct title for delivered status', () => {
    const html = buildOrderStatusUpdateHtml({
      customerName: 'Test',
      orderNumber: 'ORD-001',
      status: 'delivered',
    });

    expect(html).toContain('Your Order Has Been Delivered');
  });

  it('shows correct icon for processing status', () => {
    const html = buildOrderStatusUpdateHtml({
      customerName: 'Test',
      orderNumber: 'ORD-001',
      status: 'processing',
    });

    expect(html).toContain('⚙️');
  });

  it('shows correct icon for delivered status', () => {
    const html = buildOrderStatusUpdateHtml({
      customerName: 'Test',
      orderNumber: 'ORD-001',
      status: 'delivered',
    });

    expect(html).toContain('✅');
  });

  it('includes order items when provided', () => {
    const html = buildOrderStatusUpdateHtml({
      customerName: 'Test',
      orderNumber: 'ORD-001',
      status: 'processing',
      items: [
        { title: 'Luxury Bag', variantTitle: 'Black', quantity: 1 },
        { title: 'Silk Scarf', quantity: 2 },
      ],
    });

    expect(html).toContain('Luxury Bag');
    expect(html).toContain('Black');
    expect(html).toContain('Silk Scarf');
    expect(html).toContain('Qty: 1');
    expect(html).toContain('Qty: 2');
  });

  it('includes tracking info for delivered status', () => {
    const html = buildOrderStatusUpdateHtml({
      customerName: 'Test',
      orderNumber: 'ORD-001',
      status: 'delivered',
      trackingNumber: 'TRACK-999',
      trackingUrl: 'https://carrier.com/track/999',
    });

    expect(html).toContain('TRACK-999');
    expect(html).toContain('https://carrier.com/track/999');
    expect(html).toContain('View Tracking Details');
  });

  it('does not show tracking info for processing status', () => {
    const html = buildOrderStatusUpdateHtml({
      customerName: 'Test',
      orderNumber: 'ORD-001',
      status: 'processing',
      trackingNumber: 'TRACK-999',
      trackingUrl: 'https://carrier.com/track/999',
    });

    expect(html).not.toContain('Tracking Number');
    expect(html).not.toContain('View Tracking Details');
  });

  it("includes what's next tips for processing status", () => {
    const html = buildOrderStatusUpdateHtml({
      customerName: 'Test',
      orderNumber: 'ORD-001',
      status: 'processing',
    });

    expect(html).toContain("What's Next?");
    expect(html).toContain('Packing');
    expect(html).toContain('Updates');
    expect(html).toContain("You'll receive an email when your order ships");
  });

  it("includes what's next tips for delivered status", () => {
    const html = buildOrderStatusUpdateHtml({
      customerName: 'Test',
      orderNumber: 'ORD-001',
      status: 'delivered',
    });

    expect(html).toContain("What's Next?");
    expect(html).toContain('Share');
    expect(html).toContain('Review');
    expect(html).toContain('Returns');
  });

  it('includes View Order Details button', () => {
    const html = buildOrderStatusUpdateHtml({
      customerName: 'Test',
      orderNumber: 'ORD-001',
      status: 'processing',
    });

    expect(html).toContain('View Order Details');
    expect(html).toContain('href="https://dearmargeaux.com/account/orders/ORD-001"');
  });

  it('uses brand color #8B4513 for header', () => {
    const html = buildOrderStatusUpdateHtml({
      customerName: 'Test',
      orderNumber: 'ORD-001',
      status: 'processing',
    });

    expect(html).toContain('#8B4513');
  });

  it('uses amber color for processing status banner', () => {
    const html = buildOrderStatusUpdateHtml({
      customerName: 'Test',
      orderNumber: 'ORD-001',
      status: 'processing',
    });

    expect(html).toContain('#fef3c7'); // amber-100
  });

  it('uses green color for delivered status banner', () => {
    const html = buildOrderStatusUpdateHtml({
      customerName: 'Test',
      orderNumber: 'ORD-001',
      status: 'delivered',
    });

    expect(html).toContain('#dcfce7'); // green-100
  });

  it('includes support email in footer', () => {
    const html = buildOrderStatusUpdateHtml({
      customerName: 'Test',
      orderNumber: 'ORD-001',
      status: 'processing',
    });

    expect(html).toContain('hello@dearmargeaux.com');
  });

  it('escapes HTML in customer name', () => {
    const html = buildOrderStatusUpdateHtml({
      customerName: '<script>alert("xss")</script>',
      orderNumber: 'ORD-001',
      status: 'processing',
    });

    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('escapes HTML in order number', () => {
    const html = buildOrderStatusUpdateHtml({
      customerName: 'Test',
      orderNumber: '<img src=x onerror=alert(1)>',
      status: 'processing',
    });

    expect(html).not.toContain('<img src=x');
    expect(html).toContain('&lt;img');
  });

  it('escapes HTML in item titles', () => {
    const html = buildOrderStatusUpdateHtml({
      customerName: 'Test',
      orderNumber: 'ORD-001',
      status: 'processing',
      items: [{ title: '<script>evil()</script>', quantity: 1 }],
    });

    expect(html).not.toContain('<script>evil()');
    expect(html).toContain('&lt;script&gt;');
  });
});

// ============================================================
// TESTS: Email failure does not fail parent operation
// ============================================================

describe('Email failure isolation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('order confirmation email failure does not throw', async () => {
    mockFetch.mockImplementationOnce(() => createMockResendError('API Error'));

    const env = createMockEnv(true);

    // This should NOT throw, just return error result
    const result = await sendOrderConfirmationEmail(
      env,
      'store-1',
      createMockOrder(),
      createMockOrderItems()
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe('API Error');
    // No exception thrown
  });

  it('shipping update email failure does not throw', async () => {
    mockFetch.mockImplementationOnce(() => createMockResendError('API Error'));

    const env = createMockEnv(true);

    const result = await sendShippingUpdateEmail(
      env,
      'store-1',
      createMockOrder(),
      [],
      createMockTrackingInfo()
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe('API Error');
  });

  it('network error in email sending does not throw', async () => {
    mockFetch.mockImplementationOnce(() => createMockNetworkError('Connection reset'));

    const env = createMockEnv(true);

    const result = await sendOrderConfirmationEmail(
      env,
      'store-1',
      createMockOrder(),
      createMockOrderItems()
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe('Connection reset');
  });
});

// ============================================================
// TESTS: Email Template Builders
// ============================================================

describe('buildOrderConfirmationHtml', () => {
  it('includes customer name in greeting', () => {
    const html = buildOrderConfirmationHtml({
      customerName: 'Alice Smith',
      orderNumber: 'ORD-001',
      items: [],
      subtotal: 1000,
      shipping: 500,
      tax: 100,
      discount: 0,
      total: 1600,
      orderUrl: 'https://example.com/orders/1',
    });

    expect(html).toContain('Alice Smith');
  });

  it('includes order number in header', () => {
    const html = buildOrderConfirmationHtml({
      customerName: 'Test',
      orderNumber: 'ORD-SPECIAL-42',
      items: [],
      subtotal: 0,
      shipping: 0,
      tax: 0,
      discount: 0,
      total: 0,
      orderUrl: 'https://example.com',
    });

    expect(html).toContain('#ORD-SPECIAL-42');
  });

  it('lists all order items with names and quantities', () => {
    const html = buildOrderConfirmationHtml({
      customerName: 'Test',
      orderNumber: 'ORD-001',
      items: [
        { sku: '1', title: 'Vintage Dress', qty: 2, unit_price_cents: 5000 },
        { sku: '2', title: 'Wool Scarf', qty: 1, unit_price_cents: 2500 },
      ],
      subtotal: 12500,
      shipping: 500,
      tax: 800,
      discount: 0,
      total: 13800,
      orderUrl: 'https://example.com',
    });

    expect(html).toContain('Vintage Dress');
    expect(html).toContain('Wool Scarf');
    // Quantities appear in table cells (with possible whitespace between tags)
    expect(html).toMatch(/>\s*2\s*</); // Quantity 2 in table cell
    expect(html).toMatch(/>\s*1\s*</); // Quantity 1 in table cell
  });

  it('formats prices correctly with currency symbol', () => {
    const html = buildOrderConfirmationHtml({
      customerName: 'Test',
      orderNumber: 'ORD-001',
      items: [],
      subtotal: 10050,
      shipping: 599,
      tax: 803,
      discount: 0,
      total: 11452,
      orderUrl: 'https://example.com',
    });

    expect(html).toContain('$100.50'); // Subtotal
    expect(html).toContain('$5.99'); // Shipping
    expect(html).toContain('$8.03'); // Tax
    expect(html).toContain('$114.52'); // Total
  });

  it('displays discount when present', () => {
    const html = buildOrderConfirmationHtml({
      customerName: 'Test',
      orderNumber: 'ORD-001',
      items: [],
      subtotal: 10000,
      shipping: 500,
      tax: 500,
      discount: 1000,
      total: 10000,
      orderUrl: 'https://example.com',
    });

    expect(html).toContain('-$10.00'); // Discount
    expect(html).toContain('Discount');
  });

  it('uses brand color #8B4513', () => {
    const html = buildOrderConfirmationHtml({
      customerName: 'Test',
      orderNumber: 'ORD-001',
      items: [],
      subtotal: 0,
      shipping: 0,
      tax: 0,
      discount: 0,
      total: 0,
      orderUrl: 'https://example.com',
    });

    expect(html).toContain('#8B4513');
  });
});

describe('buildShippingUpdateHtml', () => {
  it('includes tracking number in email body', () => {
    const html = buildShippingUpdateHtml({
      customerName: 'Test',
      orderNumber: 'ORD-001',
      trackingNumber: 'TRACK123456789',
      carrier: 'UPS',
    });

    expect(html).toContain('TRACK123456789');
  });

  it('includes carrier name', () => {
    const html = buildShippingUpdateHtml({
      customerName: 'Test',
      orderNumber: 'ORD-001',
      carrier: 'FedEx Ground',
    });

    expect(html).toContain('FedEx Ground');
  });

  it('includes Track Your Package button with correct href', () => {
    const html = buildShippingUpdateHtml({
      customerName: 'Test',
      orderNumber: 'ORD-001',
      trackingUrl: 'https://ups.com/track/123',
    });

    expect(html).toContain('Track Your Package');
    expect(html).toContain('href="https://ups.com/track/123"');
  });

  it('handles missing tracking URL gracefully', () => {
    const html = buildShippingUpdateHtml({
      customerName: 'Test',
      orderNumber: 'ORD-001',
      carrier: 'USPS',
      trackingNumber: '123',
      // No trackingUrl provided
    });

    // Should not have broken HTML or missing button error
    expect(html).not.toContain('Track Your Package');
    expect(html).toContain('USPS');
    expect(html).toContain('123');
  });
});

describe('buildDropLaunchHtml', () => {
  it('includes drop name in header', () => {
    const html = buildDropLaunchHtml({
      subscriberName: 'there',
      dropName: 'Fall Vintage Collection',
      dropUrl: 'https://example.com/shop/fall',
    });

    expect(html).toContain('Fall Vintage Collection');
    expect(html).toContain('NOW LIVE');
  });

  it('includes drop description', () => {
    const html = buildDropLaunchHtml({
      subscriberName: 'there',
      dropName: 'Summer Sale',
      dropDescription: 'Our biggest sale of the year with 50% off everything!',
      dropUrl: 'https://example.com',
    });

    expect(html).toContain('Our biggest sale of the year with 50% off everything!');
  });

  it('displays featured image when provided', () => {
    const html = buildDropLaunchHtml({
      subscriberName: 'there',
      dropName: 'New Arrivals',
      dropUrl: 'https://example.com',
      featuredImageUrl: 'https://cdn.example.com/featured.jpg',
    });

    expect(html).toContain('src="https://cdn.example.com/featured.jpg"');
    expect(html).toContain('alt="New Arrivals"');
  });

  it('handles missing featured image gracefully', () => {
    const html = buildDropLaunchHtml({
      subscriberName: 'there',
      dropName: 'Limited Edition',
      dropUrl: 'https://example.com',
      // No featuredImageUrl
    });

    // Should not contain img tag for featured image
    expect(html).not.toContain('<img');
  });

  it('uses terracotta accent color #E2725B', () => {
    const html = buildDropLaunchHtml({
      subscriberName: 'there',
      dropName: 'Test Drop',
      dropUrl: 'https://example.com',
    });

    expect(html).toContain('#E2725B');
  });

  it('includes Shop Now CTA button', () => {
    const html = buildDropLaunchHtml({
      subscriberName: 'there',
      dropName: 'Test',
      dropUrl: 'https://example.com/shop/test',
    });

    expect(html).toContain('SHOP THE DROP');
    expect(html).toContain('href="https://example.com/shop/test"');
  });

  it('CTA links to correct drop URL', () => {
    const dropUrl = 'https://dearmargeaux.com/shop/spring-2026';
    const html = buildDropLaunchHtml({
      subscriberName: 'Jane',
      dropName: 'Spring 2026',
      dropUrl,
    });

    expect(html).toContain(`href="${dropUrl}"`);
  });
});

// ============================================================
// TESTS: Queue behavior for failed emails (PRD requirement)
// Note: This tests the current behavior - actual queue implementation
// would be in api-5 task. For now, we verify graceful error handling.
// ============================================================

describe('Failed email handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('batch send continues after individual failure', async () => {
    mockDbQuery.mockResolvedValueOnce([
      { id: 'sub-1', email: 'good1@example.com' },
      { id: 'sub-2', email: 'bad@example.com' },
      { id: 'sub-3', email: 'good2@example.com' },
    ]);

    mockFetch
      .mockImplementationOnce(() => createMockResendSuccess())
      .mockImplementationOnce(() => createMockResendError('Failed'))
      .mockImplementationOnce(() => createMockResendSuccess());

    const env = createMockEnv(true);
    const result = await sendDropLaunchEmails(env, 'store-1', createMockDrop());

    // All 3 were attempted
    expect(mockFetch).toHaveBeenCalledTimes(3);
    // 2 succeeded, 1 failed
    expect(result.success).toBe(2);
    expect(result.failed).toBe(1);
  });

  it('error details are captured in result', async () => {
    mockDbQuery.mockResolvedValueOnce([{ id: 'sub-1', email: 'fail@example.com' }]);
    mockFetch.mockImplementationOnce(() => createMockResendError('Rate limit exceeded'));

    const env = createMockEnv(true);
    const result = await sendDropLaunchEmails(env, 'store-1', createMockDrop());

    expect(result.errors).toContain('fail@example.com: Rate limit exceeded');
  });
});

// ============================================================
// TESTS: Newsletter Verification Email Template (newsletter-4)
// ============================================================

describe('buildNewsletterVerificationHtml', () => {
  it('returns valid HTML with doctype', () => {
    const html = buildNewsletterVerificationHtml({
      verificationUrl: 'https://example.com/verify?token=abc123',
    });

    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<html>');
    expect(html).toContain('</html>');
  });

  it('includes verification link with token', () => {
    const verificationUrl = 'https://dearmargeaux.com/newsletter/verify?token=secret-token-xyz';
    const html = buildNewsletterVerificationHtml({ verificationUrl });

    expect(html).toContain(`href="${verificationUrl}"`);
  });

  it('includes Confirm Subscription button', () => {
    const html = buildNewsletterVerificationHtml({
      verificationUrl: 'https://example.com/verify?token=abc',
    });

    expect(html).toContain('Confirm Subscription');
  });

  it('uses brand color #8B4513 for header', () => {
    const html = buildNewsletterVerificationHtml({
      verificationUrl: 'https://example.com/verify',
    });

    expect(html).toContain('#8B4513');
  });

  it('uses terracotta color #E2725B for CTA button', () => {
    const html = buildNewsletterVerificationHtml({
      verificationUrl: 'https://example.com/verify',
    });

    expect(html).toContain('#E2725B');
  });

  it('includes explanation text about receiving the email', () => {
    const html = buildNewsletterVerificationHtml({
      verificationUrl: 'https://example.com/verify',
    });

    // Should explain what happens if they didn't request the email
    expect(html).toContain("If you didn't request this email");
    expect(html).toContain('safely ignore');
  });

  it('includes store name in greeting', () => {
    const html = buildNewsletterVerificationHtml({
      verificationUrl: 'https://example.com/verify',
    });

    expect(html).toContain('Dear Margeaux');
  });

  it('includes token expiration notice', () => {
    const html = buildNewsletterVerificationHtml({
      verificationUrl: 'https://example.com/verify',
    });

    expect(html).toContain('expire');
  });

  it('includes unsubscribe link when provided', () => {
    const unsubscribeUrl = 'https://dearmargeaux.com/newsletter/unsubscribe?email=test@example.com';
    const html = buildNewsletterVerificationHtml({
      verificationUrl: 'https://example.com/verify',
      unsubscribeUrl,
    });

    expect(html).toContain(`href="${unsubscribeUrl}"`);
    expect(html).toContain('Unsubscribe');
  });

  it('omits unsubscribe link when not provided', () => {
    const html = buildNewsletterVerificationHtml({
      verificationUrl: 'https://example.com/verify',
      // No unsubscribeUrl
    });

    expect(html).not.toContain('Unsubscribe');
  });

  it('includes support email in footer', () => {
    const html = buildNewsletterVerificationHtml({
      verificationUrl: 'https://example.com/verify',
    });

    expect(html).toContain('hello@dearmargeaux.com');
  });

  it('describes newsletter benefits', () => {
    const html = buildNewsletterVerificationHtml({
      verificationUrl: 'https://example.com/verify',
    });

    // Should mention what subscribers will receive
    expect(html).toContain('new collections');
    expect(html).toContain('exclusive drops');
  });
});

// ============================================================
// TESTS: sendNewsletterVerificationEmail
// ============================================================

describe('sendNewsletterVerificationEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls Resend API with correct parameters', async () => {
    mockFetch.mockImplementationOnce(() => createMockResendSuccess('msg-verify-123'));

    const env = createMockEnv(true);
    const result = await sendNewsletterVerificationEmail(env, {
      email: 'subscriber@example.com',
      verificationToken: 'token-abc-123',
      storeId: 'store-123',
    });

    expect(result.success).toBe(true);
    expect(result.messageId).toBe('msg-verify-123');
    expect(mockFetch).toHaveBeenCalledWith('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer test-resend-api-key',
        'Content-Type': 'application/json',
      },
      body: expect.any(String),
    });

    // Verify the email body contains expected content
    const callArgs = mockFetch.mock.calls[0];
    const body = JSON.parse(callArgs[1].body);
    expect(body.to).toBe('subscriber@example.com');
    expect(body.subject).toContain('Confirm your subscription');
    expect(body.subject).toContain('Dear Margeaux');
    expect(body.html).toContain('token-abc-123');
  });

  it('logs email send attempt', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    mockFetch.mockImplementationOnce(() => createMockResendSuccess('msg-123'));

    const env = createMockEnv(true);
    await sendNewsletterVerificationEmail(env, {
      email: 'test@example.com',
      verificationToken: 'token-xyz',
      storeId: 'store-123',
    });

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[EMAIL] Sending newsletter verification to test@example.com')
    );

    consoleSpy.mockRestore();
  });

  it('catches and returns errors on send failure', async () => {
    mockFetch.mockImplementationOnce(() => createMockResendError('Invalid API key', 401));

    const env = createMockEnv(true);
    const result = await sendNewsletterVerificationEmail(env, {
      email: 'test@example.com',
      verificationToken: 'token-xyz',
      storeId: 'store-123',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid API key');
  });

  it('builds correct verification URL with token', async () => {
    mockFetch.mockImplementationOnce(() => createMockResendSuccess('msg-123'));

    const env = createMockEnv(true);
    await sendNewsletterVerificationEmail(env, {
      email: 'test@example.com',
      verificationToken: 'my-special-token',
      storeId: 'store-123',
    });

    const callArgs = mockFetch.mock.calls[0];
    const body = JSON.parse(callArgs[1].body);
    expect(body.html).toContain(
      'https://dearmargeaux.com/newsletter/verify?token=my-special-token'
    );
  });

  it('builds correct unsubscribe URL with email and token', async () => {
    mockFetch.mockImplementationOnce(() => createMockResendSuccess('msg-123'));

    const env = createMockEnv(true);
    await sendNewsletterVerificationEmail(env, {
      email: 'user@example.com',
      verificationToken: 'unsub-token-123',
      storeId: 'store-123',
    });

    const callArgs = mockFetch.mock.calls[0];
    const body = JSON.parse(callArgs[1].body);
    expect(body.html).toContain(
      'https://dearmargeaux.com/newsletter/unsubscribe?email=user%40example.com&token=unsub-token-123'
    );
  });

  it('falls back to stub when RESEND_API_KEY is not configured', async () => {
    const env = createMockEnv(false);
    const result = await sendNewsletterVerificationEmail(env, {
      email: 'test@example.com',
      verificationToken: 'token-xyz',
      storeId: 'store-123',
    });

    expect(result.success).toBe(true);
    expect(result.messageId).toMatch(/^stub-/);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('queues email for retry on failure', async () => {
    mockFetch.mockImplementationOnce(() => createMockResendError('Service unavailable', 503));

    const env = createMockEnv(true);
    await sendNewsletterVerificationEmail(env, {
      email: 'test@example.com',
      verificationToken: 'token-xyz',
      storeId: 'store-123',
    });

    // The email should be queued for retry via queueFailedEmail
    // This is verified by checking that mockDbRun was called for the queue insertion
    expect(mockDbRun).toHaveBeenCalled();
  });

  it('uses newsletter_verification as email type for queuing', async () => {
    mockFetch.mockImplementationOnce(() => createMockResendError('Temporary failure', 500));

    const env = createMockEnv(true);
    await sendNewsletterVerificationEmail(env, {
      email: 'test@example.com',
      verificationToken: 'token-xyz',
      storeId: 'store-456',
    });

    // Check the queue insertion call includes newsletter_verification type
    const queueCall = mockDbRun.mock.calls.find((call) =>
      call[0].includes('INSERT INTO email_queue')
    );
    expect(queueCall).toBeDefined();
    if (queueCall) {
      expect(queueCall[1]).toContain('newsletter_verification');
    }
  });
});

// ============================================================
// TESTS: buildNewsletterEmailHtml
// ============================================================

describe('buildNewsletterEmailHtml', () => {
  // Import the function directly for testing
  let buildNewsletterEmailHtml: typeof import('../../src/lib/notifications').buildNewsletterEmailHtml;

  beforeAll(async () => {
    const module = await import('../../src/lib/notifications');
    buildNewsletterEmailHtml = module.buildNewsletterEmailHtml;
  });

  const sampleData = {
    title: 'New Collection: Summer Essentials',
    excerpt: 'Discover our latest summer pieces crafted with care.',
    blogUrl: 'https://dearmargeaux.com/blog/summer-essentials',
    unsubscribeUrl:
      'https://dearmargeaux.com/newsletter/unsubscribe?email=test@example.com&token=abc123',
    featuredImageUrl: 'https://images.dearmargeaux.com/summer-banner.jpg',
    featuredImageAlt: 'Summer collection banner',
  };

  it('returns valid HTML with doctype', () => {
    const html = buildNewsletterEmailHtml(sampleData);

    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<html>');
    expect(html).toContain('</html>');
  });

  it('includes logo in header', () => {
    const html = buildNewsletterEmailHtml(sampleData);

    // Should include the store name as logo text
    expect(html).toContain('Dear Margeaux');
  });

  it('includes featured image when provided', () => {
    const html = buildNewsletterEmailHtml(sampleData);

    expect(html).toContain(`src="${sampleData.featuredImageUrl}"`);
    expect(html).toContain(`alt="${sampleData.featuredImageAlt}"`);
  });

  it('handles missing featured image gracefully', () => {
    const html = buildNewsletterEmailHtml({
      ...sampleData,
      featuredImageUrl: undefined,
      featuredImageAlt: undefined,
    });

    // Should still render valid HTML
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain(sampleData.title);
    // Should not have an img tag
    expect(html).not.toContain('<img');
  });

  it('includes blog post title', () => {
    const html = buildNewsletterEmailHtml(sampleData);

    expect(html).toContain(sampleData.title);
  });

  it('includes blog post excerpt', () => {
    const html = buildNewsletterEmailHtml(sampleData);

    expect(html).toContain(sampleData.excerpt);
  });

  it('includes Read More button with blog link', () => {
    const html = buildNewsletterEmailHtml(sampleData);

    expect(html).toContain(`href="${sampleData.blogUrl}"`);
    expect(html).toContain('Read More');
  });

  it('includes unsubscribe link in footer (required by law)', () => {
    const html = buildNewsletterEmailHtml(sampleData);

    expect(html).toContain(`href="${sampleData.unsubscribeUrl}"`);
    expect(html).toContain('Unsubscribe');
  });

  it('uses brand color #8B4513 for header', () => {
    const html = buildNewsletterEmailHtml(sampleData);

    expect(html).toContain('#8B4513');
  });

  it('uses terracotta color #E2725B for CTA button', () => {
    const html = buildNewsletterEmailHtml(sampleData);

    expect(html).toContain('#E2725B');
  });

  it('includes support email in footer', () => {
    const html = buildNewsletterEmailHtml(sampleData);

    expect(html).toContain('hello@dearmargeaux.com');
  });

  it('escapes HTML in title to prevent XSS', () => {
    const html = buildNewsletterEmailHtml({
      ...sampleData,
      title: 'Test <script>alert("xss")</script> Title',
    });

    // The title should be escaped
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('escapes HTML in excerpt to prevent XSS', () => {
    const html = buildNewsletterEmailHtml({
      ...sampleData,
      excerpt: 'Test <img src="x" onerror="alert(1)"> excerpt',
    });

    // The excerpt should be escaped - the < and > are converted to entities
    // preventing the browser from interpreting it as actual HTML
    expect(html).not.toContain('<img src="x"');
    expect(html).toContain('&lt;img');
    expect(html).toContain('&quot;alert(1)&quot;');
  });

  it('includes preheader text for email clients', () => {
    const html = buildNewsletterEmailHtml(sampleData);

    // Should have a hidden preheader for email preview
    expect(html).toContain(sampleData.excerpt);
  });

  it('is mobile responsive with viewport meta tag', () => {
    const html = buildNewsletterEmailHtml(sampleData);

    expect(html).toContain('viewport');
    expect(html).toContain('width=device-width');
  });
});
