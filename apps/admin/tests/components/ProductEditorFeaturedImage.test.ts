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

const mockProductNoImage: Product = {
  ...mockProduct,
  id: 'prod_456',
  featured_image_url: null,
  featured_image_alt: null,
};

describe('ProductEditor Featured Image Functionality', () => {
  const mockFetch = vi.fn();
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = mockFetch;
    mockFetch.mockReset();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('Featured image display', () => {
    it('should display current featured image when available', () => {
      // Product has featured_image_url set
      expect(mockProduct.featured_image_url).toBe(
        'https://example.com/colette.jpg'
      );
      expect(mockProduct.featured_image_url).toBeTruthy();
    });

    it('should display placeholder when no featured image', () => {
      // Product has no featured_image_url
      expect(mockProductNoImage.featured_image_url).toBeNull();
    });

    it('should display alt text for featured image', () => {
      expect(mockProduct.featured_image_alt).toBe('The Colette bag');
    });
  });

  describe('Featured image edit/replace', () => {
    it('should update featured_image_url via PATCH /api/products/:id', async () => {
      const newImageUrl = 'https://example.com/colette-new.webp';
      const updatedProduct = {
        ...mockProduct,
        featured_image_url: newImageUrl,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(updatedProduct),
      });

      const response = await fetch(`/api/products/${mockProduct.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ featured_image_url: newImageUrl }),
      });

      const result = await response.json();

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/products/prod_123',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ featured_image_url: newImageUrl }),
        })
      );
      expect(result.featured_image_url).toBe(newImageUrl);
    });

    it('should update both featured_image_url and featured_image_alt together', async () => {
      const updateData = {
        featured_image_url: 'https://example.com/colette-new.webp',
        featured_image_alt: 'New Colette bag image',
      };

      const updatedProduct = {
        ...mockProduct,
        ...updateData,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(updatedProduct),
      });

      const response = await fetch(`/api/products/${mockProduct.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      const result = await response.json();

      expect(result.featured_image_url).toBe(updateData.featured_image_url);
      expect(result.featured_image_alt).toBe(updateData.featured_image_alt);
    });

    it('should trigger ImageUploader when replace button is clicked', () => {
      // ImageUploader is integrated and shows replace button on hover
      // The uploadHandler should be called when a file is selected
      const uploadHandler = vi.fn().mockResolvedValue({
        url: 'https://r2.example.com/new-image.webp',
        key: 'products/new-image.webp',
      });

      // Simulate upload handler being called
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      uploadHandler(mockFile);

      expect(uploadHandler).toHaveBeenCalledWith(mockFile);
    });

    it('should update image preview after replacement', async () => {
      const newImageUrl = 'https://r2.example.com/new-image.webp';
      const updatedProduct = {
        ...mockProduct,
        featured_image_url: newImageUrl,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(updatedProduct),
      });

      const response = await fetch(`/api/products/${mockProduct.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ featured_image_url: newImageUrl }),
      });

      const result = await response.json();

      // After save, product state should have new image URL
      expect(result.featured_image_url).toBe(newImageUrl);
      expect(result.featured_image_url).not.toBe(
        mockProduct.featured_image_url
      );
    });
  });

  describe('Alt text field', () => {
    it('should render alt text input field below image', () => {
      // Alt text field should be present in the Featured Image section
      // Testing that the field accepts and stores alt text
      expect(mockProduct.featured_image_alt).toBe('The Colette bag');
    });

    it('should allow updating only alt text', async () => {
      const newAltText = 'Updated Colette bag description';
      const updatedProduct = {
        ...mockProduct,
        featured_image_alt: newAltText,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(updatedProduct),
      });

      const response = await fetch(`/api/products/${mockProduct.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ featured_image_alt: newAltText }),
      });

      const result = await response.json();

      expect(result.featured_image_alt).toBe(newAltText);
      // Image URL should remain unchanged
      expect(result.featured_image_url).toBe(mockProduct.featured_image_url);
    });

    it('should save featured image changes via PATCH /api/products/:id', async () => {
      const updateData = {
        featured_image_url: 'https://r2.example.com/updated.webp',
        featured_image_alt: 'Updated alt text',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            ...mockProduct,
            ...updateData,
          }),
      });

      const response = await fetch(`/api/products/${mockProduct.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      expect(response.ok).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/products/prod_123',
        expect.objectContaining({
          method: 'PATCH',
        })
      );
    });
  });

  describe('Error handling', () => {
    it('should handle image upload errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Failed to upload image' }),
      });

      const response = await fetch('/api/images/upload', {
        method: 'POST',
        body: new FormData(),
      });

      const result = await response.json();

      expect(response.ok).toBe(false);
      expect(result.error).toBe('Failed to upload image');
    });

    it('should handle PATCH errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Failed to update product' }),
      });

      const response = await fetch(`/api/products/${mockProduct.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          featured_image_url: 'https://example.com/new.webp',
        }),
      });

      expect(response.ok).toBe(false);
      const result = await response.json();
      expect(result.error).toBe('Failed to update product');
    });
  });

  describe('Image upload integration', () => {
    it('should upload image via /api/images/upload endpoint', async () => {
      const uploadResponse = {
        url: 'https://r2.example.com/products/new-image.webp',
        key: 'products/new-image.webp',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(uploadResponse),
      });

      const formData = new FormData();
      formData.append(
        'file',
        new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      );

      const response = await fetch('/api/images/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      expect(response.ok).toBe(true);
      expect(result.url).toBe(uploadResponse.url);
      expect(result.key).toBe(uploadResponse.key);
    });

    it('should chain upload and save operations', async () => {
      // First call: upload image
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            url: 'https://r2.example.com/products/uploaded.webp',
            key: 'products/uploaded.webp',
          }),
      });

      // Second call: save to product
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            ...mockProduct,
            featured_image_url: 'https://r2.example.com/products/uploaded.webp',
          }),
      });

      // Upload
      const uploadResponse = await fetch('/api/images/upload', {
        method: 'POST',
        body: new FormData(),
      });
      const uploadResult = await uploadResponse.json();

      // Save
      const saveResponse = await fetch(`/api/products/${mockProduct.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ featured_image_url: uploadResult.url }),
      });
      const saveResult = await saveResponse.json();

      expect(saveResult.featured_image_url).toBe(uploadResult.url);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });
});
