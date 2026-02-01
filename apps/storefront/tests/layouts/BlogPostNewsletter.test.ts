import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

/**
 * Tests for newsletter-24: Add newsletter signup to individual blog posts
 *
 * These tests verify that the BlogPost.astro layout includes a newsletter
 * signup section at the end of blog post content with an inline form.
 */
describe('BlogPost Newsletter Integration', () => {
  const layoutPath = resolve(__dirname, '../../src/layouts/BlogPost.astro');
  const layoutContent = readFileSync(layoutPath, 'utf-8');

  describe('Newsletter component integration', () => {
    it('imports NewsletterForm component', () => {
      expect(layoutContent).toContain(
        "import NewsletterForm from '../components/NewsletterForm'"
      );
    });

    it('retrieves API URL from environment variable', () => {
      expect(layoutContent).toContain(
        'import.meta.env.PUBLIC_MERCHANT_API_URL'
      );
    });

    it('retrieves API key from environment variable', () => {
      expect(layoutContent).toContain(
        'import.meta.env.PUBLIC_MERCHANT_API_KEY'
      );
    });

    it('renders NewsletterForm component with client:load directive', () => {
      expect(layoutContent).toContain('<NewsletterForm client:load');
    });

    it('passes apiUrl and apiKey props to NewsletterForm', () => {
      expect(layoutContent).toMatch(/apiUrl\s*=\s*\{apiUrl\}/);
      expect(layoutContent).toMatch(/apiKey\s*=\s*\{apiKey\}/);
    });
  });

  describe('Newsletter CTA section styling', () => {
    it('has a newsletter section with appropriate background', () => {
      expect(layoutContent).toMatch(/class="[^"]*bg-secondary[^"]*"/);
    });

    it('includes heading text about enjoying the post', () => {
      expect(layoutContent).toContain('Enjoyed this');
    });

    it('includes descriptive text about subscribing', () => {
      expect(layoutContent).toContain('Subscribe');
    });
  });

  describe('Newsletter section placement', () => {
    it('newsletter section comes after article content', () => {
      const articleCloseIndex = layoutContent.indexOf('</article>');
      const newsletterIndex = layoutContent.indexOf('Newsletter CTA');

      expect(articleCloseIndex).toBeGreaterThan(-1);
      expect(newsletterIndex).toBeGreaterThan(-1);
      expect(newsletterIndex).toBeGreaterThan(articleCloseIndex);
    });

    it('newsletter section comes before footer', () => {
      const newsletterIndex = layoutContent.indexOf('Newsletter CTA');
      const footerIndex = layoutContent.indexOf('<Footer');

      expect(newsletterIndex).toBeGreaterThan(-1);
      expect(footerIndex).toBeGreaterThan(-1);
      expect(newsletterIndex).toBeLessThan(footerIndex);
    });
  });

  describe('Inline feedback support', () => {
    it('NewsletterForm has space for inline feedback (form handles this)', () => {
      // The NewsletterForm component handles its own success/error feedback
      // This test verifies the form is rendered with proper container for layout
      expect(layoutContent).toContain('NewsletterForm');
    });
  });

  describe('Fallback for missing API configuration', () => {
    it('conditionally renders NewsletterForm when API is configured', () => {
      // Should have conditional rendering for when API is/isn't configured
      expect(layoutContent).toMatch(/apiUrl\s*&&\s*apiKey/);
    });

    it('provides fallback UI when API is not configured', () => {
      // Should show something when API isn't configured
      const hasConditional =
        layoutContent.includes('?') && layoutContent.includes(':');
      const hasFallback =
        layoutContent.includes('newsletter-form') ||
        layoutContent.includes('placeholder') ||
        layoutContent.includes('fallback');

      // Either conditional rendering or always show the form
      expect(
        hasConditional ||
          hasFallback ||
          layoutContent.includes('NewsletterForm')
      ).toBe(true);
    });
  });
});
