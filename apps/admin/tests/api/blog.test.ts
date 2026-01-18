import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock fs module
const mockAccess = vi.fn();
const mockReaddir = vi.fn();
const mockReadFile = vi.fn();
const mockWriteFile = vi.fn();
const mockMkdir = vi.fn();
const mockUnlink = vi.fn();

vi.mock('node:fs/promises', () => ({
  access: mockAccess,
  readdir: mockReaddir,
  readFile: mockReadFile,
  writeFile: mockWriteFile,
  mkdir: mockMkdir,
  unlink: mockUnlink,
}));

// Helper function to create mock APIContext
function createMockContext(options: {
  url?: string;
  method?: string;
  body?: unknown;
  params?: Record<string, string>;
}) {
  const url = new URL(options.url || 'http://localhost/api/blog');
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
    routePattern: '/api/blog',
    originPathname: '/api/blog',
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

// Sample MDX content
const sampleMDXContent = `---
title: Test Post
description: A test blog post
date: 2024-01-15
author: Test Author
tags: ["test", "example"]
draft: false
pinned: true
---
# Test Post

This is the content of the test post.
`;

const draftMDXContent = `---
title: Draft Post
description: A draft blog post
date: 2024-01-16
author: Test Author
tags: ["draft"]
draft: true
pinned: false
---
# Draft Post

This is a draft post.
`;

describe('Blog API Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/blog', () => {
    it('returns blog post list successfully', async () => {
      mockAccess.mockResolvedValueOnce(undefined); // Directory exists
      mockReaddir.mockResolvedValueOnce(['test-post.mdx', 'draft-post.mdx']);
      mockReadFile.mockResolvedValueOnce(sampleMDXContent);
      mockReadFile.mockResolvedValueOnce(draftMDXContent);

      const { GET } = await import('../../src/pages/api/blog/index.ts');

      const context = createMockContext({
        url: 'http://localhost/api/blog',
      });

      const response = await GET(context as any);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.items).toHaveLength(2);
    });

    it('returns empty list when directory does not exist', async () => {
      mockAccess.mockRejectedValueOnce(new Error('ENOENT'));

      const { GET } = await import('../../src/pages/api/blog/index.ts');

      const context = createMockContext({
        url: 'http://localhost/api/blog',
      });

      const response = await GET(context as any);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.items).toHaveLength(0);
    });

    it('filters draft posts when status=draft', async () => {
      mockAccess.mockResolvedValueOnce(undefined);
      mockReaddir.mockResolvedValueOnce(['test-post.mdx', 'draft-post.mdx']);
      mockReadFile.mockResolvedValueOnce(sampleMDXContent);
      mockReadFile.mockResolvedValueOnce(draftMDXContent);

      const { GET } = await import('../../src/pages/api/blog/index.ts');

      const context = createMockContext({
        url: 'http://localhost/api/blog?status=draft',
      });

      const response = await GET(context as any);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.items).toHaveLength(1);
      expect(data.items[0].title).toBe('Draft Post');
    });

    it('filters published posts when status=published', async () => {
      mockAccess.mockResolvedValueOnce(undefined);
      mockReaddir.mockResolvedValueOnce(['test-post.mdx', 'draft-post.mdx']);
      mockReadFile.mockResolvedValueOnce(sampleMDXContent);
      mockReadFile.mockResolvedValueOnce(draftMDXContent);

      const { GET } = await import('../../src/pages/api/blog/index.ts');

      const context = createMockContext({
        url: 'http://localhost/api/blog?status=published',
      });

      const response = await GET(context as any);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.items).toHaveLength(1);
      expect(data.items[0].title).toBe('Test Post');
    });

    it('filters posts by search query', async () => {
      mockAccess.mockResolvedValueOnce(undefined);
      mockReaddir.mockResolvedValueOnce(['test-post.mdx', 'draft-post.mdx']);
      mockReadFile.mockResolvedValueOnce(sampleMDXContent);
      mockReadFile.mockResolvedValueOnce(draftMDXContent);

      const { GET } = await import('../../src/pages/api/blog/index.ts');

      const context = createMockContext({
        url: 'http://localhost/api/blog?search=draft',
      });

      const response = await GET(context as any);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.items).toHaveLength(1);
      expect(data.items[0].title).toBe('Draft Post');
    });

    it('handles read errors gracefully', async () => {
      mockAccess.mockResolvedValueOnce(undefined);
      mockReaddir.mockRejectedValueOnce(new Error('Permission denied'));

      const { GET } = await import('../../src/pages/api/blog/index.ts');

      const context = createMockContext({
        url: 'http://localhost/api/blog',
      });

      const response = await GET(context as any);
      const data = await parseResponse(response);

      expect(response.status).toBe(500);
      expect(data.error).toBe('Permission denied');
    });
  });

  describe('POST /api/blog', () => {
    it('creates blog post with valid data', async () => {
      mockAccess.mockRejectedValueOnce(new Error('ENOENT')); // File doesn't exist
      mockMkdir.mockResolvedValueOnce(undefined);
      mockWriteFile.mockResolvedValueOnce(undefined);

      const { POST } = await import('../../src/pages/api/blog/index.ts');

      const context = createMockContext({
        method: 'POST',
        body: {
          title: 'New Post',
          description: 'A new blog post',
          author: 'Test Author',
          tags: ['new'],
          draft: true,
          content: '# New Post Content',
        },
      });

      const response = await POST(context as any);
      const data = await parseResponse(response);

      expect(response.status).toBe(201);
      expect(data.title).toBe('New Post');
      expect(data.slug).toBe('new-post');
      expect(mockWriteFile).toHaveBeenCalled();
    });

    it('returns 400 when title is missing', async () => {
      const { POST } = await import('../../src/pages/api/blog/index.ts');

      const context = createMockContext({
        method: 'POST',
        body: {
          description: 'A new blog post',
          author: 'Test Author',
        },
      });

      const response = await POST(context as any);
      const data = await parseResponse(response);

      expect(response.status).toBe(400);
      expect(data.error).toBe('Title is required');
    });

    it('returns 400 when description is missing', async () => {
      const { POST } = await import('../../src/pages/api/blog/index.ts');

      const context = createMockContext({
        method: 'POST',
        body: {
          title: 'New Post',
          author: 'Test Author',
        },
      });

      const response = await POST(context as any);
      const data = await parseResponse(response);

      expect(response.status).toBe(400);
      expect(data.error).toBe('Description is required');
    });

    it('returns 400 when author is missing', async () => {
      const { POST } = await import('../../src/pages/api/blog/index.ts');

      const context = createMockContext({
        method: 'POST',
        body: {
          title: 'New Post',
          description: 'A new blog post',
        },
      });

      const response = await POST(context as any);
      const data = await parseResponse(response);

      expect(response.status).toBe(400);
      expect(data.error).toBe('Author is required');
    });

    it('returns 409 when slug already exists', async () => {
      mockAccess.mockResolvedValueOnce(undefined); // File exists

      const { POST } = await import('../../src/pages/api/blog/index.ts');

      const context = createMockContext({
        method: 'POST',
        body: {
          title: 'New Post',
          description: 'A new blog post',
          author: 'Test Author',
        },
      });

      const response = await POST(context as any);
      const data = await parseResponse(response);

      expect(response.status).toBe(409);
      expect(data.error).toBe('A post with this slug already exists');
    });

    it('generates slug from title', async () => {
      mockAccess.mockRejectedValueOnce(new Error('ENOENT'));
      mockMkdir.mockResolvedValueOnce(undefined);
      mockWriteFile.mockResolvedValueOnce(undefined);

      const { POST } = await import('../../src/pages/api/blog/index.ts');

      const context = createMockContext({
        method: 'POST',
        body: {
          title: 'My Amazing Blog Post!',
          description: 'A new blog post',
          author: 'Test Author',
        },
      });

      const response = await POST(context as any);
      const data = await parseResponse(response);

      expect(response.status).toBe(201);
      expect(data.slug).toBe('my-amazing-blog-post');
    });
  });

  describe('GET /api/blog/:slug', () => {
    it('returns single blog post successfully', async () => {
      mockAccess.mockResolvedValueOnce(undefined);
      mockReadFile.mockResolvedValueOnce(sampleMDXContent);

      const { GET } = await import('../../src/pages/api/blog/[slug].ts');

      const context = createMockContext({
        params: { slug: 'test-post' },
      });

      const response = await GET(context as any);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.title).toBe('Test Post');
      expect(data.pinned).toBe(true);
      expect(data.content).toContain('This is the content');
    });

    it('returns 400 when slug is missing', async () => {
      const { GET } = await import('../../src/pages/api/blog/[slug].ts');

      const context = createMockContext({
        params: {},
      });

      const response = await GET(context as any);
      const data = await parseResponse(response);

      expect(response.status).toBe(400);
      expect(data.error).toBe('Slug is required');
    });

    it('returns 404 when post not found', async () => {
      mockAccess.mockRejectedValueOnce(new Error('ENOENT'));

      const { GET } = await import('../../src/pages/api/blog/[slug].ts');

      const context = createMockContext({
        params: { slug: 'nonexistent' },
      });

      const response = await GET(context as any);
      const data = await parseResponse(response);

      expect(response.status).toBe(404);
      expect(data.error).toBe('Blog post not found');
    });
  });

  describe('PATCH /api/blog/:slug', () => {
    it('updates blog post successfully', async () => {
      mockAccess.mockResolvedValueOnce(undefined);
      mockReadFile.mockResolvedValueOnce(sampleMDXContent);
      mockWriteFile.mockResolvedValueOnce(undefined);

      const { PATCH } = await import('../../src/pages/api/blog/[slug].ts');

      const context = createMockContext({
        method: 'PATCH',
        params: { slug: 'test-post' },
        body: { title: 'Updated Title' },
      });

      const response = await PATCH(context as any);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.title).toBe('Updated Title');
      expect(mockWriteFile).toHaveBeenCalled();
    });

    it('returns 400 when slug is missing', async () => {
      const { PATCH } = await import('../../src/pages/api/blog/[slug].ts');

      const context = createMockContext({
        method: 'PATCH',
        params: {},
        body: { title: 'Updated Title' },
      });

      const response = await PATCH(context as any);
      const data = await parseResponse(response);

      expect(response.status).toBe(400);
      expect(data.error).toBe('Slug is required');
    });

    it('returns 404 when post not found', async () => {
      mockAccess.mockRejectedValueOnce(new Error('ENOENT'));

      const { PATCH } = await import('../../src/pages/api/blog/[slug].ts');

      const context = createMockContext({
        method: 'PATCH',
        params: { slug: 'nonexistent' },
        body: { title: 'Updated Title' },
      });

      const response = await PATCH(context as any);
      const data = await parseResponse(response);

      expect(response.status).toBe(404);
      expect(data.error).toBe('Blog post not found');
    });

    it('preserves existing fields when partial update', async () => {
      mockAccess.mockResolvedValueOnce(undefined);
      mockReadFile.mockResolvedValueOnce(sampleMDXContent);
      mockWriteFile.mockResolvedValueOnce(undefined);

      const { PATCH } = await import('../../src/pages/api/blog/[slug].ts');

      const context = createMockContext({
        method: 'PATCH',
        params: { slug: 'test-post' },
        body: { pinned: false },
      });

      const response = await PATCH(context as any);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.title).toBe('Test Post'); // Preserved
      expect(data.author).toBe('Test Author'); // Preserved
      expect(data.pinned).toBe(false); // Updated
    });
  });

  describe('DELETE /api/blog/:slug', () => {
    it('deletes blog post successfully', async () => {
      mockAccess.mockResolvedValueOnce(undefined);
      mockUnlink.mockResolvedValueOnce(undefined);

      const { DELETE } = await import('../../src/pages/api/blog/[slug].ts');

      const context = createMockContext({
        method: 'DELETE',
        params: { slug: 'test-post' },
      });

      const response = await DELETE(context as any);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockUnlink).toHaveBeenCalled();
    });

    it('returns 400 when slug is missing', async () => {
      const { DELETE } = await import('../../src/pages/api/blog/[slug].ts');

      const context = createMockContext({
        method: 'DELETE',
        params: {},
      });

      const response = await DELETE(context as any);
      const data = await parseResponse(response);

      expect(response.status).toBe(400);
      expect(data.error).toBe('Slug is required');
    });

    it('returns 404 when post not found', async () => {
      mockAccess.mockRejectedValueOnce(new Error('ENOENT'));

      const { DELETE } = await import('../../src/pages/api/blog/[slug].ts');

      const context = createMockContext({
        method: 'DELETE',
        params: { slug: 'nonexistent' },
      });

      const response = await DELETE(context as any);
      const data = await parseResponse(response);

      expect(response.status).toBe(404);
      expect(data.error).toBe('Blog post not found');
    });
  });
});
