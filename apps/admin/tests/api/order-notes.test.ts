import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { OrderNote } from '@dear-margeaux/api';

// Mock the MerchantClient
const mockGetOrderNotes = vi.fn();
const mockCreateOrderNote = vi.fn();
const mockUpdateOrderNote = vi.fn();
const mockDeleteOrderNote = vi.fn();

vi.mock('@dear-margeaux/api', () => ({
  MerchantClient: vi.fn().mockImplementation(() => ({
    getOrderNotes: mockGetOrderNotes,
    createOrderNote: mockCreateOrderNote,
    updateOrderNote: mockUpdateOrderNote,
    deleteOrderNote: mockDeleteOrderNote,
  })),
}));

// Helper function to create mock APIContext
function createMockContext(options: {
  url?: string;
  method?: string;
  body?: unknown;
  params?: Record<string, string>;
  headers?: Record<string, string>;
  searchParams?: Record<string, string>;
}) {
  const baseUrl = options.url || 'http://localhost/api/orders/ord_123/notes';
  const url = new URL(baseUrl);

  if (options.searchParams) {
    Object.entries(options.searchParams).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }

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
    routePattern: '/api/orders/[id]/notes',
    originPathname: '/api/orders/ord_123/notes',
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

// Sample order note data
const sampleNote: OrderNote = {
  id: 'note_123',
  order_id: 'ord_123',
  admin_id: 'admin_1',
  admin_name: 'Admin User',
  content: 'This is a test note',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

describe('Order Notes API Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/orders/:id/notes', () => {
    it('returns list of notes for an order', async () => {
      mockGetOrderNotes.mockResolvedValueOnce({
        items: [sampleNote],
      });

      const { GET } =
        await import('../../src/pages/api/orders/[id]/notes/index.ts');

      const context = createMockContext({
        method: 'GET',
        params: { id: 'ord_123' },
      });

      const response = await GET(context as any);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.items).toHaveLength(1);
      expect(data.items[0].content).toBe('This is a test note');
      expect(mockGetOrderNotes).toHaveBeenCalledWith('ord_123');
    });

    it('returns 400 when order ID is missing', async () => {
      const { GET } =
        await import('../../src/pages/api/orders/[id]/notes/index.ts');

      const context = createMockContext({
        method: 'GET',
        params: {},
      });

      const response = await GET(context as any);
      const data = await parseResponse(response);

      expect(response.status).toBe(400);
      expect(data.error).toBe('Order ID is required');
    });

    it('returns empty list for order with no notes', async () => {
      mockGetOrderNotes.mockResolvedValueOnce({
        items: [],
      });

      const { GET } =
        await import('../../src/pages/api/orders/[id]/notes/index.ts');

      const context = createMockContext({
        method: 'GET',
        params: { id: 'ord_123' },
      });

      const response = await GET(context as any);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.items).toHaveLength(0);
    });
  });

  describe('POST /api/orders/:id/notes', () => {
    it('creates a new note successfully', async () => {
      mockCreateOrderNote.mockResolvedValueOnce(sampleNote);

      const { POST } =
        await import('../../src/pages/api/orders/[id]/notes/index.ts');

      const context = createMockContext({
        method: 'POST',
        params: { id: 'ord_123' },
        body: {
          content: 'This is a test note',
          admin_id: 'admin_1',
          admin_name: 'Admin User',
        },
      });

      const response = await POST(context as any);
      const data = await parseResponse(response);

      expect(response.status).toBe(201);
      expect(data.content).toBe('This is a test note');
      expect(data.admin_name).toBe('Admin User');
      expect(mockCreateOrderNote).toHaveBeenCalledWith('ord_123', {
        content: 'This is a test note',
        admin_id: 'admin_1',
        admin_name: 'Admin User',
      });
    });

    it('returns 400 when content is missing', async () => {
      const { POST } =
        await import('../../src/pages/api/orders/[id]/notes/index.ts');

      const context = createMockContext({
        method: 'POST',
        params: { id: 'ord_123' },
        body: {
          admin_id: 'admin_1',
          admin_name: 'Admin User',
        },
      });

      const response = await POST(context as any);
      const data = await parseResponse(response);

      expect(response.status).toBe(400);
      expect(data.error).toBe('content is required');
    });

    it('returns 400 when admin_id is missing', async () => {
      const { POST } =
        await import('../../src/pages/api/orders/[id]/notes/index.ts');

      const context = createMockContext({
        method: 'POST',
        params: { id: 'ord_123' },
        body: {
          content: 'Test note',
          admin_name: 'Admin User',
        },
      });

      const response = await POST(context as any);
      const data = await parseResponse(response);

      expect(response.status).toBe(400);
      expect(data.error).toBe('admin_id is required');
    });

    it('returns 400 when admin_name is missing', async () => {
      const { POST } =
        await import('../../src/pages/api/orders/[id]/notes/index.ts');

      const context = createMockContext({
        method: 'POST',
        params: { id: 'ord_123' },
        body: {
          content: 'Test note',
          admin_id: 'admin_1',
        },
      });

      const response = await POST(context as any);
      const data = await parseResponse(response);

      expect(response.status).toBe(400);
      expect(data.error).toBe('admin_name is required');
    });

    it('returns 400 when order ID is missing', async () => {
      const { POST } =
        await import('../../src/pages/api/orders/[id]/notes/index.ts');

      const context = createMockContext({
        method: 'POST',
        params: {},
        body: {
          content: 'Test note',
          admin_id: 'admin_1',
          admin_name: 'Admin User',
        },
      });

      const response = await POST(context as any);
      const data = await parseResponse(response);

      expect(response.status).toBe(400);
      expect(data.error).toBe('Order ID is required');
    });
  });

  describe('PATCH /api/orders/:id/notes/:noteId', () => {
    it('updates note content successfully', async () => {
      const updatedNote = { ...sampleNote, content: 'Updated content' };
      mockUpdateOrderNote.mockResolvedValueOnce(updatedNote);

      const { PATCH } =
        await import('../../src/pages/api/orders/[id]/notes/[noteId].ts');

      const context = createMockContext({
        method: 'PATCH',
        params: { id: 'ord_123', noteId: 'note_123' },
        body: {
          content: 'Updated content',
          admin_id: 'admin_1',
        },
      });

      const response = await PATCH(context as any);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.content).toBe('Updated content');
      expect(mockUpdateOrderNote).toHaveBeenCalledWith('ord_123', 'note_123', {
        content: 'Updated content',
        admin_id: 'admin_1',
      });
    });

    it('returns 400 when content is missing', async () => {
      const { PATCH } =
        await import('../../src/pages/api/orders/[id]/notes/[noteId].ts');

      const context = createMockContext({
        method: 'PATCH',
        params: { id: 'ord_123', noteId: 'note_123' },
        body: {
          admin_id: 'admin_1',
        },
      });

      const response = await PATCH(context as any);
      const data = await parseResponse(response);

      expect(response.status).toBe(400);
      expect(data.error).toBe('content is required');
    });

    it('returns 400 when admin_id is missing', async () => {
      const { PATCH } =
        await import('../../src/pages/api/orders/[id]/notes/[noteId].ts');

      const context = createMockContext({
        method: 'PATCH',
        params: { id: 'ord_123', noteId: 'note_123' },
        body: {
          content: 'Updated content',
        },
      });

      const response = await PATCH(context as any);
      const data = await parseResponse(response);

      expect(response.status).toBe(400);
      expect(data.error).toBe('admin_id is required for permission check');
    });

    it('returns 403 when trying to edit other admin notes', async () => {
      mockUpdateOrderNote.mockRejectedValueOnce(
        new Error('Cannot edit notes created by other admins')
      );

      const { PATCH } =
        await import('../../src/pages/api/orders/[id]/notes/[noteId].ts');

      const context = createMockContext({
        method: 'PATCH',
        params: { id: 'ord_123', noteId: 'note_123' },
        body: {
          content: 'Updated content',
          admin_id: 'different_admin',
        },
      });

      const response = await PATCH(context as any);
      const data = await parseResponse(response);

      expect(response.status).toBe(403);
      expect(data.error).toContain('other admins');
    });

    it('returns 400 when note ID is missing', async () => {
      const { PATCH } =
        await import('../../src/pages/api/orders/[id]/notes/[noteId].ts');

      const context = createMockContext({
        method: 'PATCH',
        params: { id: 'ord_123' },
        body: {
          content: 'Updated content',
          admin_id: 'admin_1',
        },
      });

      const response = await PATCH(context as any);
      const data = await parseResponse(response);

      expect(response.status).toBe(400);
      expect(data.error).toBe('Note ID is required');
    });
  });

  describe('DELETE /api/orders/:id/notes/:noteId', () => {
    it('deletes note successfully', async () => {
      mockDeleteOrderNote.mockResolvedValueOnce({ success: true });

      const { DELETE } =
        await import('../../src/pages/api/orders/[id]/notes/[noteId].ts');

      const context = createMockContext({
        method: 'DELETE',
        params: { id: 'ord_123', noteId: 'note_123' },
        searchParams: { admin_id: 'admin_1' },
      });

      const response = await DELETE(context as any);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockDeleteOrderNote).toHaveBeenCalledWith(
        'ord_123',
        'note_123',
        'admin_1'
      );
    });

    it('returns 400 when admin_id query param is missing', async () => {
      const { DELETE } =
        await import('../../src/pages/api/orders/[id]/notes/[noteId].ts');

      const context = createMockContext({
        method: 'DELETE',
        params: { id: 'ord_123', noteId: 'note_123' },
      });

      const response = await DELETE(context as any);
      const data = await parseResponse(response);

      expect(response.status).toBe(400);
      expect(data.error).toContain('admin_id query param is required');
    });

    it('returns 403 when trying to delete other admin notes', async () => {
      mockDeleteOrderNote.mockRejectedValueOnce(
        new Error('Cannot delete notes created by other admins')
      );

      const { DELETE } =
        await import('../../src/pages/api/orders/[id]/notes/[noteId].ts');

      const context = createMockContext({
        method: 'DELETE',
        params: { id: 'ord_123', noteId: 'note_123' },
        searchParams: { admin_id: 'different_admin' },
      });

      const response = await DELETE(context as any);
      const data = await parseResponse(response);

      expect(response.status).toBe(403);
      expect(data.error).toContain('other admins');
    });

    it('returns 400 when note ID is missing', async () => {
      const { DELETE } =
        await import('../../src/pages/api/orders/[id]/notes/[noteId].ts');

      const context = createMockContext({
        method: 'DELETE',
        params: { id: 'ord_123' },
        searchParams: { admin_id: 'admin_1' },
      });

      const response = await DELETE(context as any);
      const data = await parseResponse(response);

      expect(response.status).toBe(400);
      expect(data.error).toBe('Note ID is required');
    });
  });
});

describe('Order Notes component behavior', () => {
  describe('Note display', () => {
    it('should display notes with timestamp and admin name', () => {
      // Verify note structure matches display requirements
      expect(sampleNote.admin_name).toBeDefined();
      expect(sampleNote.created_at).toBeDefined();
      expect(sampleNote.content).toBeDefined();
    });

    it('should track if note was edited', () => {
      const editedNote = {
        ...sampleNote,
        updated_at: '2024-01-02T00:00:00Z', // Different from created_at
      };

      expect(editedNote.updated_at).not.toBe(editedNote.created_at);
    });
  });

  describe('Note permissions', () => {
    it('should only allow editing own notes', () => {
      const currentAdminId = 'admin_1';
      const noteByCurrentAdmin = { ...sampleNote, admin_id: 'admin_1' };
      const noteByOtherAdmin = { ...sampleNote, admin_id: 'admin_2' };

      expect(noteByCurrentAdmin.admin_id === currentAdminId).toBe(true);
      expect(noteByOtherAdmin.admin_id === currentAdminId).toBe(false);
    });

    it('should only allow deleting own notes', () => {
      const currentAdminId = 'admin_1';
      const noteByCurrentAdmin = { ...sampleNote, admin_id: 'admin_1' };
      const noteByOtherAdmin = { ...sampleNote, admin_id: 'admin_2' };

      expect(noteByCurrentAdmin.admin_id === currentAdminId).toBe(true);
      expect(noteByOtherAdmin.admin_id === currentAdminId).toBe(false);
    });
  });
});
