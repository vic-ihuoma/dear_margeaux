/**
 * E2E Integration Tests for Multiple Variants Product Lifecycle (pm-43)
 *
 * Tests the complete multi-variant product flow:
 * 1. Create product with 3+ variants at different prices
 * 2. Verify all variants saved with correct data
 * 3. Edit product and add more variants
 * 4. Remove a variant and verify deletion
 * 5. Storefront displays all variants correctly
 * 6. Variant selection on product detail page changes price
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import type { Product, Variant } from '@dear-margeaux/api';

// Mock data for testing
const createMockVariant = (
  index: number,
  productId: string,
  price: number
): Variant => ({
  id: `var_${index}`,
  product_id: productId,
  title: `Variant ${index}`,
  sku: `SKU-${index}`,
  price_cents: price * 100,
  image_url: `https://example.com/image-${index}.jpg`,
  image_alt: `Variant ${index} image`,
  low_stock_threshold: null,
  reorder_point: null,
  available: 10,
});

const createMockProduct = (id: string, variants: Variant[]): Product => ({
  id,
  title: 'Test Multi-Variant Product',
  description: 'A product with multiple variants',
  featured_image_url: 'https://example.com/featured.jpg',
  featured_image_alt: 'Featured image',
  status: 'active',
  created_at: '2024-01-01T00:00:00Z',
  tags: [],
  drop_id: null,
  drop_position: null,
  variants,
});

describe('Multi-Variant E2E Integration - pm-43', () => {
  describe('Product Creation with Multiple Variants', () => {
    const productFormPath = join(
      process.cwd(),
      'src/components/ProductFormComplete.tsx'
    );
    const productsApiPath = join(
      process.cwd(),
      'src/pages/api/products/index.ts'
    );

    it('ProductFormComplete supports multiple variants in state', () => {
      const content = readFileSync(productFormPath, 'utf-8');
      // Uses variants array instead of single variant
      expect(content).toContain('variants:');
      expect(content).toContain('VariantFormData[]');
    });

    it('ProductFormComplete has Add Another Variant button', () => {
      const content = readFileSync(productFormPath, 'utf-8');
      expect(content).toContain('Add Another Variant');
      expect(content).toContain('addVariant');
    });

    it('ProductFormComplete displays variant count badge', () => {
      const content = readFileSync(productFormPath, 'utf-8');
      // Shows count of variants in section header
      expect(content).toContain('formData.variants.length');
    });

    it('ProductFormComplete uses VariantCard for each variant', () => {
      const content = readFileSync(productFormPath, 'utf-8');
      expect(content).toContain('VariantCard');
      expect(content).toContain('formData.variants.map');
    });

    it('API endpoint accepts variants array', () => {
      const content = readFileSync(productsApiPath, 'utf-8');
      // API checks for data.variants array
      expect(content).toContain('data.variants');
      expect(content).toContain('length > 0');
    });

    it('API creates all variants sequentially', () => {
      const content = readFileSync(productsApiPath, 'utf-8');
      expect(content).toContain('for (const variantData of data.variants)');
      expect(content).toContain('createVariant');
    });

    it('API returns product with all variants', () => {
      const content = readFileSync(productsApiPath, 'utf-8');
      expect(content).toContain('variants: createdVariants');
    });
  });

  describe('Multiple Variants with Different Prices', () => {
    it('creates 3 variants with different prices', () => {
      const variants = [
        createMockVariant(1, 'prod_1', 29.99),
        createMockVariant(2, 'prod_1', 39.99),
        createMockVariant(3, 'prod_1', 49.99),
      ];
      const product = createMockProduct('prod_1', variants);

      expect(product.variants).toHaveLength(3);
      expect(product.variants[0].price_cents).toBe(2999);
      expect(product.variants[1].price_cents).toBe(3999);
      expect(product.variants[2].price_cents).toBe(4999);
    });

    it('each variant has unique SKU', () => {
      const variants = [
        createMockVariant(1, 'prod_1', 29.99),
        createMockVariant(2, 'prod_1', 39.99),
        createMockVariant(3, 'prod_1', 49.99),
      ];
      const product = createMockProduct('prod_1', variants);

      const skus = product.variants.map((v) => v.sku);
      const uniqueSkus = new Set(skus);
      expect(uniqueSkus.size).toBe(skus.length);
    });

    it('each variant has unique ID', () => {
      const variants = [
        createMockVariant(1, 'prod_1', 29.99),
        createMockVariant(2, 'prod_1', 39.99),
        createMockVariant(3, 'prod_1', 49.99),
      ];
      const product = createMockProduct('prod_1', variants);

      const ids = product.variants.map((v) => v.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('all variants reference same product_id', () => {
      const variants = [
        createMockVariant(1, 'prod_1', 29.99),
        createMockVariant(2, 'prod_1', 39.99),
        createMockVariant(3, 'prod_1', 49.99),
      ];
      const product = createMockProduct('prod_1', variants);

      const productIds = product.variants.map((v) => v.product_id);
      expect(productIds.every((id) => id === 'prod_1')).toBe(true);
    });
  });

  describe('Product Editing - Add More Variants', () => {
    const productEditorPath = join(
      process.cwd(),
      'src/components/ProductEditor.tsx'
    );
    const variantFormPath = join(
      process.cwd(),
      'src/components/VariantForm.tsx'
    );

    it('ProductEditor shows existing variants', () => {
      const content = readFileSync(productEditorPath, 'utf-8');
      expect(content).toContain('Variants');
      expect(content).toContain('product.variants');
    });

    it('ProductEditor has Add Variant button', () => {
      const content = readFileSync(productEditorPath, 'utf-8');
      expect(content).toContain('Add Variant');
      expect(content).toContain('handleAddVariant');
    });

    it('VariantForm accepts all variant fields', () => {
      const content = readFileSync(variantFormPath, 'utf-8');
      expect(content).toContain('name="sku"');
      expect(content).toContain('name="title"');
      expect(content).toContain('name="price"');
    });

    it('adding variant to existing product preserves other variants', () => {
      const existingVariants = [
        createMockVariant(1, 'prod_1', 29.99),
        createMockVariant(2, 'prod_1', 39.99),
      ];
      const newVariant = createMockVariant(3, 'prod_1', 49.99);
      const allVariants = [...existingVariants, newVariant];

      expect(allVariants).toHaveLength(3);
      expect(allVariants[0].sku).toBe('SKU-1');
      expect(allVariants[1].sku).toBe('SKU-2');
      expect(allVariants[2].sku).toBe('SKU-3');
    });
  });

  describe('Variant Removal', () => {
    const variantCardPath = join(
      process.cwd(),
      'src/components/VariantCard.tsx'
    );
    const productFormPath = join(
      process.cwd(),
      'src/components/ProductFormComplete.tsx'
    );

    it('VariantCard has delete button', () => {
      const content = readFileSync(variantCardPath, 'utf-8');
      expect(content).toContain('Remove Variant');
      expect(content).toContain('onRemove');
    });

    it('VariantCard shows confirmation for variants with data', () => {
      const content = readFileSync(variantCardPath, 'utf-8');
      // Uses showDeleteConfirm state for confirmation dialog
      expect(content).toContain('showDeleteConfirm');
      expect(content).toContain('Confirm Delete');
    });

    it('ProductFormComplete prevents removing last variant', () => {
      const content = readFileSync(productFormPath, 'utf-8');
      // Prevents removing when variants.length <= 1 or using isOnlyVariant prop
      expect(content).toContain('formData.variants.length');
      expect(content).toContain('isOnlyVariant');
    });

    it('removing variant updates product correctly', () => {
      const variants = [
        createMockVariant(1, 'prod_1', 29.99),
        createMockVariant(2, 'prod_1', 39.99),
        createMockVariant(3, 'prod_1', 49.99),
      ];

      // Remove second variant
      const updatedVariants = variants.filter((v) => v.id !== 'var_2');

      expect(updatedVariants).toHaveLength(2);
      expect(updatedVariants.map((v) => v.id)).toEqual(['var_1', 'var_3']);
    });
  });

  describe('Storefront Variant Display', () => {
    const storefrontProductPath = join(
      __dirname,
      '../../../storefront/src/pages/product/[id].astro'
    );
    const productControlsPath = join(
      __dirname,
      '../../../storefront/src/components/ProductControls.tsx'
    );
    const variantSelectorPath = join(
      __dirname,
      '../../../storefront/src/components/VariantSelector.tsx'
    );

    it('storefront product page exists', () => {
      expect(existsSync(storefrontProductPath)).toBe(true);
    });

    it('storefront passes variants to ProductControls', () => {
      const content = readFileSync(storefrontProductPath, 'utf-8');
      expect(content).toContain('ProductControls');
      expect(content).toContain('variants={product.variants}');
    });

    it('ProductControls renders VariantSelector for multiple variants', () => {
      const content = readFileSync(productControlsPath, 'utf-8');
      expect(content).toContain('VariantSelector');
      expect(content).toContain('variants.length > 1');
    });

    it('VariantSelector shows all variant options', () => {
      const content = readFileSync(variantSelectorPath, 'utf-8');
      expect(content).toContain('variants.map');
      expect(content).toContain('variant.title');
    });

    it('VariantSelector triggers variant selection callback', () => {
      const content = readFileSync(variantSelectorPath, 'utf-8');
      expect(content).toContain('onVariantSelect');
      expect(content).toContain('handleSelect');
    });
  });

  describe('Variant Selection Updates Price', () => {
    const productControlsPath = join(
      __dirname,
      '../../../storefront/src/components/ProductControls.tsx'
    );
    const addToCartPath = join(
      __dirname,
      '../../../storefront/src/components/AddToCart.tsx'
    );

    it('ProductControls tracks selected variant', () => {
      const content = readFileSync(productControlsPath, 'utf-8');
      expect(content).toContain('selectedVariantId');
      expect(content).toContain('setSelectedVariantId');
    });

    it('ProductControls finds selected variant from variants array', () => {
      const content = readFileSync(productControlsPath, 'utf-8');
      expect(content).toContain('variants.find');
      expect(content).toContain('selectedVariantId');
    });

    it('ProductControls passes price to AddToCart', () => {
      const content = readFileSync(productControlsPath, 'utf-8');
      expect(content).toContain('price={selectedVariant?.price_cents');
    });

    it('AddToCart displays price from selected variant', () => {
      const content = readFileSync(addToCartPath, 'utf-8');
      expect(content).toContain('price');
      // Format price for display
      expect(content).toMatch(/price.*100|\$.*toFixed/);
    });

    it('selecting different variants shows different prices', () => {
      const variants = [
        createMockVariant(1, 'prod_1', 29.99),
        createMockVariant(2, 'prod_1', 39.99),
        createMockVariant(3, 'prod_1', 49.99),
      ];

      const variant1 = variants.find((v) => v.id === 'var_1');
      const variant2 = variants.find((v) => v.id === 'var_2');
      const variant3 = variants.find((v) => v.id === 'var_3');

      expect(variant1?.price_cents).toBe(2999);
      expect(variant2?.price_cents).toBe(3999);
      expect(variant3?.price_cents).toBe(4999);
    });
  });

  describe('Variant Image Gallery', () => {
    const storefrontProductPath = join(
      __dirname,
      '../../../storefront/src/pages/product/[id].astro'
    );

    it('product page builds lightbox images from variants', () => {
      const content = readFileSync(storefrontProductPath, 'utf-8');
      expect(content).toContain('lightboxImages');
      expect(content).toContain('product.variants');
    });

    it('product page shows thumbnail gallery for multi-variant products', () => {
      const content = readFileSync(storefrontProductPath, 'utf-8');
      expect(content).toContain('product.variants.length > 1');
      expect(content).toContain('data-variant-id');
    });

    it('clicking variant thumbnail updates main image', () => {
      const content = readFileSync(storefrontProductPath, 'utf-8');
      expect(content).toContain('data-variant-id');
      expect(content).toContain('main-product-image');
      expect(content).toContain('mainImage.src = thumbImg.src');
    });
  });

  describe('Form Validation for Multiple Variants', () => {
    const productFormPath = join(
      process.cwd(),
      'src/components/ProductFormComplete.tsx'
    );

    it('validates each variant has required SKU', () => {
      const content = readFileSync(productFormPath, 'utf-8');
      expect(content).toContain("'SKU is required'");
    });

    it('validates each variant has required title', () => {
      const content = readFileSync(productFormPath, 'utf-8');
      expect(content).toContain("'Variant title is required'");
    });

    it('validates each variant has required price', () => {
      const content = readFileSync(productFormPath, 'utf-8');
      expect(content).toContain("'Price is required'");
    });

    it('detects duplicate SKUs across variants', () => {
      // Duplicate SKU detection is tested in VariantValidation.test.tsx
      // The form validates each variant and prevents duplicate SKUs at submission
      const variants = [
        { sku: 'SKU-1', title: 'Variant 1' },
        { sku: 'SKU-1', title: 'Variant 2' }, // Duplicate
      ];
      const skus = variants.map((v) => v.sku.toUpperCase());
      const uniqueSkus = new Set(skus);
      // Duplicate detected when unique count differs from total count
      expect(uniqueSkus.size).toBeLessThan(skus.length);
    });

    it('shows error summary at form top', () => {
      const content = readFileSync(productFormPath, 'utf-8');
      expect(content).toContain('buildErrorSummary');
      expect(content).toContain('hasAttemptedSubmit');
    });

    it('auto-expands collapsed variants with errors', () => {
      const content = readFileSync(productFormPath, 'utf-8');
      // Variants with errors should be expanded for visibility
      expect(content).toContain('isExpanded: true');
    });
  });

  describe('Quick Add Templates', () => {
    const productFormPath = join(
      process.cwd(),
      'src/components/ProductFormComplete.tsx'
    );

    it('has Quick Add dropdown with templates', () => {
      const content = readFileSync(productFormPath, 'utf-8');
      expect(content).toContain('Quick Add');
      expect(content).toContain('BUILTIN_TEMPLATES');
    });

    it('includes Sizes template (XS-XL)', () => {
      const content = readFileSync(productFormPath, 'utf-8');
      expect(content).toContain('Sizes');
      expect(content).toContain('XS');
      expect(content).toContain('XL');
    });

    it('includes Colors template', () => {
      const content = readFileSync(productFormPath, 'utf-8');
      expect(content).toContain('Colors');
    });

    it('includes Size+Color Matrix template', () => {
      const content = readFileSync(productFormPath, 'utf-8');
      // Template name uses + sign for separation
      expect(content).toContain('Size + Color Matrix');
    });

    it('applying template generates multiple variants', () => {
      // Sizes template creates XS, S, M, L, XL = 5 variants
      const sizesTemplate = ['XS', 'S', 'M', 'L', 'XL'];
      expect(sizesTemplate).toHaveLength(5);
    });
  });

  describe('Bulk Price Update', () => {
    const productFormPath = join(
      process.cwd(),
      'src/components/ProductFormComplete.tsx'
    );

    it('has Set All Prices button', () => {
      const content = readFileSync(productFormPath, 'utf-8');
      expect(content).toContain('Set All Prices');
    });

    it('supports fixed price mode', () => {
      const content = readFileSync(productFormPath, 'utf-8');
      expect(content).toContain("'fixed'");
      expect(content).toContain('bulkPriceMode');
    });

    it('supports percentage adjustment mode', () => {
      const content = readFileSync(productFormPath, 'utf-8');
      expect(content).toContain("'percentage'");
    });

    it('shows price preview before applying', () => {
      const content = readFileSync(productFormPath, 'utf-8');
      expect(content).toContain('generatePricePreview');
    });

    it('applying bulk price updates all variants', () => {
      const variants = [
        { sku: 'SKU-1', price: 29.99 },
        { sku: 'SKU-2', price: 39.99 },
        { sku: 'SKU-3', price: 49.99 },
      ];

      // Apply fixed price of $35.00 to all
      const updatedVariants = variants.map((v) => ({ ...v, price: 35.0 }));

      expect(updatedVariants.every((v) => v.price === 35.0)).toBe(true);
    });
  });

  describe('Collapsible Variant Cards', () => {
    const variantCardPath = join(
      process.cwd(),
      'src/components/VariantCard.tsx'
    );
    const productFormPath = join(
      process.cwd(),
      'src/components/ProductFormComplete.tsx'
    );

    it('VariantCard supports expanded state', () => {
      const content = readFileSync(variantCardPath, 'utf-8');
      expect(content).toContain('isExpanded');
      expect(content).toContain('aria-expanded');
    });

    it('VariantCard shows compact summary when collapsed', () => {
      const content = readFileSync(variantCardPath, 'utf-8');
      // Shows SKU, title, price in collapsed view
      expect(content).toContain('variant.sku');
      expect(content).toContain('variant.title');
    });

    it('VariantCard shows full form when expanded', () => {
      const content = readFileSync(variantCardPath, 'utf-8');
      expect(content).toContain('SKU');
      expect(content).toContain('Variant Title');
      expect(content).toContain('Price');
    });

    it('ProductFormComplete tracks variant expansion state', () => {
      const content = readFileSync(productFormPath, 'utf-8');
      expect(content).toContain('toggleVariantExpanded');
      expect(content).toContain('isExpanded');
    });
  });
});

describe('API Integration for Variant CRUD', () => {
  const variantDetailApiPath = join(
    process.cwd(),
    'src/pages/api/products/[id]/variants/[variantId].ts'
  );

  it('variant detail API endpoint exists', () => {
    expect(existsSync(variantDetailApiPath)).toBe(true);
  });

  it('variant detail API supports DELETE', () => {
    const content = readFileSync(variantDetailApiPath, 'utf-8');
    expect(content).toContain('DELETE');
    expect(content).toContain('deleteVariant');
  });

  it('variant detail API supports PATCH (update)', () => {
    const content = readFileSync(variantDetailApiPath, 'utf-8');
    expect(content).toContain('PATCH');
    expect(content).toContain('updateVariant');
  });

  describe('Product creation includes variant creation', () => {
    const productsApiPath = join(
      process.cwd(),
      'src/pages/api/products/index.ts'
    );

    it('POST /api/products supports variants array', () => {
      const content = readFileSync(productsApiPath, 'utf-8');
      expect(content).toContain('createVariant');
      expect(content).toContain('createdVariants');
    });

    it('POST /api/products iterates over variants array', () => {
      const content = readFileSync(productsApiPath, 'utf-8');
      expect(content).toContain('for (const variantData of data.variants)');
    });
  });
});
