/**
 * Tests for initial-content-13: Verify shop page displays all products
 *
 * Tests verify:
 * - All 7 products from 'The Debut' are displayed
 * - Product cards show images, names, and prices
 * - Drop filter shows 'The Debut' option
 * - Product detail page link structure
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  PRODUCTS,
  VARIANTS,
  DROP_CONFIG,
  R2_PUBLIC_URL,
} from '../../../../merchant/scripts/seed-config';

const STOREFRONT_DIR = path.resolve(__dirname, '../../src');
const SHOP_PAGE = path.join(STOREFRONT_DIR, 'pages/shop/index.astro');
const PRODUCT_CARD = path.join(STOREFRONT_DIR, 'components/ProductCard.astro');
const PRODUCT_DETAIL = path.join(STOREFRONT_DIR, 'pages/product/[id].astro');

describe('initial-content-13: Shop page displays all products', () => {
  describe('sample products match The Debut collection', () => {
    it('shop page file exists', () => {
      expect(fs.existsSync(SHOP_PAGE)).toBe(true);
    });

    it('should have sample products for fallback', () => {
      const content = fs.readFileSync(SHOP_PAGE, 'utf-8');
      expect(content).toContain('sampleProducts');
    });

    it('sample products include The Colette', () => {
      const content = fs.readFileSync(SHOP_PAGE, 'utf-8');
      expect(content).toContain('The Colette');
    });

    it('sample products include The Amélie', () => {
      const content = fs.readFileSync(SHOP_PAGE, 'utf-8');
      expect(content).toContain('The Amélie');
    });

    it('sample products include The Giselle', () => {
      const content = fs.readFileSync(SHOP_PAGE, 'utf-8');
      expect(content).toContain('The Giselle');
    });

    it('sample products include The Margot', () => {
      const content = fs.readFileSync(SHOP_PAGE, 'utf-8');
      expect(content).toContain('The Margot');
    });

    it('sample products include The Vivienne', () => {
      const content = fs.readFileSync(SHOP_PAGE, 'utf-8');
      expect(content).toContain('The Vivienne');
    });

    it('sample products include The Eloise', () => {
      const content = fs.readFileSync(SHOP_PAGE, 'utf-8');
      expect(content).toContain('The Eloise');
    });

    it('sample products include The Céline', () => {
      const content = fs.readFileSync(SHOP_PAGE, 'utf-8');
      expect(content).toContain('The Céline');
    });

    it('should have exactly 7 products in sampleProducts array', () => {
      const content = fs.readFileSync(SHOP_PAGE, 'utf-8');
      // Match the sampleProducts array definition
      const sampleProductsMatch = content.match(
        /const sampleProducts = \[([\s\S]*?)\];/
      );
      expect(sampleProductsMatch).toBeTruthy();

      // Count opening braces for product objects
      const arrayContent = sampleProductsMatch![1];
      const productCount = (arrayContent.match(/\{\s*id:/g) || []).length;
      expect(productCount).toBe(7);
    });
  });

  describe('product prices match seed configuration', () => {
    it('The Colette price is 39500 cents ($395)', () => {
      expect(VARIANTS['The Colette'][0].price_cents).toBe(39500);
      const content = fs.readFileSync(SHOP_PAGE, 'utf-8');
      expect(content).toContain('39500');
    });

    it('The Amélie price is 45000 cents ($450)', () => {
      expect(VARIANTS['The Amélie'][0].price_cents).toBe(45000);
      const content = fs.readFileSync(SHOP_PAGE, 'utf-8');
      expect(content).toContain('45000');
    });

    it('The Giselle price is 52500 cents ($525)', () => {
      expect(VARIANTS['The Giselle'][0].price_cents).toBe(52500);
      const content = fs.readFileSync(SHOP_PAGE, 'utf-8');
      expect(content).toContain('52500');
    });

    it('The Margot price is 47500 cents ($475)', () => {
      expect(VARIANTS['The Margot'][0].price_cents).toBe(47500);
      const content = fs.readFileSync(SHOP_PAGE, 'utf-8');
      expect(content).toContain('47500');
    });

    it('The Vivienne price is 59500 cents ($595)', () => {
      expect(VARIANTS['The Vivienne'][0].price_cents).toBe(59500);
      const content = fs.readFileSync(SHOP_PAGE, 'utf-8');
      expect(content).toContain('59500');
    });

    it('The Eloise price is 34500 cents ($345)', () => {
      expect(VARIANTS['The Eloise'][0].price_cents).toBe(34500);
      const content = fs.readFileSync(SHOP_PAGE, 'utf-8');
      expect(content).toContain('34500');
    });

    it('The Céline price is 42500 cents ($425)', () => {
      expect(VARIANTS['The Céline'][0].price_cents).toBe(42500);
      const content = fs.readFileSync(SHOP_PAGE, 'utf-8');
      expect(content).toContain('42500');
    });
  });

  describe('product images use R2 URLs', () => {
    it('sampleProducts have image property', () => {
      const content = fs.readFileSync(SHOP_PAGE, 'utf-8');
      expect(content).toMatch(/image:\s*[`'"]/);
    });

    it('images use R2 public URL', () => {
      const content = fs.readFileSync(SHOP_PAGE, 'utf-8');
      expect(content).toContain(R2_PUBLIC_URL);
    });

    it('prod-1.webp image is used', () => {
      const content = fs.readFileSync(SHOP_PAGE, 'utf-8');
      expect(content).toContain('prod-1.webp');
    });

    it('prod-2.webp image is used', () => {
      const content = fs.readFileSync(SHOP_PAGE, 'utf-8');
      expect(content).toContain('prod-2.webp');
    });

    it('prod-3.webp image is used', () => {
      const content = fs.readFileSync(SHOP_PAGE, 'utf-8');
      expect(content).toContain('prod-3.webp');
    });

    it('prod-4.webp image is used', () => {
      const content = fs.readFileSync(SHOP_PAGE, 'utf-8');
      expect(content).toContain('prod-4.webp');
    });

    it('prod-5.webp image is used', () => {
      const content = fs.readFileSync(SHOP_PAGE, 'utf-8');
      expect(content).toContain('prod-5.webp');
    });

    it('prod-6.webp image is used', () => {
      const content = fs.readFileSync(SHOP_PAGE, 'utf-8');
      expect(content).toContain('prod-6.webp');
    });

    it('prod-7.webp image is used', () => {
      const content = fs.readFileSync(SHOP_PAGE, 'utf-8');
      expect(content).toContain('prod-7.webp');
    });
  });

  describe('drop filter shows The Debut', () => {
    it('sample drops include The Debut collection name', () => {
      const content = fs.readFileSync(SHOP_PAGE, 'utf-8');
      expect(content).toContain("name: 'The Debut'");
    });

    it('sample drops include the-debut slug', () => {
      const content = fs.readFileSync(SHOP_PAGE, 'utf-8');
      expect(content).toContain("slug: 'the-debut'");
    });

    it('collection filter section exists', () => {
      const content = fs.readFileSync(SHOP_PAGE, 'utf-8');
      expect(content).toContain('Collection:');
    });

    it('drop filter has links to collection pages', () => {
      const content = fs.readFileSync(SHOP_PAGE, 'utf-8');
      expect(content).toMatch(/href=\{`\/shop\/\$\{drop\.slug\}`\}/);
    });
  });

  describe('ProductCard component structure', () => {
    it('ProductCard file exists', () => {
      expect(fs.existsSync(PRODUCT_CARD)).toBe(true);
    });

    it('ProductCard accepts title prop', () => {
      const content = fs.readFileSync(PRODUCT_CARD, 'utf-8');
      expect(content).toContain('title');
    });

    it('ProductCard accepts price prop', () => {
      const content = fs.readFileSync(PRODUCT_CARD, 'utf-8');
      expect(content).toContain('price');
    });

    it('ProductCard accepts image prop', () => {
      const content = fs.readFileSync(PRODUCT_CARD, 'utf-8');
      expect(content).toContain('image');
    });

    it('ProductCard links to product detail page', () => {
      const content = fs.readFileSync(PRODUCT_CARD, 'utf-8');
      // Check for the productUrl which contains /product/ path
      expect(content).toContain('`/product/${id}`');
    });
  });

  describe('product detail page structure', () => {
    it('product detail page file exists', () => {
      expect(fs.existsSync(PRODUCT_DETAIL)).toBe(true);
    });

    it('product detail page displays product title', () => {
      const content = fs.readFileSync(PRODUCT_DETAIL, 'utf-8');
      expect(content).toContain('product.title');
    });

    it('product detail page displays product description', () => {
      const content = fs.readFileSync(PRODUCT_DETAIL, 'utf-8');
      expect(content).toContain('product.description');
    });

    it('product detail page displays product image', () => {
      const content = fs.readFileSync(PRODUCT_DETAIL, 'utf-8');
      // Check for image-related code
      expect(content).toMatch(/featured_image_url|image_url|image/);
    });

    it('product detail page fetches product from API', () => {
      const content = fs.readFileSync(PRODUCT_DETAIL, 'utf-8');
      expect(content).toContain('getProduct');
    });
  });

  describe('shop page displays products grid', () => {
    it('uses ProductGrid component', () => {
      const content = fs.readFileSync(SHOP_PAGE, 'utf-8');
      expect(content).toContain('<ProductGrid');
    });

    it('uses ProductCard component', () => {
      const content = fs.readFileSync(SHOP_PAGE, 'utf-8');
      expect(content).toContain('<ProductCard');
    });

    it('displays product count', () => {
      const content = fs.readFileSync(SHOP_PAGE, 'utf-8');
      expect(content).toContain('Showing {products.length}');
    });

    it('maps products to ProductCard components', () => {
      const content = fs.readFileSync(SHOP_PAGE, 'utf-8');
      expect(content).toContain('products.map((product)');
    });

    it('passes title to ProductCard', () => {
      const content = fs.readFileSync(SHOP_PAGE, 'utf-8');
      expect(content).toContain('title={product.title}');
    });

    it('passes price to ProductCard', () => {
      const content = fs.readFileSync(SHOP_PAGE, 'utf-8');
      expect(content).toContain('price={product.price}');
    });

    it('passes image to ProductCard', () => {
      const content = fs.readFileSync(SHOP_PAGE, 'utf-8');
      expect(content).toContain('image={product.image}');
    });
  });

  describe('seed configuration has 7 products', () => {
    it('PRODUCTS array has exactly 7 products', () => {
      expect(PRODUCTS.length).toBe(7);
    });

    it('all 7 product names are defined in PRODUCTS', () => {
      const productNames = PRODUCTS.map((p) => p.title);
      expect(productNames).toContain('The Colette');
      expect(productNames).toContain('The Amélie');
      expect(productNames).toContain('The Giselle');
      expect(productNames).toContain('The Margot');
      expect(productNames).toContain('The Vivienne');
      expect(productNames).toContain('The Eloise');
      expect(productNames).toContain('The Céline');
    });

    it('all products have R2 image URLs', () => {
      for (const product of PRODUCTS) {
        expect(product.image_url).toContain(R2_PUBLIC_URL);
        expect(product.image_url).toMatch(/prod-\d+\.webp$/);
      }
    });

    it('DROP_CONFIG is The Debut', () => {
      expect(DROP_CONFIG.name).toBe('The Debut');
      expect(DROP_CONFIG.slug).toBe('the-debut');
      expect(DROP_CONFIG.status).toBe('active');
    });
  });
});
