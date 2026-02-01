/**
 * Tests for initial-content-9: Set initial inventory for all products
 *
 * Verifies that all 7 products have the correct inventory levels
 * configured in seed-config.ts for the limited drop feel.
 *
 * Inventory levels from task specification:
 * - The Colette: 20 units
 * - The Amélie: 15 units
 * - The Giselle: 12 units
 * - The Margot: 18 units (namesake, slightly more)
 * - The Vivienne: 10 units (premium, more exclusive)
 * - The Eloise: 25 units (entry price point)
 * - The Céline: 15 units
 */

import { describe, it, expect } from 'vitest';
import { VARIANTS, PRODUCTS } from '../../scripts/seed-config';

describe('initial-content-9: Set initial inventory for all products', () => {
  describe('The Colette inventory', () => {
    it('should have inventory of 20 units', () => {
      const coletteVariant = VARIANTS['The Colette']?.[0];
      expect(coletteVariant).toBeDefined();
      expect(coletteVariant?.stock).toBe(20);
    });

    it('should have SKU COLETTE-001', () => {
      const coletteVariant = VARIANTS['The Colette']?.[0];
      expect(coletteVariant?.sku).toBe('COLETTE-001');
    });
  });

  describe('The Amélie inventory', () => {
    it('should have inventory of 15 units', () => {
      const amelieVariant = VARIANTS['The Amélie']?.[0];
      expect(amelieVariant).toBeDefined();
      expect(amelieVariant?.stock).toBe(15);
    });

    it('should have SKU AMELIE-001', () => {
      const amelieVariant = VARIANTS['The Amélie']?.[0];
      expect(amelieVariant?.sku).toBe('AMELIE-001');
    });
  });

  describe('The Giselle inventory', () => {
    it('should have inventory of 12 units', () => {
      const giselleVariant = VARIANTS['The Giselle']?.[0];
      expect(giselleVariant).toBeDefined();
      expect(giselleVariant?.stock).toBe(12);
    });

    it('should have SKU GISELLE-001', () => {
      const giselleVariant = VARIANTS['The Giselle']?.[0];
      expect(giselleVariant?.sku).toBe('GISELLE-001');
    });
  });

  describe('The Margot inventory', () => {
    it('should have inventory of 18 units', () => {
      const margotVariant = VARIANTS['The Margot']?.[0];
      expect(margotVariant).toBeDefined();
      expect(margotVariant?.stock).toBe(18);
    });

    it('should have SKU MARGOT-001', () => {
      const margotVariant = VARIANTS['The Margot']?.[0];
      expect(margotVariant?.sku).toBe('MARGOT-001');
    });

    it('should have slightly higher stock (18) than average as namesake product', () => {
      // The Margot is the namesake product, so it should have more stock than average
      const margotStock = VARIANTS['The Margot']?.[0]?.stock || 0;
      const giselleStock = VARIANTS['The Giselle']?.[0]?.stock || 0; // 12
      const vivienneStock = VARIANTS['The Vivienne']?.[0]?.stock || 0; // 10

      expect(margotStock).toBeGreaterThan(giselleStock);
      expect(margotStock).toBeGreaterThan(vivienneStock);
    });
  });

  describe('The Vivienne inventory', () => {
    it('should have inventory of 10 units', () => {
      const vivienneVariant = VARIANTS['The Vivienne']?.[0];
      expect(vivienneVariant).toBeDefined();
      expect(vivienneVariant?.stock).toBe(10);
    });

    it('should have SKU VIVIENNE-001', () => {
      const vivienneVariant = VARIANTS['The Vivienne']?.[0];
      expect(vivienneVariant?.sku).toBe('VIVIENNE-001');
    });

    it('should have the lowest stock (10) as premium/exclusive product', () => {
      // The Vivienne is the premium product, so it should have the lowest stock
      const vivienneStock = VARIANTS['The Vivienne']?.[0]?.stock || 0;
      const allStocks = Object.values(VARIANTS).map((v) => v[0]?.stock || 0);
      const minStock = Math.min(...allStocks);

      expect(vivienneStock).toBe(minStock);
      expect(vivienneStock).toBe(10);
    });
  });

  describe('The Eloise inventory', () => {
    it('should have inventory of 25 units', () => {
      const eloiseVariant = VARIANTS['The Eloise']?.[0];
      expect(eloiseVariant).toBeDefined();
      expect(eloiseVariant?.stock).toBe(25);
    });

    it('should have SKU ELOISE-001', () => {
      const eloiseVariant = VARIANTS['The Eloise']?.[0];
      expect(eloiseVariant?.sku).toBe('ELOISE-001');
    });

    it('should have the highest stock (25) as entry price point product', () => {
      // The Eloise is the entry price point product, so it should have the highest stock
      const eloiseStock = VARIANTS['The Eloise']?.[0]?.stock || 0;
      const allStocks = Object.values(VARIANTS).map((v) => v[0]?.stock || 0);
      const maxStock = Math.max(...allStocks);

      expect(eloiseStock).toBe(maxStock);
      expect(eloiseStock).toBe(25);
    });
  });

  describe('The Céline inventory', () => {
    it('should have inventory of 15 units', () => {
      const celineVariant = VARIANTS['The Céline']?.[0];
      expect(celineVariant).toBeDefined();
      expect(celineVariant?.stock).toBe(15);
    });

    it('should have SKU CELINE-001', () => {
      const celineVariant = VARIANTS['The Céline']?.[0];
      expect(celineVariant?.sku).toBe('CELINE-001');
    });
  });

  describe('All products inventory range', () => {
    it('should have all 7 products configured', () => {
      expect(PRODUCTS.length).toBe(7);
      expect(Object.keys(VARIANTS).length).toBe(7);
    });

    it('should have stock levels in range 10-25 units for limited drop feel', () => {
      const allStocks = Object.values(VARIANTS).map((v) => v[0]?.stock || 0);

      for (const stock of allStocks) {
        expect(stock).toBeGreaterThanOrEqual(10);
        expect(stock).toBeLessThanOrEqual(25);
      }
    });

    it('should have total inventory of 115 units across all products', () => {
      // 20 + 15 + 12 + 18 + 10 + 25 + 15 = 115
      const allStocks = Object.values(VARIANTS).map((v) => v[0]?.stock || 0);
      const totalStock = allStocks.reduce((sum, stock) => sum + stock, 0);

      expect(totalStock).toBe(115);
    });

    it('should have each variant with a valid stock property defined', () => {
      for (const variants of Object.values(VARIANTS)) {
        expect(variants.length).toBeGreaterThan(0);
        const variant = variants[0];
        expect(variant.stock).toBeDefined();
        expect(typeof variant.stock).toBe('number');
        expect(variant.stock).toBeGreaterThan(0);
      }
    });
  });

  describe('Inventory and price correlation', () => {
    it('should have lower stock for premium (higher-priced) products', () => {
      // The Vivienne at $595 has 10 units (lowest stock)
      // The Eloise at $345 has 25 units (highest stock)
      const vivienneVariant = VARIANTS['The Vivienne']?.[0];
      const eloiseVariant = VARIANTS['The Eloise']?.[0];

      expect(vivienneVariant?.price_cents).toBeGreaterThan(eloiseVariant?.price_cents || 0);
      expect(vivienneVariant?.stock).toBeLessThan(eloiseVariant?.stock || 0);
    });

    it('should have higher stock for entry-price products', () => {
      // The Eloise at $345 (entry price) has the most stock (25)
      const eloiseVariant = VARIANTS['The Eloise']?.[0];

      // Check it has the lowest price
      const allPrices = Object.values(VARIANTS).map((v) => v[0]?.price_cents || 0);
      const minPrice = Math.min(...allPrices);

      expect(eloiseVariant?.price_cents).toBe(minPrice);
      expect(eloiseVariant?.stock).toBe(25);
    });
  });
});
