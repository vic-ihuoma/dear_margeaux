/**
 * Tests for initial-content-5: Create product: The Margot
 *
 * Verifies that The Margot product is correctly configured in seed-config.ts
 * with the proper SKU, price, description, and drop assignment.
 */

import { describe, expect, it } from 'vitest';
import {
  PRODUCTS,
  VARIANTS,
  DROP_CONFIG,
  TEST_ORDERS,
  R2_PUBLIC_URL,
} from '../../scripts/seed-config';

describe('initial-content-5: Create product: The Margot', () => {
  describe('Product configuration', () => {
    it('should have The Margot product in PRODUCTS array', () => {
      const margot = PRODUCTS.find((p) => p.title === 'The Margot');
      expect(margot).toBeDefined();
    });

    it('should have correct product description', () => {
      const margot = PRODUCTS.find((p) => p.title === 'The Margot');
      expect(margot?.description).toBe(
        'Our namesake piece. The Margot embodies everything Dear Margeaux stands for—timeless beauty, exceptional craftsmanship, and quiet luxury.'
      );
    });

    it('should have product image URL pointing to R2', () => {
      const margot = PRODUCTS.find((p) => p.title === 'The Margot');
      expect(margot?.image_url).toBe(`${R2_PUBLIC_URL}/products/prod-4.webp`);
    });

    it('should use product image 4 as featured image', () => {
      const margot = PRODUCTS.find((p) => p.title === 'The Margot');
      expect(margot?.image_url).toContain('prod-4.webp');
    });
  });

  describe('Variant configuration', () => {
    it('should have The Margot variants defined', () => {
      expect(VARIANTS['The Margot']).toBeDefined();
      expect(Array.isArray(VARIANTS['The Margot'])).toBe(true);
    });

    it('should have SKU MARGOT-001', () => {
      const variant = VARIANTS['The Margot'][0];
      expect(variant.sku).toBe('MARGOT-001');
    });

    it('should have price $475 (47500 cents)', () => {
      const variant = VARIANTS['The Margot'][0];
      expect(variant.price_cents).toBe(47500);
    });

    it('should have variant image URL pointing to R2', () => {
      const variant = VARIANTS['The Margot'][0];
      expect(variant.image_url).toBe(`${R2_PUBLIC_URL}/products/prod-4.webp`);
    });
  });

  describe('Drop assignment', () => {
    it('should be in PRODUCTS array that gets assigned to The Debut drop', () => {
      const margot = PRODUCTS.find((p) => p.title === 'The Margot');
      expect(margot).toBeDefined();
      // Products in PRODUCTS array are assigned to DROP_CONFIG in seed.ts
      expect(DROP_CONFIG.name).toBe('The Debut');
    });

    it('should have drop with active status', () => {
      expect(DROP_CONFIG.status).toBe('active');
    });
  });

  describe('Inventory configuration', () => {
    it('should have 18 units in stock (namesake, slightly more)', () => {
      const variant = VARIANTS['The Margot'][0];
      expect(variant.stock).toBe(18);
    });

    it('should have appropriate weight for luxury bag', () => {
      const variant = VARIANTS['The Margot'][0];
      expect(variant.weight_g).toBeGreaterThan(0);
      expect(variant.weight_g).toBe(500); // 500g
    });
  });

  describe('Integration with test orders', () => {
    it('should be included in TEST_ORDERS for demo orders', () => {
      const ordersWithMargot = TEST_ORDERS.filter((order) =>
        order.items.some((item) => item.sku === 'MARGOT-001')
      );
      expect(ordersWithMargot.length).toBeGreaterThan(0);
    });

    it('should appear in orders with valid customer emails', () => {
      const ordersWithMargot = TEST_ORDERS.filter((order) =>
        order.items.some((item) => item.sku === 'MARGOT-001')
      );
      ordersWithMargot.forEach((order) => {
        expect(order.customer_email).toMatch(/@example\.com$/);
      });
    });
  });
});
