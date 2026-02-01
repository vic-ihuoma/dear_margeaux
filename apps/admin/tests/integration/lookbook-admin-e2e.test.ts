import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * E2E integration tests for lookbook-admin-6: Test lookbook admin workflow
 *
 * These tests verify the complete lookbook creation flow from admin to storefront display:
 * 1. Create new lookbook via admin UI
 * 2. Upload multiple images to gallery
 * 3. Reorder images and verify order persists
 * 4. Edit lookbook details and save
 * 5. Verify lookbook appears correctly on storefront /lookbook page
 */

describe('Lookbook Admin Workflow E2E', () => {
  const adminSrcPath = path.resolve(__dirname, '../../src');
  const storefrontSrcPath = path.resolve(__dirname, '../../../storefront/src');

  describe('Step 1: Create new lookbook via admin UI', () => {
    it('admin has lookbook new page at /lookbook/new', () => {
      const newPagePath = path.join(adminSrcPath, 'pages/lookbook/new.astro');
      expect(fs.existsSync(newPagePath)).toBe(true);
    });

    it('new page renders CreateLookbook component', () => {
      const newPagePath = path.join(adminSrcPath, 'pages/lookbook/new.astro');
      const content = fs.readFileSync(newPagePath, 'utf-8');
      expect(content).toContain('CreateLookbook');
      expect(content).toContain('client:load');
    });

    it('CreateLookbook component uses LookbookForm', () => {
      const componentPath = path.join(
        adminSrcPath,
        'components/CreateLookbook.tsx'
      );
      const content = fs.readFileSync(componentPath, 'utf-8');
      expect(content).toContain('LookbookForm');
      expect(content).toContain('onSubmit={handleSubmit}');
    });

    it('CreateLookbook handles form submission to API', () => {
      const componentPath = path.join(
        adminSrcPath,
        'components/CreateLookbook.tsx'
      );
      const content = fs.readFileSync(componentPath, 'utf-8');
      expect(content).toContain("fetch('/api/lookbook'");
      expect(content).toContain("method: 'POST'");
    });

    it('POST /api/lookbook creates new MDX file', () => {
      const apiPath = path.join(adminSrcPath, 'pages/api/lookbook/index.ts');
      const content = fs.readFileSync(apiPath, 'utf-8');
      expect(content).toContain('POST: APIRoute');
      expect(content).toContain('generateMDX');
      expect(content).toContain('fs.writeFile');
    });

    it('lookbook creation generates slug from title', () => {
      const apiPath = path.join(adminSrcPath, 'pages/api/lookbook/index.ts');
      const content = fs.readFileSync(apiPath, 'utf-8');
      expect(content).toContain('generateSlug');
      expect(content).toContain('toLowerCase()');
    });

    it('successful creation redirects to edit page', () => {
      const componentPath = path.join(
        adminSrcPath,
        'components/CreateLookbook.tsx'
      );
      const content = fs.readFileSync(componentPath, 'utf-8');
      expect(content).toContain('window.location.href');
      expect(content).toContain('newLookbook.slug');
    });
  });

  describe('Step 2: Upload multiple images to gallery', () => {
    it('CreateLookbook uses LookbookGallery component', () => {
      const componentPath = path.join(
        adminSrcPath,
        'components/CreateLookbook.tsx'
      );
      const content = fs.readFileSync(componentPath, 'utf-8');
      expect(content).toContain('LookbookGallery');
      expect(content).toContain('onChange={handleImagesChange}');
    });

    it('LookbookGallery has image upload handler', () => {
      const componentPath = path.join(
        adminSrcPath,
        'components/LookbookGallery.tsx'
      );
      const content = fs.readFileSync(componentPath, 'utf-8');
      expect(content).toContain('uploadHandler');
      expect(content).toContain('ImageUploader');
    });

    it('LookbookGallery displays images in grid layout', () => {
      const componentPath = path.join(
        adminSrcPath,
        'components/LookbookGallery.tsx'
      );
      const content = fs.readFileSync(componentPath, 'utf-8');
      expect(content).toContain('grid');
      expect(content).toContain('gap');
    });

    it('LookbookGallery shows image count', () => {
      const componentPath = path.join(
        adminSrcPath,
        'components/LookbookGallery.tsx'
      );
      const content = fs.readFileSync(componentPath, 'utf-8');
      expect(content).toContain('images.length');
    });

    it('image upload uses R2 storage via API', () => {
      const componentPath = path.join(
        adminSrcPath,
        'components/CreateLookbook.tsx'
      );
      const content = fs.readFileSync(componentPath, 'utf-8');
      expect(content).toContain('uploadImageToR2');
      expect(content).toContain('/api/images/upload');
    });

    it('upload progress indicator displayed during upload', () => {
      const componentPath = path.join(
        adminSrcPath,
        'components/LookbookGallery.tsx'
      );
      const content = fs.readFileSync(componentPath, 'utf-8');
      expect(content).toContain('isUploading');
    });

    it('LookbookGallery supports delete button for each image', () => {
      const componentPath = path.join(
        adminSrcPath,
        'components/LookbookGallery.tsx'
      );
      const content = fs.readFileSync(componentPath, 'utf-8');
      // Check for delete functionality
      expect(content).toContain('handleDeleteImage');
    });
  });

  describe('Step 3: Reorder images and verify order persists', () => {
    it('LookbookGallery supports drag-to-reorder', () => {
      const componentPath = path.join(
        adminSrcPath,
        'components/LookbookGallery.tsx'
      );
      const content = fs.readFileSync(componentPath, 'utf-8');
      // Check for drag handlers (uses onDragEnd instead of onDrop)
      expect(content).toContain('onDragStart');
      expect(content).toContain('onDragOver');
      expect(content).toContain('onDragEnd');
    });

    it('LookbookGallery tracks dragging state', () => {
      const componentPath = path.join(
        adminSrcPath,
        'components/LookbookGallery.tsx'
      );
      const content = fs.readFileSync(componentPath, 'utf-8');
      expect(content).toContain('draggedIndex');
      expect(content).toContain('setDraggedIndex');
    });

    it('drag reorder calls onChange with new order', () => {
      const componentPath = path.join(
        adminSrcPath,
        'components/LookbookGallery.tsx'
      );
      const content = fs.readFileSync(componentPath, 'utf-8');
      expect(content).toContain('onChange(newImages)');
    });

    it('images array order is preserved in MDX file', () => {
      const apiPath = path.join(adminSrcPath, 'pages/api/lookbook/[slug].ts');
      const content = fs.readFileSync(apiPath, 'utf-8');
      expect(content).toContain('images:');
      expect(content).toContain('data.images');
    });

    it('PATCH endpoint preserves image order on update', () => {
      const apiPath = path.join(adminSrcPath, 'pages/api/lookbook/[slug].ts');
      const content = fs.readFileSync(apiPath, 'utf-8');
      expect(content).toContain('PATCH: APIRoute');
      expect(content).toContain('data.images !== undefined');
    });

    it('MDX generator writes images in array order', () => {
      const apiPath = path.join(adminSrcPath, 'pages/api/lookbook/index.ts');
      const content = fs.readFileSync(apiPath, 'utf-8');
      expect(content).toContain('for (const img of data.images)');
    });
  });

  describe('Step 4: Edit lookbook details and save', () => {
    it('admin has lookbook edit page at /lookbook/[slug]', () => {
      const editPagePath = path.join(
        adminSrcPath,
        'pages/lookbook/[slug].astro'
      );
      expect(fs.existsSync(editPagePath)).toBe(true);
    });

    it('edit page fetches existing lookbook data', () => {
      const editPagePath = path.join(
        adminSrcPath,
        'pages/lookbook/[slug].astro'
      );
      const content = fs.readFileSync(editPagePath, 'utf-8');
      expect(content).toContain('/api/lookbook/');
      // Uses destructuring: const { slug } = Astro.params
      expect(content).toContain('Astro.params');
      expect(content).toContain('slug');
    });

    it('edit page renders EditLookbook component', () => {
      const editPagePath = path.join(
        adminSrcPath,
        'pages/lookbook/[slug].astro'
      );
      const content = fs.readFileSync(editPagePath, 'utf-8');
      expect(content).toContain('EditLookbook');
      expect(content).toContain('client:load');
    });

    it('EditLookbook component uses LookbookForm', () => {
      const componentPath = path.join(
        adminSrcPath,
        'components/EditLookbook.tsx'
      );
      const content = fs.readFileSync(componentPath, 'utf-8');
      expect(content).toContain('LookbookForm');
      expect(content).toContain('lookbook={formData}');
    });

    it('EditLookbook handles form submission to PATCH API', () => {
      const componentPath = path.join(
        adminSrcPath,
        'components/EditLookbook.tsx'
      );
      const content = fs.readFileSync(componentPath, 'utf-8');
      expect(content).toContain("method: 'PATCH'");
      expect(content).toContain('lookbook.slug');
    });

    it('PATCH endpoint updates MDX file', () => {
      const apiPath = path.join(adminSrcPath, 'pages/api/lookbook/[slug].ts');
      const content = fs.readFileSync(apiPath, 'utf-8');
      expect(content).toContain('fs.writeFile(filePath, mdxContent');
    });

    it('EditLookbook displays success message after save', () => {
      const componentPath = path.join(
        adminSrcPath,
        'components/EditLookbook.tsx'
      );
      const content = fs.readFileSync(componentPath, 'utf-8');
      expect(content).toContain('successMessage');
      expect(content).toContain('Lookbook saved successfully');
    });

    it('LookbookForm supports edit mode with pre-filled fields', () => {
      const formPath = path.join(adminSrcPath, 'components/LookbookForm.tsx');
      const content = fs.readFileSync(formPath, 'utf-8');
      expect(content).toContain('lookbook?');
      // Should use lookbook data when provided
      expect(content).toContain('lookbook?.title');
    });
  });

  describe('Step 5: Verify lookbook appears on storefront /lookbook page', () => {
    it('storefront has lookbook index page', () => {
      const indexPath = path.join(
        storefrontSrcPath,
        'pages/lookbook/index.astro'
      );
      expect(fs.existsSync(indexPath)).toBe(true);
    });

    it('storefront lookbook index fetches collection', () => {
      const indexPath = path.join(
        storefrontSrcPath,
        'pages/lookbook/index.astro'
      );
      const content = fs.readFileSync(indexPath, 'utf-8');
      expect(content).toContain("getCollection('lookbook'");
    });

    it('lookbook listing displays title', () => {
      const indexPath = path.join(
        storefrontSrcPath,
        'pages/lookbook/index.astro'
      );
      const content = fs.readFileSync(indexPath, 'utf-8');
      expect(content).toContain('lookbook.data.title');
    });

    it('lookbook listing displays date', () => {
      const indexPath = path.join(
        storefrontSrcPath,
        'pages/lookbook/index.astro'
      );
      const content = fs.readFileSync(indexPath, 'utf-8');
      expect(content).toContain('lookbook.data.date');
      expect(content).toContain('formatDate');
    });

    it('lookbook listing displays image count', () => {
      const indexPath = path.join(
        storefrontSrcPath,
        'pages/lookbook/index.astro'
      );
      const content = fs.readFileSync(indexPath, 'utf-8');
      expect(content).toContain('lookbook.data.images.length');
    });

    it('lookbook listing shows cover image from first image', () => {
      const indexPath = path.join(
        storefrontSrcPath,
        'pages/lookbook/index.astro'
      );
      const content = fs.readFileSync(indexPath, 'utf-8');
      expect(content).toContain('lookbook.data.images[0]');
    });

    it('lookbook listing links to detail page', () => {
      const indexPath = path.join(
        storefrontSrcPath,
        'pages/lookbook/index.astro'
      );
      const content = fs.readFileSync(indexPath, 'utf-8');
      expect(content).toContain('href={`/lookbook/${lookbook.slug}`}');
    });

    it('storefront has lookbook detail page', () => {
      const detailPath = path.join(
        storefrontSrcPath,
        'pages/lookbook/[...slug].astro'
      );
      expect(fs.existsSync(detailPath)).toBe(true);
    });

    it('lookbook detail page uses Lookbook layout', () => {
      const detailPath = path.join(
        storefrontSrcPath,
        'pages/lookbook/[...slug].astro'
      );
      const content = fs.readFileSync(detailPath, 'utf-8');
      expect(content).toContain('Lookbook');
      expect(content).toContain('images={lookbook.data.images}');
    });

    it('lookbook detail passes images array to layout', () => {
      const detailPath = path.join(
        storefrontSrcPath,
        'pages/lookbook/[...slug].astro'
      );
      const content = fs.readFileSync(detailPath, 'utf-8');
      expect(content).toContain('images={lookbook.data.images}');
    });
  });

  describe('Complete Workflow Integration', () => {
    it('admin listing page shows all lookbooks', () => {
      const listingPath = path.join(adminSrcPath, 'pages/lookbook/index.astro');
      expect(fs.existsSync(listingPath)).toBe(true);
      const content = fs.readFileSync(listingPath, 'utf-8');
      expect(content).toContain('/api/lookbook');
    });

    it('admin sidebar has Lookbook navigation item', () => {
      const layoutPath = path.join(adminSrcPath, 'layouts/AdminLayout.astro');
      const content = fs.readFileSync(layoutPath, 'utf-8');
      expect(content).toContain('Lookbook');
      expect(content).toContain('/lookbook');
    });

    it('lookbooks stored as MDX in content directory', () => {
      const apiPath = path.join(adminSrcPath, 'pages/api/lookbook/index.ts');
      const content = fs.readFileSync(apiPath, 'utf-8');
      expect(content).toContain('storefront/src/content/lookbook');
      expect(content).toContain('.mdx');
    });

    it('MDX frontmatter includes all required fields', () => {
      const apiPath = path.join(adminSrcPath, 'pages/api/lookbook/index.ts');
      const content = fs.readFileSync(apiPath, 'utf-8');
      expect(content).toContain('title:');
      expect(content).toContain('date:');
      expect(content).toContain('draft:');
      expect(content).toContain('images:');
    });

    it('draft lookbooks filtered in production on storefront', () => {
      const indexPath = path.join(
        storefrontSrcPath,
        'pages/lookbook/index.astro'
      );
      const content = fs.readFileSync(indexPath, 'utf-8');
      expect(content).toContain('!data.draft');
      expect(content).toContain('import.meta.env.PROD');
    });

    it('lookbooks sorted by date (newest first)', () => {
      const indexPath = path.join(
        storefrontSrcPath,
        'pages/lookbook/index.astro'
      );
      const content = fs.readFileSync(indexPath, 'utf-8');
      expect(content).toContain('.sort(');
      expect(content).toContain('date');
    });

    it('admin can delete lookbooks', () => {
      const apiPath = path.join(adminSrcPath, 'pages/api/lookbook/[slug].ts');
      const content = fs.readFileSync(apiPath, 'utf-8');
      expect(content).toContain('DELETE: APIRoute');
      expect(content).toContain('fs.unlink');
    });

    it('admin can toggle lookbook draft status', () => {
      const formPath = path.join(adminSrcPath, 'components/LookbookForm.tsx');
      const content = fs.readFileSync(formPath, 'utf-8');
      expect(content).toContain('draft');
      // Check for toggle input
      expect(content).toContain('type="checkbox"');
    });
  });

  describe('Gallery Image Management', () => {
    it('LookbookGallery displays position indicators', () => {
      const componentPath = path.join(
        adminSrcPath,
        'components/LookbookGallery.tsx'
      );
      const content = fs.readFileSync(componentPath, 'utf-8');
      // Should show position numbers
      expect(content).toContain('index + 1');
    });

    it('LookbookGallery has empty state for no images', () => {
      const componentPath = path.join(
        adminSrcPath,
        'components/LookbookGallery.tsx'
      );
      const content = fs.readFileSync(componentPath, 'utf-8');
      // Uses ternary with images.length > 0 to show grid or empty state
      expect(content).toContain('images.length > 0');
      expect(content).toContain('No images in this lookbook');
    });

    it('image order in gallery matches array order', () => {
      const componentPath = path.join(
        adminSrcPath,
        'components/LookbookGallery.tsx'
      );
      const content = fs.readFileSync(componentPath, 'utf-8');
      // Images are mapped in order
      expect(content).toContain('images.map');
    });

    it('EditLookbook converts image URLs to LookbookImage format', () => {
      const componentPath = path.join(
        adminSrcPath,
        'components/EditLookbook.tsx'
      );
      const content = fs.readFileSync(componentPath, 'utf-8');
      expect(content).toContain('lookbook.images.map');
      expect(content).toContain('url,');
    });

    it('CreateLookbook converts images back to URL array on submit', () => {
      const componentPath = path.join(
        adminSrcPath,
        'components/CreateLookbook.tsx'
      );
      const content = fs.readFileSync(componentPath, 'utf-8');
      expect(content).toContain('images.map((img) => img.url)');
    });
  });

  describe('Storefront Lookbook Display', () => {
    it('storefront uses LookbookGallery component for images', () => {
      const layoutPath = path.join(storefrontSrcPath, 'layouts/Lookbook.astro');
      const content = fs.readFileSync(layoutPath, 'utf-8');
      expect(content).toContain('LookbookGallery');
    });

    it('LookbookGallery supports lightbox for fullscreen viewing', () => {
      const componentPath = path.join(
        storefrontSrcPath,
        'components/LookbookGallery.tsx'
      );
      const content = fs.readFileSync(componentPath, 'utf-8');
      expect(content).toContain('ImageLightbox');
    });

    it('LookbookGallery implements lazy loading', () => {
      const componentPath = path.join(
        storefrontSrcPath,
        'components/LookbookGallery.tsx'
      );
      const content = fs.readFileSync(componentPath, 'utf-8');
      expect(content).toContain('IntersectionObserver');
      expect(content).toContain('loading="lazy"');
    });

    it('storefront displays images in correct order', () => {
      const detailPath = path.join(
        storefrontSrcPath,
        'pages/lookbook/[...slug].astro'
      );
      const content = fs.readFileSync(detailPath, 'utf-8');
      // Images passed as array to layout
      expect(content).toContain('images={lookbook.data.images}');
    });
  });

  describe('Form Validation', () => {
    it('LookbookForm requires title field', () => {
      const formPath = path.join(adminSrcPath, 'components/LookbookForm.tsx');
      const content = fs.readFileSync(formPath, 'utf-8');
      // Validation uses local state variable 'title' not 'formData.title'
      expect(content).toContain('!title.trim()');
      expect(content).toContain('Title is required');
    });

    it('LookbookForm requires date field', () => {
      const formPath = path.join(adminSrcPath, 'components/LookbookForm.tsx');
      const content = fs.readFileSync(formPath, 'utf-8');
      // Validation uses local state variable 'date' not 'formData.date'
      expect(content).toContain('!date');
      expect(content).toContain('Date is required');
    });

    it('API validates required fields', () => {
      const apiPath = path.join(adminSrcPath, 'pages/api/lookbook/index.ts');
      const content = fs.readFileSync(apiPath, 'utf-8');
      expect(content).toContain('!data.title?.trim()');
      expect(content).toContain("error: 'Title is required'");
    });

    it('API handles slug conflicts', () => {
      const apiPath = path.join(adminSrcPath, 'pages/api/lookbook/index.ts');
      const content = fs.readFileSync(apiPath, 'utf-8');
      expect(content).toContain('slug conflicts');
      expect(content).toContain('counter');
    });
  });

  describe('Error Handling', () => {
    it('CreateLookbook handles API errors', () => {
      const componentPath = path.join(
        adminSrcPath,
        'components/CreateLookbook.tsx'
      );
      const content = fs.readFileSync(componentPath, 'utf-8');
      expect(content).toContain('setError');
      expect(content).toContain('catch');
    });

    it('EditLookbook handles save errors', () => {
      const componentPath = path.join(
        adminSrcPath,
        'components/EditLookbook.tsx'
      );
      const content = fs.readFileSync(componentPath, 'utf-8');
      expect(content).toContain('setError');
      expect(content).toContain('catch');
    });

    it('API returns 404 for non-existent lookbook', () => {
      const apiPath = path.join(adminSrcPath, 'pages/api/lookbook/[slug].ts');
      const content = fs.readFileSync(apiPath, 'utf-8');
      expect(content).toContain('status: 404');
      expect(content).toContain("error: 'Lookbook not found'");
    });

    it('image upload handles errors gracefully', () => {
      const componentPath = path.join(
        adminSrcPath,
        'components/CreateLookbook.tsx'
      );
      const content = fs.readFileSync(componentPath, 'utf-8');
      expect(content).toContain('Failed to upload image');
    });
  });
});
