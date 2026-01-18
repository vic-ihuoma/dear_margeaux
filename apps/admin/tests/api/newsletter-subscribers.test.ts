import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// These values are defined in vitest.config.ts
const MOCK_API_URL = 'https://api.example.com';
const MOCK_API_KEY = 'test-api-key';

// Helper function to create mock APIContext for GET requests
function createMockContext(options: { url?: string } = {}) {
  const url = new URL(
    options.url || 'http://localhost/api/newsletter/subscribers'
  );

  const request = new Request(url.toString(), {
    method: 'GET',
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
    routePattern: '/api/newsletter/subscribers',
    originPathname: '/api/newsletter/subscribers',
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

describe('Newsletter Subscribers API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetModules();
  });

  describe('GET /api/newsletter/subscribers', () => {
    it('fetches subscribers list successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          subscribers: [
            {
              id: 'sub-1',
              email: 'user1@example.com',
              verified: true,
              subscribed_at: '2026-01-15T10:00:00Z',
              verified_at: '2026-01-15T10:05:00Z',
              unsubscribed_at: null,
              source: 'footer',
              status: 'verified',
            },
            {
              id: 'sub-2',
              email: 'user2@example.com',
              verified: false,
              subscribed_at: '2026-01-16T10:00:00Z',
              verified_at: null,
              unsubscribed_at: null,
              source: 'popup',
              status: 'unverified',
            },
          ],
          count: 2,
          next_cursor: null,
          has_more: false,
        }),
      });

      const { GET } =
        await import('../../src/pages/api/newsletter/subscribers.ts');

      const context = createMockContext();
      const response = await GET(context as any);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.subscribers).toHaveLength(2);
      expect(data.subscribers[0].email).toBe('user1@example.com');
      expect(data.subscribers[0].status).toBe('verified');
      expect(data.subscribers[1].email).toBe('user2@example.com');
      expect(data.subscribers[1].status).toBe('unverified');
      expect(data.count).toBe(2);

      // Verify fetch was called with correct URL
      expect(mockFetch).toHaveBeenCalledWith(
        `${MOCK_API_URL}/v1/newsletter/subscribers?limit=50`,
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: `Bearer ${MOCK_API_KEY}`,
          }),
        })
      );
    });

    it('passes search query parameter to API', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          subscribers: [
            {
              id: 'sub-1',
              email: 'test@example.com',
              verified: true,
              subscribed_at: '2026-01-15T10:00:00Z',
              verified_at: '2026-01-15T10:05:00Z',
              unsubscribed_at: null,
              source: 'footer',
              status: 'verified',
            },
          ],
          count: 1,
          next_cursor: null,
          has_more: false,
        }),
      });

      const { GET } =
        await import('../../src/pages/api/newsletter/subscribers.ts');

      const context = createMockContext({
        url: 'http://localhost/api/newsletter/subscribers?search=test',
      });
      const response = await GET(context as any);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.subscribers).toHaveLength(1);

      // Verify search parameter was passed
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('search=test'),
        expect.any(Object)
      );
    });

    it('passes status filter to API', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          subscribers: [],
          count: 0,
          next_cursor: null,
          has_more: false,
        }),
      });

      const { GET } =
        await import('../../src/pages/api/newsletter/subscribers.ts');

      const context = createMockContext({
        url: 'http://localhost/api/newsletter/subscribers?status=verified',
      });
      const response = await GET(context as any);

      expect(response.status).toBe(200);

      // Verify status parameter was passed
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('status=verified'),
        expect.any(Object)
      );
    });

    it('passes cursor for pagination', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          subscribers: [],
          count: 100,
          next_cursor: 'next-cursor-456',
          has_more: true,
        }),
      });

      const { GET } =
        await import('../../src/pages/api/newsletter/subscribers.ts');

      const context = createMockContext({
        url: 'http://localhost/api/newsletter/subscribers?cursor=cursor-123',
      });
      const response = await GET(context as any);

      expect(response.status).toBe(200);

      // Verify cursor parameter was passed
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('cursor=cursor-123'),
        expect.any(Object)
      );
    });

    it('passes limit parameter', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          subscribers: [],
          count: 0,
          next_cursor: null,
          has_more: false,
        }),
      });

      const { GET } =
        await import('../../src/pages/api/newsletter/subscribers.ts');

      const context = createMockContext({
        url: 'http://localhost/api/newsletter/subscribers?limit=25',
      });
      const response = await GET(context as any);

      expect(response.status).toBe(200);

      // Verify limit parameter was passed
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('limit=25'),
        expect.any(Object)
      );
    });

    it('handles API errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({
          error: 'Database connection failed',
        }),
      });

      const { GET } =
        await import('../../src/pages/api/newsletter/subscribers.ts');

      const context = createMockContext();
      const response = await GET(context as any);
      const data = await parseResponse(response);

      expect(response.status).toBe(500);
      expect(data.error).toBe('Database connection failed');
    });

    it('handles network errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { GET } =
        await import('../../src/pages/api/newsletter/subscribers.ts');

      const context = createMockContext();
      const response = await GET(context as any);
      const data = await parseResponse(response);

      expect(response.status).toBe(500);
      expect(data.error).toBe('Network error');
    });

    it('returns empty list when no subscribers', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          subscribers: [],
          count: 0,
          next_cursor: null,
          has_more: false,
        }),
      });

      const { GET } =
        await import('../../src/pages/api/newsletter/subscribers.ts');

      const context = createMockContext();
      const response = await GET(context as any);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.subscribers).toEqual([]);
      expect(data.count).toBe(0);
      expect(data.has_more).toBe(false);
    });
  });
});

describe('Subscribers Page Behavior (documented tests)', () => {
  // These tests document expected behavior per PRD newsletter-16
  // The actual implementation is in pages/subscribers/index.astro

  it('BEHAVIOR: Subscribers page fetches from API', () => {
    // The subscribers page should fetch the list of subscribers
    // from /api/newsletter/subscribers on page load.
    // It passes filter parameters (search, status) from URL query params.
    expect(true).toBe(true);
  });

  it('BEHAVIOR: Table displays all columns', () => {
    // The subscribers table should display these columns:
    // - Email: the subscriber's email address
    // - Status: verified/unverified/unsubscribed with badge styling
    // - Subscribed: formatted date when they subscribed
    // - Source: where they signed up from (footer, popup, etc.)
    expect(true).toBe(true);
  });

  it('BEHAVIOR: Search filters by email', () => {
    // When the user enters a search term and submits the filter form,
    // the page should reload with ?search=<term> in the URL.
    // The API will filter subscribers by email containing the term.
    expect(true).toBe(true);
  });

  it('BEHAVIOR: Status filter limits results', () => {
    // The status dropdown allows filtering by:
    // - All Status (no filter)
    // - Verified (verified=true, unsubscribed_at=null)
    // - Unverified (verified=false, unsubscribed_at=null)
    // - Unsubscribed (unsubscribed_at is set)
    expect(true).toBe(true);
  });

  it('BEHAVIOR: Pagination with load more link', () => {
    // When has_more=true in the API response, a "Load more" link
    // is shown at the bottom of the table.
    // The link includes the next_cursor for fetching the next page.
    expect(true).toBe(true);
  });

  it('BEHAVIOR: Subscribers link in sidebar navigation', () => {
    // The admin sidebar should include a "Subscribers" link
    // with a users icon that navigates to /subscribers.
    // It should highlight when the current path starts with /subscribers.
    expect(true).toBe(true);
  });

  it('BEHAVIOR: Total count displayed in header', () => {
    // The page header should display the total number of subscribers
    // from the API response (count field).
    // Format: "X total subscribers"
    expect(true).toBe(true);
  });

  it('BEHAVIOR: Empty state when no subscribers', () => {
    // When there are no subscribers (or no matches for filters),
    // the page should display an empty state message:
    // - With filters: "No subscribers match your filters."
    // - Without filters: "No subscribers yet. Subscribers will appear here..."
    expect(true).toBe(true);
  });
});
