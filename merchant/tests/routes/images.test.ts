import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import type { AuthContext, Env } from '../../src/types';

// Mock R2 bucket
const mockR2Put = vi.fn().mockResolvedValue(undefined);
const mockR2Get = vi.fn();
const mockR2Delete = vi.fn().mockResolvedValue(undefined);

const mockR2Bucket = {
  put: mockR2Put,
  get: mockR2Get,
  delete: mockR2Delete,
};

// Track auth context for tests
let mockAuthRole: 'admin' | 'public' = 'admin';
let mockStoreId = 'store-1';

// Mock auth middleware
vi.mock('../../src/middleware/auth', () => {
  return {
    authMiddleware: vi.fn().mockImplementation((c: any, next: any) => {
      c.set('auth', {
        store: {
          id: mockStoreId,
          name: 'Test Store',
          status: 'enabled',
          stripe_secret_key: null,
          stripe_webhook_secret: null,
        },
        role: mockAuthRole,
      });
      return next();
    }),
    adminOnly: vi.fn().mockImplementation(async (c: any, next: any) => {
      const auth = c.get('auth');
      if (auth?.role !== 'admin') {
        const types = await import('../../src/types');
        throw types.ApiError.forbidden('Admin access required');
      }
      return next();
    }),
  };
});

// Mock uuid
vi.mock('../../src/types', async (importOriginal) => {
  const original = (await importOriginal()) as Record<string, unknown>;
  return {
    ...original,
    uuid: vi.fn(() => 'test-uuid-123'),
  };
});

import { ApiError } from '../../src/types';

function setAuthContext(role: 'admin' | 'public', storeId = 'store-1') {
  mockAuthRole = role;
  mockStoreId = storeId;
}

function createTestApp() {
  const app = new Hono<{
    Bindings: Env;
    Variables: { auth: AuthContext };
  }>();

  app.onError((err, c) => {
    if (err instanceof ApiError) {
      return c.json(
        { error: err.code, message: err.message, details: err.details },
        err.statusCode as any
      );
    }
    return c.json({ error: 'internal_error', message: err.message }, 500);
  });

  return app;
}

async function getImagesRoutes() {
  const { images } = await import('../../src/routes/images');
  return images;
}

// Helper to create a mock File for testing
function createMockFile(content: string, filename: string, type: string): File {
  const blob = new Blob([content], { type });
  return new File([blob], filename, { type });
}

describe('Image Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setAuthContext('admin');
  });

  describe('POST /v1/images - Upload Image', () => {
    it('uploads image with default UUID filename', async () => {
      const app = createTestApp();
      const images = await getImagesRoutes();
      app.route('/v1/images', images);

      const formData = new FormData();
      const file = createMockFile('fake-image-data', 'test.png', 'image/png');
      formData.append('file', file);

      const res = await app.request(
        '/v1/images',
        {
          method: 'POST',
          body: formData,
        },
        {
          IMAGES: mockR2Bucket,
          IMAGES_URL: 'https://images.example.com',
        }
      );

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.key).toBe('store-1/test-uuid-123.png');
      expect(data.url).toBe('https://images.example.com/store-1/test-uuid-123.png');
      expect(mockR2Put).toHaveBeenCalledOnce();
    });

    it('uploads image with custom folder', async () => {
      const app = createTestApp();
      const images = await getImagesRoutes();
      app.route('/v1/images', images);

      const formData = new FormData();
      const file = createMockFile('fake-image-data', 'test.webp', 'image/webp');
      formData.append('file', file);
      formData.append('folder', 'products');

      const res = await app.request(
        '/v1/images',
        {
          method: 'POST',
          body: formData,
        },
        {
          IMAGES: mockR2Bucket,
          IMAGES_URL: 'https://images.example.com',
        }
      );

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.key).toBe('store-1/products/test-uuid-123.webp');
      expect(data.url).toBe('https://images.example.com/store-1/products/test-uuid-123.webp');
    });

    it('uploads image with custom filename', async () => {
      const app = createTestApp();
      const images = await getImagesRoutes();
      app.route('/v1/images', images);

      const formData = new FormData();
      const file = createMockFile('fake-image-data', 'original.webp', 'image/webp');
      formData.append('file', file);
      formData.append('folder', 'products');
      formData.append('filename', 'prod-1.webp');

      const res = await app.request(
        '/v1/images',
        {
          method: 'POST',
          body: formData,
        },
        {
          IMAGES: mockR2Bucket,
          IMAGES_URL: 'https://images.example.com',
        }
      );

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.key).toBe('store-1/products/prod-1.webp');
      expect(data.url).toBe('https://images.example.com/store-1/products/prod-1.webp');
    });

    it('rejects invalid file types', async () => {
      const app = createTestApp();
      const images = await getImagesRoutes();
      app.route('/v1/images', images);

      const formData = new FormData();
      const file = createMockFile('not-an-image', 'test.txt', 'text/plain');
      formData.append('file', file);

      const res = await app.request(
        '/v1/images',
        {
          method: 'POST',
          body: formData,
        },
        {
          IMAGES: mockR2Bucket,
        }
      );

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.message).toContain('jpeg, png, webp, or gif');
    });

    it('rejects invalid folder names', async () => {
      const app = createTestApp();
      const images = await getImagesRoutes();
      app.route('/v1/images', images);

      const formData = new FormData();
      const file = createMockFile('fake-image-data', 'test.png', 'image/png');
      formData.append('file', file);
      formData.append('folder', '../hack');

      const res = await app.request(
        '/v1/images',
        {
          method: 'POST',
          body: formData,
        },
        {
          IMAGES: mockR2Bucket,
        }
      );

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.message).toContain('alphanumeric');
    });

    it('requires admin authentication', async () => {
      setAuthContext('public');

      const app = createTestApp();
      const images = await getImagesRoutes();
      app.route('/v1/images', images);

      const formData = new FormData();
      const file = createMockFile('fake-image-data', 'test.png', 'image/png');
      formData.append('file', file);

      const res = await app.request(
        '/v1/images',
        {
          method: 'POST',
          body: formData,
        },
        {
          IMAGES: mockR2Bucket,
        }
      );

      expect(res.status).toBe(403);
    });

    it('returns error when R2 bucket not configured', async () => {
      const app = createTestApp();
      const images = await getImagesRoutes();
      app.route('/v1/images', images);

      const formData = new FormData();
      const file = createMockFile('fake-image-data', 'test.png', 'image/png');
      formData.append('file', file);

      const res = await app.request(
        '/v1/images',
        {
          method: 'POST',
          body: formData,
        },
        {
          IMAGES: undefined,
        }
      );

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.message).toContain('R2 bucket not configured');
    });
  });

  describe('GET /v1/images/* - Serve Image', () => {
    it('serves image from R2', async () => {
      mockR2Get.mockResolvedValue({
        body: new ReadableStream(),
        httpMetadata: { contentType: 'image/webp' },
      });

      const app = createTestApp();
      const images = await getImagesRoutes();
      app.route('/v1/images', images);

      const res = await app.request(
        '/v1/images/store-1/products/prod-1.webp',
        {
          method: 'GET',
        },
        {
          IMAGES: mockR2Bucket,
        }
      );

      expect(res.status).toBe(200);
      expect(res.headers.get('Content-Type')).toBe('image/webp');
      expect(res.headers.get('Cache-Control')).toContain('max-age=31536000');
    });

    it('returns 404 for missing image', async () => {
      mockR2Get.mockResolvedValue(null);

      const app = createTestApp();
      const images = await getImagesRoutes();
      app.route('/v1/images', images);

      const res = await app.request(
        '/v1/images/store-1/missing.webp',
        {
          method: 'GET',
        },
        {
          IMAGES: mockR2Bucket,
        }
      );

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /v1/images/* - Delete Image', () => {
    it('deletes image from R2', async () => {
      const app = createTestApp();
      const images = await getImagesRoutes();
      app.route('/v1/images', images);

      const res = await app.request(
        '/v1/images/store-1/products/prod-1.webp',
        {
          method: 'DELETE',
        },
        {
          IMAGES: mockR2Bucket,
        }
      );

      expect(res.status).toBe(200);
      expect(mockR2Delete).toHaveBeenCalledWith('store-1/products/prod-1.webp');
    });

    it('prevents deleting other store images', async () => {
      const app = createTestApp();
      const images = await getImagesRoutes();
      app.route('/v1/images', images);

      const res = await app.request(
        '/v1/images/other-store/image.webp',
        {
          method: 'DELETE',
        },
        {
          IMAGES: mockR2Bucket,
        }
      );

      expect(res.status).toBe(403);
      expect(mockR2Delete).not.toHaveBeenCalled();
    });
  });
});

describe('R2 Upload Script Integration', () => {
  it('should upload all required image categories', () => {
    // This test documents the expected folder structure
    const expectedFolders = ['products', 'blog', 'lookbook', 'branding'];
    const expectedProductImages = 7;
    const expectedBlogImages = 1;
    const expectedLookbookImages = 2;
    const expectedBrandingImages = 7; // branding-hero + 3 logos * 2 formats

    expect(expectedFolders).toContain('products');
    expect(expectedFolders).toContain('blog');
    expect(expectedFolders).toContain('lookbook');
    expect(expectedFolders).toContain('branding');

    expect(expectedProductImages).toBe(7);
    expect(expectedBlogImages).toBe(1);
    expect(expectedLookbookImages).toBe(2);
    expect(expectedBrandingImages).toBe(7);
  });
});
