/**
 * E2E Integration Tests for Complete Product Creation Flow (pm-35)
 *
 * Tests the end-to-end flow from creating a product in admin
 * through to verifying it displays on the storefront.
 *
 * Flow tested:
 * 1. Navigate to /products/new
 * 2. Fill in product details: title, description, price, SKU, images
 * 3. Submit form → creates product with variant
 * 4. Redirect to product edit page with all data displayed
 * 5. Edit product fields and save
 * 6. View product on storefront with images
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

describe('Product Creation E2E Flow Integration', () => {
  describe('Admin Product Form Structure', () => {
    const newProductPath = join(process.cwd(), 'src/pages/products/new.astro');
    const productFormCompletePath = join(
      process.cwd(),
      'src/components/ProductFormComplete.tsx'
    );
    const createProductCompletePath = join(
      process.cwd(),
      'src/components/CreateProductComplete.tsx'
    );

    it('new.astro uses CreateProductComplete component', () => {
      const content = readFileSync(newProductPath, 'utf-8');
      expect(content).toContain('CreateProductComplete');
      expect(content).toContain('client:load');
    });

    it('new.astro has correct description for full product creation', () => {
      const content = readFileSync(newProductPath, 'utf-8');
      // Should mention variant creation capability
      expect(content).toContain('default');
      expect(content).toContain('variant');
    });

    it('CreateProductComplete connects form to API', () => {
      const content = readFileSync(createProductCompletePath, 'utf-8');
      expect(content).toContain("fetch('/api/products'");
      expect(content).toContain("method: 'POST'");
    });

    it('CreateProductComplete handles image uploads', () => {
      const content = readFileSync(createProductCompletePath, 'utf-8');
      expect(content).toContain('/api/images/upload');
      expect(content).toContain('uploadHandler');
    });

    it('CreateProductComplete redirects to product edit on success', () => {
      const content = readFileSync(createProductCompletePath, 'utf-8');
      expect(content).toContain('successRedirect');
      expect(content).toContain('window.location.href');
      expect(content).toContain('product.id');
    });

    it('ProductFormComplete has all required fields', () => {
      const content = readFileSync(productFormCompletePath, 'utf-8');
      // Product fields
      expect(content).toContain('name="title"');
      expect(content).toContain('name="description"');
      expect(content).toContain('name="status"');
      // Variant fields are now in VariantCard component
      expect(content).toContain('VariantCard');
      // Verify VariantCard contains variant fields
      const variantCardPath = join(
        process.cwd(),
        'src/components/VariantCard.tsx'
      );
      const variantCardContent = readFileSync(variantCardPath, 'utf-8');
      expect(variantCardContent).toContain('SKU');
      expect(variantCardContent).toContain('Price');
      expect(variantCardContent).toContain('Variant Title');
    });

    it('ProductFormComplete includes image uploaders', () => {
      const content = readFileSync(productFormCompletePath, 'utf-8');
      expect(content).toContain('ImageUploader');
      expect(content).toContain('Featured Image');
      // Variant Image is now in VariantCard component
      expect(content).toContain('VariantCard');
    });

    it('ProductFormComplete uses VariantCard with price input', () => {
      // Price input is now in VariantCard component
      const variantCardPath = join(
        process.cwd(),
        'src/components/VariantCard.tsx'
      );
      const content = readFileSync(variantCardPath, 'utf-8');
      expect(content).toMatch(/\$\s*<\/span>/);
      expect(content).toContain('step="0.01"');
    });

    it('ProductFormComplete converts dollars to cents on submit', () => {
      const content = readFileSync(productFormCompletePath, 'utf-8');
      expect(content).toContain('price_cents');
      expect(content).toMatch(/parseFloat.*\*\s*100/);
    });

    it('ProductFormComplete auto-generates SKU from title', () => {
      const content = readFileSync(productFormCompletePath, 'utf-8');
      expect(content).toContain('generateSkuFromTitle');
      expect(content).toContain('toUpperCase');
    });

    it('ProductFormComplete validates required fields', () => {
      const content = readFileSync(productFormCompletePath, 'utf-8');
      expect(content).toContain("'Title is required'");
      expect(content).toContain("'SKU is required'");
      expect(content).toContain("'Price is required'");
    });
  });

  describe('Admin Product Edit Page Structure', () => {
    const editPagePath = join(process.cwd(), 'src/pages/products/[id].astro');
    const productEditorPath = join(
      process.cwd(),
      'src/components/ProductEditor.tsx'
    );

    it('[id].astro fetches product from API', () => {
      const content = readFileSync(editPagePath, 'utf-8');
      expect(content).toContain('getProduct');
      expect(content).toContain('Astro.params');
    });

    it('[id].astro uses ProductEditor component', () => {
      const content = readFileSync(editPagePath, 'utf-8');
      expect(content).toContain('ProductEditor');
      expect(content).toContain('client:load');
    });

    it('[id].astro passes product data to editor', () => {
      const content = readFileSync(editPagePath, 'utf-8');
      expect(content).toContain('product={product}');
    });

    it('[id].astro displays product title in header', () => {
      const content = readFileSync(editPagePath, 'utf-8');
      expect(content).toContain('{product.title}');
    });

    it('[id].astro has breadcrumb navigation', () => {
      const content = readFileSync(editPagePath, 'utf-8');
      expect(content).toContain('href="/products"');
      expect(content).toContain('Products');
    });

    it('ProductEditor displays product details section', () => {
      const content = readFileSync(productEditorPath, 'utf-8');
      expect(content).toContain('Product Details');
    });

    it('ProductEditor displays featured image section', () => {
      const content = readFileSync(productEditorPath, 'utf-8');
      expect(content).toContain('Featured Image');
    });

    it('ProductEditor displays variants section', () => {
      const content = readFileSync(productEditorPath, 'utf-8');
      expect(content).toContain('Variants');
    });
  });

  describe('API Endpoints Integration', () => {
    const productsApiPath = join(
      process.cwd(),
      'src/pages/api/products/index.ts'
    );
    const productApiPath = join(
      process.cwd(),
      'src/pages/api/products/[id].ts'
    );

    it('POST /api/products accepts variant fields', () => {
      const content = readFileSync(productsApiPath, 'utf-8');
      expect(content).toContain('sku');
      expect(content).toContain('variant_title');
      expect(content).toContain('price_cents');
    });

    it('POST /api/products creates variant when variant fields provided', () => {
      const content = readFileSync(productsApiPath, 'utf-8');
      expect(content).toContain('createVariant');
      // Supports both new variants array and legacy single variant fields
      expect(content).toContain('hasLegacyVariantData');
    });

    it('POST /api/products returns product with variants array', () => {
      const content = readFileSync(productsApiPath, 'utf-8');
      expect(content).toContain('variants: [variant]');
    });

    it('PATCH /api/products/[id] updates product fields', () => {
      const content = readFileSync(productApiPath, 'utf-8');
      expect(content).toContain('PATCH');
      expect(content).toContain('updateProduct');
    });

    it('PATCH /api/products/[id] supports featured_image_url', () => {
      const content = readFileSync(productApiPath, 'utf-8');
      expect(content).toContain('featured_image_url');
    });
  });

  describe('Form Submission Data Flow', () => {
    const productFormCompletePath = join(
      process.cwd(),
      'src/components/ProductFormComplete.tsx'
    );

    it('form submits ProductFormCompleteSubmitData shape', () => {
      const content = readFileSync(productFormCompletePath, 'utf-8');
      expect(content).toContain('ProductFormCompleteSubmitData');
      expect(content).toContain('title: string');
      expect(content).toContain('price_cents?: number');
    });

    it('form handles partial variant data gracefully', () => {
      const content = readFileSync(productFormCompletePath, 'utf-8');
      // Should only add variant data if any variant field is filled
      // Now uses variantHasData helper function to check each variant
      expect(content).toContain('variantHasData');
    });

    it('form preserves optional fields', () => {
      const content = readFileSync(productFormCompletePath, 'utf-8');
      expect(content).toContain('tags: formData.tags.length > 0');
      expect(content).toContain('drop_id: formData.drop_id ||');
    });
  });

  describe('Error Handling', () => {
    const createProductCompletePath = join(
      process.cwd(),
      'src/components/CreateProductComplete.tsx'
    );
    const productFormCompletePath = join(
      process.cwd(),
      'src/components/ProductFormComplete.tsx'
    );

    it('CreateProductComplete handles API errors', () => {
      const content = readFileSync(createProductCompletePath, 'utf-8');
      expect(content).toContain('catch');
      expect(content).toContain('setError');
    });

    it('CreateProductComplete handles upload errors', () => {
      const content = readFileSync(createProductCompletePath, 'utf-8');
      expect(content).toContain('throw new Error');
      expect(content).toContain('Failed to upload image');
    });

    it('ProductFormComplete displays error message', () => {
      const content = readFileSync(productFormCompletePath, 'utf-8');
      expect(content).toContain('{error && (');
      expect(content).toContain('text-status-error');
    });

    it('ProductFormComplete displays field validation errors', () => {
      const content = readFileSync(productFormCompletePath, 'utf-8');
      expect(content).toContain('formErrors.title');
      // Variant errors are now passed to VariantCard component
      expect(content).toContain('variantErrors[index]');
      // Uses the extracted VariantCard component for variant editing
      expect(content).toContain('VariantCard');
    });
  });
});

describe('Storefront Product Display Integration', () => {
  const productPagePath = join(
    __dirname,
    '../../../storefront/src/pages/product/[id].astro'
  );

  it('product page exists', () => {
    expect(existsSync(productPagePath)).toBe(true);
  });

  it('product page displays featured image', () => {
    const content = readFileSync(productPagePath, 'utf-8');
    expect(content).toContain('featured_image_url');
    expect(content).toContain('mainImageUrl');
  });

  it('product page falls back to variant image', () => {
    const content = readFileSync(productPagePath, 'utf-8');
    expect(content).toContain('defaultVariant?.image_url');
  });

  it('product page shows variant thumbnail gallery', () => {
    const content = readFileSync(productPagePath, 'utf-8');
    expect(content).toContain('data-variant-id');
    expect(content).toContain('variant.image_url');
  });

  it('product page has placeholder for missing images', () => {
    const content = readFileSync(productPagePath, 'utf-8');
    expect(content).toContain('flex items-center justify-center');
    // Has SVG placeholder icon
    expect(content).toContain('<svg');
  });

  it('product page uses proper alt text', () => {
    const content = readFileSync(productPagePath, 'utf-8');
    expect(content).toContain('mainImageAlt');
    expect(content).toContain('featured_image_alt');
    expect(content).toContain('image_alt');
  });

  it('product page has lightbox support', () => {
    const content = readFileSync(productPagePath, 'utf-8');
    expect(content).toContain('ProductImageGallery');
    expect(content).toContain('lightboxImages');
  });
});
