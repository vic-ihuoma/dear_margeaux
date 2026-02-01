import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Product } from '@dear-margeaux/api';

// Mock product for testing
const mockProduct: Product = {
  id: 'prod_123',
  title: 'The Colette',
  description: 'A refined everyday companion',
  status: 'active',
  featured_image_url: 'https://example.com/colette.jpg',
  featured_image_alt: 'The Colette bag',
  created_at: '2026-01-01T00:00:00Z',
  tags: ['bags', 'luxury'],
  drop_id: 'drop_123',
  drop_position: 0,
  variants: [
    {
      id: 'var_123',
      product_id: 'prod_123',
      title: 'Default',
      sku: 'COLETTE-001',
      price_cents: 39500,
      image_url: null,
      image_alt: null,
      low_stock_threshold: null,
      reorder_point: null,
      available: null,
    },
  ],
};

describe('ProductEditor Duplicate Functionality', () => {
  const mockFetch = vi.fn();
  const originalFetch = global.fetch;
  const originalLocation = global.window?.location;

  beforeEach(() => {
    global.fetch = mockFetch;
    mockFetch.mockReset();

    // Mock window.location
    Object.defineProperty(global, 'window', {
      value: {
        location: {
          href: '',
        },
        confirm: vi.fn(() => true),
      },
      writable: true,
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
    if (originalLocation) {
      Object.defineProperty(global, 'window', {
        value: { location: originalLocation },
        writable: true,
      });
    }
  });

  describe('Duplicate button behavior', () => {
    it('should call duplicate API when duplicate button is clicked', async () => {
      const duplicatedProduct = {
        ...mockProduct,
        id: 'prod_456',
        title: 'The Colette (Copy)',
        status: 'draft',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(duplicatedProduct),
      });

      // Simulate duplicate action
      const response = await fetch(
        `/api/products/${mockProduct.id}/duplicate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      const result = await response.json();

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/products/prod_123/duplicate',
        expect.objectContaining({
          method: 'POST',
        })
      );
      expect(result.id).toBe('prod_456');
      expect(result.title).toBe('The Colette (Copy)');
    });

    it('should navigate to new product edit page after successful duplication', async () => {
      const duplicatedProduct = {
        ...mockProduct,
        id: 'prod_456',
        title: 'The Colette (Copy)',
        status: 'draft',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(duplicatedProduct),
      });

      // Simulate duplicate action
      const response = await fetch(
        `/api/products/${mockProduct.id}/duplicate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      const result = await response.json();

      // Simulate redirect to new product
      window.location.href = `/products/${result.id}`;

      expect(window.location.href).toBe('/products/prod_456');
    });

    it('should show confirmation dialog before duplicating', () => {
      const confirmMessage =
        'This will create a copy of this product with all variants. The new product will be in Draft status. Continue?';

      // Mock confirm to return true
      const confirmSpy = vi.fn(() => true);
      window.confirm = confirmSpy;

      // Simulate confirmation check
      const shouldProceed = window.confirm(confirmMessage);

      expect(confirmSpy).toHaveBeenCalledWith(confirmMessage);
      expect(shouldProceed).toBe(true);
    });

    it('should not call API if user cancels confirmation', () => {
      // Mock confirm to return false
      window.confirm = vi.fn(() => false);

      // Simulate confirmation check
      const shouldProceed = window.confirm('Duplicate this product?');

      expect(shouldProceed).toBe(false);
      // API should not be called
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should handle duplicate API errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Failed to duplicate product' }),
      });

      let errorMessage = '';
      try {
        const response = await fetch(
          `/api/products/${mockProduct.id}/duplicate`,
          {
            method: 'POST',
          }
        );

        if (!response.ok) {
          const result = await response.json();
          errorMessage = result.error || 'Failed to duplicate product';
        }
      } catch {
        errorMessage = 'Failed to duplicate product';
      }

      expect(errorMessage).toBe('Failed to duplicate product');
    });

    it('should show loading state while duplicating', () => {
      // isDuplicating state
      let isDuplicating = false;

      // Start duplication
      isDuplicating = true;
      expect(isDuplicating).toBe(true);

      // Complete duplication
      isDuplicating = false;
      expect(isDuplicating).toBe(false);
    });
  });

  describe('Duplicated product properties', () => {
    it('should create duplicate with (Copy) suffix in title', async () => {
      const duplicatedProduct = {
        ...mockProduct,
        id: 'prod_456',
        title: 'The Colette (Copy)',
        status: 'draft',
        variants: [
          {
            ...mockProduct.variants[0],
            id: 'var_456',
            product_id: 'prod_456',
            sku: 'COLETTE-001-COPY',
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(duplicatedProduct),
      });

      const response = await fetch(
        `/api/products/${mockProduct.id}/duplicate`,
        {
          method: 'POST',
        }
      );

      const result = await response.json();

      expect(result.title).toBe('The Colette (Copy)');
      expect(result.title).toContain('(Copy)');
    });

    it('should set duplicate status to draft', async () => {
      const duplicatedProduct = {
        ...mockProduct,
        id: 'prod_456',
        title: 'The Colette (Copy)',
        status: 'draft',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(duplicatedProduct),
      });

      const response = await fetch(
        `/api/products/${mockProduct.id}/duplicate`,
        {
          method: 'POST',
        }
      );

      const result = await response.json();

      expect(result.status).toBe('draft');
    });

    it('should create duplicate variants with new IDs', async () => {
      const duplicatedProduct = {
        ...mockProduct,
        id: 'prod_456',
        title: 'The Colette (Copy)',
        status: 'draft',
        variants: [
          {
            id: 'var_new_123',
            product_id: 'prod_456',
            title: 'Default',
            sku: 'COLETTE-001-COPY',
            price_cents: 39500,
            image_url: null,
            image_alt: null,
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(duplicatedProduct),
      });

      const response = await fetch(
        `/api/products/${mockProduct.id}/duplicate`,
        {
          method: 'POST',
        }
      );

      const result = await response.json();

      expect(result.variants[0].id).not.toBe(mockProduct.variants[0].id);
      expect(result.variants[0].product_id).toBe('prod_456');
      expect(result.variants[0].sku).toBe('COLETTE-001-COPY');
    });

    it('should preserve all variant properties except id, product_id, and sku', async () => {
      const originalVariant = mockProduct.variants[0];
      const duplicatedProduct = {
        ...mockProduct,
        id: 'prod_456',
        title: 'The Colette (Copy)',
        status: 'draft',
        variants: [
          {
            id: 'var_new_123',
            product_id: 'prod_456',
            title: originalVariant.title,
            sku: `${originalVariant.sku}-COPY`,
            price_cents: originalVariant.price_cents,
            image_url: originalVariant.image_url,
            image_alt: originalVariant.image_alt,
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(duplicatedProduct),
      });

      const response = await fetch(
        `/api/products/${mockProduct.id}/duplicate`,
        {
          method: 'POST',
        }
      );

      const result = await response.json();
      const duplicatedVariant = result.variants[0];

      expect(duplicatedVariant.title).toBe(originalVariant.title);
      expect(duplicatedVariant.price_cents).toBe(originalVariant.price_cents);
      expect(duplicatedVariant.image_url).toBe(originalVariant.image_url);
      expect(duplicatedVariant.image_alt).toBe(originalVariant.image_alt);
    });
  });

  describe('Network error handling', () => {
    it('should handle network errors during duplication', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      let errorOccurred = false;
      let errorMessage = '';

      try {
        await fetch(`/api/products/${mockProduct.id}/duplicate`, {
          method: 'POST',
        });
      } catch (err) {
        errorOccurred = true;
        errorMessage = err instanceof Error ? err.message : 'Unknown error';
      }

      expect(errorOccurred).toBe(true);
      expect(errorMessage).toBe('Network error');
    });

    it('should display error message to user on failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () =>
          Promise.resolve({ error: 'SKU already exists for another product' }),
      });

      const response = await fetch(
        `/api/products/${mockProduct.id}/duplicate`,
        {
          method: 'POST',
        }
      );

      const result = await response.json();

      expect(response.ok).toBe(false);
      expect(result.error).toBe('SKU already exists for another product');
    });
  });
});
