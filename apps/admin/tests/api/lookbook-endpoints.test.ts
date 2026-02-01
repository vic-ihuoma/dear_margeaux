import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock fs module for all tests
const mockAccess = vi.fn();
const mockReaddir = vi.fn();
const mockReadFile = vi.fn();
const mockWriteFile = vi.fn();
const mockMkdir = vi.fn();
const mockUnlink = vi.fn();

vi.mock('node:fs/promises', () => ({
  access: (...args: unknown[]) => mockAccess(...args),
  readdir: (...args: unknown[]) => mockReaddir(...args),
  readFile: (...args: unknown[]) => mockReadFile(...args),
  writeFile: (...args: unknown[]) => mockWriteFile(...args),
  mkdir: (...args: unknown[]) => mockMkdir(...args),
  unlink: (...args: unknown[]) => mockUnlink(...args),
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

// Sample lookbook MDX content with all fields
const fullLookbookMDX = `---
title: "Spring 2026 Collection"
description: "A celebration of new beginnings"
date: "2026-03-01"
drop: "spring-2026"
coverImage: "https://example.com/cover.webp"
draft: false
images:
  - "https://example.com/lookbook/image1.webp"
  - "https://example.com/lookbook/image2.webp"
  - "https://example.com/lookbook/image3.webp"
---

# Spring 2026 Collection

A celebration of new beginnings.
`;

const minimalLookbookMDX = `---
title: "Minimal Lookbook"
date: "2026-01-15"
draft: true
images: []
---

`;

describe('lookbook-admin-5: Lookbook API Endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  describe('GET /api/lookbook - List lookbooks', () => {
    it('returns list of lookbooks from MDX files', async () => {
      mockAccess.mockResolvedValueOnce(undefined);
      mockReaddir.mockResolvedValueOnce(['spring-2026.mdx', 'winter-2025.mdx']);
      mockReadFile.mockResolvedValueOnce(fullLookbookMDX);
      mockReadFile.mockResolvedValueOnce(minimalLookbookMDX);

      const { GET } = await import('../../src/pages/api/lookbook/index.ts');
      const context = createMockContext({
        url: 'http://localhost/api/lookbook',
      });

      const response = await GET(context as never);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.items).toBeDefined();
      expect(Array.isArray(data.items)).toBe(true);
    });

    it('includes imageCount in list response', async () => {
      mockAccess.mockResolvedValueOnce(undefined);
      mockReaddir.mockResolvedValueOnce(['spring-2026.mdx']);
      mockReadFile.mockResolvedValueOnce(fullLookbookMDX);

      const { GET } = await import('../../src/pages/api/lookbook/index.ts');
      const context = createMockContext({
        url: 'http://localhost/api/lookbook',
      });

      const response = await GET(context as never);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.items[0].imageCount).toBe(3);
    });

    it('includes draft status in list response', async () => {
      mockAccess.mockResolvedValueOnce(undefined);
      mockReaddir.mockResolvedValueOnce(['minimal.mdx']);
      mockReadFile.mockResolvedValueOnce(minimalLookbookMDX);

      const { GET } = await import('../../src/pages/api/lookbook/index.ts');
      const context = createMockContext({
        url: 'http://localhost/api/lookbook',
      });

      const response = await GET(context as never);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.items[0].draft).toBe(true);
    });
  });

  describe('POST /api/lookbook - Create new lookbook', () => {
    it('creates new MDX file on POST', async () => {
      // Directory exists
      mockAccess.mockResolvedValueOnce(undefined);
      // Slug doesn't exist yet
      mockAccess.mockRejectedValueOnce(new Error('ENOENT'));
      // Write succeeds
      mockWriteFile.mockResolvedValueOnce(undefined);

      const { POST } = await import('../../src/pages/api/lookbook/index.ts');
      const context = createMockContext({
        url: 'http://localhost/api/lookbook',
        method: 'POST',
        body: {
          title: 'New Collection',
          date: '2026-02-15',
          images: ['https://example.com/img1.webp'],
          draft: false,
        },
      });

      const response = await POST(context as never);
      const data = await parseResponse(response);

      expect(response.status).toBe(201);
      expect(data.title).toBe('New Collection');
      expect(data.slug).toBe('new-collection');
      expect(mockWriteFile).toHaveBeenCalled();
    });

    it('returns 400 if title is missing', async () => {
      const { POST } = await import('../../src/pages/api/lookbook/index.ts');
      const context = createMockContext({
        url: 'http://localhost/api/lookbook',
        method: 'POST',
        body: {
          date: '2026-02-15',
          images: [],
        },
      });

      const response = await POST(context as never);
      const data = await parseResponse(response);

      expect(response.status).toBe(400);
      expect(data.error).toBe('Title is required');
    });

    it('returns 400 if date is missing', async () => {
      const { POST } = await import('../../src/pages/api/lookbook/index.ts');
      const context = createMockContext({
        url: 'http://localhost/api/lookbook',
        method: 'POST',
        body: {
          title: 'Test Collection',
          images: [],
        },
      });

      const response = await POST(context as never);
      const data = await parseResponse(response);

      expect(response.status).toBe(400);
      expect(data.error).toBe('Date is required');
    });

    it('handles slug conflicts by appending counter', async () => {
      // Directory exists
      mockAccess.mockResolvedValueOnce(undefined);
      // First slug exists
      mockAccess.mockResolvedValueOnce(undefined);
      // Second slug doesn't exist
      mockAccess.mockRejectedValueOnce(new Error('ENOENT'));
      mockWriteFile.mockResolvedValueOnce(undefined);

      const { POST } = await import('../../src/pages/api/lookbook/index.ts');
      const context = createMockContext({
        url: 'http://localhost/api/lookbook',
        method: 'POST',
        body: {
          title: 'Existing Title',
          date: '2026-02-15',
          images: [],
        },
      });

      const response = await POST(context as never);
      const data = await parseResponse(response);

      expect(response.status).toBe(201);
      expect(data.slug).toBe('existing-title-1');
    });

    it('creates directory if it does not exist', async () => {
      // Directory doesn't exist
      mockAccess.mockRejectedValueOnce(new Error('ENOENT'));
      mockMkdir.mockResolvedValueOnce(undefined);
      // Slug doesn't exist
      mockAccess.mockRejectedValueOnce(new Error('ENOENT'));
      mockWriteFile.mockResolvedValueOnce(undefined);

      const { POST } = await import('../../src/pages/api/lookbook/index.ts');
      const context = createMockContext({
        url: 'http://localhost/api/lookbook',
        method: 'POST',
        body: {
          title: 'First Lookbook',
          date: '2026-02-15',
          images: [],
        },
      });

      const response = await POST(context as never);

      expect(response.status).toBe(201);
      expect(mockMkdir).toHaveBeenCalled();
    });

    it('returns images array in response', async () => {
      mockAccess.mockResolvedValueOnce(undefined);
      mockAccess.mockRejectedValueOnce(new Error('ENOENT'));
      mockWriteFile.mockResolvedValueOnce(undefined);

      const images = [
        'https://example.com/img1.webp',
        'https://example.com/img2.webp',
      ];

      const { POST } = await import('../../src/pages/api/lookbook/index.ts');
      const context = createMockContext({
        url: 'http://localhost/api/lookbook',
        method: 'POST',
        body: {
          title: 'With Images',
          date: '2026-02-15',
          images,
          draft: true,
        },
      });

      const response = await POST(context as never);
      const data = await parseResponse(response);

      expect(response.status).toBe(201);
      expect(data.images).toEqual(images);
      expect(data.draft).toBe(true);
    });

    it('includes optional fields in created lookbook', async () => {
      mockAccess.mockResolvedValueOnce(undefined);
      mockAccess.mockRejectedValueOnce(new Error('ENOENT'));
      mockWriteFile.mockResolvedValueOnce(undefined);

      const { POST } = await import('../../src/pages/api/lookbook/index.ts');
      const context = createMockContext({
        url: 'http://localhost/api/lookbook',
        method: 'POST',
        body: {
          title: 'Full Details',
          description: 'A beautiful collection',
          date: '2026-02-15',
          drop: 'spring-2026',
          coverImage: 'https://example.com/cover.webp',
          images: [],
          draft: false,
        },
      });

      const response = await POST(context as never);
      const data = await parseResponse(response);

      expect(response.status).toBe(201);
      expect(data.description).toBe('A beautiful collection');
      expect(data.drop).toBe('spring-2026');
      expect(data.coverImage).toBe('https://example.com/cover.webp');
    });
  });

  describe('GET /api/lookbook/[slug] - Get single lookbook', () => {
    it('returns lookbook data for valid slug', async () => {
      mockAccess.mockResolvedValueOnce(undefined);
      mockReadFile.mockResolvedValueOnce(fullLookbookMDX);

      const { GET } = await import('../../src/pages/api/lookbook/[slug].ts');
      const context = createMockContext({
        url: 'http://localhost/api/lookbook/spring-2026',
        params: { slug: 'spring-2026' },
      });

      const response = await GET(context as never);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.slug).toBe('spring-2026');
      expect(data.title).toBe('Spring 2026 Collection');
    });

    it('returns 404 if lookbook not found', async () => {
      mockAccess.mockRejectedValueOnce(new Error('ENOENT'));

      const { GET } = await import('../../src/pages/api/lookbook/[slug].ts');
      const context = createMockContext({
        url: 'http://localhost/api/lookbook/not-exists',
        params: { slug: 'not-exists' },
      });

      const response = await GET(context as never);
      const data = await parseResponse(response);

      expect(response.status).toBe(404);
      expect(data.error).toBe('Lookbook not found');
    });

    it('returns 400 if slug is missing', async () => {
      const { GET } = await import('../../src/pages/api/lookbook/[slug].ts');
      const context = createMockContext({
        url: 'http://localhost/api/lookbook/',
        params: {},
      });

      const response = await GET(context as never);
      const data = await parseResponse(response);

      expect(response.status).toBe(400);
      expect(data.error).toBe('Slug is required');
    });

    it('returns images array from MDX', async () => {
      mockAccess.mockResolvedValueOnce(undefined);
      mockReadFile.mockResolvedValueOnce(fullLookbookMDX);

      const { GET } = await import('../../src/pages/api/lookbook/[slug].ts');
      const context = createMockContext({
        url: 'http://localhost/api/lookbook/spring-2026',
        params: { slug: 'spring-2026' },
      });

      const response = await GET(context as never);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.images).toHaveLength(3);
      expect(data.images[0]).toBe('https://example.com/lookbook/image1.webp');
    });

    it('returns all frontmatter fields', async () => {
      mockAccess.mockResolvedValueOnce(undefined);
      mockReadFile.mockResolvedValueOnce(fullLookbookMDX);

      const { GET } = await import('../../src/pages/api/lookbook/[slug].ts');
      const context = createMockContext({
        url: 'http://localhost/api/lookbook/spring-2026',
        params: { slug: 'spring-2026' },
      });

      const response = await GET(context as never);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.title).toBe('Spring 2026 Collection');
      expect(data.description).toBe('A celebration of new beginnings');
      expect(data.date).toBe('2026-03-01');
      expect(data.drop).toBe('spring-2026');
      expect(data.coverImage).toBe('https://example.com/cover.webp');
      expect(data.draft).toBe(false);
    });

    it('returns body content', async () => {
      mockAccess.mockResolvedValueOnce(undefined);
      mockReadFile.mockResolvedValueOnce(fullLookbookMDX);

      const { GET } = await import('../../src/pages/api/lookbook/[slug].ts');
      const context = createMockContext({
        url: 'http://localhost/api/lookbook/spring-2026',
        params: { slug: 'spring-2026' },
      });

      const response = await GET(context as never);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.body).toContain('Spring 2026 Collection');
    });
  });

  describe('PATCH /api/lookbook/[slug] - Update lookbook', () => {
    it('updates MDX file on PATCH', async () => {
      mockAccess.mockResolvedValueOnce(undefined);
      mockReadFile.mockResolvedValueOnce(fullLookbookMDX);
      mockWriteFile.mockResolvedValueOnce(undefined);

      const { PATCH } = await import('../../src/pages/api/lookbook/[slug].ts');
      const context = createMockContext({
        url: 'http://localhost/api/lookbook/spring-2026',
        method: 'PATCH',
        params: { slug: 'spring-2026' },
        body: {
          title: 'Updated Spring Collection',
        },
      });

      const response = await PATCH(context as never);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.title).toBe('Updated Spring Collection');
      expect(mockWriteFile).toHaveBeenCalled();
    });

    it('returns 404 if lookbook not found', async () => {
      mockAccess.mockRejectedValueOnce(new Error('ENOENT'));

      const { PATCH } = await import('../../src/pages/api/lookbook/[slug].ts');
      const context = createMockContext({
        url: 'http://localhost/api/lookbook/not-exists',
        method: 'PATCH',
        params: { slug: 'not-exists' },
        body: { title: 'New Title' },
      });

      const response = await PATCH(context as never);
      const data = await parseResponse(response);

      expect(response.status).toBe(404);
      expect(data.error).toBe('Lookbook not found');
    });

    it('preserves existing data when partial update', async () => {
      mockAccess.mockResolvedValueOnce(undefined);
      mockReadFile.mockResolvedValueOnce(fullLookbookMDX);
      mockWriteFile.mockResolvedValueOnce(undefined);

      const { PATCH } = await import('../../src/pages/api/lookbook/[slug].ts');
      const context = createMockContext({
        url: 'http://localhost/api/lookbook/spring-2026',
        method: 'PATCH',
        params: { slug: 'spring-2026' },
        body: {
          draft: true, // Only updating draft status
        },
      });

      const response = await PATCH(context as never);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      // Original title preserved
      expect(data.title).toBe('Spring 2026 Collection');
      // Updated field
      expect(data.draft).toBe(true);
      // Original images preserved
      expect(data.images).toHaveLength(3);
    });

    it('updates images array and preserves order', async () => {
      mockAccess.mockResolvedValueOnce(undefined);
      mockReadFile.mockResolvedValueOnce(fullLookbookMDX);
      mockWriteFile.mockResolvedValueOnce(undefined);

      const newImages = [
        'https://example.com/new1.webp',
        'https://example.com/new2.webp',
      ];

      const { PATCH } = await import('../../src/pages/api/lookbook/[slug].ts');
      const context = createMockContext({
        url: 'http://localhost/api/lookbook/spring-2026',
        method: 'PATCH',
        params: { slug: 'spring-2026' },
        body: {
          images: newImages,
        },
      });

      const response = await PATCH(context as never);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.images).toEqual(newImages);
      expect(data.images[0]).toBe('https://example.com/new1.webp');
      expect(data.images[1]).toBe('https://example.com/new2.webp');
    });

    it('preserves original title if empty string provided', async () => {
      mockAccess.mockResolvedValueOnce(undefined);
      mockReadFile.mockResolvedValueOnce(minimalLookbookMDX);
      mockWriteFile.mockResolvedValueOnce(undefined);

      const { PATCH } = await import('../../src/pages/api/lookbook/[slug].ts');
      const context = createMockContext({
        url: 'http://localhost/api/lookbook/minimal',
        method: 'PATCH',
        params: { slug: 'minimal' },
        body: {
          title: '', // Empty title - should preserve original
        },
      });

      const response = await PATCH(context as never);
      const data = await parseResponse(response);

      // API preserves original title when empty string provided
      expect(response.status).toBe(200);
      expect(data.title).toBe('Minimal Lookbook'); // Original title preserved
    });

    it('can clear optional fields by setting empty string', async () => {
      mockAccess.mockResolvedValueOnce(undefined);
      mockReadFile.mockResolvedValueOnce(fullLookbookMDX);
      mockWriteFile.mockResolvedValueOnce(undefined);

      const { PATCH } = await import('../../src/pages/api/lookbook/[slug].ts');
      const context = createMockContext({
        url: 'http://localhost/api/lookbook/spring-2026',
        method: 'PATCH',
        params: { slug: 'spring-2026' },
        body: {
          drop: '', // Clear drop association
          description: '', // Clear description
        },
      });

      const response = await PATCH(context as never);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      // Optional fields are cleared (empty string or undefined depending on field)
      // The API uses undefined for falsy values in the MDX generation
      expect(data.drop).toBeFalsy(); // Either empty string or undefined
      expect(data.description).toBeFalsy();
    });
  });

  describe('DELETE /api/lookbook/[slug] - Delete lookbook', () => {
    it('removes MDX file on DELETE', async () => {
      mockAccess.mockResolvedValueOnce(undefined);
      mockUnlink.mockResolvedValueOnce(undefined);

      const { DELETE } = await import('../../src/pages/api/lookbook/[slug].ts');
      const context = createMockContext({
        url: 'http://localhost/api/lookbook/spring-2026',
        method: 'DELETE',
        params: { slug: 'spring-2026' },
      });

      const response = await DELETE(context as never);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockUnlink).toHaveBeenCalled();
    });

    it('returns 404 if lookbook not found', async () => {
      mockAccess.mockRejectedValueOnce(new Error('ENOENT'));

      const { DELETE } = await import('../../src/pages/api/lookbook/[slug].ts');
      const context = createMockContext({
        url: 'http://localhost/api/lookbook/not-exists',
        method: 'DELETE',
        params: { slug: 'not-exists' },
      });

      const response = await DELETE(context as never);
      const data = await parseResponse(response);

      expect(response.status).toBe(404);
      expect(data.error).toBe('Lookbook not found');
    });

    it('returns 400 if slug is missing', async () => {
      const { DELETE } = await import('../../src/pages/api/lookbook/[slug].ts');
      const context = createMockContext({
        url: 'http://localhost/api/lookbook/',
        method: 'DELETE',
        params: {},
      });

      const response = await DELETE(context as never);
      const data = await parseResponse(response);

      expect(response.status).toBe(400);
      expect(data.error).toBe('Slug is required');
    });

    it('returns success message on delete', async () => {
      mockAccess.mockResolvedValueOnce(undefined);
      mockUnlink.mockResolvedValueOnce(undefined);

      const { DELETE } = await import('../../src/pages/api/lookbook/[slug].ts');
      const context = createMockContext({
        url: 'http://localhost/api/lookbook/test-lookbook',
        method: 'DELETE',
        params: { slug: 'test-lookbook' },
      });

      const response = await DELETE(context as never);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.message).toBe('Lookbook deleted');
    });
  });

  describe('MDX Frontmatter Format', () => {
    it('generated MDX includes title in frontmatter', async () => {
      mockAccess.mockResolvedValueOnce(undefined);
      mockAccess.mockRejectedValueOnce(new Error('ENOENT'));
      mockWriteFile.mockResolvedValueOnce(undefined);

      const { POST } = await import('../../src/pages/api/lookbook/index.ts');
      const context = createMockContext({
        url: 'http://localhost/api/lookbook',
        method: 'POST',
        body: {
          title: 'Test Collection',
          date: '2026-02-15',
          images: [],
        },
      });

      await POST(context as never);

      const writtenContent = mockWriteFile.mock.calls[0][1] as string;
      expect(writtenContent).toContain('title: "Test Collection"');
    });

    it('generated MDX includes date in frontmatter', async () => {
      mockAccess.mockResolvedValueOnce(undefined);
      mockAccess.mockRejectedValueOnce(new Error('ENOENT'));
      mockWriteFile.mockResolvedValueOnce(undefined);

      const { POST } = await import('../../src/pages/api/lookbook/index.ts');
      const context = createMockContext({
        url: 'http://localhost/api/lookbook',
        method: 'POST',
        body: {
          title: 'Test Collection',
          date: '2026-02-15',
          images: [],
        },
      });

      await POST(context as never);

      const writtenContent = mockWriteFile.mock.calls[0][1] as string;
      expect(writtenContent).toContain('date: "2026-02-15"');
    });

    it('generated MDX includes draft status in frontmatter', async () => {
      mockAccess.mockResolvedValueOnce(undefined);
      mockAccess.mockRejectedValueOnce(new Error('ENOENT'));
      mockWriteFile.mockResolvedValueOnce(undefined);

      const { POST } = await import('../../src/pages/api/lookbook/index.ts');
      const context = createMockContext({
        url: 'http://localhost/api/lookbook',
        method: 'POST',
        body: {
          title: 'Test Collection',
          date: '2026-02-15',
          draft: false,
          images: [],
        },
      });

      await POST(context as never);

      const writtenContent = mockWriteFile.mock.calls[0][1] as string;
      expect(writtenContent).toContain('draft: false');
    });

    it('generated MDX includes images array in frontmatter', async () => {
      mockAccess.mockResolvedValueOnce(undefined);
      mockAccess.mockRejectedValueOnce(new Error('ENOENT'));
      mockWriteFile.mockResolvedValueOnce(undefined);

      const { POST } = await import('../../src/pages/api/lookbook/index.ts');
      const context = createMockContext({
        url: 'http://localhost/api/lookbook',
        method: 'POST',
        body: {
          title: 'Test Collection',
          date: '2026-02-15',
          images: [
            'https://example.com/img1.webp',
            'https://example.com/img2.webp',
          ],
        },
      });

      await POST(context as never);

      const writtenContent = mockWriteFile.mock.calls[0][1] as string;
      expect(writtenContent).toContain('images:');
      expect(writtenContent).toContain('  - "https://example.com/img1.webp"');
      expect(writtenContent).toContain('  - "https://example.com/img2.webp"');
    });

    it('preserves image order when writing MDX', async () => {
      mockAccess.mockResolvedValueOnce(undefined);
      mockAccess.mockRejectedValueOnce(new Error('ENOENT'));
      mockWriteFile.mockResolvedValueOnce(undefined);

      const orderedImages = [
        'https://example.com/first.webp',
        'https://example.com/second.webp',
        'https://example.com/third.webp',
      ];

      const { POST } = await import('../../src/pages/api/lookbook/index.ts');
      const context = createMockContext({
        url: 'http://localhost/api/lookbook',
        method: 'POST',
        body: {
          title: 'Ordered Images',
          date: '2026-02-15',
          images: orderedImages,
        },
      });

      await POST(context as never);

      const writtenContent = mockWriteFile.mock.calls[0][1] as string;
      const firstIdx = writtenContent.indexOf('first.webp');
      const secondIdx = writtenContent.indexOf('second.webp');
      const thirdIdx = writtenContent.indexOf('third.webp');

      expect(firstIdx).toBeLessThan(secondIdx);
      expect(secondIdx).toBeLessThan(thirdIdx);
    });

    it('generated MDX includes optional description', async () => {
      mockAccess.mockResolvedValueOnce(undefined);
      mockAccess.mockRejectedValueOnce(new Error('ENOENT'));
      mockWriteFile.mockResolvedValueOnce(undefined);

      const { POST } = await import('../../src/pages/api/lookbook/index.ts');
      const context = createMockContext({
        url: 'http://localhost/api/lookbook',
        method: 'POST',
        body: {
          title: 'Test Collection',
          description: 'A beautiful story',
          date: '2026-02-15',
          images: [],
        },
      });

      await POST(context as never);

      const writtenContent = mockWriteFile.mock.calls[0][1] as string;
      expect(writtenContent).toContain('description: "A beautiful story"');
    });

    it('generated MDX includes optional drop association', async () => {
      mockAccess.mockResolvedValueOnce(undefined);
      mockAccess.mockRejectedValueOnce(new Error('ENOENT'));
      mockWriteFile.mockResolvedValueOnce(undefined);

      const { POST } = await import('../../src/pages/api/lookbook/index.ts');
      const context = createMockContext({
        url: 'http://localhost/api/lookbook',
        method: 'POST',
        body: {
          title: 'Test Collection',
          date: '2026-02-15',
          drop: 'spring-2026',
          images: [],
        },
      });

      await POST(context as never);

      const writtenContent = mockWriteFile.mock.calls[0][1] as string;
      expect(writtenContent).toContain('drop: "spring-2026"');
    });

    it('generated MDX includes optional coverImage', async () => {
      mockAccess.mockResolvedValueOnce(undefined);
      mockAccess.mockRejectedValueOnce(new Error('ENOENT'));
      mockWriteFile.mockResolvedValueOnce(undefined);

      const { POST } = await import('../../src/pages/api/lookbook/index.ts');
      const context = createMockContext({
        url: 'http://localhost/api/lookbook',
        method: 'POST',
        body: {
          title: 'Test Collection',
          date: '2026-02-15',
          coverImage: 'https://example.com/cover.webp',
          images: [],
        },
      });

      await POST(context as never);

      const writtenContent = mockWriteFile.mock.calls[0][1] as string;
      expect(writtenContent).toContain(
        'coverImage: "https://example.com/cover.webp"'
      );
    });

    it('escapes quotes in title', async () => {
      mockAccess.mockResolvedValueOnce(undefined);
      mockAccess.mockRejectedValueOnce(new Error('ENOENT'));
      mockWriteFile.mockResolvedValueOnce(undefined);

      const { POST } = await import('../../src/pages/api/lookbook/index.ts');
      const context = createMockContext({
        url: 'http://localhost/api/lookbook',
        method: 'POST',
        body: {
          title: 'The "Best" Collection',
          date: '2026-02-15',
          images: [],
        },
      });

      await POST(context as never);

      const writtenContent = mockWriteFile.mock.calls[0][1] as string;
      expect(writtenContent).toContain('title: "The \\"Best\\" Collection"');
    });
  });

  describe('Image Array Updates', () => {
    it('adding new image preserves existing order', async () => {
      mockAccess.mockResolvedValueOnce(undefined);
      mockReadFile.mockResolvedValueOnce(fullLookbookMDX);
      mockWriteFile.mockResolvedValueOnce(undefined);

      const newImages = [
        'https://example.com/lookbook/image1.webp',
        'https://example.com/lookbook/image2.webp',
        'https://example.com/lookbook/image3.webp',
        'https://example.com/lookbook/new-image.webp', // Added at end
      ];

      const { PATCH } = await import('../../src/pages/api/lookbook/[slug].ts');
      const context = createMockContext({
        url: 'http://localhost/api/lookbook/spring-2026',
        method: 'PATCH',
        params: { slug: 'spring-2026' },
        body: {
          images: newImages,
        },
      });

      const response = await PATCH(context as never);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.images).toHaveLength(4);
      expect(data.images[0]).toBe('https://example.com/lookbook/image1.webp');
      expect(data.images[3]).toBe(
        'https://example.com/lookbook/new-image.webp'
      );
    });

    it('reordering images is reflected in response', async () => {
      mockAccess.mockResolvedValueOnce(undefined);
      mockReadFile.mockResolvedValueOnce(fullLookbookMDX);
      mockWriteFile.mockResolvedValueOnce(undefined);

      const reorderedImages = [
        'https://example.com/lookbook/image3.webp', // Was third, now first
        'https://example.com/lookbook/image1.webp', // Was first, now second
        'https://example.com/lookbook/image2.webp', // Was second, now third
      ];

      const { PATCH } = await import('../../src/pages/api/lookbook/[slug].ts');
      const context = createMockContext({
        url: 'http://localhost/api/lookbook/spring-2026',
        method: 'PATCH',
        params: { slug: 'spring-2026' },
        body: {
          images: reorderedImages,
        },
      });

      const response = await PATCH(context as never);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.images[0]).toBe('https://example.com/lookbook/image3.webp');
      expect(data.images[1]).toBe('https://example.com/lookbook/image1.webp');
      expect(data.images[2]).toBe('https://example.com/lookbook/image2.webp');
    });

    it('removing an image from array works correctly', async () => {
      mockAccess.mockResolvedValueOnce(undefined);
      mockReadFile.mockResolvedValueOnce(fullLookbookMDX);
      mockWriteFile.mockResolvedValueOnce(undefined);

      const reducedImages = [
        'https://example.com/lookbook/image1.webp',
        // image2 removed
        'https://example.com/lookbook/image3.webp',
      ];

      const { PATCH } = await import('../../src/pages/api/lookbook/[slug].ts');
      const context = createMockContext({
        url: 'http://localhost/api/lookbook/spring-2026',
        method: 'PATCH',
        params: { slug: 'spring-2026' },
        body: {
          images: reducedImages,
        },
      });

      const response = await PATCH(context as never);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.images).toHaveLength(2);
      expect(data.images).not.toContain(
        'https://example.com/lookbook/image2.webp'
      );
    });

    it('can set empty images array', async () => {
      mockAccess.mockResolvedValueOnce(undefined);
      mockReadFile.mockResolvedValueOnce(fullLookbookMDX);
      mockWriteFile.mockResolvedValueOnce(undefined);

      const { PATCH } = await import('../../src/pages/api/lookbook/[slug].ts');
      const context = createMockContext({
        url: 'http://localhost/api/lookbook/spring-2026',
        method: 'PATCH',
        params: { slug: 'spring-2026' },
        body: {
          images: [],
        },
      });

      const response = await PATCH(context as never);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.images).toHaveLength(0);
    });
  });

  describe('Error Handling', () => {
    it('handles file write errors on create', async () => {
      mockAccess.mockResolvedValueOnce(undefined);
      mockAccess.mockRejectedValueOnce(new Error('ENOENT'));
      mockWriteFile.mockRejectedValueOnce(new Error('Permission denied'));

      const { POST } = await import('../../src/pages/api/lookbook/index.ts');
      const context = createMockContext({
        url: 'http://localhost/api/lookbook',
        method: 'POST',
        body: {
          title: 'Test',
          date: '2026-02-15',
          images: [],
        },
      });

      const response = await POST(context as never);
      const data = await parseResponse(response);

      expect(response.status).toBe(500);
      expect(data.error).toBe('Permission denied');
    });

    it('handles file read errors on get', async () => {
      mockAccess.mockResolvedValueOnce(undefined);
      mockReadFile.mockRejectedValueOnce(new Error('Read error'));

      const { GET } = await import('../../src/pages/api/lookbook/[slug].ts');
      const context = createMockContext({
        url: 'http://localhost/api/lookbook/test',
        params: { slug: 'test' },
      });

      const response = await GET(context as never);
      const data = await parseResponse(response);

      expect(response.status).toBe(500);
      expect(data.error).toBe('Read error');
    });

    it('handles file delete errors', async () => {
      mockAccess.mockResolvedValueOnce(undefined);
      mockUnlink.mockRejectedValueOnce(new Error('Cannot delete'));

      const { DELETE } = await import('../../src/pages/api/lookbook/[slug].ts');
      const context = createMockContext({
        url: 'http://localhost/api/lookbook/test',
        method: 'DELETE',
        params: { slug: 'test' },
      });

      const response = await DELETE(context as never);
      const data = await parseResponse(response);

      expect(response.status).toBe(500);
      expect(data.error).toBe('Cannot delete');
    });
  });
});
