import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { APIContext } from 'astro';
import type { EmailSend, PaginatedResponse } from '@dear-margeaux/api';

// Mock the MerchantClient
const mockGetEmailSends = vi.fn();
const mockGetEmailSendStats = vi.fn();

vi.mock('@dear-margeaux/api', () => ({
  MerchantClient: vi.fn().mockImplementation(() => ({
    getEmailSends: mockGetEmailSends,
    getEmailSendStats: mockGetEmailSendStats,
  })),
}));

// Helper function to create mock APIContext
function createMockContext(options: {
  url?: string;
  method?: string;
}): APIContext {
  const url = new URL(options.url || 'http://localhost/api/notifications');
  const request = new Request(url.toString(), {
    method: options.method || 'GET',
  });

  return {
    url,
    request,
    params: {},
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
    routePattern: '/api/notifications',
    originPathname: '/api/notifications',
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

// Sample email send data
const sampleEmailSend: EmailSend = {
  id: 'es_test_123',
  email_type: 'order_confirmation',
  recipient: 'customer@example.com',
  subject: 'Order Confirmed - #1001',
  status: 'sent',
  error_message: null,
  metadata: { orderId: 'ord_123', orderNumber: '1001' },
  created_at: '2026-01-31T10:00:00.000Z',
};

const sampleEmailSendFailed: EmailSend = {
  id: 'es_test_456',
  email_type: 'newsletter',
  recipient: 'subscriber@example.com',
  subject: 'New Blog Post',
  status: 'failed',
  error_message: 'Invalid recipient address',
  metadata: { blogSlug: 'test-post' },
  created_at: '2026-01-31T09:00:00.000Z',
};

describe('Notifications API Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/notifications', () => {
    it('fetches email sends list successfully', async () => {
      const mockResponse: PaginatedResponse<EmailSend> = {
        items: [sampleEmailSend, sampleEmailSendFailed],
        pagination: {
          has_more: false,
          next_cursor: null,
        },
      };
      mockGetEmailSends.mockResolvedValueOnce(mockResponse);

      const { GET } =
        await import('../../src/pages/api/notifications/index.ts');
      const context = createMockContext({});
      const response = await GET(context);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.items).toHaveLength(2);
      expect(data.items[0].id).toBe('es_test_123');
      expect(data.pagination.has_more).toBe(false);
    });

    it('passes type filter to API', async () => {
      mockGetEmailSends.mockResolvedValueOnce({
        items: [sampleEmailSend],
        pagination: { has_more: false, next_cursor: null },
      });

      const { GET } =
        await import('../../src/pages/api/notifications/index.ts');
      const context = createMockContext({
        url: 'http://localhost/api/notifications?email_type=order_confirmation',
      });
      await GET(context);

      expect(mockGetEmailSends).toHaveBeenCalledWith(
        expect.objectContaining({ email_type: 'order_confirmation' })
      );
    });

    it('passes status filter to API', async () => {
      mockGetEmailSends.mockResolvedValueOnce({
        items: [sampleEmailSendFailed],
        pagination: { has_more: false, next_cursor: null },
      });

      const { GET } =
        await import('../../src/pages/api/notifications/index.ts');
      const context = createMockContext({
        url: 'http://localhost/api/notifications?status=failed',
      });
      await GET(context);

      expect(mockGetEmailSends).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'failed' })
      );
    });

    it('passes date range filters to API', async () => {
      mockGetEmailSends.mockResolvedValueOnce({
        items: [],
        pagination: { has_more: false, next_cursor: null },
      });

      const { GET } =
        await import('../../src/pages/api/notifications/index.ts');
      const context = createMockContext({
        url: 'http://localhost/api/notifications?start_date=2026-01-01&end_date=2026-01-31',
      });
      await GET(context);

      expect(mockGetEmailSends).toHaveBeenCalledWith(
        expect.objectContaining({
          start_date: '2026-01-01',
          end_date: '2026-01-31',
        })
      );
    });

    it('handles API errors gracefully', async () => {
      mockGetEmailSends.mockRejectedValueOnce(new Error('Network error'));

      const { GET } =
        await import('../../src/pages/api/notifications/index.ts');
      const context = createMockContext({});
      const response = await GET(context);
      const data = await parseResponse(response);

      expect(response.status).toBe(500);
      expect(data.error).toBe('Network error');
    });
  });

  describe('GET /api/notifications/stats', () => {
    it('fetches email send statistics', async () => {
      const mockStats = {
        total: 150,
        by_status: { sent: 140, failed: 10 },
        by_type: {
          order_confirmation: 50,
          shipping_update: 30,
          newsletter: 70,
        },
      };
      mockGetEmailSendStats.mockResolvedValueOnce(mockStats);

      const { GET } =
        await import('../../src/pages/api/notifications/stats.ts');
      const context = createMockContext({
        url: 'http://localhost/api/notifications/stats',
      });
      const response = await GET(context);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.total).toBe(150);
      expect(data.by_status.sent).toBe(140);
      expect(data.by_type.newsletter).toBe(70);
    });

    it('handles stats API errors', async () => {
      mockGetEmailSendStats.mockRejectedValueOnce(new Error('Database error'));

      const { GET } =
        await import('../../src/pages/api/notifications/stats.ts');
      const context = createMockContext({
        url: 'http://localhost/api/notifications/stats',
      });
      const response = await GET(context);
      const data = await parseResponse(response);

      expect(response.status).toBe(500);
      expect(data.error).toBe('Database error');
    });
  });
});

describe('Email Send Type Definitions', () => {
  it('EmailSend type has correct structure', () => {
    const emailSend: EmailSend = {
      id: 'test',
      email_type: 'order_confirmation',
      recipient: 'test@test.com',
      subject: 'Test Subject',
      status: 'sent',
      error_message: null,
      metadata: null,
      created_at: '2026-01-31T00:00:00.000Z',
    };

    expect(emailSend.id).toBe('test');
    expect(emailSend.email_type).toBe('order_confirmation');
    expect(emailSend.status).toBe('sent');
  });

  it('EmailSend type accepts all valid email_type values', () => {
    const types: EmailSend['email_type'][] = [
      'order_confirmation',
      'shipping_update',
      'order_status_update',
      'drop_launch',
      'newsletter_verification',
      'newsletter',
    ];

    types.forEach((type) => {
      const emailSend: EmailSend = {
        id: 'test',
        email_type: type,
        recipient: 'test@test.com',
        subject: 'Test',
        status: 'sent',
        error_message: null,
        metadata: null,
        created_at: '2026-01-31T00:00:00.000Z',
      };
      expect(emailSend.email_type).toBe(type);
    });
  });

  it('EmailSend type accepts all valid status values', () => {
    const statuses: EmailSend['status'][] = ['sent', 'failed', 'queued'];

    statuses.forEach((status) => {
      const emailSend: EmailSend = {
        id: 'test',
        email_type: 'newsletter',
        recipient: 'test@test.com',
        subject: 'Test',
        status: status,
        error_message: status === 'failed' ? 'Error message' : null,
        metadata: null,
        created_at: '2026-01-31T00:00:00.000Z',
      };
      expect(emailSend.status).toBe(status);
    });
  });
});
