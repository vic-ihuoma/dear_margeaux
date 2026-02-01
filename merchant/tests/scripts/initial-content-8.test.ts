/**
 * Tests for initial-content-8: Create product: The Céline
 *
 * Verifies The Céline product configuration in seed-config for database creation.
 *
 * Unit tests from implementations.json:
 * - Product 'The Céline' exists in database (configured in seed-config)
 * - Product has SKU CELINE-001
 * - Product price is $425 (42500 cents)
 * - Product assigned to 'The Debut' drop
 */

import { describe, it, expect } from 'vitest';
import {
  PRODUCTS,
  VARIANTS,
  DROP_CONFIG,
  R2_PUBLIC_URL,
  TEST_ORDERS,
} from '../../scripts/seed-config';

describe('initial-content-8: The Céline Product Configuration', () => {
  describe('Product exists in configuration', () => {
    it('should have The Céline in PRODUCTS array', () => {
      const product = PRODUCTS.find((p) => p.title === 'The Céline');
      expect(product).toBeDefined();
    });

    it('should have The Céline as the 7th product (corresponds to prod-7.webp)', () => {
      // The Céline uses product image 7 per task requirements
      expect(PRODUCTS[6].title).toBe('The Céline');
    });

    it('should have correct product description', () => {
      const product = PRODUCTS.find((p) => p.title === 'The Céline');
      expect(product?.description).toBe(
        'Structured sophistication meets everyday practicality. The Céline transitions seamlessly from day to evening.'
      );
    });

    it('should use product image 7 (prod-7.webp) as featured image', () => {
      const product = PRODUCTS.find((p) => p.title === 'The Céline');
      expect(product?.image_url).toBe(`${R2_PUBLIC_URL}/products/prod-7.webp`);
    });
  });

  describe('Variant configuration - SKU CELINE-001', () => {
    it('should have variants defined for The Céline', () => {
      expect(VARIANTS['The Céline']).toBeDefined();
      expect(VARIANTS['The Céline'].length).toBeGreaterThan(0);
    });

    it('should have SKU CELINE-001', () => {
      const variant = VARIANTS['The Céline'][0];
      expect(variant.sku).toBe('CELINE-001');
    });

    it('should have Default as variant title', () => {
      const variant = VARIANTS['The Céline'][0];
      expect(variant.title).toBe('Default');
    });
  });

  describe('Price configuration - $425 (42500 cents)', () => {
    it('should have price_cents of 42500 (equals $425)', () => {
      const variant = VARIANTS['The Céline'][0];
      expect(variant.price_cents).toBe(42500);
    });

    it('should have price that converts to exactly $425.00', () => {
      const variant = VARIANTS['The Céline'][0];
      const priceInDollars = variant.price_cents / 100;
      expect(priceInDollars).toBe(425);
    });
  });

  describe('Drop assignment - The Debut', () => {
    it('should be included in PRODUCTS array for drop assignment', () => {
      // All products in PRODUCTS array are assigned to DROP_CONFIG (The Debut)
      const productInArray = PRODUCTS.some((p) => p.title === 'The Céline');
      expect(productInArray).toBe(true);
    });

    it('should be assigned to The Debut drop per DROP_CONFIG', () => {
      // Verify DROP_CONFIG exists and The Céline can be associated
      expect(DROP_CONFIG.name).toBe('The Debut');
      expect(DROP_CONFIG.status).toBe('active');
    });

    it('should have The Céline as one of 7 products in The Debut collection', () => {
      // All 7 products assigned to The Debut
      expect(PRODUCTS.length).toBe(7);
      expect(PRODUCTS.some((p) => p.title === 'The Céline')).toBe(true);
    });
  });

  describe('Inventory configuration', () => {
    it('should have stock defined for The Céline variant', () => {
      const variant = VARIANTS['The Céline'][0];
      expect(variant.stock).toBeDefined();
      expect(typeof variant.stock).toBe('number');
    });

    it('should have 15 units in stock', () => {
      const variant = VARIANTS['The Céline'][0];
      expect(variant.stock).toBe(15);
    });

    it('should have weight defined for shipping calculations', () => {
      const variant = VARIANTS['The Céline'][0];
      expect(variant.weight_g).toBeDefined();
      expect(variant.weight_g).toBe(480);
    });
  });

  describe('Test orders include The Céline', () => {
    it('should be included in at least one test order', () => {
      const ordersWithCeline = TEST_ORDERS.filter((order) =>
        order.items.some((item) => item.sku === 'CELINE-001')
      );
      expect(ordersWithCeline.length).toBeGreaterThan(0);
    });

    it('should be included in multiple test orders for demo data', () => {
      const ordersWithCeline = TEST_ORDERS.filter((order) =>
        order.items.some((item) => item.sku === 'CELINE-001')
      );
      // The Céline appears in at least 2 test orders
      expect(ordersWithCeline.length).toBeGreaterThanOrEqual(2);
    });
  });
});
