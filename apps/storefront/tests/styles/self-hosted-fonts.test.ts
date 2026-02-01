import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const publicDir = join(__dirname, '../../public');
const stylesDir = join(__dirname, '../../src/styles');

describe('Self-hosted Inter font', () => {
  describe('Font files', () => {
    it('should have Inter variable font file in public/fonts directory', () => {
      const fontPath = join(publicDir, 'fonts/inter-variable.woff2');
      expect(existsSync(fontPath)).toBe(true);
    });

    it('should have Inter italic variable font file in public/fonts directory', () => {
      const fontPath = join(publicDir, 'fonts/inter-variable-italic.woff2');
      expect(existsSync(fontPath)).toBe(true);
    });

    it('should have font files with valid woff2 format', () => {
      const fontPath = join(publicDir, 'fonts/inter-variable.woff2');
      const buffer = readFileSync(fontPath);
      // WOFF2 signature: 'wOF2' (0x774F4632)
      const signature = buffer.slice(0, 4).toString('ascii');
      expect(signature).toBe('wOF2');
    });
  });

  describe('CSS @font-face declarations', () => {
    it('should include @font-face declarations in global.css', () => {
      const cssPath = join(stylesDir, 'global.css');
      const content = readFileSync(cssPath, 'utf-8');
      expect(content).toContain('@font-face');
    });

    it('should define Inter font family in @font-face', () => {
      const cssPath = join(stylesDir, 'global.css');
      const content = readFileSync(cssPath, 'utf-8');
      expect(content).toContain("font-family: 'Inter'");
    });

    it('should set font-display: swap in @font-face for performance', () => {
      const cssPath = join(stylesDir, 'global.css');
      const content = readFileSync(cssPath, 'utf-8');
      expect(content).toContain('font-display: swap');
    });

    it('should reference self-hosted font file in @font-face src', () => {
      const cssPath = join(stylesDir, 'global.css');
      const content = readFileSync(cssPath, 'utf-8');
      expect(content).toContain("url('/fonts/inter-variable.woff2')");
    });

    it('should include font-weight range for variable font', () => {
      const cssPath = join(stylesDir, 'global.css');
      const content = readFileSync(cssPath, 'utf-8');
      expect(content).toContain('font-weight: 100 900');
    });
  });

  describe('No Google Fonts CDN references', () => {
    it('should not have Google Fonts API links in BaseLayout.astro', () => {
      const layoutPath = join(__dirname, '../../src/layouts/BaseLayout.astro');
      const content = readFileSync(layoutPath, 'utf-8');
      expect(content).not.toContain('fonts.googleapis.com/css');
    });

    it('should not have Google Fonts preconnect in BaseLayout.astro', () => {
      const layoutPath = join(__dirname, '../../src/layouts/BaseLayout.astro');
      const content = readFileSync(layoutPath, 'utf-8');
      expect(content).not.toContain(
        'preconnect" href="https://fonts.googleapis.com"'
      );
    });

    it('should not have Google Fonts references in BlogPost.astro', () => {
      const layoutPath = join(__dirname, '../../src/layouts/BlogPost.astro');
      const content = readFileSync(layoutPath, 'utf-8');
      expect(content).not.toContain('fonts.googleapis.com/css');
    });

    it('should not have Google Fonts references in Lookbook.astro', () => {
      const layoutPath = join(__dirname, '../../src/layouts/Lookbook.astro');
      const content = readFileSync(layoutPath, 'utf-8');
      expect(content).not.toContain('fonts.googleapis.com/css');
    });
  });
});
