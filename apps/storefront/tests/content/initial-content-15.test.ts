/**
 * Tests for initial-content-15: Final visual QA across site
 *
 * Verifies the complete site structure, navigation, and content integration.
 * Visual tests via agent-browser are documented separately.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const storefrontSrc = path.join(__dirname, '../../src');
const contentDir = path.join(storefrontSrc, 'content');

describe('initial-content-15: Final visual QA across site', () => {
  describe('Header Logo Integration', () => {
    const headerPath = path.join(storefrontSrc, 'components/Header.astro');
    const headerContent = fs.readFileSync(headerPath, 'utf-8');

    it('Header uses logo-main.webp from R2 branding folder', () => {
      expect(headerContent).toContain('logo-main.webp');
      expect(headerContent).toContain('/branding/logo-main.webp');
    });

    it('Header logo has proper alt text', () => {
      expect(headerContent).toContain('alt="Dear Margeaux"');
    });

    it('Header logo uses PUBLIC_IMAGES_URL environment variable', () => {
      expect(headerContent).toContain('PUBLIC_IMAGES_URL');
    });

    it('Header falls back to text if no image URL', () => {
      expect(headerContent).toContain('Dear Margeaux');
    });
  });

  describe('Footer Logo Integration', () => {
    const footerPath = path.join(storefrontSrc, 'components/Footer.astro');
    const footerContent = fs.readFileSync(footerPath, 'utf-8');

    it('Footer uses logo-light.webp from R2 branding folder', () => {
      expect(footerContent).toContain('logo-light.webp');
      expect(footerContent).toContain('/branding/logo-light.webp');
    });

    it('Footer logo has proper alt text', () => {
      expect(footerContent).toContain('alt="Dear Margeaux"');
    });

    it('Footer logo links to homepage', () => {
      expect(footerContent).toMatch(/href=["']\/["']/);
    });
  });

  describe('Favicon Configuration', () => {
    const baseLayoutPath = path.join(storefrontSrc, 'layouts/BaseLayout.astro');
    const baseLayoutContent = fs.readFileSync(baseLayoutPath, 'utf-8');

    it('BaseLayout includes favicon.ico link', () => {
      expect(baseLayoutContent).toContain('favicon.ico');
    });

    it('BaseLayout includes favicon-16x16.png link', () => {
      expect(baseLayoutContent).toContain('favicon-16x16.png');
    });

    it('BaseLayout includes favicon-32x32.png link', () => {
      expect(baseLayoutContent).toContain('favicon-32x32.png');
    });

    it('BaseLayout includes apple-touch-icon.png link', () => {
      expect(baseLayoutContent).toContain('apple-touch-icon.png');
    });

    it('BaseLayout includes site.webmanifest link', () => {
      expect(baseLayoutContent).toContain('site.webmanifest');
    });
  });

  describe('Navigation Links', () => {
    const headerPath = path.join(storefrontSrc, 'components/Header.astro');
    const headerContent = fs.readFileSync(headerPath, 'utf-8');

    it('Header contains Shop link to /shop', () => {
      expect(headerContent).toContain('href="/shop"');
      expect(headerContent).toMatch(/>\s*Shop\s*</s);
    });

    it('Header contains Drops link to /drops', () => {
      expect(headerContent).toContain('href="/drops"');
      expect(headerContent).toMatch(/>\s*Drops\s*</s);
    });

    it('Header contains Journal link to /blog', () => {
      expect(headerContent).toContain('href="/blog"');
      expect(headerContent).toMatch(/>\s*Journal\s*</s);
    });

    it('Header contains Lookbook link to /lookbook', () => {
      expect(headerContent).toContain('href="/lookbook"');
      expect(headerContent).toMatch(/>\s*Lookbook\s*</s);
    });
  });

  describe('Journal Naming Consistency', () => {
    const headerPath = path.join(storefrontSrc, 'components/Header.astro');
    const footerPath = path.join(storefrontSrc, 'components/Footer.astro');
    const headerContent = fs.readFileSync(headerPath, 'utf-8');
    const footerContent = fs.readFileSync(footerPath, 'utf-8');

    it('Header uses "Journal" for blog link text', () => {
      // Match the navigation link with "Journal" text
      expect(headerContent).toMatch(
        /href=["']\/blog["'][\s\S]*?>\s*Journal\s*</s
      );
    });

    it('Footer uses "Journal" for blog link text', () => {
      // Match the navigation link with "Journal" text
      expect(footerContent).toMatch(
        /href=["']\/blog["'][\s\S]*?>\s*Journal\s*</s
      );
    });

    it('Both header and footer link to /blog', () => {
      expect(headerContent).toContain('href="/blog"');
      expect(footerContent).toContain('href="/blog"');
    });
  });

  describe('Our Story Section on Homepage', () => {
    const homepagePath = path.join(storefrontSrc, 'pages/index.astro');
    const homepageContent = fs.readFileSync(homepagePath, 'utf-8');

    it('Homepage contains "Our Story" heading', () => {
      expect(homepageContent).toContain('Our Story');
    });

    it('Homepage links Our Story to /blog/about-dear-margeaux', () => {
      expect(homepageContent).toContain('/blog/about-dear-margeaux');
    });

    it('Homepage uses branding-hero.webp for Our Story image', () => {
      expect(homepageContent).toContain('branding-hero.webp');
    });

    it('Our Story image has descriptive alt text', () => {
      expect(homepageContent).toMatch(/alt=["'][^"']*Dear Margeaux[^"']*["']/);
    });
  });

  describe('About Dear Margeaux Blog Post', () => {
    const blogPostPath = path.join(contentDir, 'blog/about-dear-margeaux.mdx');
    const blogPostContent = fs.readFileSync(blogPostPath, 'utf-8');

    it('Blog post exists at correct path', () => {
      expect(fs.existsSync(blogPostPath)).toBe(true);
    });

    it('Blog post is pinned (appears first)', () => {
      expect(blogPostContent).toMatch(/pinned:\s*true/);
    });

    it('Blog post is not a draft', () => {
      expect(blogPostContent).toMatch(/draft:\s*false/);
    });

    it('Blog post has title "About Dear Margeaux"', () => {
      expect(blogPostContent).toMatch(/title:\s*["']?About Dear Margeaux["']?/);
    });
  });

  describe('The Debut Lookbook', () => {
    const lookbookPath = path.join(contentDir, 'lookbook/the-debut.mdx');
    const lookbookContent = fs.readFileSync(lookbookPath, 'utf-8');

    it('Lookbook exists at correct path', () => {
      expect(fs.existsSync(lookbookPath)).toBe(true);
    });

    it('Lookbook has title "The Debut"', () => {
      expect(lookbookContent).toMatch(/title:\s*["']?The Debut["']?/);
    });

    it('Lookbook is not a draft', () => {
      expect(lookbookContent).toMatch(/draft:\s*false/);
    });

    it('Lookbook has at least 3 images', () => {
      // Count R2 image URLs in the images array
      const imageMatches = lookbookContent.match(
        /lookbook\/lookbook-\d+\.webp|branding\/branding-hero\.webp/g
      );
      expect(imageMatches).toBeTruthy();
      expect(imageMatches!.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Mobile Responsive Layout', () => {
    const headerPath = path.join(storefrontSrc, 'components/Header.astro');
    const headerContent = fs.readFileSync(headerPath, 'utf-8');

    it('Header has mobile menu toggle button', () => {
      expect(headerContent).toContain('mobile-menu-button');
    });

    it('Header has hidden mobile menu', () => {
      expect(headerContent).toContain('mobile-menu');
    });

    it('Mobile menu contains all navigation links', () => {
      // Check for mobile menu with navigation links
      expect(headerContent).toMatch(
        /id=["']mobile-menu["'][\s\S]*href=["']\/shop["']/
      );
      expect(headerContent).toMatch(
        /id=["']mobile-menu["'][\s\S]*href=["']\/drops["']/
      );
      expect(headerContent).toMatch(
        /id=["']mobile-menu["'][\s\S]*href=["']\/blog["']/
      );
      expect(headerContent).toMatch(
        /id=["']mobile-menu["'][\s\S]*href=["']\/lookbook["']/
      );
    });

    it('Mobile menu uses "Journal" for blog link', () => {
      // Find the mobile menu and verify Journal text
      const mobileMenuMatch = headerContent.match(
        /id=["']mobile-menu["'][\s\S]*?<\/div>\s*<\/div>/
      );
      expect(mobileMenuMatch).toBeTruthy();
      expect(mobileMenuMatch![0]).toContain('Journal');
    });
  });

  describe('Complete Navigation Structure', () => {
    it('Shop page exists', () => {
      const shopPath = path.join(storefrontSrc, 'pages/shop/index.astro');
      expect(fs.existsSync(shopPath)).toBe(true);
    });

    it('Drops page exists', () => {
      const dropsPath = path.join(storefrontSrc, 'pages/drops/index.astro');
      expect(fs.existsSync(dropsPath)).toBe(true);
    });

    it('Blog page exists', () => {
      const blogPath = path.join(storefrontSrc, 'pages/blog/index.astro');
      expect(fs.existsSync(blogPath)).toBe(true);
    });

    it('Lookbook page exists', () => {
      const lookbookPath = path.join(
        storefrontSrc,
        'pages/lookbook/index.astro'
      );
      expect(fs.existsSync(lookbookPath)).toBe(true);
    });

    it('Drops archive page exists', () => {
      const archivePath = path.join(storefrontSrc, 'pages/drops/archive.astro');
      expect(fs.existsSync(archivePath)).toBe(true);
    });
  });

  describe('Content Integration', () => {
    it('Blog directory contains posts', () => {
      const blogDir = path.join(contentDir, 'blog');
      const files = fs.readdirSync(blogDir);
      expect(files.length).toBeGreaterThan(0);
    });

    it('Lookbook directory contains entries', () => {
      const lookbookDir = path.join(contentDir, 'lookbook');
      const files = fs.readdirSync(lookbookDir);
      expect(files.length).toBeGreaterThan(0);
    });

    it('About Dear Margeaux blog uses R2 image', () => {
      const blogPostPath = path.join(
        contentDir,
        'blog/about-dear-margeaux.mdx'
      );
      const blogPostContent = fs.readFileSync(blogPostPath, 'utf-8');
      expect(blogPostContent).toMatch(/image:\s*["']?https?:\/\//);
    });
  });

  describe('Visual Test Requirements Documentation', () => {
    // These tests document what visual tests should verify
    // The actual visual tests are executed via agent-browser

    it('Documents: Header logo image loads from R2', () => {
      // Visual test: Navigate to homepage, verify header logo image loads
      expect(true).toBe(true);
    });

    it('Documents: Footer logo image loads from R2', () => {
      // Visual test: Scroll to footer, verify footer logo image loads
      expect(true).toBe(true);
    });

    it('Documents: Favicon appears in browser tab', () => {
      // Visual test: Check browser tab for favicon
      expect(true).toBe(true);
    });

    it('Documents: All navigation links work correctly', () => {
      // Visual test: Click each nav link and verify correct page loads
      expect(true).toBe(true);
    });

    it('Documents: Our Story branding image loads', () => {
      // Visual test: Scroll to Our Story, verify branding-hero.webp loads
      expect(true).toBe(true);
    });

    it('Documents: About Dear Margeaux is first on /blog (pinned)', () => {
      // Visual test: Navigate to /blog, verify About Dear Margeaux appears first
      expect(true).toBe(true);
    });

    it('Documents: The Debut lookbook shows with images on /lookbook', () => {
      // Visual test: Navigate to /lookbook, verify The Debut appears with images
      expect(true).toBe(true);
    });

    it('Documents: Mobile viewport shows responsive layout', () => {
      // Visual test: Set viewport to 375x812, verify mobile layout
      expect(true).toBe(true);
    });

    it('Documents: Mobile navigation shows Journal link', () => {
      // Visual test: Open mobile menu, verify Journal link is present
      expect(true).toBe(true);
    });
  });
});
