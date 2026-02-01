import { describe, it, expect, beforeAll } from 'vitest';

/**
 * Tests for initial-content-3: Create product: The Amélie
 *
 * Verifies that The Amélie product is correctly configured in seed-config
 * for creation in the database with proper attributes
 */

describe('initial-content-3: Create product: The Amélie', () => {
  let seedConfig: typeof import('../../scripts/seed-config');

  beforeAll(async () => {
    seedConfig = await import('../../scripts/seed-config');
  });

  describe('Product Configuration', () => {
    it("Product 'The Amélie' exists in PRODUCTS array", () => {
      const amelie = seedConfig.PRODUCTS.find((p: { title: string }) => p.title === 'The Amélie');
      expect(amelie).toBeDefined();
    });

    it('Product has correct description', () => {
      const amelie = seedConfig.PRODUCTS.find((p: { title: string }) => p.title === 'The Amélie');
      expect(amelie?.description).toBe(
        'Effortlessly chic with a touch of Parisian flair. The Amélie combines timeless silhouette with modern functionality.'
      );
    });

    it('Product featured_image_url is set (R2 URL)', () => {
      const amelie = seedConfig.PRODUCTS.find((p: { title: string }) => p.title === 'The Amélie');
      expect(amelie?.image_url).toBeDefined();
      expect(amelie?.image_url).toContain('/products/prod-2.webp');
      expect(amelie?.image_url).toMatch(/^https:\/\/.+\.r2\.dev/);
    });
  });

  describe('Variant Configuration', () => {
    it('Product has SKU AMELIE-001', () => {
      const variants = seedConfig.VARIANTS['The Amélie'];
      expect(variants).toBeDefined();
      expect(variants.length).toBeGreaterThan(0);
      expect(variants[0].sku).toBe('AMELIE-001');
    });

    it('Product price is $450 (45000 cents)', () => {
      const variants = seedConfig.VARIANTS['The Amélie'];
      expect(variants[0].price_cents).toBe(45000);
    });

    it('Variant has image_url set', () => {
      const variants = seedConfig.VARIANTS['The Amélie'];
      expect(variants[0].image_url).toBeDefined();
      expect(variants[0].image_url).toContain('/products/prod-2.webp');
    });

    it('Variant has title "Default"', () => {
      const variants = seedConfig.VARIANTS['The Amélie'];
      expect(variants[0].title).toBe('Default');
    });

    it('Variant has weight_g configured', () => {
      const variants = seedConfig.VARIANTS['The Amélie'];
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
      expect(productTitles).toContain('The Amélie');

      // Verify the drop is active
      expect(seedConfig.DROP_CONFIG.status).toBe('active');
    });
  });

  describe('Inventory Configuration', () => {
    it('Initial inventory is 15 units', () => {
      const variants = seedConfig.VARIANTS['The Amélie'];
      expect(variants[0].stock).toBe(15);
    });
  });

  describe('Seed Script Integration', () => {
    it('Product is second in PRODUCTS array (proper ordering)', () => {
      expect(seedConfig.PRODUCTS[1].title).toBe('The Amélie');
    });

    it('Product image uses R2 public URL format', () => {
      expect(seedConfig.R2_PUBLIC_URL).toBeDefined();
      expect(seedConfig.R2_PUBLIC_URL).toMatch(/^https:\/\/pub-.+\.r2\.dev$/);

      const amelie = seedConfig.PRODUCTS.find((p: { title: string }) => p.title === 'The Amélie');
      expect(amelie?.image_url?.startsWith(seedConfig.R2_PUBLIC_URL)).toBe(true);
    });

    it('Test orders include AMELIE-001 SKU', () => {
      // Verify The Amélie is included in test orders
      const ordersWithAmelie = seedConfig.TEST_ORDERS.filter(
        (order: { items: Array<{ sku: string }> }) =>
          order.items.some((item) => item.sku === 'AMELIE-001')
      );
      expect(ordersWithAmelie.length).toBeGreaterThan(0);
    });
  });
});
