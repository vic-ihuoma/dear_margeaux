import { useState, useCallback, type FormEvent, useEffect } from 'react';
import type { Product, ProductStatus } from '@dear-margeaux/api';
import { TagInput } from './TagInput';
import { DropSelector } from './DropSelector';
import { ImageUploader } from './ImageUploader';

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
  // Default variant fields
  sku: string;
  variant_title: string;
  price: string;
  variant_image_url: string;
  variant_image_alt: string;
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
  // Default variant fields (optional - product-only creation if not provided)
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

export function ProductFormComplete({
  product,
  onSubmit,
  onCancel,
  isSubmitting = false,
  error,
  uploadHandler,
}: ProductFormCompleteProps) {
  const firstVariant = product?.variants?.[0];

  const [formData, setFormData] = useState<ProductFormCompleteData>({
    // Product fields
    title: product?.title || '',
    description: product?.description || '',
    status: product?.status || 'draft',
    tags: product?.tags || [],
    drop_id: product?.drop_id || null,
    featured_image_url: product?.featured_image_url || '',
    featured_image_alt: product?.featured_image_alt || '',
    // Default variant fields
    sku: firstVariant?.sku || '',
    variant_title: firstVariant?.title || '',
    price: firstVariant ? (firstVariant.price_cents / 100).toFixed(2) : '',
    variant_image_url: firstVariant?.image_url || '',
    variant_image_alt: firstVariant?.image_alt || '',
  });

  const [formErrors, setFormErrors] = useState<
    Partial<Record<keyof ProductFormCompleteData, string>>
  >({});

  // Auto-generate SKU from title when title changes and SKU is empty
  useEffect(() => {
    if (!product && formData.title && !formData.sku) {
      const suggestedSku = generateSkuFromTitle(formData.title);
      if (suggestedSku) {
        setFormData((prev) => ({ ...prev, sku: suggestedSku }));
      }
    }
  }, [formData.title, formData.sku, product]);

  const validate = useCallback((): boolean => {
    const errors: Partial<Record<keyof ProductFormCompleteData, string>> = {};

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

    // Default variant validation (only if any variant field is filled)
    const hasVariantData =
      formData.sku.trim() ||
      formData.variant_title.trim() ||
      formData.price.trim() ||
      formData.variant_image_url;

    if (hasVariantData) {
      if (!formData.sku.trim()) {
        errors.sku = 'SKU is required';
      } else if (!/^[A-Za-z0-9-_]+$/.test(formData.sku)) {
        errors.sku =
          'SKU can only contain letters, numbers, hyphens, and underscores';
      }

      if (!formData.variant_title.trim()) {
        errors.variant_title = 'Variant title is required';
      }

      if (!formData.price.trim()) {
        errors.price = 'Price is required';
      } else {
        const priceValue = parseFloat(formData.price);
        if (isNaN(priceValue) || priceValue < 0) {
          errors.price = 'Price must be a positive number';
        }
      }

      // Variant image alt text required when image is uploaded
      if (formData.variant_image_url && !formData.variant_image_alt.trim()) {
        errors.variant_image_alt =
          'Alt text is required when an image is uploaded';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    const hasVariantData =
      formData.sku.trim() ||
      formData.variant_title.trim() ||
      formData.price.trim();

    const submitData: ProductFormCompleteSubmitData = {
      title: formData.title.trim(),
      description: formData.description.trim() || undefined,
      status: formData.status,
      tags: formData.tags.length > 0 ? formData.tags : undefined,
      drop_id: formData.drop_id || undefined,
      featured_image_url: formData.featured_image_url.trim() || undefined,
      featured_image_alt: formData.featured_image_alt.trim() || undefined,
    };

    // Add variant data if provided
    if (hasVariantData) {
      submitData.sku = formData.sku.trim().toUpperCase();
      submitData.variant_title = formData.variant_title.trim();
      submitData.price_cents = Math.round(parseFloat(formData.price) * 100);
      submitData.variant_image_url =
        formData.variant_image_url.trim() || undefined;
      submitData.variant_image_alt =
        formData.variant_image_alt.trim() || undefined;
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

  const handleVariantImageUpload = (url: string) => {
    setFormData({ ...formData, variant_image_url: url });
    if (formErrors.variant_image_url) {
      setFormErrors({ ...formErrors, variant_image_url: undefined });
    }
  };

  const handleVariantImageRemove = () => {
    setFormData({ ...formData, variant_image_url: '', variant_image_alt: '' });
  };

  // Format price preview
  const pricePreview = formData.price
    ? new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(parseFloat(formData.price) || 0)
    : null;

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

      {/* Default Variant Section */}
      <section>
        <h2 className="text-lg font-semibold text-text-primary mb-4 pb-2 border-b border-border">
          Default Variant
        </h2>
        <p className="text-sm text-text-muted mb-4">
          Create the first variant for this product. You can add more variants
          after creating the product.
        </p>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* SKU */}
            <div>
              <label
                htmlFor="variant-sku"
                className="block text-sm font-medium text-text-primary mb-1"
              >
                SKU <span className="text-status-error">*</span>
              </label>
              <input
                type="text"
                id="variant-sku"
                name="sku"
                value={formData.sku}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    sku: e.target.value.toUpperCase(),
                  })
                }
                className={`block w-full rounded-lg border ${
                  formErrors.sku
                    ? 'border-status-error focus:border-status-error focus:ring-status-error'
                    : 'border-border focus:border-primary-500 focus:ring-primary-500'
                } bg-background-primary py-2 px-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 uppercase`}
                placeholder="e.g., BAG-001-BLK"
                disabled={isSubmitting || !!product}
              />
              {formErrors.sku && (
                <p className="mt-1 text-xs text-status-error">
                  {formErrors.sku}
                </p>
              )}
              {!product && (
                <p className="mt-1 text-xs text-text-muted">
                  Auto-generated from title. Alphanumeric with
                  hyphens/underscores only.
                </p>
              )}
              {product && (
                <p className="mt-1 text-xs text-text-muted">
                  SKU cannot be changed after creation
                </p>
              )}
            </div>

            {/* Variant Title */}
            <div>
              <label
                htmlFor="variant-title"
                className="block text-sm font-medium text-text-primary mb-1"
              >
                Variant Title <span className="text-status-error">*</span>
              </label>
              <input
                type="text"
                id="variant-title"
                name="variant_title"
                value={formData.variant_title}
                onChange={(e) =>
                  setFormData({ ...formData, variant_title: e.target.value })
                }
                className={`block w-full rounded-lg border ${
                  formErrors.variant_title
                    ? 'border-status-error focus:border-status-error focus:ring-status-error'
                    : 'border-border focus:border-primary-500 focus:ring-primary-500'
                } bg-background-primary py-2 px-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1`}
                placeholder="e.g., Black Leather, Size M"
                disabled={isSubmitting}
              />
              {formErrors.variant_title && (
                <p className="mt-1 text-xs text-status-error">
                  {formErrors.variant_title}
                </p>
              )}
            </div>
          </div>

          {/* Price */}
          <div>
            <label
              htmlFor="variant-price"
              className="block text-sm font-medium text-text-primary mb-1"
            >
              Price <span className="text-status-error">*</span>
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <span className="text-text-muted text-sm">$</span>
              </div>
              <input
                type="number"
                id="variant-price"
                name="price"
                value={formData.price}
                onChange={(e) =>
                  setFormData({ ...formData, price: e.target.value })
                }
                step="0.01"
                min="0"
                className={`block w-full rounded-lg border ${
                  formErrors.price
                    ? 'border-status-error focus:border-status-error focus:ring-status-error'
                    : 'border-border focus:border-primary-500 focus:ring-primary-500'
                } bg-background-primary py-2 pl-7 pr-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1`}
                placeholder="0.00"
                disabled={isSubmitting}
              />
            </div>
            {formErrors.price && (
              <p className="mt-1 text-xs text-status-error">
                {formErrors.price}
              </p>
            )}
            {pricePreview && (
              <p className="mt-1 text-xs text-text-muted">
                Preview: {pricePreview}
              </p>
            )}
          </div>

          {/* Variant Image */}
          <div>
            <span className="block text-sm font-medium text-text-primary mb-1">
              Variant Image
            </span>
            <p className="text-xs text-text-muted mb-3">
              Optional. Falls back to featured image if not provided.
            </p>
            {uploadHandler ? (
              <ImageUploader
                value={formData.variant_image_url || null}
                onUpload={handleVariantImageUpload}
                onRemove={handleVariantImageRemove}
                isUploading={isSubmitting}
                uploadHandler={uploadHandler}
              />
            ) : (
              <div>
                <label htmlFor="variant-image-url" className="sr-only">
                  Variant Image URL
                </label>
                <input
                  type="url"
                  id="variant-image-url"
                  name="variant_image_url"
                  value={formData.variant_image_url}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      variant_image_url: e.target.value,
                    })
                  }
                  className="block w-full rounded-lg border border-border focus:border-primary-500 focus:ring-primary-500 bg-background-primary py-2 px-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1"
                  placeholder="https://example.com/variant-image.jpg"
                  disabled={isSubmitting}
                />
                {formData.variant_image_url && (
                  <div className="mt-2 relative inline-block">
                    <img
                      src={formData.variant_image_url}
                      alt={formData.variant_image_alt || 'Variant preview'}
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

          {/* Variant Image Alt Text */}
          {formData.variant_image_url && (
            <div>
              <label
                htmlFor="variant-image-alt"
                className="block text-sm font-medium text-text-primary mb-1"
              >
                Variant Image Alt Text{' '}
                <span className="text-status-error">*</span>
              </label>
              <input
                type="text"
                id="variant-image-alt"
                name="variant_image_alt"
                value={formData.variant_image_alt}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    variant_image_alt: e.target.value,
                  })
                }
                className={`block w-full rounded-lg border ${
                  formErrors.variant_image_alt
                    ? 'border-status-error focus:border-status-error focus:ring-status-error'
                    : 'border-border focus:border-primary-500 focus:ring-primary-500'
                } bg-background-primary py-2 px-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1`}
                placeholder="Describe the variant image for accessibility"
                disabled={isSubmitting}
              />
              {formErrors.variant_image_alt && (
                <p className="mt-1 text-xs text-status-error">
                  {formErrors.variant_image_alt}
                </p>
              )}
              <p className="mt-1 text-xs text-text-muted">
                Describe the image for screen readers and accessibility
              </p>
            </div>
          )}
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
