/**
 * Tests for initial-content-12: Verify homepage displays products correctly
 *
 * Verifies that the storefront homepage displays featured products
 * from The Debut collection with correct names, prices, and images.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

const storefrontRoot = path.resolve(__dirname, '../..');
const indexPath = path.join(storefrontRoot, 'src/pages/index.astro');
const productCardPath = path.join(
  storefrontRoot,
  'src/components/ProductCard.astro'
);

describe('initial-content-12: Homepage product display', () => {
  describe('Homepage structure', () => {
    it('should have index.astro page', () => {
      expect(fs.existsSync(indexPath)).toBe(true);
    });

    it('should import ProductCard component', () => {
      const content = fs.readFileSync(indexPath, 'utf-8');
      expect(content).toContain('import ProductCard from');
    });

    it('should import ProductGrid component', () => {
      const content = fs.readFileSync(indexPath, 'utf-8');
      expect(content).toContain('import ProductGrid from');
    });
  });

  describe('Featured Products section', () => {
    it('should have Featured Products heading', () => {
      const content = fs.readFileSync(indexPath, 'utf-8');
      expect(content).toContain('Featured Products');
    });

    it('should use ProductGrid for layout', () => {
      const content = fs.readFileSync(indexPath, 'utf-8');
      expect(content).toMatch(/<ProductGrid/);
    });

    it('should render ProductCard for each product', () => {
      const content = fs.readFileSync(indexPath, 'utf-8');
      expect(content).toMatch(/<ProductCard/);
    });

    it('should pass product data to ProductCard', () => {
      const content = fs.readFileSync(indexPath, 'utf-8');
      // Verify product props are passed
      expect(content).toContain('id={product.id}');
      expect(content).toContain('title={product.title}');
      expect(content).toContain('price={product.price}');
      expect(content).toContain('image={product.image}');
    });

    it('should show collection info for products from active drop', () => {
      const content = fs.readFileSync(indexPath, 'utf-8');
      // Should show collection context
      expect(content).toContain('collection={product.collection}');
    });
  });

  describe('Sample products - The Debut collection', () => {
    it('should have sample products for fallback', () => {
      const content = fs.readFileSync(indexPath, 'utf-8');
      expect(content).toContain('sampleProducts');
    });

    it('should include The Colette product', () => {
      const content = fs.readFileSync(indexPath, 'utf-8');
      expect(content).toContain("title: 'The Colette'");
    });

    it('should include The Amélie product', () => {
      const content = fs.readFileSync(indexPath, 'utf-8');
      expect(content).toContain("title: 'The Amélie'");
    });

    it('should include The Giselle product', () => {
      const content = fs.readFileSync(indexPath, 'utf-8');
      expect(content).toContain("title: 'The Giselle'");
    });

    it('should include The Margot product', () => {
      const content = fs.readFileSync(indexPath, 'utf-8');
      expect(content).toContain("title: 'The Margot'");
    });

    it('should have correct price for The Colette ($395 = 39500 cents)', () => {
      const content = fs.readFileSync(indexPath, 'utf-8');
      expect(content).toMatch(/title:\s*'The Colette'[\s\S]*?price:\s*39500/);
    });

    it('should have correct price for The Amélie ($450 = 45000 cents)', () => {
      const content = fs.readFileSync(indexPath, 'utf-8');
      expect(content).toMatch(/title:\s*'The Amélie'[\s\S]*?price:\s*45000/);
    });

    it('should have correct price for The Giselle ($525 = 52500 cents)', () => {
      const content = fs.readFileSync(indexPath, 'utf-8');
      expect(content).toMatch(/title:\s*'The Giselle'[\s\S]*?price:\s*52500/);
    });

    it('should have correct price for The Margot ($475 = 47500 cents)', () => {
      const content = fs.readFileSync(indexPath, 'utf-8');
      expect(content).toMatch(/title:\s*'The Margot'[\s\S]*?price:\s*47500/);
    });

    it('should reference The Debut collection', () => {
      const content = fs.readFileSync(indexPath, 'utf-8');
      expect(content).toContain("collection: 'The Debut'");
    });
  });

  describe('Product images from R2', () => {
    it('should reference R2 product images URL', () => {
      const content = fs.readFileSync(indexPath, 'utf-8');
      expect(content).toContain('PUBLIC_IMAGES_URL');
    });

    it('should construct product image URLs from R2', () => {
      const content = fs.readFileSync(indexPath, 'utf-8');
      // Sample products should use R2 image URLs
      expect(content).toContain('/products/prod-1.webp');
      expect(content).toContain('/products/prod-2.webp');
      expect(content).toContain('/products/prod-3.webp');
      expect(content).toContain('/products/prod-4.webp');
    });
  });

  describe('Shop Now navigation', () => {
    it('should have View All link for products', () => {
      const content = fs.readFileSync(indexPath, 'utf-8');
      expect(content).toContain('View All');
    });

    it('should link to /shop when no active drop', () => {
      const content = fs.readFileSync(indexPath, 'utf-8');
      // Uses href="/shop" or dynamic link based on currentDrop
      expect(content).toContain('href="/shop"');
    });

    it('should have View All Collections button in hero', () => {
      const content = fs.readFileSync(indexPath, 'utf-8');
      expect(content).toContain('View All Collections');
    });

    it('should have Shop button in hero section', () => {
      const content = fs.readFileSync(indexPath, 'utf-8');
      // Shop {currentDrop.name} button
      expect(content).toMatch(/Shop\s*\{currentDrop\.name\}/);
    });
  });

  describe('ProductCard component', () => {
    it('should exist', () => {
      expect(fs.existsSync(productCardPath)).toBe(true);
    });

    it('should accept title prop', () => {
      const content = fs.readFileSync(productCardPath, 'utf-8');
      expect(content).toContain('title: string');
    });

    it('should accept price prop', () => {
      const content = fs.readFileSync(productCardPath, 'utf-8');
      expect(content).toContain('price: number');
    });

    it('should accept image prop', () => {
      const content = fs.readFileSync(productCardPath, 'utf-8');
      expect(content).toContain('image?: string');
    });

    it('should display product title in h3', () => {
      const content = fs.readFileSync(productCardPath, 'utf-8');
      // h3 element contains {title}
      expect(content).toContain('<h3');
      expect(content).toContain('{title}');
    });

    it('should format price with currency', () => {
      const content = fs.readFileSync(productCardPath, 'utf-8');
      expect(content).toContain('Intl.NumberFormat');
      expect(content).toContain('formattedPrice');
    });

    it('should render image when provided', () => {
      const content = fs.readFileSync(productCardPath, 'utf-8');
      expect(content).toMatch(/<img[\s\S]*?src=\{image\}/);
    });

    it('should have placeholder when no image', () => {
      const content = fs.readFileSync(productCardPath, 'utf-8');
      // SVG placeholder for missing images
      expect(content).toContain('<svg');
    });

    it('should link to product detail page', () => {
      const content = fs.readFileSync(productCardPath, 'utf-8');
      expect(content).toContain('/product/${id}');
    });
  });

  describe('API integration for products', () => {
    it('should fetch active drop from API', () => {
      const content = fs.readFileSync(indexPath, 'utf-8');
      expect(content).toContain("getDrops({ status: 'active'");
    });

    it('should fetch products from active drop', () => {
      const content = fs.readFileSync(indexPath, 'utf-8');
      expect(content).toContain('getDropProducts');
    });

    it('should fallback to sample products when API unavailable', () => {
      const content = fs.readFileSync(indexPath, 'utf-8');
      // Default products assignment
      expect(content).toContain(
        'let products: DisplayProduct[] = sampleProducts'
      );
    });

    it('should handle API errors gracefully', () => {
      const content = fs.readFileSync(indexPath, 'utf-8');
      expect(content).toContain('catch (error)');
      expect(content).toContain('Failed to fetch products from API');
    });
  });

  describe('Product display formatting', () => {
    it('should show collection name for products', () => {
      const content = fs.readFileSync(productCardPath, 'utf-8');
      expect(content).toContain('collection');
    });

    it('should have soldOut state handling', () => {
      const content = fs.readFileSync(productCardPath, 'utf-8');
      expect(content).toContain('soldOut');
      expect(content).toContain('Sold Out');
    });

    it('should have lazy loading for images', () => {
      const content = fs.readFileSync(productCardPath, 'utf-8');
      // Uses loading="lazy" attribute on images
      expect(content).toContain('loading="lazy"');
    });

    it('should have responsive image sizing', () => {
      const content = fs.readFileSync(productCardPath, 'utf-8');
      expect(content).toContain('sizes=');
    });
  });

  describe('Drop banner', () => {
    it('should show current drop banner when active', () => {
      const content = fs.readFileSync(indexPath, 'utf-8');
      expect(content).toContain('currentDrop.isActive');
    });

    it('should show Shop link in banner', () => {
      const content = fs.readFileSync(indexPath, 'utf-8');
      // Shop {currentDrop.name} link in banner
      expect(content).toMatch(/Shop\s*\{currentDrop\.name\}\s*→/);
    });

    it('should default to Debut Collection when no active API drop', () => {
      const content = fs.readFileSync(indexPath, 'utf-8');
      expect(content).toContain("name: 'Debut Collection'");
    });
  });
});
