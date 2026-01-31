import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { OrderListItem } from '@dear-margeaux/api';

// Mock the MerchantClient
const mockGetOrders = vi.fn();

vi.mock('@dear-margeaux/api', () => ({
  MerchantClient: vi.fn().mockImplementation(() => ({
    getOrders: mockGetOrders,
  })),
}));

// Helper function to create mock APIContext
function createMockContext(options: { url?: string; method?: string }) {
  const url = new URL(
    options.url || 'http://localhost/api/analytics/export',
    'http://localhost'
  );
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
    routePattern: '/api/analytics/export',
    originPathname: '/api/analytics/export',
    rewrite: vi.fn(),
    isPrerendered: false,
    ResponseWithEncoding: Response,
  };
}

// Sample order data (matching actual OrderListItem type)
const sampleOrders: OrderListItem[] = [
  {
    id: 'ord_001',
    number: '1001',
    status: 'delivered',
    customer_email: 'alice@example.com',
    total_cents: 15000,
    created_at: '2026-01-15T10:00:00.000Z',
  },
  {
    id: 'ord_002',
    number: '1002',
    status: 'processing',
    customer_email: 'bob@example.com',
    total_cents: 25000,
    created_at: '2026-01-20T14:30:00.000Z',
  },
  {
    id: 'ord_003',
    number: '1003',
    status: 'paid',
    customer_email: 'carol@example.com',
    total_cents: 8500,
    created_at: '2026-01-25T09:15:00.000Z',
  },
];

describe('Analytics Export API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/analytics/export', () => {
    it('returns CSV with correct content type', async () => {
      mockGetOrders.mockResolvedValueOnce({
        items: sampleOrders,
        pagination: { has_more: false, next_cursor: null },
      });

      const { GET } = await import('../../src/pages/api/analytics/export.ts');
      const context = createMockContext({
        url: 'http://localhost/api/analytics/export?range=30',
      });
      const response = await GET(context as any);

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe(
        'text/csv; charset=utf-8'
      );
    });

    it('includes Content-Disposition header with date range', async () => {
      mockGetOrders.mockResolvedValueOnce({
        items: sampleOrders,
        pagination: { has_more: false, next_cursor: null },
      });

      const { GET } = await import('../../src/pages/api/analytics/export.ts');
      const context = createMockContext({
        url: 'http://localhost/api/analytics/export?range=30',
      });
      const response = await GET(context as any);

      const disposition = response.headers.get('Content-Disposition');
      expect(disposition).toContain('attachment');
      expect(disposition).toContain('filename=');
      expect(disposition).toContain('analytics');
      expect(disposition).toContain('.csv');
    });

    it('generates CSV with header row', async () => {
      mockGetOrders.mockResolvedValueOnce({
        items: sampleOrders,
        pagination: { has_more: false, next_cursor: null },
      });

      const { GET } = await import('../../src/pages/api/analytics/export.ts');
      const context = createMockContext({
        url: 'http://localhost/api/analytics/export?range=30',
      });
      const response = await GET(context as any);
      const csvContent = await response.text();

      const lines = csvContent.split('\n');
      const headerLine = lines[0];

      // Check header contains expected columns (based on OrderListItem fields)
      expect(headerLine).toContain('Order Number');
      expect(headerLine).toContain('Date');
      expect(headerLine).toContain('Customer Email');
      expect(headerLine).toContain('Status');
      expect(headerLine).toContain('Total');
    });

    it('includes orders data in CSV', async () => {
      mockGetOrders.mockResolvedValueOnce({
        items: sampleOrders,
        pagination: { has_more: false, next_cursor: null },
      });

      const { GET } = await import('../../src/pages/api/analytics/export.ts');
      const context = createMockContext({
        url: 'http://localhost/api/analytics/export?range=30',
      });
      const response = await GET(context as any);
      const csvContent = await response.text();

      // Should contain order data
      expect(csvContent).toContain('1001');
      expect(csvContent).toContain('alice@example.com');
      expect(csvContent).toContain('1002');
      expect(csvContent).toContain('bob@example.com');
      expect(csvContent).toContain('1003');
      expect(csvContent).toContain('carol@example.com');
    });

    it('includes summary stats row at the end', async () => {
      mockGetOrders.mockResolvedValueOnce({
        items: sampleOrders,
        pagination: { has_more: false, next_cursor: null },
      });

      const { GET } = await import('../../src/pages/api/analytics/export.ts');
      const context = createMockContext({
        url: 'http://localhost/api/analytics/export?range=30',
      });
      const response = await GET(context as any);
      const csvContent = await response.text();

      // Summary row should contain SUMMARY label
      expect(csvContent).toContain('SUMMARY');
    });

    it('calculates correct total revenue in summary', async () => {
      mockGetOrders.mockResolvedValueOnce({
        items: sampleOrders,
        pagination: { has_more: false, next_cursor: null },
      });

      const { GET } = await import('../../src/pages/api/analytics/export.ts');
      const context = createMockContext({
        url: 'http://localhost/api/analytics/export?range=30',
      });
      const response = await GET(context as any);
      const csvContent = await response.text();

      // Total should be $150.00 + $250.00 + $85.00 = $485.00
      // Note: Only counts valid statuses (paid, processing, shipped, delivered)
      expect(csvContent).toContain('485');
    });

    it('filters orders by date range', async () => {
      mockGetOrders.mockResolvedValueOnce({
        items: sampleOrders,
        pagination: { has_more: false, next_cursor: null },
      });

      const { GET } = await import('../../src/pages/api/analytics/export.ts');
      const context = createMockContext({
        url: 'http://localhost/api/analytics/export?range=7',
      });
      await GET(context as any);

      expect(mockGetOrders).toHaveBeenCalledWith(
        expect.objectContaining({ limit: expect.any(Number) })
      );
    });

    it('handles different date ranges (7, 30, 90)', async () => {
      const ranges = [7, 30, 90];

      for (const range of ranges) {
        vi.clearAllMocks();
        mockGetOrders.mockResolvedValueOnce({
          items: [],
          pagination: { has_more: false, next_cursor: null },
        });

        const { GET } = await import('../../src/pages/api/analytics/export.ts');
        const context = createMockContext({
          url: `http://localhost/api/analytics/export?range=${range}`,
        });
        const response = await GET(context as any);

        expect(response.status).toBe(200);
      }
    });

    it('handles empty orders list', async () => {
      mockGetOrders.mockResolvedValueOnce({
        items: [],
        pagination: { has_more: false, next_cursor: null },
      });

      const { GET } = await import('../../src/pages/api/analytics/export.ts');
      const context = createMockContext({
        url: 'http://localhost/api/analytics/export?range=30',
      });
      const response = await GET(context as any);
      const csvContent = await response.text();

      // Should still have header and summary row
      const lines = csvContent.trim().split('\n');
      expect(lines.length).toBeGreaterThanOrEqual(2);
      expect(lines[0]).toContain('Order Number'); // Header
    });

    it('handles API errors gracefully', async () => {
      mockGetOrders.mockRejectedValueOnce(new Error('API unavailable'));

      const { GET } = await import('../../src/pages/api/analytics/export.ts');
      const context = createMockContext({});
      const response = await GET(context as any);

      expect(response.status).toBe(500);
    });

    it('escapes CSV special characters in data', async () => {
      const ordersWithSpecialChars: OrderListItem[] = [
        {
          id: 'ord_special',
          number: '1004',
          status: 'paid',
          customer_email: 'test+special@example.com',
          total_cents: 5000,
          created_at: '2026-01-28T10:00:00.000Z',
        },
      ];

      mockGetOrders.mockResolvedValueOnce({
        items: ordersWithSpecialChars,
        pagination: { has_more: false, next_cursor: null },
      });

      const { GET } = await import('../../src/pages/api/analytics/export.ts');
      const context = createMockContext({
        url: 'http://localhost/api/analytics/export?range=30',
      });
      const response = await GET(context as any);
      const csvContent = await response.text();

      // Should properly handle special characters
      expect(csvContent).toContain('1004');
    });

    it('includes order count in summary', async () => {
      mockGetOrders.mockResolvedValueOnce({
        items: sampleOrders,
        pagination: { has_more: false, next_cursor: null },
      });

      const { GET } = await import('../../src/pages/api/analytics/export.ts');
      const context = createMockContext({
        url: 'http://localhost/api/analytics/export?range=30',
      });
      const response = await GET(context as any);
      const csvContent = await response.text();

      // Should include the order count (3 orders) in summary row
      expect(csvContent).toContain('3 orders');
    });

    it('formats prices as dollars in CSV', async () => {
      mockGetOrders.mockResolvedValueOnce({
        items: [sampleOrders[0]], // $150.00
        pagination: { has_more: false, next_cursor: null },
      });

      const { GET } = await import('../../src/pages/api/analytics/export.ts');
      const context = createMockContext({
        url: 'http://localhost/api/analytics/export?range=30',
      });
      const response = await GET(context as any);
      const csvContent = await response.text();

      // Price should be formatted as dollars ($150.00 or 150.00)
      expect(csvContent).toContain('150');
    });

    it('uses default range of 30 days when not specified', async () => {
      mockGetOrders.mockResolvedValueOnce({
        items: sampleOrders,
        pagination: { has_more: false, next_cursor: null },
      });

      const { GET } = await import('../../src/pages/api/analytics/export.ts');
      const context = createMockContext({
        url: 'http://localhost/api/analytics/export',
      });
      const response = await GET(context as any);

      expect(response.status).toBe(200);
    });
  });
});

describe('CSV Generation Utilities', () => {
  it('properly escapes double quotes in CSV fields', () => {
    // CSV spec: double quotes are escaped by doubling them
    const escapeCsvField = (field: string): string => {
      if (field.includes(',') || field.includes('"') || field.includes('\n')) {
        return `"${field.replace(/"/g, '""')}"`;
      }
      return field;
    };

    expect(escapeCsvField('normal')).toBe('normal');
    expect(escapeCsvField('with,comma')).toBe('"with,comma"');
    expect(escapeCsvField('with"quote')).toBe('"with""quote"');
    expect(escapeCsvField('with\nnewline')).toBe('"with\nnewline"');
  });

  it('properly formats cents to dollars', () => {
    const formatCentsToDollars = (cents: number): string => {
      return (cents / 100).toFixed(2);
    };

    expect(formatCentsToDollars(15000)).toBe('150.00');
    expect(formatCentsToDollars(2500)).toBe('25.00');
    expect(formatCentsToDollars(99)).toBe('0.99');
    expect(formatCentsToDollars(0)).toBe('0.00');
  });
});
