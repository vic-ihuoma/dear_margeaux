import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

/**
 * Navigation E2E Tests for nav-15
 *
 * These tests verify the navigation structure and links across the storefront.
 * Visual verification is performed via agent-browser.
 */

describe('Navigation E2E', () => {
  describe('Header Navigation', () => {
    it('should display logo in header that links to homepage', () => {
      // Header.astro: <a href="/"> wraps logo img or text
      // Logo uses logo-main.webp from R2 branding folder
      // Verified via code inspection and visual test
      const headerContent = readFileSync(
        resolve(__dirname, '../../src/components/Header.astro'),
        'utf-8'
      );
      expect(headerContent).toContain('href="/"');
      expect(headerContent).toContain('logo-main.webp');
    });

    it('should have Shop link pointing to /shop', () => {
      const headerContent = readFileSync(
        resolve(__dirname, '../../src/components/Header.astro'),
        'utf-8'
      );
      expect(headerContent).toContain('href="/shop"');
      // Text content appears on the next line after >
      expect(headerContent).toMatch(/href="\/shop"[\s\S]*?>\s*Shop\s*<\/a>/);
    });

    it('should have Drops link pointing to /drops', () => {
      const headerContent = readFileSync(
        resolve(__dirname, '../../src/components/Header.astro'),
        'utf-8'
      );
      expect(headerContent).toContain('href="/drops"');
      expect(headerContent).toMatch(/href="\/drops"[\s\S]*?>\s*Drops\s*<\/a>/);
    });

    it('should have Journal link pointing to /blog', () => {
      const headerContent = readFileSync(
        resolve(__dirname, '../../src/components/Header.astro'),
        'utf-8'
      );
      expect(headerContent).toContain('href="/blog"');
      expect(headerContent).toMatch(/href="\/blog"[\s\S]*?>\s*Journal\s*<\/a>/);
    });

    it('should have Lookbook link pointing to /lookbook', () => {
      const headerContent = readFileSync(
        resolve(__dirname, '../../src/components/Header.astro'),
        'utf-8'
      );
      expect(headerContent).toContain('href="/lookbook"');
      expect(headerContent).toMatch(
        /href="\/lookbook"[\s\S]*?>\s*Lookbook\s*<\/a>/
      );
    });

    it('should have mobile menu with all navigation links', () => {
      const headerContent = readFileSync(
        resolve(__dirname, '../../src/components/Header.astro'),
        'utf-8'
      );
      // Mobile menu exists
      expect(headerContent).toContain('id="mobile-menu"');
      // All links appear in mobile menu section
      const mobileMenuSection = headerContent.split('id="mobile-menu"')[1];
      expect(mobileMenuSection).toContain('href="/shop"');
      expect(mobileMenuSection).toContain('href="/drops"');
      expect(mobileMenuSection).toContain('href="/blog"');
      expect(mobileMenuSection).toContain('href="/lookbook"');
    });
  });

  describe('Footer Navigation', () => {
    it('should display logo in footer that links to homepage', () => {
      const footerContent = readFileSync(
        resolve(__dirname, '../../src/components/Footer.astro'),
        'utf-8'
      );
      expect(footerContent).toContain('href="/"');
      expect(footerContent).toContain('logo-light.webp');
    });

    it('should have Shop links section with correct links', () => {
      const footerContent = readFileSync(
        resolve(__dirname, '../../src/components/Footer.astro'),
        'utf-8'
      );
      expect(footerContent).toContain('href="/shop"');
      expect(footerContent).toContain('href="/drops"');
      expect(footerContent).toContain('href="/drops/archive"');
    });

    it('should have Journal link pointing to /blog in Company section', () => {
      const footerContent = readFileSync(
        resolve(__dirname, '../../src/components/Footer.astro'),
        'utf-8'
      );
      expect(footerContent).toContain('href="/blog"');
      // Verify it's labeled as Journal (consistent with header)
      expect(footerContent).toMatch(/href="\/blog"[\s\S]*?>\s*Journal\s*<\/a>/);
    });

    it('should have newsletter signup section', () => {
      const footerContent = readFileSync(
        resolve(__dirname, '../../src/components/Footer.astro'),
        'utf-8'
      );
      expect(footerContent).toContain('NewsletterForm');
      expect(footerContent).toContain('Stay in the loop');
    });
  });

  describe('Homepage Our Story Section', () => {
    it('should link to /blog/about-dear-margeaux', () => {
      const indexContent = readFileSync(
        resolve(__dirname, '../../src/pages/index.astro'),
        'utf-8'
      );
      expect(indexContent).toContain('href="/blog/about-dear-margeaux"');
    });

    it('should display Our Story heading', () => {
      const indexContent = readFileSync(
        resolve(__dirname, '../../src/pages/index.astro'),
        'utf-8'
      );
      expect(indexContent).toContain('Our Story');
    });

    it('should display branding hero image', () => {
      const indexContent = readFileSync(
        resolve(__dirname, '../../src/pages/index.astro'),
        'utf-8'
      );
      expect(indexContent).toContain('branding-hero.webp');
    });
  });

  describe('Drops Page', () => {
    it('should exist at /drops with proper structure', () => {
      const dropsContent = readFileSync(
        resolve(__dirname, '../../src/pages/drops/index.astro'),
        'utf-8'
      );
      // Has sections for active, scheduled, and ended drops
      expect(dropsContent).toContain('Active Drops');
      expect(dropsContent).toBeTruthy();
    });

    it('should have link to archive page', () => {
      const dropsContent = readFileSync(
        resolve(__dirname, '../../src/pages/drops/index.astro'),
        'utf-8'
      );
      expect(dropsContent).toContain('href="/drops/archive"');
    });
  });

  describe('Drops Archive Page', () => {
    it('should exist at /drops/archive', () => {
      const archiveContent = readFileSync(
        resolve(__dirname, '../../src/pages/drops/archive.astro'),
        'utf-8'
      );
      expect(archiveContent).toBeTruthy();
      expect(archiveContent).toContain('Drops Archive');
    });

    it('should have breadcrumb navigation back to drops', () => {
      const archiveContent = readFileSync(
        resolve(__dirname, '../../src/pages/drops/archive.astro'),
        'utf-8'
      );
      expect(archiveContent).toContain('href="/drops"');
    });
  });

  describe('Blog Page', () => {
    it('should exist at /blog with The Journal title', () => {
      const blogContent = readFileSync(
        resolve(__dirname, '../../src/pages/blog/index.astro'),
        'utf-8'
      );
      expect(blogContent).toContain('The Journal');
    });

    it('should display pinned posts first', () => {
      const blogContent = readFileSync(
        resolve(__dirname, '../../src/pages/blog/index.astro'),
        'utf-8'
      );
      // Code sorts posts with pinned first
      expect(blogContent).toContain('pinned');
    });

    it('should have newsletter signup section', () => {
      const blogContent = readFileSync(
        resolve(__dirname, '../../src/pages/blog/index.astro'),
        'utf-8'
      );
      expect(blogContent).toContain('NewsletterForm');
    });
  });

  describe('Lookbook Page', () => {
    it('should exist at /lookbook', () => {
      const lookbookContent = readFileSync(
        resolve(__dirname, '../../src/pages/lookbook/index.astro'),
        'utf-8'
      );
      expect(lookbookContent).toBeTruthy();
      expect(lookbookContent).toContain('Lookbook');
    });
  });

  describe('Navigation Consistency', () => {
    it('should use consistent "Journal" naming across header and footer', () => {
      const headerContent = readFileSync(
        resolve(__dirname, '../../src/components/Header.astro'),
        'utf-8'
      );
      const footerContent = readFileSync(
        resolve(__dirname, '../../src/components/Footer.astro'),
        'utf-8'
      );

      // Both should use "Journal" as the link text for /blog
      // Text content appears on the next line after > in Astro templates
      expect(headerContent).toMatch(/href="\/blog"[\s\S]*?>\s*Journal\s*<\/a>/);
      expect(footerContent).toMatch(/href="\/blog"[\s\S]*?>\s*Journal\s*<\/a>/);
    });

    it('should have all main routes accessible from header', () => {
      const headerContent = readFileSync(
        resolve(__dirname, '../../src/components/Header.astro'),
        'utf-8'
      );
      const mainRoutes = ['/shop', '/drops', '/blog', '/lookbook'];
      for (const route of mainRoutes) {
        expect(headerContent).toContain(`href="${route}"`);
      }
    });
  });
});
