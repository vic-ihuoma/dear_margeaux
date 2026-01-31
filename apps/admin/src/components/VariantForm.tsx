import { useState, useCallback, type FormEvent } from 'react';
import type { Variant } from '@dear-margeaux/api';
import { ImageUploader } from './ImageUploader';

export interface VariantFormData {
  sku: string;
  title: string;
  price: string;
  image_url: string;
  image_alt: string;
  low_stock_threshold: string;
}

/** The data shape that VariantForm submits */
export interface VariantFormSubmitData {
  sku: string;
  title: string;
  price_cents: number;
  image_url?: string;
  image_alt?: string;
  low_stock_threshold?: number | null;
}

export interface VariantFormProps {
  /** Existing variant data for editing, undefined for new variants */
  variant?: Variant;
  /** Called when form is submitted */
  onSubmit: (data: VariantFormSubmitData) => Promise<void>;
  /** Called when user cancels */
  onCancel: () => void;
  /** Whether the form is currently submitting */
  isSubmitting?: boolean;
  /** Error message to display */
  error?: string | null;
  /** Handler function for image upload - required for ImageUploader */
  uploadHandler?: (file: File) => Promise<{ url: string; key: string }>;
}

export function VariantForm({
  variant,
  onSubmit,
  onCancel,
  isSubmitting = false,
  error,
  uploadHandler,
}: VariantFormProps) {
  const [formData, setFormData] = useState<VariantFormData>({
    sku: variant?.sku || '',
    title: variant?.title || '',
    price: variant ? (variant.price_cents / 100).toFixed(2) : '',
    image_url: variant?.image_url || '',
    image_alt: variant?.image_alt || '',
    low_stock_threshold:
      variant?.low_stock_threshold != null
        ? String(variant.low_stock_threshold)
        : '',
  });

  const [formErrors, setFormErrors] = useState<
    Partial<Record<keyof VariantFormData, string>>
  >({});

  const validate = useCallback((): boolean => {
    const errors: Partial<Record<keyof VariantFormData, string>> = {};

    if (!formData.sku.trim()) {
      errors.sku = 'SKU is required';
    } else if (!/^[A-Za-z0-9-_]+$/.test(formData.sku)) {
      errors.sku =
        'SKU can only contain letters, numbers, hyphens, and underscores';
    }

    if (!formData.title.trim()) {
      errors.title = 'Title is required';
    }

    if (!formData.price.trim()) {
      errors.price = 'Price is required';
    } else {
      const priceValue = parseFloat(formData.price);
      if (isNaN(priceValue) || priceValue < 0) {
        errors.price = 'Price must be a positive number';
      }
    }

    // Validate alt text is required when image is uploaded
    if (formData.image_url && !formData.image_alt.trim()) {
      errors.image_alt = 'Alt text is required when an image is uploaded';
    }

    // Validate low_stock_threshold if provided
    if (formData.low_stock_threshold.trim()) {
      const thresholdValue = parseInt(formData.low_stock_threshold, 10);
      if (
        isNaN(thresholdValue) ||
        thresholdValue < 0 ||
        !Number.isInteger(thresholdValue)
      ) {
        errors.low_stock_threshold =
          'Threshold must be a non-negative whole number';
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

    const priceCents = Math.round(parseFloat(formData.price) * 100);

    // Parse low_stock_threshold: empty string = null (use default), otherwise integer
    const threshold = formData.low_stock_threshold.trim();
    const lowStockThreshold = threshold ? parseInt(threshold, 10) : null;

    await onSubmit({
      sku: formData.sku.trim().toUpperCase(),
      title: formData.title.trim(),
      price_cents: priceCents,
      image_url: formData.image_url.trim() || undefined,
      image_alt: formData.image_alt.trim() || undefined,
      low_stock_threshold: lowStockThreshold,
    });
  };

  const handleImageUpload = (url: string) => {
    setFormData({ ...formData, image_url: url });
    // Clear any image_url errors when a new image is uploaded
    if (formErrors.image_url) {
      setFormErrors({ ...formErrors, image_url: undefined });
    }
  };

  const handleImageRemove = () => {
    setFormData({ ...formData, image_url: '', image_alt: '' });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg bg-status-error/10 border border-status-error/20 p-3">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-4 w-4 text-status-error"
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
            <div className="ml-2">
              <p className="text-sm text-status-error">{error}</p>
            </div>
          </div>
        </div>
      )}

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
              setFormData({ ...formData, sku: e.target.value.toUpperCase() })
            }
            className={`block w-full rounded-lg border ${
              formErrors.sku
                ? 'border-status-error focus:border-status-error focus:ring-status-error'
                : 'border-border focus:border-primary-500 focus:ring-primary-500'
            } bg-background-primary py-2 px-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 uppercase`}
            placeholder="e.g., BAG-001-BLK"
            disabled={isSubmitting || !!variant}
          />
          {formErrors.sku && (
            <p className="mt-1 text-xs text-status-error">{formErrors.sku}</p>
          )}
          {variant && (
            <p className="mt-1 text-xs text-text-muted">
              SKU cannot be changed after creation
            </p>
          )}
        </div>

        {/* Title */}
        <div>
          <label
            htmlFor="variant-title"
            className="block text-sm font-medium text-text-primary mb-1"
          >
            Title <span className="text-status-error">*</span>
          </label>
          <input
            type="text"
            id="variant-title"
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
            placeholder="e.g., Black Leather"
            disabled={isSubmitting}
          />
          {formErrors.title && (
            <p className="mt-1 text-xs text-status-error">{formErrors.title}</p>
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
          <p className="mt-1 text-xs text-status-error">{formErrors.price}</p>
        )}
      </div>

      {/* Low Stock Threshold */}
      <div>
        <label
          htmlFor="variant-low-stock-threshold"
          className="block text-sm font-medium text-text-primary mb-1"
        >
          Low Stock Threshold
        </label>
        <input
          type="number"
          id="variant-low-stock-threshold"
          name="low_stock_threshold"
          value={formData.low_stock_threshold}
          onChange={(e) =>
            setFormData({ ...formData, low_stock_threshold: e.target.value })
          }
          step="1"
          min="0"
          className={`block w-full rounded-lg border ${
            formErrors.low_stock_threshold
              ? 'border-status-error focus:border-status-error focus:ring-status-error'
              : 'border-border focus:border-primary-500 focus:ring-primary-500'
          } bg-background-primary py-2 px-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1`}
          placeholder="5"
          disabled={isSubmitting}
        />
        {formErrors.low_stock_threshold && (
          <p className="mt-1 text-xs text-status-error">
            {formErrors.low_stock_threshold}
          </p>
        )}
        <p className="mt-1 text-xs text-text-muted">
          Alert when stock falls below this level. Leave empty to use default
          (5).
        </p>
      </div>

      {/* Variant Image Section */}
      <div className="space-y-4">
        <div>
          <span className="block text-sm font-medium text-text-primary mb-1">
            Variant Image
          </span>
          {uploadHandler ? (
            <ImageUploader
              value={formData.image_url || null}
              onUpload={handleImageUpload}
              onRemove={handleImageRemove}
              isUploading={isSubmitting}
              uploadHandler={uploadHandler}
            />
          ) : (
            // Fallback to URL input if no upload handler is provided
            <div>
              <label htmlFor="variant-image" className="sr-only">
                Variant Image URL
              </label>
              <input
                type="url"
                id="variant-image"
                name="image_url"
                value={formData.image_url}
                onChange={(e) =>
                  setFormData({ ...formData, image_url: e.target.value })
                }
                className="block w-full rounded-lg border border-border focus:border-primary-500 focus:ring-primary-500 bg-background-primary py-2 px-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1"
                placeholder="https://example.com/image.jpg"
                disabled={isSubmitting}
              />
              {formData.image_url && (
                <div className="mt-2 relative inline-block">
                  <img
                    src={formData.image_url}
                    alt={formData.image_alt || 'Variant preview'}
                    className="h-32 w-32 rounded-lg object-cover border border-border"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                  {formData.image_alt && (
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-1 rounded-b-lg truncate">
                      {formData.image_alt}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Alt Text Input - shown when image is uploaded */}
        {formData.image_url && (
          <div>
            <label
              htmlFor="variant-image-alt"
              className="block text-sm font-medium text-text-primary mb-1"
            >
              Image Alt Text <span className="text-status-error">*</span>
            </label>
            <input
              type="text"
              id="variant-image-alt"
              name="image_alt"
              value={formData.image_alt}
              onChange={(e) =>
                setFormData({ ...formData, image_alt: e.target.value })
              }
              className={`block w-full rounded-lg border ${
                formErrors.image_alt
                  ? 'border-status-error focus:border-status-error focus:ring-status-error'
                  : 'border-border focus:border-primary-500 focus:ring-primary-500'
              } bg-background-primary py-2 px-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1`}
              placeholder="Describe the image for accessibility"
              disabled={isSubmitting}
            />
            {formErrors.image_alt && (
              <p className="mt-1 text-xs text-status-error">
                {formErrors.image_alt}
              </p>
            )}
            <p className="mt-1 text-xs text-text-muted">
              Describe the image for screen readers and accessibility
            </p>
          </div>
        )}

        {/* Image preview with alt text overlay when using ImageUploader */}
        {uploadHandler && formData.image_url && formData.image_alt && (
          <div className="text-xs text-text-muted bg-background-tertiary rounded-lg p-2">
            <span className="font-medium">Alt text:</span> {formData.image_alt}
          </div>
        )}
      </div>

      {/* Form Actions */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="px-3 py-1.5 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors duration-normal disabled:opacity-50 disabled:cursor-not-allowed"
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
          ) : variant ? (
            'Save Variant'
          ) : (
            'Add Variant'
          )}
        </button>
      </div>
    </form>
  );
}
