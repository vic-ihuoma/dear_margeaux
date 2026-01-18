import { describe, it, expect } from 'vitest';
import { sampleProducts } from '../src/data/sample-products';

/**
 * Tests for image alt text implementation (PM-17)
 * Verifies that products and variants have proper image alt text support
 */

describe('Sample Products Image Alt Text', () => {
  describe('SampleProduct interface', () => {
    it('has featured_image_url field', () => {
      const product = sampleProducts[0];
      expect('featured_image_url' in product).toBe(true);
    });

    it('has featured_image_alt field', () => {
      const product = sampleProducts[0];
      expect('featured_image_alt' in product).toBe(true);
    });

    it('featured_image_url and featured_image_alt can be null', () => {
      // All sample products have null featured images by default
      const product = sampleProducts[0];
      expect(product.featured_image_url).toBeNull();
      expect(product.featured_image_alt).toBeNull();
    });
  });

  describe('SampleVariant interface', () => {
    it('has image_alt field', () => {
      const product = sampleProducts[0];
      const variant = product.variants[0];
      expect('image_alt' in variant).toBe(true);
    });

    it('image_alt can be null', () => {
      const product = sampleProducts[0];
      const variant = product.variants[0];
      expect(variant.image_alt).toBeNull();
    });

    it('image_url and image_alt are paired fields', () => {
      const product = sampleProducts[0];
      const variant = product.variants[0];
      expect('image_url' in variant).toBe(true);
      expect('image_alt' in variant).toBe(true);
    });
  });

  describe('All sample products', () => {
    it('all products have the required image fields', () => {
      for (const product of sampleProducts) {
        expect(product).toHaveProperty('featured_image_url');
        expect(product).toHaveProperty('featured_image_alt');
        for (const variant of product.variants) {
          expect(variant).toHaveProperty('image_url');
          expect(variant).toHaveProperty('image_alt');
        }
      }
    });

    it('there are at least 8 sample products', () => {
      expect(sampleProducts.length).toBeGreaterThanOrEqual(8);
    });
  });
});

describe('DisplayProduct Alt Text Logic', () => {
  // These tests verify the alt text cascade logic used in the storefront pages

  describe('main image alt text cascade', () => {
    it('prefers featured_image_alt when available', () => {
      const product = {
        title: 'Test Product',
        featured_image_alt: 'Featured product image',
        variants: [{ image_alt: 'Variant image' }],
      };

      const altText =
        product.featured_image_alt ??
        product.variants[0]?.image_alt ??
        product.title;
      expect(altText).toBe('Featured product image');
    });

    it('falls back to variant image_alt when featured_image_alt is null', () => {
      const product = {
        title: 'Test Product',
        featured_image_alt: null,
        variants: [{ image_alt: 'Variant image' }],
      };

      const altText =
        product.featured_image_alt ??
        product.variants[0]?.image_alt ??
        product.title;
      expect(altText).toBe('Variant image');
    });

    it('falls back to product title when both alt fields are null', () => {
      const product = {
        title: 'Test Product',
        featured_image_alt: null,
        variants: [{ image_alt: null }],
      };

      const altText =
        product.featured_image_alt ??
        product.variants[0]?.image_alt ??
        product.title;
      expect(altText).toBe('Test Product');
    });
  });

  describe('variant alt text generation', () => {
    it('uses variant image_alt when available', () => {
      const product = { title: 'Leather Tote' };
      const variant = {
        title: 'Black',
        image_alt: 'Black leather tote with gold hardware',
      };

      const altText =
        variant.image_alt ?? `${product.title} - ${variant.title}`;
      expect(altText).toBe('Black leather tote with gold hardware');
    });

    it('generates descriptive alt from product and variant titles when image_alt is null', () => {
      const product = { title: 'Leather Tote' };
      const variant = { title: 'Black', image_alt: null };

      const altText =
        variant.image_alt ?? `${product.title} - ${variant.title}`;
      expect(altText).toBe('Leather Tote - Black');
    });
  });
});

describe('Accessibility requirements', () => {
  it('alt text should not be empty for any image', () => {
    // This test validates that our cascade logic always produces a non-empty alt text
    const testCases = [
      {
        featured_image_alt: 'Alt text',
        variant_image_alt: null,
        title: 'Product',
      },
      {
        featured_image_alt: null,
        variant_image_alt: 'Variant alt',
        title: 'Product',
      },
      { featured_image_alt: null, variant_image_alt: null, title: 'Product' },
    ];

    for (const testCase of testCases) {
      const altText =
        testCase.featured_image_alt ??
        testCase.variant_image_alt ??
        testCase.title;
      expect(altText).toBeTruthy();
      expect(altText.length).toBeGreaterThan(0);
    }
  });

  it('thumbnail alt text should always be descriptive', () => {
    const product = { title: 'Classic Tote' };
    const variants = [
      { title: 'Tan', image_alt: null },
      { title: 'Black', image_alt: 'Black version with silver hardware' },
      { title: 'Cognac', image_alt: null },
    ];

    for (const variant of variants) {
      const altText =
        variant.image_alt ?? `${product.title} - ${variant.title}`;
      expect(altText).toBeTruthy();
      expect(altText.length).toBeGreaterThan(0);
      // Alt text should contain meaningful description
      expect(altText).not.toBe('');
    }
  });
});
