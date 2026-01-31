import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Tests for lookbook content images (assets-11)
 * Verifies that lookbook entries have proper R2 image URLs
 */

const LOOKBOOK_CONTENT_DIR = path.join(__dirname, '../../src/content/lookbook');

const R2_PUBLIC_URL = 'https://pub-bf88a85e013c44b6a3a965d48812aa90.r2.dev';

/**
 * Simple frontmatter parser that extracts YAML frontmatter from MDX files
 * Handles arrays in YAML format
 */
function parseFrontmatter(content: string): Record<string, unknown> {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) return {};

  const frontmatterStr = frontmatterMatch[1];
  const result: Record<string, unknown> = {};
  const lines = frontmatterStr.split('\n');

  let currentKey: string | null = null;
  let currentArray: string[] | null = null;

  for (const line of lines) {
    // Check if this is an array item (starts with "  - ")
    if (line.match(/^\s+-\s+/)) {
      if (currentArray !== null) {
        let value = line.replace(/^\s+-\s+/, '').trim();
        // Remove quotes if present
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }
        currentArray.push(value);
      }
      continue;
    }

    // Check if this is a key with just a colon (array start)
    const colonIndex = line.indexOf(':');
    if (colonIndex > 0) {
      // If we were building an array, save it
      if (currentKey && currentArray !== null) {
        result[currentKey] = currentArray;
        currentArray = null;
      }

      const key = line.slice(0, colonIndex).trim();
      let value = line.slice(colonIndex + 1).trim();

      // Check if this starts an array
      if (value === '') {
        currentKey = key;
        currentArray = [];
      } else {
        // Remove quotes if present
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }
        result[key] = value;
        currentKey = null;
      }
    }
  }

  // Save any remaining array
  if (currentKey && currentArray !== null) {
    result[currentKey] = currentArray;
  }

  return result;
}

describe('Lookbook Content Images (assets-11)', () => {
  describe('spring-2026.mdx', () => {
    const filePath = path.join(LOOKBOOK_CONTENT_DIR, 'spring-2026.mdx');

    it('has images array in frontmatter', () => {
      const content = fs.readFileSync(filePath, 'utf-8');
      const frontmatter = parseFrontmatter(content);

      expect(frontmatter.images).toBeDefined();
      expect(Array.isArray(frontmatter.images)).toBe(true);
    });

    it('image URLs point to R2 lookbook/ folder', () => {
      const content = fs.readFileSync(filePath, 'utf-8');
      const frontmatter = parseFrontmatter(content);
      const images = frontmatter.images as string[];

      expect(images.length).toBeGreaterThan(0);
      for (const image of images) {
        expect(image).toContain(R2_PUBLIC_URL);
        expect(image).toContain('/lookbook/');
      }
    });

    it('images use lookbook-1.webp and lookbook-2.webp filenames', () => {
      const content = fs.readFileSync(filePath, 'utf-8');
      const frontmatter = parseFrontmatter(content);
      const images = frontmatter.images as string[];

      // Should contain lookbook-1.webp and lookbook-2.webp
      const hasLookbook1 = images.some((img) =>
        img.includes('lookbook-1.webp')
      );
      const hasLookbook2 = images.some((img) =>
        img.includes('lookbook-2.webp')
      );

      expect(hasLookbook1).toBe(true);
      expect(hasLookbook2).toBe(true);
    });

    it('all images are WebP format', () => {
      const content = fs.readFileSync(filePath, 'utf-8');
      const frontmatter = parseFrontmatter(content);
      const images = frontmatter.images as string[];

      for (const image of images) {
        expect(image).toMatch(/\.webp$/);
      }
    });
  });

  describe('Alt text provided for accessibility', () => {
    it('lookbook layout uses title in alt text (verified by code inspection)', () => {
      // The Lookbook.astro layout uses the lookbook title in alt text:
      // Hero: alt={`${title} - Hero`}
      // Gallery: alt={`${title} - Image ${index + 2}`}
      // This test documents this behavior and ensures it's expected

      const lookbookLayout = fs.readFileSync(
        path.join(__dirname, '../../src/layouts/Lookbook.astro'),
        'utf-8'
      );

      // Verify the images use title-based alt text
      expect(lookbookLayout).toContain('alt={`${title} - Hero`}');
      expect(lookbookLayout).toContain('alt={`${title} - Image ${index + 2}`}');
    });
  });
});
