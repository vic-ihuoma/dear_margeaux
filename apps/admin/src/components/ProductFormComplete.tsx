import {
  useState,
  useCallback,
  type FormEvent,
  useEffect,
  useRef,
} from 'react';
import type { Product, ProductStatus } from '@dear-margeaux/api';
import { TagInput } from './TagInput';
import { DropSelector } from './DropSelector';
import { ImageUploader } from './ImageUploader';
import { VariantCard } from './VariantCard';

/** Single variant form data */
export interface VariantFormData {
  id?: string; // Only present when editing existing variant
  sku: string;
  title: string;
  price: string;
  image_url: string;
  image_alt: string;
  isExpanded: boolean;
}

/** Form data shape for the complete product form */
export interface ProductFormCompleteData {
  // Product fields
  title: string;
  description: string;
  status: ProductStatus;
  tags: string[];
  drop_id: string | null;
  featured_image_url: string;
  featured_image_alt: string;
  // Variants array
  variants: VariantFormData[];
}

/** Single variant submission data */
export interface VariantSubmitData {
  id?: string;
  sku: string;
  title: string;
  price_cents: number;
  image_url?: string;
  image_alt?: string;
}

/** The data shape that ProductFormComplete submits */
export interface ProductFormCompleteSubmitData {
  // Product fields
  title: string;
  description?: string;
  status: ProductStatus;
  tags?: string[];
  drop_id?: string;
  featured_image_url?: string;
  featured_image_alt?: string;
  // Multiple variants array
  variants: VariantSubmitData[];
  // Backwards compatible single variant fields (for API compatibility)
  sku?: string;
  variant_title?: string;
  price_cents?: number;
  variant_image_url?: string;
  variant_image_alt?: string;
}

export interface ProductFormCompleteProps {
  /** Existing product data for editing, undefined for new products */
  product?: Product;
  /** Called when form is submitted */
  onSubmit: (data: ProductFormCompleteSubmitData) => Promise<void>;
  /** Called when user cancels */
  onCancel: () => void;
  /** Whether the form is currently submitting */
  isSubmitting?: boolean;
  /** Error message to display */
  error?: string | null;
  /** Handler function for image upload */
  uploadHandler?: (file: File) => Promise<{ url: string; key: string }>;
}

/** Generate a SKU suggestion from product title */
function generateSkuFromTitle(title: string): string {
  return title
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, '')
    .trim()
    .split(/\s+/)
    .slice(0, 3)
    .join('-')
    .substring(0, 20);
}

/** Create an empty variant form data object */
function createEmptyVariant(isExpanded = true): VariantFormData {
  return {
    sku: '',
    title: '',
    price: '',
    image_url: '',
    image_alt: '',
    isExpanded,
  };
}

/** Check if a variant has any data entered */
function variantHasData(variant: VariantFormData): boolean {
  return !!(
    variant.sku.trim() ||
    variant.title.trim() ||
    variant.price.trim() ||
    variant.image_url
  );
}

export function ProductFormComplete({
  product,
  onSubmit,
  onCancel,
  isSubmitting = false,
  error,
  uploadHandler,
}: ProductFormCompleteProps) {
  // Initialize variants from product or create one empty variant
  const initialVariants: VariantFormData[] =
    product?.variants && product.variants.length > 0
      ? product.variants.map((v) => ({
          id: v.id,
          sku: v.sku,
          title: v.title,
          price: (v.price_cents / 100).toFixed(2),
          image_url: v.image_url || '',
          image_alt: v.image_alt || '',
          isExpanded: true,
        }))
      : [createEmptyVariant()];

  const [formData, setFormData] = useState<ProductFormCompleteData>({
    // Product fields
    title: product?.title || '',
    description: product?.description || '',
    status: product?.status || 'draft',
    tags: product?.tags || [],
    drop_id: product?.drop_id || null,
    featured_image_url: product?.featured_image_url || '',
    featured_image_alt: product?.featured_image_alt || '',
    // Variants array
    variants: initialVariants,
  });

  const [formErrors, setFormErrors] = useState<
    Partial<Record<keyof ProductFormCompleteData, string>>
  >({});
  const [variantErrors, setVariantErrors] = useState<
    Record<number, Partial<Record<keyof VariantFormData, string>>>
  >({});

  // Track newly added variant index for auto-focus
  const [focusVariantIndex, setFocusVariantIndex] = useState<number | null>(
    null
  );
  const variantSkuRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Auto-focus SKU field when new variant is added
  useEffect(() => {
    if (
      focusVariantIndex !== null &&
      variantSkuRefs.current[focusVariantIndex]
    ) {
      variantSkuRefs.current[focusVariantIndex]?.focus();
      setFocusVariantIndex(null);
    }
  }, [focusVariantIndex, formData.variants.length]);

  // Auto-generate SKU from title when title changes and first variant SKU is empty
  useEffect(() => {
    if (
      !product &&
      formData.title &&
      formData.variants[0] &&
      !formData.variants[0].sku
    ) {
      const suggestedSku = generateSkuFromTitle(formData.title);
      if (suggestedSku) {
        setFormData((prev) => ({
          ...prev,
          variants: prev.variants.map((v, i) =>
            i === 0 ? { ...v, sku: suggestedSku } : v
          ),
        }));
      }
    }
  }, [formData.title, formData.variants, product]);

  const validate = useCallback((): boolean => {
    const errors: Partial<Record<keyof ProductFormCompleteData, string>> = {};
    const vErrors: Record<
      number,
      Partial<Record<keyof VariantFormData, string>>
    > = {};

    // Product validation
    if (!formData.title.trim()) {
      errors.title = 'Title is required';
    } else if (formData.title.length > 200) {
      errors.title = 'Title must be less than 200 characters';
    }

    if (formData.description && formData.description.length > 5000) {
      errors.description = 'Description must be less than 5000 characters';
    }

    // Featured image alt text required when image is uploaded
    if (formData.featured_image_url && !formData.featured_image_alt.trim()) {
      errors.featured_image_alt =
        'Alt text is required when an image is uploaded';
    }

    // Variant validation - require at least one complete variant
    const skusUsed = new Set<string>();
    let hasValidVariant = false;

    formData.variants.forEach((variant, index) => {
      const variantErrors: Partial<Record<keyof VariantFormData, string>> = {};
      const hasData = variantHasData(variant);

      if (hasData || formData.variants.length === 1) {
        // Validate required fields for variants with data (or the only variant)
        if (!variant.sku.trim()) {
          variantErrors.sku = 'SKU is required';
        } else if (!/^[A-Za-z0-9-_]+$/.test(variant.sku)) {
          variantErrors.sku =
            'SKU can only contain letters, numbers, hyphens, and underscores';
        } else {
          const normalizedSku = variant.sku.trim().toUpperCase();
          if (skusUsed.has(normalizedSku)) {
            variantErrors.sku = 'SKU must be unique across all variants';
          } else {
            skusUsed.add(normalizedSku);
          }
        }

        if (!variant.title.trim()) {
          variantErrors.title = 'Variant title is required';
        }

        if (!variant.price.trim()) {
          variantErrors.price = 'Price is required';
        } else {
          const priceValue = parseFloat(variant.price);
          if (isNaN(priceValue) || priceValue < 0) {
            variantErrors.price = 'Price must be a positive number';
          }
        }

        // Variant image alt text required when image is uploaded
        if (variant.image_url && !variant.image_alt.trim()) {
          variantErrors.image_alt =
            'Alt text is required when an image is uploaded';
        }

        if (Object.keys(variantErrors).length === 0 && hasData) {
          hasValidVariant = true;
        }
      }

      if (Object.keys(variantErrors).length > 0) {
        vErrors[index] = variantErrors;
      }
    });

    // Require at least one valid variant
    if (
      !hasValidVariant &&
      formData.variants.length === 1 &&
      !variantHasData(formData.variants[0])
    ) {
      vErrors[0] = { sku: 'At least one variant is required' };
    }

    setFormErrors(errors);
    setVariantErrors(vErrors);
    return (
      Object.keys(errors).length === 0 && Object.keys(vErrors).length === 0
    );
  }, [formData]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    // Convert variants to submission format
    const validVariants: VariantSubmitData[] = formData.variants
      .filter(variantHasData)
      .map((v) => ({
        id: v.id,
        sku: v.sku.trim().toUpperCase(),
        title: v.title.trim(),
        price_cents: Math.round(parseFloat(v.price) * 100),
        image_url: v.image_url.trim() || undefined,
        image_alt: v.image_alt.trim() || undefined,
      }));

    const submitData: ProductFormCompleteSubmitData = {
      title: formData.title.trim(),
      description: formData.description.trim() || undefined,
      status: formData.status,
      tags: formData.tags.length > 0 ? formData.tags : undefined,
      drop_id: formData.drop_id || undefined,
      featured_image_url: formData.featured_image_url.trim() || undefined,
      featured_image_alt: formData.featured_image_alt.trim() || undefined,
      variants: validVariants,
    };

    // For backwards compatibility, also include first variant as flat fields
    if (validVariants.length > 0) {
      const firstVariant = validVariants[0];
      submitData.sku = firstVariant.sku;
      submitData.variant_title = firstVariant.title;
      submitData.price_cents = firstVariant.price_cents;
      submitData.variant_image_url = firstVariant.image_url;
      submitData.variant_image_alt = firstVariant.image_alt;
    }

    await onSubmit(submitData);
  };

  const handleFeaturedImageUpload = (url: string) => {
    setFormData({ ...formData, featured_image_url: url });
    if (formErrors.featured_image_url) {
      setFormErrors({ ...formErrors, featured_image_url: undefined });
    }
  };

  const handleFeaturedImageRemove = () => {
    setFormData({
      ...formData,
      featured_image_url: '',
      featured_image_alt: '',
    });
  };

  // Variant management handlers
  const updateVariant = (index: number, updates: Partial<VariantFormData>) => {
    setFormData((prev) => ({
      ...prev,
      variants: prev.variants.map((v, i) =>
        i === index ? { ...v, ...updates } : v
      ),
    }));
    // Clear errors for this variant when updating
    if (variantErrors[index]) {
      setVariantErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[index];
        return newErrors;
      });
    }
  };

  const addVariant = () => {
    const newIndex = formData.variants.length;
    setFormData((prev) => ({
      ...prev,
      variants: [...prev.variants, createEmptyVariant(true)],
    }));
    // Set focus to the new variant's SKU field after render
    setFocusVariantIndex(newIndex);
  };

  const removeVariant = (index: number) => {
    if (formData.variants.length <= 1) return; // Prevent removing last variant

    // Note: Confirmation dialog is handled in VariantCard component
    setFormData((prev) => ({
      ...prev,
      variants: prev.variants.filter((_, i) => i !== index),
    }));
    // Remove errors for this variant
    setVariantErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[index];
      // Renumber higher indices
      Object.keys(newErrors).forEach((key) => {
        const keyNum = parseInt(key, 10);
        if (keyNum > index) {
          newErrors[keyNum - 1] = newErrors[keyNum];
          delete newErrors[keyNum];
        }
      });
      return newErrors;
    });
  };

  const toggleVariantExpanded = (index: number) => {
    updateVariant(index, { isExpanded: !formData.variants[index].isExpanded });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {error && (
        <div className="rounded-lg bg-status-error/10 border border-status-error/20 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-status-error"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-status-error">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Product Details Section */}
      <section>
        <h2 className="text-lg font-semibold text-text-primary mb-4 pb-2 border-b border-border">
          Product Details
        </h2>
        <div className="space-y-6">
          {/* Title */}
          <div>
            <label
              htmlFor="title"
              className="block text-sm font-medium text-text-primary mb-1"
            >
              Title <span className="text-status-error">*</span>
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              className={`block w-full rounded-lg border ${
                formErrors.title
                  ? 'border-status-error focus:border-status-error focus:ring-status-error'
                  : 'border-border focus:border-primary-500 focus:ring-primary-500'
              } bg-background-primary py-2 px-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1`}
              placeholder="Enter product title"
              disabled={isSubmitting}
            />
            {formErrors.title && (
              <p className="mt-1 text-sm text-status-error">
                {formErrors.title}
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-text-primary mb-1"
            >
              Description
            </label>
            <textarea
              id="description"
              name="description"
              rows={4}
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className={`block w-full rounded-lg border ${
                formErrors.description
                  ? 'border-status-error focus:border-status-error focus:ring-status-error'
                  : 'border-border focus:border-primary-500 focus:ring-primary-500'
              } bg-background-primary py-2 px-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 resize-none`}
              placeholder="Enter product description"
              disabled={isSubmitting}
            />
            {formErrors.description && (
              <p className="mt-1 text-sm text-status-error">
                {formErrors.description}
              </p>
            )}
            <p className="mt-1 text-xs text-text-muted">
              {formData.description.length}/5000 characters
            </p>
          </div>

          {/* Tags */}
          <TagInput
            id="tags"
            label="Tags"
            value={formData.tags}
            onChange={(tags) => setFormData({ ...formData, tags })}
            placeholder="Add tags (press Enter or comma to add)"
            disabled={isSubmitting}
            maxTags={10}
          />

          {/* Drop Assignment */}
          <DropSelector
            id="drop_id"
            label="Assign to Drop"
            value={formData.drop_id}
            onChange={(drop_id) => setFormData({ ...formData, drop_id })}
            disabled={isSubmitting}
          />

          {/* Status */}
          <div>
            <label
              htmlFor="status"
              className="block text-sm font-medium text-text-primary mb-1"
            >
              Status
            </label>
            <select
              id="status"
              name="status"
              value={formData.status}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  status: e.target.value as ProductStatus,
                })
              }
              className="block w-full rounded-lg border border-border bg-background-primary py-2 pl-3 pr-10 text-sm text-text-primary focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              disabled={isSubmitting}
            >
              <option value="draft">Draft</option>
              <option value="active">Active</option>
            </select>
            <p className="mt-1 text-xs text-text-muted">
              {formData.status === 'draft'
                ? 'Draft products are not visible to customers'
                : 'Active products are visible and purchasable'}
            </p>
          </div>
        </div>
      </section>

      {/* Featured Image Section */}
      <section>
        <h2 className="text-lg font-semibold text-text-primary mb-4 pb-2 border-b border-border">
          Featured Image
        </h2>
        <div className="space-y-4">
          <div>
            <span className="block text-sm font-medium text-text-primary mb-1">
              Product Image
            </span>
            <p className="text-xs text-text-muted mb-3">
              This image will be displayed on product cards and as the main
              image on the product page
            </p>
            {uploadHandler ? (
              <ImageUploader
                value={formData.featured_image_url || null}
                onUpload={handleFeaturedImageUpload}
                onRemove={handleFeaturedImageRemove}
                isUploading={isSubmitting}
                uploadHandler={uploadHandler}
              />
            ) : (
              <div>
                <label htmlFor="featured-image-url" className="sr-only">
                  Featured Image URL
                </label>
                <input
                  type="url"
                  id="featured-image-url"
                  name="featured_image_url"
                  value={formData.featured_image_url}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      featured_image_url: e.target.value,
                    })
                  }
                  className="block w-full rounded-lg border border-border focus:border-primary-500 focus:ring-primary-500 bg-background-primary py-2 px-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1"
                  placeholder="https://example.com/image.jpg"
                  disabled={isSubmitting}
                />
                {formData.featured_image_url && (
                  <div className="mt-2 relative inline-block">
                    <img
                      src={formData.featured_image_url}
                      alt={formData.featured_image_alt || 'Featured preview'}
                      className="h-32 w-32 rounded-lg object-cover border border-border"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Featured Image Alt Text */}
          {formData.featured_image_url && (
            <div>
              <label
                htmlFor="featured-image-alt"
                className="block text-sm font-medium text-text-primary mb-1"
              >
                Image Alt Text <span className="text-status-error">*</span>
              </label>
              <input
                type="text"
                id="featured-image-alt"
                name="featured_image_alt"
                value={formData.featured_image_alt}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    featured_image_alt: e.target.value,
                  })
                }
                className={`block w-full rounded-lg border ${
                  formErrors.featured_image_alt
                    ? 'border-status-error focus:border-status-error focus:ring-status-error'
                    : 'border-border focus:border-primary-500 focus:ring-primary-500'
                } bg-background-primary py-2 px-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1`}
                placeholder="Describe the image for accessibility"
                disabled={isSubmitting}
              />
              {formErrors.featured_image_alt && (
                <p className="mt-1 text-xs text-status-error">
                  {formErrors.featured_image_alt}
                </p>
              )}
              <p className="mt-1 text-xs text-text-muted">
                Describe the image for screen readers and accessibility
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Variants Section */}
      <section>
        <h2 className="text-lg font-semibold text-text-primary mb-4 pb-2 border-b border-border flex items-center gap-2">
          Variants
          <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium rounded-full bg-primary-100 text-primary-700">
            {formData.variants.length}
          </span>
        </h2>
        <p className="text-sm text-text-muted mb-4">
          Add one or more variants for this product. Each variant can have its
          own SKU, price, and image.
        </p>

        <div className="space-y-4">
          {formData.variants.map((variant, index) => (
            <VariantCard
              key={variant.id || index}
              variant={variant}
              index={index}
              onUpdate={updateVariant}
              onRemove={removeVariant}
              onToggleExpand={toggleVariantExpanded}
              isOnlyVariant={formData.variants.length === 1}
              isSubmitting={isSubmitting}
              isEditing={!!product}
              errors={variantErrors[index] || {}}
              uploadHandler={uploadHandler}
              skuInputRef={(el) => {
                variantSkuRefs.current[index] = el;
              }}
            />
          ))}

          {/* Add Another Variant Button */}
          <button
            type="button"
            onClick={addVariant}
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 border-2 border-dashed border-border rounded-lg text-sm font-medium text-text-muted hover:border-primary-500 hover:text-primary-500 transition-colors duration-normal disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
            Add Another Variant
          </button>
        </div>
      </section>

      {/* Form Actions */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="px-4 py-2 text-sm font-medium text-text-primary bg-background-tertiary border border-border rounded-lg hover:bg-background-primary transition-colors duration-normal disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-600 transition-colors duration-normal disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <>
              <svg
                className="animate-spin h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Saving...
            </>
          ) : product ? (
            'Save Changes'
          ) : (
            'Create Product'
          )}
        </button>
      </div>
    </form>
  );
}
