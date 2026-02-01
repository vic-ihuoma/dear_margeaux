import { useState, useCallback } from 'react';
import type { VariantFormData } from './ProductFormComplete';
import { ImageUploader } from './ImageUploader';

export interface VariantCardProps {
  /** The variant data */
  variant: VariantFormData;
  /** The index of the variant in the array (0-indexed) */
  index: number;
  /** Called when any variant field is updated */
  onUpdate: (index: number, updates: Partial<VariantFormData>) => void;
  /** Called when the variant should be removed */
  onRemove: (index: number) => void;
  /** Called when the expand/collapse toggle is clicked */
  onToggleExpand: (index: number) => void;
  /** Whether this is the only variant (prevents removal) */
  isOnlyVariant: boolean;
  /** Whether the parent form is submitting */
  isSubmitting: boolean;
  /** Whether we're editing an existing product (disables SKU changes) */
  isEditing: boolean;
  /** Field-level errors for this variant */
  errors: Partial<Record<keyof VariantFormData, string>>;
  /** Optional handler for image uploads (shows ImageUploader when provided) */
  uploadHandler?: (file: File) => Promise<{ url: string; key: string }>;
}

/**
 * Check if a variant has any data entered
 */
function variantHasData(variant: VariantFormData): boolean {
  return !!(
    variant.sku.trim() ||
    variant.title.trim() ||
    variant.price.trim() ||
    variant.image_url
  );
}

/**
 * Format price for preview display
 */
function formatPricePreview(price: string): string | null {
  if (!price) return null;
  const numericPrice = parseFloat(price);
  if (isNaN(numericPrice)) return null;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(numericPrice);
}

/**
 * VariantCard component for inline variant editing
 *
 * Features:
 * - Compact view: SKU, title, price, thumbnail (collapsed)
 * - Full edit form (expanded)
 * - Delete button with confirmation for variants with data
 * - Optional drag handle for reordering
 */
export function VariantCard({
  variant,
  index,
  onUpdate,
  onRemove,
  onToggleExpand,
  isOnlyVariant,
  isSubmitting,
  isEditing,
  errors,
  uploadHandler,
}: VariantCardProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const hasErrors = Object.keys(errors).length > 0;
  const pricePreview = formatPricePreview(variant.price);
  const hasData = variantHasData(variant);

  // Handle image upload
  const handleImageUpload = useCallback(
    (url: string) => {
      onUpdate(index, { image_url: url });
    },
    [index, onUpdate]
  );

  // Handle image removal
  const handleImageRemove = useCallback(() => {
    onUpdate(index, { image_url: '', image_alt: '' });
  }, [index, onUpdate]);

  // Handle delete click - show confirmation if variant has data
  const handleDeleteClick = useCallback(() => {
    if (hasData) {
      setShowDeleteConfirm(true);
    } else {
      onRemove(index);
    }
  }, [hasData, index, onRemove]);

  // Confirm deletion
  const handleConfirmDelete = useCallback(() => {
    setShowDeleteConfirm(false);
    onRemove(index);
  }, [index, onRemove]);

  // Cancel deletion
  const handleCancelDelete = useCallback(() => {
    setShowDeleteConfirm(false);
  }, []);

  return (
    <div
      data-testid="variant-card"
      data-variant-card
      className={`border rounded-lg ${hasErrors ? 'border-status-error' : 'border-border'} bg-background-secondary`}
    >
      {/* Variant Header - Collapsible Toggle */}
      <button
        type="button"
        onClick={() => onToggleExpand(index)}
        aria-expanded={variant.isExpanded}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-background-tertiary transition-colors duration-normal rounded-t-lg"
        disabled={isSubmitting}
      >
        <div className="flex items-center gap-3">
          {/* Optional drag handle (visual indicator for reordering) */}
          {!isOnlyVariant && (
            <span
              data-testid="drag-handle"
              className="text-text-muted cursor-grab"
              title="Drag to reorder"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 8h16M4 16h16"
                />
              </svg>
            </span>
          )}

          {/* Thumbnail when collapsed */}
          {!variant.isExpanded && variant.image_url && (
            <img
              src={variant.image_url}
              alt={variant.image_alt || 'Variant thumbnail'}
              className="w-8 h-8 rounded object-cover border border-border"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          )}
          {!variant.isExpanded && !variant.image_url && (
            <div
              data-testid="no-image-indicator"
              className="w-8 h-8 rounded bg-background-tertiary flex items-center justify-center"
            >
              <svg
                className="w-4 h-4 text-text-muted"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
          )}

          <span className="text-sm font-medium text-text-primary">
            Variant {index + 1}
          </span>

          {/* Compact summary when collapsed */}
          {!variant.isExpanded &&
            (variant.sku || variant.title || variant.price) && (
              <span className="text-xs text-text-muted">
                {[
                  variant.sku && variant.sku.toUpperCase(),
                  variant.title,
                  pricePreview,
                ]
                  .filter(Boolean)
                  .join(' • ')}
              </span>
            )}

          {/* Error indicator when collapsed */}
          {hasErrors && !variant.isExpanded && (
            <span className="text-xs text-status-error">Has errors</span>
          )}
        </div>

        {/* Expand/collapse chevron */}
        <svg
          className={`w-5 h-5 text-text-muted transition-transform duration-normal ${
            variant.isExpanded ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Variant Form Fields - Collapsible Content */}
      {variant.isExpanded && (
        <div className="p-4 pt-0 space-y-4 border-t border-border">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* SKU */}
            <div>
              <label
                htmlFor={`variant-${index}-sku`}
                className="block text-sm font-medium text-text-primary mb-1"
              >
                SKU <span className="text-status-error">*</span>
              </label>
              <input
                type="text"
                id={`variant-${index}-sku`}
                value={variant.sku}
                onChange={(e) =>
                  onUpdate(index, { sku: e.target.value.toUpperCase() })
                }
                className={`block w-full rounded-lg border ${
                  errors.sku
                    ? 'border-status-error focus:border-status-error focus:ring-status-error'
                    : 'border-border focus:border-primary-500 focus:ring-primary-500'
                } bg-background-primary py-2 px-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 uppercase`}
                placeholder="e.g., BAG-001-BLK"
                disabled={isSubmitting || (isEditing && !!variant.id)}
              />
              {errors.sku && (
                <p className="mt-1 text-xs text-status-error">{errors.sku}</p>
              )}
              {isEditing && !!variant.id && (
                <p className="mt-1 text-xs text-text-muted">
                  SKU cannot be changed after creation
                </p>
              )}
              {!isEditing && index === 0 && (
                <p className="mt-1 text-xs text-text-muted">
                  Auto-generated from title. Alphanumeric with
                  hyphens/underscores only.
                </p>
              )}
            </div>

            {/* Variant Title */}
            <div>
              <label
                htmlFor={`variant-${index}-title`}
                className="block text-sm font-medium text-text-primary mb-1"
              >
                Variant Title <span className="text-status-error">*</span>
              </label>
              <input
                type="text"
                id={`variant-${index}-title`}
                value={variant.title}
                onChange={(e) => onUpdate(index, { title: e.target.value })}
                className={`block w-full rounded-lg border ${
                  errors.title
                    ? 'border-status-error focus:border-status-error focus:ring-status-error'
                    : 'border-border focus:border-primary-500 focus:ring-primary-500'
                } bg-background-primary py-2 px-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1`}
                placeholder="e.g., Black Leather, Size M"
                disabled={isSubmitting}
              />
              {errors.title && (
                <p className="mt-1 text-xs text-status-error">{errors.title}</p>
              )}
            </div>
          </div>

          {/* Price */}
          <div>
            <label
              htmlFor={`variant-${index}-price`}
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
                id={`variant-${index}-price`}
                value={variant.price}
                onChange={(e) => onUpdate(index, { price: e.target.value })}
                step="0.01"
                min="0"
                className={`block w-full rounded-lg border ${
                  errors.price
                    ? 'border-status-error focus:border-status-error focus:ring-status-error'
                    : 'border-border focus:border-primary-500 focus:ring-primary-500'
                } bg-background-primary py-2 pl-7 pr-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1`}
                placeholder="0.00"
                disabled={isSubmitting}
              />
            </div>
            {errors.price && (
              <p className="mt-1 text-xs text-status-error">{errors.price}</p>
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
                value={variant.image_url || null}
                onUpload={handleImageUpload}
                onRemove={handleImageRemove}
                isUploading={isSubmitting}
                uploadHandler={uploadHandler}
              />
            ) : (
              <div>
                <label
                  htmlFor={`variant-${index}-image-url`}
                  className="sr-only"
                >
                  Variant Image URL
                </label>
                <input
                  type="url"
                  id={`variant-${index}-image-url`}
                  value={variant.image_url}
                  onChange={(e) =>
                    onUpdate(index, { image_url: e.target.value })
                  }
                  className="block w-full rounded-lg border border-border focus:border-primary-500 focus:ring-primary-500 bg-background-primary py-2 px-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1"
                  placeholder="https://example.com/variant-image.jpg"
                  disabled={isSubmitting}
                />
                {variant.image_url && (
                  <div className="mt-2 relative inline-block">
                    <img
                      src={variant.image_url}
                      alt={variant.image_alt || 'Variant preview'}
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
          {variant.image_url && (
            <div>
              <label
                htmlFor={`variant-${index}-image-alt`}
                className="block text-sm font-medium text-text-primary mb-1"
              >
                Image Alt Text <span className="text-status-error">*</span>
              </label>
              <input
                type="text"
                id={`variant-${index}-image-alt`}
                value={variant.image_alt}
                onChange={(e) => onUpdate(index, { image_alt: e.target.value })}
                className={`block w-full rounded-lg border ${
                  errors.image_alt
                    ? 'border-status-error focus:border-status-error focus:ring-status-error'
                    : 'border-border focus:border-primary-500 focus:ring-primary-500'
                } bg-background-primary py-2 px-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1`}
                placeholder="Describe the variant image for accessibility"
                disabled={isSubmitting}
              />
              {errors.image_alt && (
                <p className="mt-1 text-xs text-status-error">
                  {errors.image_alt}
                </p>
              )}
            </div>
          )}

          {/* Remove Variant Button / Delete Confirmation */}
          <div className="pt-2 flex justify-end">
            {showDeleteConfirm ? (
              <div className="flex items-center gap-3 p-3 bg-status-error/10 rounded-lg border border-status-error/20">
                <span className="text-sm text-text-primary">
                  Are you sure you want to remove this variant?
                </span>
                <button
                  type="button"
                  onClick={handleCancelDelete}
                  className="px-3 py-1 text-sm text-text-primary bg-background-tertiary border border-border rounded hover:bg-background-primary transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="px-3 py-1 text-sm text-white bg-status-error rounded hover:bg-red-700 transition-colors"
                >
                  Confirm Delete
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleDeleteClick}
                disabled={isSubmitting || isOnlyVariant}
                className="text-sm text-status-error hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Remove Variant
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
