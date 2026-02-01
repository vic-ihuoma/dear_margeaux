import { describe, it, expect, beforeAll } from 'vitest';

/**
 * Tests for initial-content-4: Create product: The Giselle
 *
 * Verifies that The Giselle product is correctly configured in seed-config
 * for creation in the database with proper attributes
 */

describe('initial-content-4: Create product: The Giselle', () => {
  let seedConfig: typeof import('../../scripts/seed-config');

  beforeAll(async () => {
    seedConfig = await import('../../scripts/seed-config');
  });

  describe('Product Configuration', () => {
    it("Product 'The Giselle' exists in PRODUCTS array", () => {
      const giselle = seedConfig.PRODUCTS.find((p: { title: string }) => p.title === 'The Giselle');
      expect(giselle).toBeDefined();
    });

    it('Product has correct description', () => {
      const giselle = seedConfig.PRODUCTS.find((p: { title: string }) => p.title === 'The Giselle');
      expect(giselle?.description).toBe(
        'Graceful and sophisticated. The Giselle is crafted for those special moments when presence matters.'
      );
    });

    it('Product featured_image_url is set (R2 URL)', () => {
      const giselle = seedConfig.PRODUCTS.find((p: { title: string }) => p.title === 'The Giselle');
      expect(giselle?.image_url).toBeDefined();
      expect(giselle?.image_url).toContain('/products/prod-3.webp');
      expect(giselle?.image_url).toMatch(/^https:\/\/.+\.r2\.dev/);
    });
  });

  describe('Variant Configuration', () => {
    it('Product has SKU GISELLE-001', () => {
      const variants = seedConfig.VARIANTS['The Giselle'];
      expect(variants).toBeDefined();
      expect(variants.length).toBeGreaterThan(0);
      expect(variants[0].sku).toBe('GISELLE-001');
    });

    it('Product price is $525 (52500 cents)', () => {
      const variants = seedConfig.VARIANTS['The Giselle'];
      expect(variants[0].price_cents).toBe(52500);
    });

    it('Variant has image_url set', () => {
      const variants = seedConfig.VARIANTS['The Giselle'];
      expect(variants[0].image_url).toBeDefined();
      expect(variants[0].image_url).toContain('/products/prod-3.webp');
    });

    it('Variant has title "Default"', () => {
      const variants = seedConfig.VARIANTS['The Giselle'];
      expect(variants[0].title).toBe('Default');
    });

    it('Variant has weight_g configured', () => {
      const variants = seedConfig.VARIANTS['The Giselle'];
      expect(variants[0].weight_g).toBeDefined();
      expect(variants[0].weight_g).toBeGreaterThan(0);
    });
  });

  describe('Drop Assignment', () => {
    it("Product is assigned to 'The Debut' drop", () => {
      // Verify seed-config includes The Debut drop configuration
      expect(seedConfig.DROP_CONFIG.name).toBe('The Debut');
      expect(seedConfig.DROP_CONFIG.status).toBe('active');
    });

    it('Product assigned to active drop via seed script', () => {
      // The seed script creates products and assigns them to "The Debut" drop
      // This test verifies the product is in PRODUCTS array which seed script iterates
      const productTitles = seedConfig.PRODUCTS.map((p: { title: string }) => p.title);
      expect(productTitles).toContain('The Giselle');

      // Verify the drop is active
      expect(seedConfig.DROP_CONFIG.status).toBe('active');
    });
  });

  describe('Inventory Configuration', () => {
    it('Initial inventory is 12 units', () => {
      const variants = seedConfig.VARIANTS['The Giselle'];
      expect(variants[0].stock).toBe(12);
    });
  });

  describe('Seed Script Integration', () => {
    it('Product is third in PRODUCTS array (proper ordering)', () => {
      expect(seedConfig.PRODUCTS[2].title).toBe('The Giselle');
    });

    it('Product image uses R2 public URL format', () => {
      expect(seedConfig.R2_PUBLIC_URL).toBeDefined();
      expect(seedConfig.R2_PUBLIC_URL).toMatch(/^https:\/\/pub-.+\.r2\.dev$/);

      const giselle = seedConfig.PRODUCTS.find((p: { title: string }) => p.title === 'The Giselle');
      expect(giselle?.image_url?.startsWith(seedConfig.R2_PUBLIC_URL)).toBe(true);
    });

    it('Test orders include GISELLE-001 SKU', () => {
      // Verify The Giselle is included in test orders
      const ordersWithGiselle = seedConfig.TEST_ORDERS.filter(
        (order: { items: Array<{ sku: string }> }) =>
          order.items.some((item) => item.sku === 'GISELLE-001')
      );
      expect(ordersWithGiselle.length).toBeGreaterThan(0);
    });
  });
});
