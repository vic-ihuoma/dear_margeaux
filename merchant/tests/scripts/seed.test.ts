import { describe, it, expect } from 'vitest';

// R2 Public URL from environment or default development value
const R2_PUBLIC_URL = 'https://pub-bf88a85e013c44b6a3a965d48812aa90.r2.dev';

/**
 * Tests for seed script R2 product image configuration
 * These tests verify that the seed data uses proper R2 URLs for product images
 */

// Import seed data configuration (we'll extract this to a separate module)
// For now, we define the expected configuration inline
const EXPECTED_PRODUCT_IMAGES = [
  { index: 1, url: `${R2_PUBLIC_URL}/products/prod-1.webp` },
  { index: 2, url: `${R2_PUBLIC_URL}/products/prod-2.webp` },
  { index: 3, url: `${R2_PUBLIC_URL}/products/prod-3.webp` },
  { index: 4, url: `${R2_PUBLIC_URL}/products/prod-4.webp` },
  { index: 5, url: `${R2_PUBLIC_URL}/products/prod-5.webp` },
  { index: 6, url: `${R2_PUBLIC_URL}/products/prod-6.webp` },
  { index: 7, url: `${R2_PUBLIC_URL}/products/prod-7.webp` },
];

describe('Seed Script R2 Product Images', () => {
  // Import the seed configuration
  let seedConfig: typeof import('../../scripts/seed-config');

  beforeAll(async () => {
    seedConfig = await import('../../scripts/seed-config');
  });

  it('seed script references R2 product image URLs', () => {
    const products = seedConfig.PRODUCTS;
    const hasR2Images = products.some(
      (p: { image_url?: string }) => p.image_url && p.image_url.includes('r2.dev')
    );
    expect(hasR2Images).toBe(true);
  });

  it('all 7 products have image URLs pointing to R2', () => {
    const products = seedConfig.PRODUCTS;
    expect(products.length).toBe(7);

    for (const product of products) {
      expect(product.image_url).toBeDefined();
      expect(product.image_url).toContain(R2_PUBLIC_URL);
    }
  });

  it('image URLs follow pattern: {R2_URL}/products/prod-X.webp', () => {
    const products = seedConfig.PRODUCTS;
    const urlPattern = new RegExp(
      `^${R2_PUBLIC_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/products/prod-\\d+\\.webp$`
    );

    for (const product of products) {
      expect(product.image_url).toMatch(urlPattern);
    }
  });

  it('each product has a unique image URL', () => {
    const products = seedConfig.PRODUCTS;
    const imageUrls = products.map((p: { image_url: string }) => p.image_url);
    const uniqueUrls = new Set(imageUrls);
    expect(uniqueUrls.size).toBe(products.length);
  });

  it('product image URLs are in correct order (prod-1 through prod-7)', () => {
    const products = seedConfig.PRODUCTS;

    products.forEach((product: { image_url: string }, index: number) => {
      const expectedUrl = `${R2_PUBLIC_URL}/products/prod-${index + 1}.webp`;
      expect(product.image_url).toBe(expectedUrl);
    });
  });
});
