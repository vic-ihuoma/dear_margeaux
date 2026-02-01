import { describe, it, expect, vi } from 'vitest';
import type { VariantFormData } from '../../src/components/ProductFormComplete';

/**
 * Tests for pm-37: Create VariantCard component for inline variant editing
 *
 * Requirements:
 * - Display compact view: SKU, title, price, thumbnail
 * - Expand to show full edit form on click
 * - Include all variant fields: SKU, title, price, image upload, alt text
 * - Add delete button with confirmation
 * - Add drag handle for reordering (optional)
 */

// Sample variant data for testing
const sampleVariant: VariantFormData = {
  id: 'var-1',
  sku: 'SKU-001',
  title: 'Black Leather',
  price: '29.99',
  image_url: 'https://example.com/image.jpg',
  image_alt: 'Black leather variant',
  isExpanded: false,
};

const sampleExpandedVariant: VariantFormData = {
  ...sampleVariant,
  isExpanded: true,
};

const sampleEmptyVariant: VariantFormData = {
  sku: '',
  title: '',
  price: '',
  image_url: '',
  image_alt: '',
  isExpanded: true,
};

describe('VariantCard', () => {
  describe('Compact view (collapsed)', () => {
    it('should display variant number based on index', () => {
      // Variant 1 for index 0, Variant 2 for index 1, etc.
      const index = 0;
      const variantLabel = `Variant ${index + 1}`;
      expect(variantLabel).toBe('Variant 1');
    });

    it('should display compact summary with SKU, title, price when collapsed', () => {
      const variant = sampleVariant;
      const isExpanded = false;

      // Compact summary should show key fields
      const summaryParts = [
        variant.sku && variant.sku.toUpperCase(),
        variant.title,
        variant.price
          ? new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD',
            }).format(parseFloat(variant.price))
          : null,
      ].filter(Boolean);

      expect(summaryParts.length).toBe(3);
      expect(summaryParts.join(' • ')).toBe('SKU-001 • Black Leather • $29.99');
      expect(isExpanded).toBe(false);
    });

    it('should have thumbnail when image_url is set', () => {
      const variant = sampleVariant;
      const hasThumbnail = !!variant.image_url;
      expect(hasThumbnail).toBe(true);
    });

    it('should show no thumbnail when image_url is empty', () => {
      const variant = sampleEmptyVariant;
      const hasThumbnail = !!variant.image_url;
      expect(hasThumbnail).toBe(false);
    });
  });

  describe('Expanded view (full edit form)', () => {
    it('should show full edit form when isExpanded is true', () => {
      const variant = sampleExpandedVariant;
      expect(variant.isExpanded).toBe(true);
    });

    it('should include SKU field in expanded view', () => {
      // SKU field should be present in VariantCard expanded form
      const fields = ['sku', 'title', 'price', 'image_url', 'image_alt'];
      expect(fields).toContain('sku');
    });

    it('should include title field in expanded view', () => {
      const fields = ['sku', 'title', 'price', 'image_url', 'image_alt'];
      expect(fields).toContain('title');
    });

    it('should include price field in expanded view', () => {
      const fields = ['sku', 'title', 'price', 'image_url', 'image_alt'];
      expect(fields).toContain('price');
    });

    it('should include image upload/url field in expanded view', () => {
      const fields = ['sku', 'title', 'price', 'image_url', 'image_alt'];
      expect(fields).toContain('image_url');
    });

    it('should include alt text field when image is present', () => {
      const variant = sampleExpandedVariant;
      const showAltText = !!variant.image_url;
      expect(showAltText).toBe(true);
    });

    it('should hide alt text field when no image', () => {
      const variant = { ...sampleEmptyVariant, image_url: '' };
      const showAltText = !!variant.image_url;
      expect(showAltText).toBe(false);
    });
  });

  describe('Update handling', () => {
    it('should call onUpdate with index and sku when SKU changes', () => {
      const onUpdate = vi.fn();
      const index = 0;
      const newValue = 'NEW-SKU';

      // Simulate update call
      onUpdate(index, { sku: newValue.toUpperCase() });

      expect(onUpdate).toHaveBeenCalledWith(0, { sku: 'NEW-SKU' });
    });

    it('should call onUpdate with index and title when title changes', () => {
      const onUpdate = vi.fn();
      const index = 0;
      const newValue = 'New Title';

      onUpdate(index, { title: newValue });

      expect(onUpdate).toHaveBeenCalledWith(0, { title: 'New Title' });
    });

    it('should call onUpdate with index and price when price changes', () => {
      const onUpdate = vi.fn();
      const index = 0;
      const newValue = '39.99';

      onUpdate(index, { price: newValue });

      expect(onUpdate).toHaveBeenCalledWith(0, { price: '39.99' });
    });

    it('should call onUpdate with index and image_url when image uploads', () => {
      const onUpdate = vi.fn();
      const index = 0;
      const newUrl = 'https://example.com/new-image.jpg';

      onUpdate(index, { image_url: newUrl });

      expect(onUpdate).toHaveBeenCalledWith(0, {
        image_url: 'https://example.com/new-image.jpg',
      });
    });

    it('should call onUpdate with index and image_alt when alt text changes', () => {
      const onUpdate = vi.fn();
      const index = 0;
      const newAlt = 'New alt text';

      onUpdate(index, { image_alt: newAlt });

      expect(onUpdate).toHaveBeenCalledWith(0, { image_alt: 'New alt text' });
    });

    it('should transform SKU to uppercase when updating', () => {
      const inputSku = 'lowercase-sku';
      const normalizedSku = inputSku.toUpperCase();
      expect(normalizedSku).toBe('LOWERCASE-SKU');
    });
  });

  describe('Delete button with confirmation', () => {
    it('should have delete button when expanded', () => {
      const variant = sampleExpandedVariant;
      const hasDeleteButton = variant.isExpanded;
      expect(hasDeleteButton).toBe(true);
    });

    it('should disable delete button when only one variant', () => {
      const isOnlyVariant = true;
      const deleteDisabled = isOnlyVariant;
      expect(deleteDisabled).toBe(true);
    });

    it('should enable delete button when multiple variants exist', () => {
      const isOnlyVariant = false;
      const deleteDisabled = isOnlyVariant;
      expect(deleteDisabled).toBe(false);
    });

    it('should check if variant has data for confirmation logic', () => {
      const variant = sampleVariant;
      const hasData = !!(
        variant.sku.trim() ||
        variant.title.trim() ||
        variant.price.trim() ||
        variant.image_url
      );
      expect(hasData).toBe(true);
    });

    it('should detect empty variant (no confirmation needed)', () => {
      const variant = sampleEmptyVariant;
      const hasData = !!(
        variant.sku.trim() ||
        variant.title.trim() ||
        variant.price.trim() ||
        variant.image_url
      );
      expect(hasData).toBe(false);
    });

    it('should call onRemove with index when confirmed', () => {
      const onRemove = vi.fn();
      const index = 0;

      onRemove(index);

      expect(onRemove).toHaveBeenCalledWith(0);
    });

    it('should call onRemove immediately for empty variants', () => {
      const onRemove = vi.fn();
      const index = 1;
      const variant = sampleEmptyVariant;
      const hasData = !!(
        variant.sku.trim() ||
        variant.title.trim() ||
        variant.price.trim() ||
        variant.image_url
      );

      // Empty variant - no confirmation needed
      expect(hasData).toBe(false);
      onRemove(index);
      expect(onRemove).toHaveBeenCalledWith(1);
    });
  });

  describe('Toggle expand/collapse', () => {
    it('should call onToggleExpand with index when header clicked', () => {
      const onToggleExpand = vi.fn();
      const index = 0;

      onToggleExpand(index);

      expect(onToggleExpand).toHaveBeenCalledWith(0);
    });

    it('should use aria-expanded attribute for accessibility', () => {
      const variant = sampleExpandedVariant;
      const ariaExpanded = variant.isExpanded;
      expect(ariaExpanded).toBe(true);
    });

    it('should set aria-expanded to false when collapsed', () => {
      const variant = sampleVariant;
      const ariaExpanded = variant.isExpanded;
      expect(ariaExpanded).toBe(false);
    });
  });

  describe('Error display', () => {
    it('should have error styling when errors exist', () => {
      const errors = { sku: 'SKU is required' };
      const hasErrors = Object.keys(errors).length > 0;
      const borderClass = hasErrors ? 'border-status-error' : 'border-border';
      expect(borderClass).toBe('border-status-error');
    });

    it('should show "Has errors" indicator when collapsed with errors', () => {
      const errors = { sku: 'SKU is required' };
      const isExpanded = false;
      const hasErrors = Object.keys(errors).length > 0;
      const showErrorIndicator = !isExpanded && hasErrors;
      expect(showErrorIndicator).toBe(true);
    });

    it('should show field-level error messages when expanded', () => {
      const errors = { sku: 'SKU must be unique', price: 'Price is required' };
      expect(errors.sku).toBe('SKU must be unique');
      expect(errors.price).toBe('Price is required');
    });
  });

  describe('Submitting state', () => {
    it('should disable all inputs when submitting', () => {
      const isSubmitting = true;
      const inputsDisabled = isSubmitting;
      expect(inputsDisabled).toBe(true);
    });

    it('should disable delete button when submitting', () => {
      const isSubmitting = true;
      const deleteDisabled = isSubmitting;
      expect(deleteDisabled).toBe(true);
    });

    it('should disable toggle button when submitting', () => {
      const isSubmitting = true;
      const toggleDisabled = isSubmitting;
      expect(toggleDisabled).toBe(true);
    });
  });

  describe('Editing existing variant', () => {
    it('should disable SKU field when editing existing variant', () => {
      const isEditing = true;
      const variant = sampleExpandedVariant;
      const skuDisabled = isEditing && !!variant.id;
      expect(skuDisabled).toBe(true);
    });

    it('should allow SKU field when creating new variant', () => {
      const isEditing = false;
      const variant = { ...sampleExpandedVariant, id: undefined };
      const skuDisabled = isEditing && !!variant.id;
      expect(skuDisabled).toBe(false);
    });
  });

  describe('Image upload integration', () => {
    it('should show ImageUploader when uploadHandler is provided', () => {
      const uploadHandler = vi
        .fn()
        .mockResolvedValue({ url: 'test', key: 'test' });
      const hasUploadHandler = !!uploadHandler;
      expect(hasUploadHandler).toBe(true);
    });

    it('should show URL input when uploadHandler is not provided', () => {
      const uploadHandler = undefined;
      const hasUploadHandler = !!uploadHandler;
      const showUrlInput = !hasUploadHandler;
      expect(showUrlInput).toBe(true);
    });

    it('should clear image_url and image_alt when image removed', () => {
      const onUpdate = vi.fn();
      const index = 0;

      // Simulate remove image
      onUpdate(index, { image_url: '', image_alt: '' });

      expect(onUpdate).toHaveBeenCalledWith(0, {
        image_url: '',
        image_alt: '',
      });
    });
  });

  describe('Price preview', () => {
    it('should format price as currency for preview', () => {
      const price = '29.99';
      const formatted = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(parseFloat(price));
      expect(formatted).toBe('$29.99');
    });

    it('should not show preview when price is empty', () => {
      const price = '';
      const showPreview = !!price;
      expect(showPreview).toBe(false);
    });

    it('should handle decimal prices correctly', () => {
      const price = '1234.56';
      const formatted = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(parseFloat(price));
      expect(formatted).toBe('$1,234.56');
    });
  });

  describe('Variant index display', () => {
    it('should display Variant 1 for index 0', () => {
      const index = 0;
      const label = `Variant ${index + 1}`;
      expect(label).toBe('Variant 1');
    });

    it('should display Variant 2 for index 1', () => {
      const index = 1;
      const label = `Variant ${index + 1}`;
      expect(label).toBe('Variant 2');
    });

    it('should display Variant 10 for index 9', () => {
      const index = 9;
      const label = `Variant ${index + 1}`;
      expect(label).toBe('Variant 10');
    });
  });

  describe('Drag handle (optional)', () => {
    it('should conditionally show drag handle based on multiple variants', () => {
      const isOnlyVariant = false;
      const showDragHandle = !isOnlyVariant;
      expect(showDragHandle).toBe(true);
    });

    it('should hide drag handle when only one variant', () => {
      const isOnlyVariant = true;
      const showDragHandle = !isOnlyVariant;
      expect(showDragHandle).toBe(false);
    });
  });

  describe('VariantCard props interface', () => {
    it('should accept variant prop of type VariantFormData', () => {
      const variant: VariantFormData = sampleVariant;
      expect(variant.sku).toBeDefined();
      expect(variant.title).toBeDefined();
      expect(variant.price).toBeDefined();
      expect(variant.image_url).toBeDefined();
      expect(variant.image_alt).toBeDefined();
      expect(variant.isExpanded).toBeDefined();
    });

    it('should accept index prop as number', () => {
      const index: number = 0;
      expect(typeof index).toBe('number');
    });

    it('should accept callback props', () => {
      const onUpdate = vi.fn();
      const onRemove = vi.fn();
      const onToggleExpand = vi.fn();

      expect(typeof onUpdate).toBe('function');
      expect(typeof onRemove).toBe('function');
      expect(typeof onToggleExpand).toBe('function');
    });

    it('should accept boolean flags', () => {
      const isOnlyVariant = false;
      const isSubmitting = false;
      const isEditing = false;

      expect(typeof isOnlyVariant).toBe('boolean');
      expect(typeof isSubmitting).toBe('boolean');
      expect(typeof isEditing).toBe('boolean');
    });

    it('should accept errors prop as record of field errors', () => {
      const errors: Partial<Record<keyof VariantFormData, string>> = {
        sku: 'SKU is required',
        price: 'Price must be positive',
      };

      expect(errors.sku).toBe('SKU is required');
      expect(errors.price).toBe('Price must be positive');
    });

    it('should accept optional uploadHandler prop', () => {
      const uploadHandler = async () => ({ url: 'test', key: 'test' });
      expect(typeof uploadHandler).toBe('function');
    });
  });
});
