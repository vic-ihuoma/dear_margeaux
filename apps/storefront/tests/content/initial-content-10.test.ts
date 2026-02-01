import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Tests for initial-content-10: Create 'About Dear Margeaux' blog post
 *
 * Verifies:
 * - Blog post 'About Dear Margeaux' exists
 * - Blog post slug is 'about-dear-margeaux'
 * - Blog post is pinned (pinned: true)
 * - Blog post has featured image
 * - Blog post is not draft (draft: false)
 */

const BLOG_CONTENT_DIR = path.join(__dirname, '../../src/content/blog');
const BLOG_INDEX_PAGE = path.join(
  __dirname,
  '../../src/pages/blog/index.astro'
);

const R2_PUBLIC_URL = 'https://pub-bf88a85e013c44b6a3a965d48812aa90.r2.dev';

/**
 * Simple frontmatter parser that extracts YAML frontmatter from MDX files
 */
function parseFrontmatter(content: string): Record<string, string | boolean> {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) return {};

  const frontmatterStr = frontmatterMatch[1];
  const result: Record<string, string | boolean> = {};

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
      // Parse boolean values
      if (value === 'true') {
        result[key] = true;
      } else if (value === 'false') {
        result[key] = false;
      } else {
        result[key] = value;
      }
    }
  }

  return result;
}

describe('initial-content-10: About Dear Margeaux blog post', () => {
  const filePath = path.join(BLOG_CONTENT_DIR, 'about-dear-margeaux.mdx');

  describe("Blog post 'About Dear Margeaux' exists", () => {
    it('about-dear-margeaux.mdx file exists in blog content directory', () => {
      expect(fs.existsSync(filePath)).toBe(true);
    });

    it('has title "About Dear Margeaux" in frontmatter', () => {
      const content = fs.readFileSync(filePath, 'utf-8');
      const frontmatter = parseFrontmatter(content);

      expect(frontmatter.title).toBe('About Dear Margeaux');
    });
  });

  describe("Blog post slug is 'about-dear-margeaux'", () => {
    it('filename creates correct slug (about-dear-margeaux)', () => {
      // Astro content collections derive slug from filename
      // about-dear-margeaux.mdx -> slug: about-dear-margeaux
      const filename = path.basename(filePath, '.mdx');
      expect(filename).toBe('about-dear-margeaux');
    });
  });

  describe('Blog post is pinned', () => {
    it('has pinned: true in frontmatter', () => {
      const content = fs.readFileSync(filePath, 'utf-8');
      const frontmatter = parseFrontmatter(content);

      expect(frontmatter.pinned).toBe(true);
    });

    it('blog index page sorts pinned posts first', () => {
      const indexContent = fs.readFileSync(BLOG_INDEX_PAGE, 'utf-8');

      // Verify the sorting logic prioritizes pinned posts
      expect(indexContent).toContain('pinned');
      expect(indexContent).toMatch(/if.*\(.*pinned.*\).*return -1/s);
    });

    it('blog index page displays pinned badge for pinned posts', () => {
      const indexContent = fs.readFileSync(BLOG_INDEX_PAGE, 'utf-8');

      // Verify pinned badge is shown
      expect(indexContent).toContain('data.pinned');
      expect(indexContent).toContain('Pinned');
    });
  });

  describe('Blog post has featured image', () => {
    it('has image field in frontmatter', () => {
      const content = fs.readFileSync(filePath, 'utf-8');
      const frontmatter = parseFrontmatter(content);

      expect(frontmatter.image).toBeDefined();
      expect(typeof frontmatter.image).toBe('string');
    });

    it('image points to R2 blog folder', () => {
      const content = fs.readFileSync(filePath, 'utf-8');
      const frontmatter = parseFrontmatter(content);

      expect(frontmatter.image).toContain(R2_PUBLIC_URL);
      expect(frontmatter.image).toContain('/blog/');
    });

    it('uses blog-about.webp as featured image', () => {
      const content = fs.readFileSync(filePath, 'utf-8');
      const frontmatter = parseFrontmatter(content);

      expect(frontmatter.image).toContain('blog-about.webp');
    });
  });

  describe('Blog post is not draft', () => {
    it('has draft: false in frontmatter', () => {
      const content = fs.readFileSync(filePath, 'utf-8');
      const frontmatter = parseFrontmatter(content);

      expect(frontmatter.draft).toBe(false);
    });
  });

  describe('Blog post content quality', () => {
    it('has descriptive content about the brand', () => {
      const content = fs.readFileSync(filePath, 'utf-8');

      // Should contain brand story elements
      expect(content.toLowerCase()).toContain('dear margeaux');
    });

    it('has author field set', () => {
      const content = fs.readFileSync(filePath, 'utf-8');
      const frontmatter = parseFrontmatter(content);

      expect(frontmatter.author).toBeDefined();
      expect(typeof frontmatter.author).toBe('string');
    });

    it('has description field set', () => {
      const content = fs.readFileSync(filePath, 'utf-8');
      const frontmatter = parseFrontmatter(content);

      expect(frontmatter.description).toBeDefined();
      expect(typeof frontmatter.description).toBe('string');
      expect((frontmatter.description as string).length).toBeGreaterThan(20);
    });

    it('has tags field set', () => {
      const content = fs.readFileSync(filePath, 'utf-8');

      // Tags are stored as array in frontmatter
      expect(content).toMatch(/tags:\s*\[.*\]/);
    });

    it('has date field set', () => {
      const content = fs.readFileSync(filePath, 'utf-8');
      const frontmatter = parseFrontmatter(content);

      expect(frontmatter.date).toBeDefined();
      expect(typeof frontmatter.date).toBe('string');
    });
  });

  describe('Visual test preparation: pinned post appears first on /blog', () => {
    it('blog index page exists and is accessible', () => {
      expect(fs.existsSync(BLOG_INDEX_PAGE)).toBe(true);
    });

    it('blog index page fetches posts from collection', () => {
      const indexContent = fs.readFileSync(BLOG_INDEX_PAGE, 'utf-8');

      expect(indexContent).toContain("getCollection('blog'");
    });

    it('blog index page has proper sorting to show pinned first', () => {
      const indexContent = fs.readFileSync(BLOG_INDEX_PAGE, 'utf-8');

      // Verify sorting logic exists
      expect(indexContent).toContain('.sort(');
      // Pinned items should come first (return -1 means sort before)
      expect(indexContent).toMatch(/a\.data\.pinned.*return -1/s);
      expect(indexContent).toMatch(/b\.data\.pinned.*return 1/s);
    });
  });
});
