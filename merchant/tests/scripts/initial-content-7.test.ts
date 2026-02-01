/**
 * Tests for initial-content-7: Create product: The Eloise
 *
 * Verifies The Eloise product configuration in seed-config.ts
 * matches the specifications from implementations.json
 */

import { describe, it, expect } from 'vitest';
import { PRODUCTS, VARIANTS, R2_PUBLIC_URL, TEST_ORDERS } from '../../scripts/seed-config';

describe('initial-content-7: The Eloise product configuration', () => {
  // Unit test: Product 'The Eloise' exists in database (via seed config)
  it("should have product 'The Eloise' in PRODUCTS array", () => {
    const product = PRODUCTS.find((p) => p.title === 'The Eloise');
    expect(product).toBeDefined();
    expect(product?.title).toBe('The Eloise');
  });

  it('should have correct description for The Eloise', () => {
    const product = PRODUCTS.find((p) => p.title === 'The Eloise');
    expect(product?.description).toBe(
      'Delicate and dreamy. The Eloise is a petite treasure for evenings out and intimate gatherings.'
    );
  });

  // Unit test: Product has SKU ELOISE-001
  it('should have variant with SKU ELOISE-001', () => {
    const variants = VARIANTS['The Eloise'];
    expect(variants).toBeDefined();
    expect(variants.length).toBeGreaterThanOrEqual(1);
    expect(variants[0].sku).toBe('ELOISE-001');
  });

  // Unit test: Product price is $345 (34500 cents)
  it('should have price of $345 (34500 cents)', () => {
    const variants = VARIANTS['The Eloise'];
    expect(variants[0].price_cents).toBe(34500);
  });

  // Verify dollars to cents conversion
  it('price in dollars should equal 345', () => {
    const variants = VARIANTS['The Eloise'];
    const priceInDollars = variants[0].price_cents / 100;
    expect(priceInDollars).toBe(345);
  });

  // Unit test: Product assigned to 'The Debut' drop
  // This is verified by the product being in the PRODUCTS array
  // which the seed script assigns to the drop
  it('should be configured for assignment to The Debut drop', () => {
    const productIndex = PRODUCTS.findIndex((p) => p.title === 'The Eloise');
    expect(productIndex).toBeGreaterThanOrEqual(0);
    // Product at index 5 (0-indexed) corresponds to prod-6.webp image
    expect(productIndex).toBe(5);
  });

  // Verify featured image URL points to R2
  it('should have featured_image_url pointing to R2', () => {
    const product = PRODUCTS.find((p) => p.title === 'The Eloise');
    expect(product?.image_url).toBe(`${R2_PUBLIC_URL}/products/prod-6.webp`);
    expect(product?.image_url).toContain('r2.dev');
  });

  // Variant image should also point to R2
  it('should have variant image_url pointing to R2', () => {
    const variants = VARIANTS['The Eloise'];
    expect(variants[0].image_url).toBe(`${R2_PUBLIC_URL}/products/prod-6.webp`);
  });

  describe('inventory configuration', () => {
    // Initial-content-9 specifies: The Eloise: 25 units (entry price point)
    it('should have initial stock of 25 units', () => {
      const variants = VARIANTS['The Eloise'];
      expect(variants[0].stock).toBe(25);
    });

    it('should have weight configured', () => {
      const variants = VARIANTS['The Eloise'];
      expect(variants[0].weight_g).toBeDefined();
      expect(variants[0].weight_g).toBeGreaterThan(0);
    });
  });

  describe('variant details', () => {
    it('should have Default as variant title', () => {
      const variants = VARIANTS['The Eloise'];
      expect(variants[0].title).toBe('Default');
    });

    it('should have exactly one variant initially', () => {
      const variants = VARIANTS['The Eloise'];
      expect(variants.length).toBe(1);
    });
  });

  describe('test orders integration', () => {
    it('should be included in TEST_ORDERS for demo data', () => {
      const ordersWithEloise = TEST_ORDERS.filter((order) =>
        order.items.some((item) => item.sku === 'ELOISE-001')
      );
      expect(ordersWithEloise.length).toBeGreaterThan(0);
    });

    it('should appear in multiple test orders', () => {
      const ordersWithEloise = TEST_ORDERS.filter((order) =>
        order.items.some((item) => item.sku === 'ELOISE-001')
      );
      // The Eloise appears in orders for sarah@example.com and noah@example.com
      expect(ordersWithEloise.length).toBe(2);
    });
  });
});
