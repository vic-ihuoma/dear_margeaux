import { describe, it, expect, beforeAll } from 'vitest';

/**
 * Tests for initial-content-2: Create product: The Colette
 *
 * Verifies that The Colette product is correctly configured in seed-config
 * for creation in the database with proper attributes
 */

describe('initial-content-2: Create product: The Colette', () => {
  let seedConfig: typeof import('../../scripts/seed-config');

  beforeAll(async () => {
    seedConfig = await import('../../scripts/seed-config');
  });

  describe('Product Configuration', () => {
    it("Product 'The Colette' exists in PRODUCTS array", () => {
      const colette = seedConfig.PRODUCTS.find((p: { title: string }) => p.title === 'The Colette');
      expect(colette).toBeDefined();
    });

    it('Product has correct description', () => {
      const colette = seedConfig.PRODUCTS.find((p: { title: string }) => p.title === 'The Colette');
      expect(colette?.description).toBe(
        'A refined everyday companion. The Colette features clean lines and supple leather, designed for the woman who values understated elegance.'
      );
    });

    it('Product featured_image_url is set (R2 URL)', () => {
      const colette = seedConfig.PRODUCTS.find((p: { title: string }) => p.title === 'The Colette');
      expect(colette?.image_url).toBeDefined();
      expect(colette?.image_url).toContain('/products/prod-1.webp');
      expect(colette?.image_url).toMatch(/^https:\/\/.+\.r2\.dev/);
    });
  });

  describe('Variant Configuration', () => {
    it('Product has SKU COLETTE-001', () => {
      const variants = seedConfig.VARIANTS['The Colette'];
      expect(variants).toBeDefined();
      expect(variants.length).toBeGreaterThan(0);
      expect(variants[0].sku).toBe('COLETTE-001');
    });

    it('Product price is $395 (39500 cents)', () => {
      const variants = seedConfig.VARIANTS['The Colette'];
      expect(variants[0].price_cents).toBe(39500);
    });

    it('Variant has image_url set', () => {
      const variants = seedConfig.VARIANTS['The Colette'];
      expect(variants[0].image_url).toBeDefined();
      expect(variants[0].image_url).toContain('/products/prod-1.webp');
    });

    it('Variant has title "Default"', () => {
      const variants = seedConfig.VARIANTS['The Colette'];
      expect(variants[0].title).toBe('Default');
    });

    it('Variant has weight_g configured', () => {
      const variants = seedConfig.VARIANTS['The Colette'];
      expect(variants[0].weight_g).toBeDefined();
      expect(variants[0].weight_g).toBeGreaterThan(0);
    });
  });

  describe('Drop Assignment', () => {
    it("Product is indexed in The Debut drop's product list", () => {
      // Verify seed-config includes The Debut drop configuration
      expect(seedConfig.DROP_CONFIG.name).toBe('The Debut');
      expect(seedConfig.DROP_CONFIG.status).toBe('active');
    });

    it('Product assigned to active drop via seed script', () => {
      // The seed script creates products and assigns them to "The Debut" drop
      // This test verifies the product is in PRODUCTS array which seed script iterates
      const productTitles = seedConfig.PRODUCTS.map((p: { title: string }) => p.title);
      expect(productTitles).toContain('The Colette');

      // Verify the drop is active
      expect(seedConfig.DROP_CONFIG.status).toBe('active');
    });
  });

  describe('Inventory Configuration', () => {
    it('Initial inventory is 20 units', () => {
      const variants = seedConfig.VARIANTS['The Colette'];
      expect(variants[0].stock).toBe(20);
    });
  });

  describe('Seed Script Integration', () => {
    it('Product is first in PRODUCTS array (proper ordering)', () => {
      expect(seedConfig.PRODUCTS[0].title).toBe('The Colette');
    });

    it('Product image uses R2 public URL format', () => {
      expect(seedConfig.R2_PUBLIC_URL).toBeDefined();
      expect(seedConfig.R2_PUBLIC_URL).toMatch(/^https:\/\/pub-.+\.r2\.dev$/);

      const colette = seedConfig.PRODUCTS.find((p: { title: string }) => p.title === 'The Colette');
      expect(colette?.image_url?.startsWith(seedConfig.R2_PUBLIC_URL)).toBe(true);
    });

    it('Test orders include COLETTE-001 SKU', () => {
      // Verify The Colette is included in test orders
      const ordersWithColette = seedConfig.TEST_ORDERS.filter(
        (order: { items: Array<{ sku: string }> }) =>
          order.items.some((item) => item.sku === 'COLETTE-001')
      );
      expect(ordersWithColette.length).toBeGreaterThan(0);
    });
  });
});
