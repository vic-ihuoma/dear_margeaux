import { useState, useCallback } from 'react';
import { ProductForm } from './ProductForm';
import { VariantForm } from './VariantForm';
import type {
  Product,
  Variant,
  UpdateProductParams,
  CreateVariantParams,
  UpdateVariantParams,
} from '@dear-margeaux/api';

export interface ProductEditorProps {
  product: Product;
  /** URL to redirect after product deletion */
  deleteRedirect?: string;
}

function formatPrice(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
}

export function ProductEditor({
  product: initialProduct,
  deleteRedirect = '/products',
}: ProductEditorProps) {
  const [product, setProduct] = useState<Product>(initialProduct);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [variantError, setVariantError] = useState<string | null>(null);
  const [isAddingVariant, setIsAddingVariant] = useState(false);
  const [editingVariantId, setEditingVariantId] = useState<string | null>(null);
  const [deletingProductId, setDeletingProductId] = useState(false);
  const [deletingVariantId, setDeletingVariantId] = useState<string | null>(
    null
  );

  const handleProductSubmit = useCallback(
    async (data: UpdateProductParams) => {
      setIsSubmitting(true);
      setError(null);

      try {
        const response = await fetch(`/api/products/${product.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const result = await response.json();
          throw new Error(result.error || 'Failed to update product');
        }

        const updatedProduct = await response.json();
        setProduct((prev) => ({ ...prev, ...updatedProduct }));
        // Show a brief success indicator (the UI updates automatically)
      } catch (err) {
        console.error('Update product error:', err);
        setError(
          err instanceof Error ? err.message : 'Failed to update product'
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [product.id]
  );

  const handleDeleteProduct = useCallback(async () => {
    if (
      !confirm(
        'Are you sure you want to delete this product? This action cannot be undone.'
      )
    ) {
      return;
    }

    setDeletingProductId(true);
    setError(null);

    try {
      const response = await fetch(`/api/products/${product.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to delete product');
      }

      window.location.href = deleteRedirect;
    } catch (err) {
      console.error('Delete product error:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete product');
    } finally {
      setDeletingProductId(false);
    }
  }, [product.id, deleteRedirect]);

  const handleAddVariant = useCallback(
    async (data: CreateVariantParams) => {
      setIsSubmitting(true);
      setVariantError(null);

      try {
        const response = await fetch(`/api/products/${product.id}/variants`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const result = await response.json();
          throw new Error(result.error || 'Failed to add variant');
        }

        const variant = await response.json();
        setProduct({
          ...product,
          variants: [...product.variants, variant],
        });
        setIsAddingVariant(false);
      } catch (err) {
        console.error('Add variant error:', err);
        setVariantError(
          err instanceof Error ? err.message : 'Failed to add variant'
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [product]
  );

  const handleUpdateVariant = useCallback(
    async (variantId: string, data: UpdateVariantParams) => {
      setIsSubmitting(true);
      setVariantError(null);

      try {
        const response = await fetch(
          `/api/products/${product.id}/variants/${variantId}`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
          }
        );

        if (!response.ok) {
          const result = await response.json();
          throw new Error(result.error || 'Failed to update variant');
        }

        const updatedVariant = await response.json();
        setProduct({
          ...product,
          variants: product.variants.map((v) =>
            v.id === variantId ? { ...v, ...updatedVariant } : v
          ),
        });
        setEditingVariantId(null);
      } catch (err) {
        console.error('Update variant error:', err);
        setVariantError(
          err instanceof Error ? err.message : 'Failed to update variant'
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [product]
  );

  const handleDeleteVariant = useCallback(
    async (variantId: string) => {
      if (!confirm('Are you sure you want to delete this variant?')) {
        return;
      }

      setDeletingVariantId(variantId);
      setVariantError(null);

      try {
        const response = await fetch(
          `/api/products/${product.id}/variants/${variantId}`,
          {
            method: 'DELETE',
          }
        );

        if (!response.ok) {
          const result = await response.json();
          throw new Error(result.error || 'Failed to delete variant');
        }

        setProduct({
          ...product,
          variants: product.variants.filter((v) => v.id !== variantId),
        });
      } catch (err) {
        console.error('Delete variant error:', err);
        setVariantError(
          err instanceof Error ? err.message : 'Failed to delete variant'
        );
      } finally {
        setDeletingVariantId(null);
      }
    },
    [product]
  );

  return (
    <div className="space-y-8">
      {/* Product Details Section */}
      <div className="bg-background-secondary rounded-xl border border-border shadow-sm">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-text-primary">
            Product Details
          </h2>
        </div>
        <div className="p-6">
          <ProductForm
            product={product}
            onSubmit={handleProductSubmit}
            onCancel={() => window.history.back()}
            isSubmitting={isSubmitting}
            error={error}
          />
        </div>
      </div>

      {/* Variants Section */}
      <div className="bg-background-secondary rounded-xl border border-border shadow-sm">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text-primary">Variants</h2>
          {!isAddingVariant && (
            <button
              type="button"
              onClick={() => {
                setIsAddingVariant(true);
                setEditingVariantId(null);
              }}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-primary hover:text-primary-600 transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
                className="w-4 h-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4.5v15m7.5-7.5h-15"
                />
              </svg>
              Add Variant
            </button>
          )}
        </div>
        <div className="p-6">
          {/* Variant Error */}
          {variantError && (
            <div className="mb-4 rounded-lg bg-status-error/10 border border-status-error/20 p-4">
              <p className="text-sm text-status-error">{variantError}</p>
            </div>
          )}

          {/* Add Variant Form */}
          {isAddingVariant && (
            <div className="mb-6 p-4 bg-background-tertiary rounded-lg border border-border">
              <h3 className="text-sm font-medium text-text-primary mb-4">
                Add New Variant
              </h3>
              <VariantForm
                onSubmit={handleAddVariant}
                onCancel={() => setIsAddingVariant(false)}
                isSubmitting={isSubmitting}
                error={variantError}
              />
            </div>
          )}

          {/* Variants List */}
          {product.variants.length === 0 && !isAddingVariant ? (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-background-tertiary mb-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                  className="w-6 h-6 text-text-muted"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125"
                  />
                </svg>
              </div>
              <h3 className="text-sm font-medium text-text-primary mb-1">
                No variants yet
              </h3>
              <p className="text-sm text-text-muted mb-4">
                Add variants like different sizes or colors
              </p>
              <button
                type="button"
                onClick={() => setIsAddingVariant(true)}
                className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary-600"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                  className="w-4 h-4"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 4.5v15m7.5-7.5h-15"
                  />
                </svg>
                Add your first variant
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {product.variants.map((variant) => (
                <div key={variant.id}>
                  {editingVariantId === variant.id ? (
                    <div className="p-4 bg-background-tertiary rounded-lg border border-border">
                      <h3 className="text-sm font-medium text-text-primary mb-4">
                        Edit Variant
                      </h3>
                      <VariantForm
                        variant={variant}
                        onSubmit={(data) =>
                          handleUpdateVariant(
                            variant.id,
                            data as UpdateVariantParams
                          )
                        }
                        onCancel={() => setEditingVariantId(null)}
                        isSubmitting={isSubmitting}
                        error={variantError}
                      />
                    </div>
                  ) : (
                    <VariantCard
                      variant={variant}
                      onEdit={() => {
                        setEditingVariantId(variant.id);
                        setIsAddingVariant(false);
                      }}
                      onDelete={() => handleDeleteVariant(variant.id)}
                      isDeleting={deletingVariantId === variant.id}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-background-secondary rounded-xl border border-status-error/30 shadow-sm">
        <div className="px-6 py-4 border-b border-status-error/30">
          <h2 className="text-lg font-semibold text-status-error">
            Danger Zone
          </h2>
        </div>
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-text-primary">
                Delete this product
              </h3>
              <p className="text-sm text-text-muted">
                Once deleted, this product cannot be recovered.
              </p>
            </div>
            <button
              type="button"
              onClick={handleDeleteProduct}
              disabled={deletingProductId}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-status-error rounded-lg hover:bg-status-error/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {deletingProductId ? 'Deleting...' : 'Delete Product'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface VariantCardProps {
  variant: Variant;
  onEdit: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}

function VariantCard({
  variant,
  onEdit,
  onDelete,
  isDeleting,
}: VariantCardProps) {
  return (
    <div className="flex items-center gap-4 p-4 bg-background-tertiary/50 rounded-lg border border-border">
      {/* Image */}
      <div className="flex-shrink-0">
        {variant.image_url ? (
          <img
            src={variant.image_url}
            alt={variant.title}
            className="h-16 w-16 rounded-lg object-cover"
          />
        ) : (
          <div className="h-16 w-16 rounded-lg bg-background-tertiary flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
              className="w-6 h-6 text-text-muted"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
              />
            </svg>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-medium text-text-primary">
          {variant.title}
        </h4>
        <p className="text-sm text-text-muted">SKU: {variant.sku}</p>
        <p className="text-sm font-medium text-primary mt-1">
          {formatPrice(variant.price_cents)}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onEdit}
          className="p-2 text-text-secondary hover:text-text-primary hover:bg-background-primary rounded-lg transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
            className="w-4 h-4"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
            />
          </svg>
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={isDeleting}
          className="p-2 text-text-secondary hover:text-status-error hover:bg-status-error/10 rounded-lg transition-colors disabled:opacity-50"
        >
          {isDeleting ? (
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
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
              className="w-4 h-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
              />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
