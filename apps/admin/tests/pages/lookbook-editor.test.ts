import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

// Paths to the lookbook editor pages
const pagesDir = path.resolve(__dirname, '../../src/pages/lookbook');
const componentsDir = path.resolve(__dirname, '../../src/components');

describe('lookbook-admin-4: Lookbook Editor Pages', () => {
  describe('New Lookbook Page (/lookbook/new.astro)', () => {
    const newPagePath = path.join(pagesDir, 'new.astro');

    it('should have new.astro page file', () => {
      expect(fs.existsSync(newPagePath)).toBe(true);
    });

    it('should use AdminLayout for consistent layout', () => {
      const content = fs.readFileSync(newPagePath, 'utf-8');
      expect(content).toMatch(/import AdminLayout from/);
      expect(content).toMatch(/<AdminLayout/);
    });

    it('should render CreateLookbook wrapper component', () => {
      const content = fs.readFileSync(newPagePath, 'utf-8');
      expect(content).toMatch(/<CreateLookbook/);
    });

    it('should import CreateLookbook component', () => {
      const content = fs.readFileSync(newPagePath, 'utf-8');
      expect(content).toMatch(/import.*CreateLookbook.*from/);
    });

    it('should have a wrapper component with client:load directive', () => {
      const content = fs.readFileSync(newPagePath, 'utf-8');
      expect(content).toMatch(/client:load/);
    });

    it('should have breadcrumb navigation', () => {
      const content = fs.readFileSync(newPagePath, 'utf-8');
      expect(content).toMatch(/Breadcrumb/i);
      expect(content).toMatch(/href="\/lookbook"/);
    });

    it('should have page title "New Lookbook"', () => {
      const content = fs.readFileSync(newPagePath, 'utf-8');
      expect(content).toMatch(/New Lookbook/);
    });
  });

  describe('Edit Lookbook Page (/lookbook/[slug].astro)', () => {
    const editPagePath = path.join(pagesDir, '[slug].astro');

    it('should have [slug].astro page file', () => {
      expect(fs.existsSync(editPagePath)).toBe(true);
    });

    it('should use AdminLayout for consistent layout', () => {
      const content = fs.readFileSync(editPagePath, 'utf-8');
      expect(content).toMatch(/import AdminLayout from/);
      expect(content).toMatch(/<AdminLayout/);
    });

    it('should extract slug from Astro.params', () => {
      const content = fs.readFileSync(editPagePath, 'utf-8');
      expect(content).toMatch(/Astro\.params/);
      expect(content).toMatch(/slug/);
    });

    it('should fetch existing lookbook from API', () => {
      const content = fs.readFileSync(editPagePath, 'utf-8');
      expect(content).toMatch(/\/api\/lookbook\//);
      expect(content).toMatch(/fetch/);
    });

    it('should redirect to lookbook list if not found', () => {
      const content = fs.readFileSync(editPagePath, 'utf-8');
      expect(content).toMatch(/Astro\.redirect.*\/lookbook/);
    });

    it('should render LookbookEditor or wrapper component', () => {
      const content = fs.readFileSync(editPagePath, 'utf-8');
      // Could be LookbookEditor, EditLookbook, or LookbookGallery
      expect(content).toMatch(/LookbookEditor|EditLookbook|LookbookForm/);
    });

    it('should have breadcrumb with lookbook title', () => {
      const content = fs.readFileSync(editPagePath, 'utf-8');
      expect(content).toMatch(/Breadcrumb/i);
    });

    it('should display status badge (draft/published)', () => {
      const content = fs.readFileSync(editPagePath, 'utf-8');
      expect(content).toMatch(/draft|Draft|Published/);
    });

    it('should have error handling for failed API calls', () => {
      const content = fs.readFileSync(editPagePath, 'utf-8');
      expect(content).toMatch(/error/i);
    });
  });

  describe('CreateLookbook Component', () => {
    const createLookbookPath = path.join(componentsDir, 'CreateLookbook.tsx');

    it('should have CreateLookbook component file', () => {
      expect(fs.existsSync(createLookbookPath)).toBe(true);
    });

    it('should import LookbookForm component', () => {
      const content = fs.readFileSync(createLookbookPath, 'utf-8');
      expect(content).toMatch(/import.*LookbookForm/);
    });

    it('should import LookbookGallery component', () => {
      const content = fs.readFileSync(createLookbookPath, 'utf-8');
      expect(content).toMatch(/import.*LookbookGallery/);
    });

    it('should have state for form data', () => {
      const content = fs.readFileSync(createLookbookPath, 'utf-8');
      expect(content).toMatch(/useState/);
    });

    it('should have state for gallery images', () => {
      const content = fs.readFileSync(createLookbookPath, 'utf-8');
      expect(content).toMatch(/images/i);
    });

    it('should have submit handler that calls API', () => {
      const content = fs.readFileSync(createLookbookPath, 'utf-8');
      expect(content).toMatch(/handleSubmit|onSubmit/);
      expect(content).toMatch(/\/api\/lookbook/);
      expect(content).toMatch(/POST/);
    });

    it('should have cancel handler that navigates back', () => {
      const content = fs.readFileSync(createLookbookPath, 'utf-8');
      expect(content).toMatch(/handleCancel|onCancel/);
      expect(content).toMatch(/\/lookbook/);
    });

    it('should have image upload handler', () => {
      const content = fs.readFileSync(createLookbookPath, 'utf-8');
      expect(content).toMatch(/uploadHandler|uploadImage/i);
    });

    it('should redirect after successful creation', () => {
      const content = fs.readFileSync(createLookbookPath, 'utf-8');
      expect(content).toMatch(/window\.location|redirect/);
    });

    it('should have error handling and display', () => {
      const content = fs.readFileSync(createLookbookPath, 'utf-8');
      expect(content).toMatch(/error/i);
      expect(content).toMatch(/setError|error.*state/i);
    });
  });

  describe('EditLookbook Component', () => {
    const editLookbookPath = path.join(componentsDir, 'EditLookbook.tsx');

    it('should have EditLookbook component file', () => {
      expect(fs.existsSync(editLookbookPath)).toBe(true);
    });

    it('should accept lookbook prop for initial data', () => {
      const content = fs.readFileSync(editLookbookPath, 'utf-8');
      expect(content).toMatch(/lookbook.*:/);
    });

    it('should import LookbookForm component', () => {
      const content = fs.readFileSync(editLookbookPath, 'utf-8');
      expect(content).toMatch(/import.*LookbookForm/);
    });

    it('should import LookbookGallery component', () => {
      const content = fs.readFileSync(editLookbookPath, 'utf-8');
      expect(content).toMatch(/import.*LookbookGallery/);
    });

    it('should pass initial lookbook data to LookbookForm', () => {
      const content = fs.readFileSync(editLookbookPath, 'utf-8');
      expect(content).toMatch(/lookbook=/);
    });

    it('should have submit handler that calls PATCH API', () => {
      const content = fs.readFileSync(editLookbookPath, 'utf-8');
      expect(content).toMatch(/PATCH|PUT/);
      expect(content).toMatch(/\/api\/lookbook\//);
    });

    it('should display success message on save', () => {
      const content = fs.readFileSync(editLookbookPath, 'utf-8');
      expect(content).toMatch(/success|saved/i);
    });
  });
});

describe('Lookbook API Endpoints for Editor', () => {
  describe('POST /api/lookbook (create)', () => {
    const apiPath = path.resolve(
      __dirname,
      '../../src/pages/api/lookbook/index.ts'
    );

    it('should have POST handler', () => {
      const content = fs.readFileSync(apiPath, 'utf-8');
      expect(content).toMatch(/export const POST/);
    });
  });

  describe('API slug endpoint (/api/lookbook/[slug].ts)', () => {
    const slugApiPath = path.resolve(
      __dirname,
      '../../src/pages/api/lookbook/[slug].ts'
    );

    it('should have [slug].ts API file', () => {
      expect(fs.existsSync(slugApiPath)).toBe(true);
    });

    it('should have GET handler', () => {
      const content = fs.readFileSync(slugApiPath, 'utf-8');
      expect(content).toMatch(/export const GET/);
    });

    it('should have PATCH handler', () => {
      const content = fs.readFileSync(slugApiPath, 'utf-8');
      expect(content).toMatch(/export const PATCH/);
    });

    it('should have DELETE handler', () => {
      const content = fs.readFileSync(slugApiPath, 'utf-8');
      expect(content).toMatch(/export const DELETE/);
    });
  });
});

describe('LookbookForm and LookbookGallery Integration', () => {
  it('should combine LookbookForm and LookbookGallery in editor', () => {
    // This is validated by the existence of CreateLookbook and EditLookbook
    const createPath = path.join(componentsDir, 'CreateLookbook.tsx');
    const editPath = path.join(componentsDir, 'EditLookbook.tsx');

    const createContent = fs.readFileSync(createPath, 'utf-8');
    const editContent = fs.readFileSync(editPath, 'utf-8');

    // Both should have form and gallery
    expect(createContent).toMatch(/LookbookForm/);
    expect(createContent).toMatch(/LookbookGallery/);
    expect(editContent).toMatch(/LookbookForm/);
    expect(editContent).toMatch(/LookbookGallery/);
  });
});

describe('Page Structure and UX', () => {
  it('new.astro should have proper heading structure', () => {
    const content = fs.readFileSync(path.join(pagesDir, 'new.astro'), 'utf-8');
    expect(content).toMatch(/<h1/);
  });

  it('[slug].astro should have proper heading structure', () => {
    const content = fs.readFileSync(
      path.join(pagesDir, '[slug].astro'),
      'utf-8'
    );
    expect(content).toMatch(/<h1/);
  });

  it('new.astro should have helpful description text', () => {
    const content = fs.readFileSync(path.join(pagesDir, 'new.astro'), 'utf-8');
    // Should have description about what the page does
    expect(content).toMatch(/Create.*lookbook|lookbook.*collection/i);
  });
});
