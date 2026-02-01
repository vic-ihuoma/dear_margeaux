import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Tests for blog content images (assets-10)
 * Verifies that blog posts have proper R2 image URLs
 */

const BLOG_CONTENT_DIR = path.join(__dirname, '../../src/content/blog');

const R2_PUBLIC_URL = 'https://pub-bf88a85e013c44b6a3a965d48812aa90.r2.dev';

/**
 * Simple frontmatter parser that extracts YAML frontmatter from MDX files
 */
function parseFrontmatter(content: string): Record<string, string> {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) return {};

  const frontmatterStr = frontmatterMatch[1];
  const result: Record<string, string> = {};

  for (const line of frontmatterStr.split('\n')) {
    const colonIndex = line.indexOf(':');
    if (colonIndex > 0) {
      const key = line.slice(0, colonIndex).trim();
      let value = line.slice(colonIndex + 1).trim();
      // Remove quotes if present
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      result[key] = value;
    }
  }

  return result;
}

describe('Blog Content Images (assets-10)', () => {
  describe('about-dear-margeaux.mdx', () => {
    const filePath = path.join(BLOG_CONTENT_DIR, 'about-dear-margeaux.mdx');

    it('has image field in frontmatter', () => {
      const content = fs.readFileSync(filePath, 'utf-8');
      const frontmatter = parseFrontmatter(content);

      expect(frontmatter.image).toBeDefined();
      expect(typeof frontmatter.image).toBe('string');
    });

    it('image URL points to R2 blog/ folder', () => {
      const content = fs.readFileSync(filePath, 'utf-8');
      const frontmatter = parseFrontmatter(content);

      expect(frontmatter.image).toContain(R2_PUBLIC_URL);
      expect(frontmatter.image).toContain('/blog/');
    });

    it('image uses blog-about.webp filename', () => {
      const content = fs.readFileSync(filePath, 'utf-8');
      const frontmatter = parseFrontmatter(content);

      expect(frontmatter.image).toContain('blog-about.webp');
    });

    it('image URL is WebP format', () => {
      const content = fs.readFileSync(filePath, 'utf-8');
      const frontmatter = parseFrontmatter(content);

      expect(frontmatter.image).toMatch(/\.webp$/);
    });
  });

  describe('Alt text provided for accessibility', () => {
    it('blog post layout uses title as alt text (verified by code inspection)', () => {
      // The BlogPost.astro layout uses the post title as alt text:
      // <img src={image} alt={title} ... />
      // This test documents this behavior and ensures it's expected

      const blogPostLayout = fs.readFileSync(
        path.join(__dirname, '../../src/layouts/BlogPost.astro'),
        'utf-8'
      );

      // Verify the image uses alt={title}
      expect(blogPostLayout).toContain('alt={title}');
    });
  });
});
