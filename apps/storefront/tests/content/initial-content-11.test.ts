import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const LOOKBOOK_DIR = join(__dirname, '../../src/content/lookbook');
const THE_DEBUT_PATH = join(LOOKBOOK_DIR, 'the-debut.mdx');

describe('initial-content-11: Create The Debut lookbook', () => {
  describe('Lookbook existence', () => {
    it('should have The Debut lookbook file', () => {
      expect(existsSync(THE_DEBUT_PATH)).toBe(true);
    });

    it('should have title "The Debut"', () => {
      const content = readFileSync(THE_DEBUT_PATH, 'utf-8');
      expect(content).toMatch(/title:\s*["']?The Debut["']?/);
    });

    it('should have correct description', () => {
      const content = readFileSync(THE_DEBUT_PATH, 'utf-8');
      expect(content).toMatch(
        /A visual journey through our inaugural collection/
      );
    });
  });

  describe('Lookbook images', () => {
    it('should have 3 images in the lookbook', () => {
      const content = readFileSync(THE_DEBUT_PATH, 'utf-8');
      // Count image URLs in the images array
      const imageMatches = content.match(
        /https:\/\/pub-bf88a85e013c44b6a3a965d48812aa90\.r2\.dev\/(lookbook|branding)\/[^"'\s]+/g
      );
      expect(imageMatches).toHaveLength(3);
    });

    it('should include lookbook-1.webp', () => {
      const content = readFileSync(THE_DEBUT_PATH, 'utf-8');
      expect(content).toContain('lookbook/lookbook-1.webp');
    });

    it('should include lookbook-2.webp', () => {
      const content = readFileSync(THE_DEBUT_PATH, 'utf-8');
      expect(content).toContain('lookbook/lookbook-2.webp');
    });

    it('should include branding-hero.webp', () => {
      const content = readFileSync(THE_DEBUT_PATH, 'utf-8');
      expect(content).toContain('branding/branding-hero.webp');
    });
  });

  describe('Lookbook publication status', () => {
    it('should not be a draft (draft: false)', () => {
      const content = readFileSync(THE_DEBUT_PATH, 'utf-8');
      expect(content).toMatch(/draft:\s*false/);
    });

    it('should have a date field', () => {
      const content = readFileSync(THE_DEBUT_PATH, 'utf-8');
      expect(content).toMatch(/date:\s*\d{4}-\d{2}-\d{2}/);
    });
  });

  describe('Lookbook frontmatter structure', () => {
    it('should have valid YAML frontmatter', () => {
      const content = readFileSync(THE_DEBUT_PATH, 'utf-8');
      // Check that it starts with --- and has another ---
      expect(content).toMatch(/^---\n[\s\S]*?\n---/);
    });

    it('should have images as an array in YAML', () => {
      const content = readFileSync(THE_DEBUT_PATH, 'utf-8');
      // YAML array syntax: images: followed by lines starting with -
      expect(content).toMatch(/images:\s*\n\s*-\s/);
    });
  });

  describe('Lookbook content', () => {
    it('should have markdown body content after frontmatter', () => {
      const content = readFileSync(THE_DEBUT_PATH, 'utf-8');
      // Split by frontmatter and check body exists
      const parts = content.split(/^---\n[\s\S]*?\n---/);
      const body = parts[1]?.trim() || '';
      expect(body.length).toBeGreaterThan(0);
    });

    it('should reference The Debut collection in body', () => {
      const content = readFileSync(THE_DEBUT_PATH, 'utf-8');
      expect(content).toMatch(/The Debut|inaugural collection/i);
    });
  });

  describe('Lookbook R2 URLs', () => {
    it('should use correct R2 base URL for all images', () => {
      const content = readFileSync(THE_DEBUT_PATH, 'utf-8');
      const frontmatter = content.match(/^---\n([\s\S]*?)\n---/)?.[1] || '';
      const imageLines = frontmatter
        .split('\n')
        .filter((line) => line.includes('r2.dev'));

      imageLines.forEach((line) => {
        expect(line).toContain('pub-bf88a85e013c44b6a3a965d48812aa90.r2.dev');
      });
    });

    it('should have lookbook images in lookbook folder', () => {
      const content = readFileSync(THE_DEBUT_PATH, 'utf-8');
      expect(content).toContain('/lookbook/lookbook-1.webp');
      expect(content).toContain('/lookbook/lookbook-2.webp');
    });

    it('should have branding-hero in branding folder', () => {
      const content = readFileSync(THE_DEBUT_PATH, 'utf-8');
      expect(content).toContain('/branding/branding-hero.webp');
    });
  });
});
