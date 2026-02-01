/**
 * Tests for initial-content-6: Create product: The Vivienne
 *
 * Verifies that The Vivienne product is correctly configured in seed-config.ts
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

describe('initial-content-6: Create product: The Vivienne', () => {
  describe('Product configuration', () => {
    it('should have The Vivienne product in PRODUCTS array', () => {
      const vivienne = PRODUCTS.find((p) => p.title === 'The Vivienne');
      expect(vivienne).toBeDefined();
    });

    it('should have correct product description', () => {
      const vivienne = PRODUCTS.find((p) => p.title === 'The Vivienne');
      expect(vivienne?.description).toBe(
        'Bold yet refined. The Vivienne makes a statement without saying a word, perfect for the confident woman.'
      );
    });

    it('should have product image URL pointing to R2', () => {
      const vivienne = PRODUCTS.find((p) => p.title === 'The Vivienne');
      expect(vivienne?.image_url).toBe(`${R2_PUBLIC_URL}/products/prod-5.webp`);
    });

    it('should use product image 5 as featured image', () => {
      const vivienne = PRODUCTS.find((p) => p.title === 'The Vivienne');
      expect(vivienne?.image_url).toContain('prod-5.webp');
    });
  });

  describe('Variant configuration', () => {
    it('should have The Vivienne variants defined', () => {
      expect(VARIANTS['The Vivienne']).toBeDefined();
      expect(Array.isArray(VARIANTS['The Vivienne'])).toBe(true);
    });

    it('should have SKU VIVIENNE-001', () => {
      const variant = VARIANTS['The Vivienne'][0];
      expect(variant.sku).toBe('VIVIENNE-001');
    });

    it('should have price $595 (59500 cents)', () => {
      const variant = VARIANTS['The Vivienne'][0];
      expect(variant.price_cents).toBe(59500);
    });

    it('should have variant image URL pointing to R2', () => {
      const variant = VARIANTS['The Vivienne'][0];
      expect(variant.image_url).toBe(`${R2_PUBLIC_URL}/products/prod-5.webp`);
    });
  });

  describe('Drop assignment', () => {
    it('should be in PRODUCTS array that gets assigned to The Debut drop', () => {
      const vivienne = PRODUCTS.find((p) => p.title === 'The Vivienne');
      expect(vivienne).toBeDefined();
      // Products in PRODUCTS array are assigned to DROP_CONFIG in seed.ts
      expect(DROP_CONFIG.name).toBe('The Debut');
    });

    it('should have drop with active status', () => {
      expect(DROP_CONFIG.status).toBe('active');
    });
  });

  describe('Inventory configuration', () => {
    it('should have 10 units in stock (premium, more exclusive)', () => {
      const variant = VARIANTS['The Vivienne'][0];
      expect(variant.stock).toBe(10);
    });

    it('should have appropriate weight for luxury bag', () => {
      const variant = VARIANTS['The Vivienne'][0];
      expect(variant.weight_g).toBeGreaterThan(0);
      expect(variant.weight_g).toBe(620); // 620g
    });
  });

  describe('Integration with test orders', () => {
    it('should be included in TEST_ORDERS for demo orders', () => {
      const ordersWithVivienne = TEST_ORDERS.filter((order) =>
        order.items.some((item) => item.sku === 'VIVIENNE-001')
      );
      expect(ordersWithVivienne.length).toBeGreaterThan(0);
    });

    it('should appear in orders with valid customer emails', () => {
      const ordersWithVivienne = TEST_ORDERS.filter((order) =>
        order.items.some((item) => item.sku === 'VIVIENNE-001')
      );
      ordersWithVivienne.forEach((order) => {
        expect(order.customer_email).toMatch(/@example\.com$/);
      });
    });
  });
});
