import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock fs module
const mockAccess = vi.fn();
const mockReaddir = vi.fn();
const mockReadFile = vi.fn();

vi.mock('node:fs/promises', () => ({
  access: mockAccess,
  readdir: mockReaddir,
  readFile: mockReadFile,
}));

// Helper function to create mock APIContext
function createMockContext(options: {
  url?: string;
  method?: string;
  body?: unknown;
  params?: Record<string, string>;
}) {
  const url = new URL(options.url || 'http://localhost/api/lookbook');
  const headers: Record<string, string> = options.body
    ? { 'Content-Type': 'application/json' }
    : {};
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
    routePattern: '/api/lookbook',
    originPathname: '/api/lookbook',
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

// Sample lookbook MDX content
const sampleLookbookMDX = `---
title: "Spring 2026 Collection"
drop: "spring-2026"
date: 2026-03-01
images:
  - "https://example.com/lookbook/image1.webp"
  - "https://example.com/lookbook/image2.webp"
draft: false
---
# Spring 2026 Collection

A celebration of new beginnings.
`;

const draftLookbookMDX = `---
title: "Summer 2026 Preview"
drop: "summer-2026"
date: 2026-06-01
images:
  - "https://example.com/lookbook/summer1.webp"
draft: true
---
# Summer 2026 Preview

Coming soon.
`;

describe('Lookbook API Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/lookbook', () => {
    it('returns lookbook list successfully', async () => {
      mockAccess.mockResolvedValueOnce(undefined); // Directory exists
      mockReaddir.mockResolvedValueOnce(['spring-2026.mdx', 'summer-2026.mdx']);
      mockReadFile.mockResolvedValueOnce(sampleLookbookMDX);
      mockReadFile.mockResolvedValueOnce(draftLookbookMDX);

      const { GET } = await import('../../src/pages/api/lookbook/index.ts');

      const context = createMockContext({
        url: 'http://localhost/api/lookbook',
      });

      const response = await GET(context as any);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.items).toHaveLength(2);
    });

    it('returns lookbook items with correct fields', async () => {
      mockAccess.mockResolvedValueOnce(undefined);
      mockReaddir.mockResolvedValueOnce(['spring-2026.mdx']);
      mockReadFile.mockResolvedValueOnce(sampleLookbookMDX);

      const { GET } = await import('../../src/pages/api/lookbook/index.ts');

      const context = createMockContext({
        url: 'http://localhost/api/lookbook',
      });

      const response = await GET(context as any);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.items).toHaveLength(1);
      expect(data.items[0]).toMatchObject({
        slug: 'spring-2026',
        title: 'Spring 2026 Collection',
        date: expect.any(String),
        imageCount: 2,
        draft: false,
      });
    });

    it('returns empty list when directory does not exist', async () => {
      mockAccess.mockRejectedValueOnce(new Error('ENOENT'));

      const { GET } = await import('../../src/pages/api/lookbook/index.ts');

      const context = createMockContext({
        url: 'http://localhost/api/lookbook',
      });

      const response = await GET(context as any);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.items).toHaveLength(0);
    });

    it('filters draft lookbooks when status=draft', async () => {
      mockAccess.mockResolvedValueOnce(undefined);
      mockReaddir.mockResolvedValueOnce(['spring-2026.mdx', 'summer-2026.mdx']);
      mockReadFile.mockResolvedValueOnce(sampleLookbookMDX);
      mockReadFile.mockResolvedValueOnce(draftLookbookMDX);

      const { GET } = await import('../../src/pages/api/lookbook/index.ts');

      const context = createMockContext({
        url: 'http://localhost/api/lookbook?status=draft',
      });

      const response = await GET(context as any);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.items).toHaveLength(1);
      expect(data.items[0].title).toBe('Summer 2026 Preview');
    });

    it('filters published lookbooks when status=published', async () => {
      mockAccess.mockResolvedValueOnce(undefined);
      mockReaddir.mockResolvedValueOnce(['spring-2026.mdx', 'summer-2026.mdx']);
      mockReadFile.mockResolvedValueOnce(sampleLookbookMDX);
      mockReadFile.mockResolvedValueOnce(draftLookbookMDX);

      const { GET } = await import('../../src/pages/api/lookbook/index.ts');

      const context = createMockContext({
        url: 'http://localhost/api/lookbook?status=published',
      });

      const response = await GET(context as any);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.items).toHaveLength(1);
      expect(data.items[0].title).toBe('Spring 2026 Collection');
    });

    it('filters lookbooks by search query', async () => {
      mockAccess.mockResolvedValueOnce(undefined);
      mockReaddir.mockResolvedValueOnce(['spring-2026.mdx', 'summer-2026.mdx']);
      mockReadFile.mockResolvedValueOnce(sampleLookbookMDX);
      mockReadFile.mockResolvedValueOnce(draftLookbookMDX);

      const { GET } = await import('../../src/pages/api/lookbook/index.ts');

      const context = createMockContext({
        url: 'http://localhost/api/lookbook?search=summer',
      });

      const response = await GET(context as any);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.items).toHaveLength(1);
      expect(data.items[0].title).toBe('Summer 2026 Preview');
    });

    it('handles read errors gracefully', async () => {
      mockAccess.mockResolvedValueOnce(undefined);
      mockReaddir.mockRejectedValueOnce(new Error('Permission denied'));

      const { GET } = await import('../../src/pages/api/lookbook/index.ts');

      const context = createMockContext({
        url: 'http://localhost/api/lookbook',
      });

      const response = await GET(context as any);
      const data = await parseResponse(response);

      expect(response.status).toBe(500);
      expect(data.error).toBe('Permission denied');
    });

    it('sorts lookbooks by date (newest first)', async () => {
      mockAccess.mockResolvedValueOnce(undefined);
      mockReaddir.mockResolvedValueOnce(['spring-2026.mdx', 'summer-2026.mdx']);
      mockReadFile.mockResolvedValueOnce(sampleLookbookMDX); // March
      mockReadFile.mockResolvedValueOnce(draftLookbookMDX); // June

      const { GET } = await import('../../src/pages/api/lookbook/index.ts');

      const context = createMockContext({
        url: 'http://localhost/api/lookbook',
      });

      const response = await GET(context as any);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.items).toHaveLength(2);
      // June should be first (newest)
      expect(data.items[0].title).toBe('Summer 2026 Preview');
      expect(data.items[1].title).toBe('Spring 2026 Collection');
    });

    it('includes drop association in response', async () => {
      mockAccess.mockResolvedValueOnce(undefined);
      mockReaddir.mockResolvedValueOnce(['spring-2026.mdx']);
      mockReadFile.mockResolvedValueOnce(sampleLookbookMDX);

      const { GET } = await import('../../src/pages/api/lookbook/index.ts');

      const context = createMockContext({
        url: 'http://localhost/api/lookbook',
      });

      const response = await GET(context as any);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.items[0].drop).toBe('spring-2026');
    });
  });
});

describe('Lookbook Admin Page Structure', () => {
  it('page file should exist and use AdminLayout', async () => {
    // Import actual fs (not mocked)
    const { readFileSync } =
      await vi.importActual<typeof import('node:fs')>('node:fs');
    const path = await import('node:path');

    const pagePath = path.resolve(
      process.cwd(),
      'src/pages/lookbook/index.astro'
    );

    // Read the file content
    const content = readFileSync(pagePath, 'utf-8');

    // Check it imports AdminLayout
    expect(content).toContain('AdminLayout');

    // Check for required page elements
    expect(content).toContain('Lookbook');
    expect(content).toContain('/lookbook/new');
  });

  it('should have Create Lookbook button', async () => {
    // Import actual fs (not mocked)
    const { readFileSync } =
      await vi.importActual<typeof import('node:fs')>('node:fs');
    const path = await import('node:path');

    const pagePath = path.resolve(
      process.cwd(),
      'src/pages/lookbook/index.astro'
    );

    const content = readFileSync(pagePath, 'utf-8');

    // Check for create link to /lookbook/new
    expect(content).toContain('href="/lookbook/new"');
    expect(content).toContain('Create Lookbook');
  });
});

describe('Admin Navigation', () => {
  it('should include Lookbook in navigation', async () => {
    // Import actual fs (not mocked)
    const { readFileSync } =
      await vi.importActual<typeof import('node:fs')>('node:fs');
    const path = await import('node:path');

    const layoutPath = path.resolve(
      process.cwd(),
      'src/layouts/AdminLayout.astro'
    );

    const content = readFileSync(layoutPath, 'utf-8');

    // Check for Lookbook in navigation array
    expect(content).toContain("name: 'Lookbook'");
    expect(content).toContain("href: '/lookbook'");
  });
});
