import { useState, useCallback, useRef, useEffect } from 'react';
import type { Product, DeletedProduct } from '@dear-margeaux/api';
import { UndoToast } from './UndoToast';

/**
 * Format cents to a currency string (e.g., 1999 -> "$19.99")
 * Defined inline to avoid SSR hydration issues with function props
 */
function formatPrice(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
}

interface ProductListBulkProps {
  products: Product[];
  onProductsChanged?: () => void;
}

type BulkAction = 'delete' | 'active' | 'draft';

interface OperationProgress {
  total: number;
  completed: number;
  failed: number;
  inProgress: boolean;
}

interface DeletedProducts {
  items: DeletedProduct[];
}

export function ProductListBulk({
  products: initialProducts,
  onProductsChanged,
}: ProductListBulkProps) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [progress, setProgress] = useState<OperationProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [deletedProducts, setDeletedProducts] =
    useState<DeletedProducts | null>(null);
  const [showUndoToast, setShowUndoToast] = useState(false);
  const selectAllRef = useRef<HTMLInputElement>(null);

  // Update products when prop changes
  useEffect(() => {
    setProducts(initialProducts);
  }, [initialProducts]);

  // Handle indeterminate state for select-all checkbox
  useEffect(() => {
    if (selectAllRef.current) {
      const allSelected =
        selectedIds.size === products.length && products.length > 0;
      const someSelected = selectedIds.size > 0 && !allSelected;
      selectAllRef.current.indeterminate = someSelected;
    }
  }, [selectedIds, products.length]);

  // Clear messages after delay
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === products.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(products.map((p) => p.id)));
    }
  }, [products, selectedIds.size]);

  const toggleSelect = useCallback((productId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  }, []);

  const handleBulkAction = useCallback(
    async (action: BulkAction) => {
      if (action === 'delete') {
        setShowConfirmDelete(true);
        return;
      }

      // Status change operation
      const ids = Array.from(selectedIds);
      setProgress({
        total: ids.length,
        completed: 0,
        failed: 0,
        inProgress: true,
      });
      setError(null);

      let completed = 0;
      let failed = 0;

      for (const id of ids) {
        try {
          const response = await fetch(`/api/products/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: action }),
          });

          if (!response.ok) {
            failed++;
          } else {
            completed++;
            // Update local state
            setProducts((prev) =>
              prev.map((p) =>
                p.id === id ? { ...p, status: action as 'active' | 'draft' } : p
              )
            );
          }
        } catch {
          failed++;
        }

        setProgress((prev) =>
          prev ? { ...prev, completed: completed, failed: failed } : null
        );
      }

      setProgress((prev) => (prev ? { ...prev, inProgress: false } : null));
      setSelectedIds(new Set());

      if (failed > 0) {
        setError(`Failed to update ${failed} product${failed > 1 ? 's' : ''}`);
      } else {
        setSuccessMessage(
          `Successfully updated ${completed} product${completed > 1 ? 's' : ''} to ${action}`
        );
      }

      setTimeout(() => setProgress(null), 2000);
      onProductsChanged?.();
    },
    [selectedIds, onProductsChanged]
  );

  const executeBulkDelete = useCallback(async () => {
    const ids = Array.from(selectedIds);
    setShowConfirmDelete(false);
    setProgress({
      total: ids.length,
      completed: 0,
      failed: 0,
      inProgress: true,
    });
    setError(null);

    let completed = 0;
    let failed = 0;
    const deleted: DeletedProduct[] = [];

    for (const id of ids) {
      try {
        const response = await fetch(`/api/products/${id}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          failed++;
        } else {
          const deletedProduct = await response.json();
          deleted.push(deletedProduct);
          completed++;
          // Remove from local state
          setProducts((prev) => prev.filter((p) => p.id !== id));
        }
      } catch {
        failed++;
      }

      setProgress((prev) =>
        prev ? { ...prev, completed: completed, failed: failed } : null
      );
    }

    setProgress((prev) => (prev ? { ...prev, inProgress: false } : null));
    setSelectedIds(new Set());

    if (failed > 0) {
      setError(`Failed to delete ${failed} product${failed > 1 ? 's' : ''}`);
    } else if (deleted.length > 0) {
      // Show undo toast for soft-deleted products
      setDeletedProducts({ items: deleted });
      setShowUndoToast(true);
    }

    setTimeout(() => setProgress(null), 2000);
    onProductsChanged?.();
  }, [selectedIds, onProductsChanged]);

  const handleUndoBulkDelete = useCallback(async () => {
    if (!deletedProducts || deletedProducts.items.length === 0) return;

    let restored = 0;
    let failed = 0;

    for (const product of deletedProducts.items) {
      try {
        const response = await fetch(`/api/products/${product.id}/restore`, {
          method: 'POST',
        });

        if (response.ok) {
          const restoredProduct = await response.json();
          restored++;
          // Add back to local state
          setProducts((prev) => [...prev, restoredProduct]);
        } else {
          failed++;
        }
      } catch {
        failed++;
      }
    }

    if (failed > 0) {
      setError(`Failed to restore ${failed} product${failed > 1 ? 's' : ''}`);
    } else {
      setSuccessMessage(
        `Successfully restored ${restored} product${restored > 1 ? 's' : ''}`
      );
    }

    setDeletedProducts(null);
    setShowUndoToast(false);
    onProductsChanged?.();
  }, [deletedProducts, onProductsChanged]);

  const handleDismissUndo = useCallback(() => {
    setShowUndoToast(false);
    setDeletedProducts(null);
  }, []);

  const getPrimaryPrice = (product: Product): number => {
    return product.variants[0]?.price_cents || 0;
  };

  const getPrimaryImage = (product: Product): string | null => {
    return product.variants.find((v) => v.image_url)?.image_url || null;
  };

  const showToolbar = selectedIds.size > 0;

  return (
    <div className="relative">
      {/* Undo Toast for bulk delete */}
      {showUndoToast && deletedProducts && (
        <UndoToast
          message={`${deletedProducts.items.length} product${deletedProducts.items.length > 1 ? 's' : ''} deleted`}
          onUndo={handleUndoBulkDelete}
          onDismiss={handleDismissUndo}
          duration={30000}
        />
      )}

      {/* Bulk Action Toolbar */}
      {showToolbar && (
        <div className="sticky top-0 z-10 mb-4 bg-primary/5 border border-primary/20 rounded-lg p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-text-primary">
              {selectedIds.size}{' '}
              {selectedIds.size === 1 ? 'product' : 'products'} selected
            </span>
          </div>
          <div className="flex items-center gap-2">
            <select
              onChange={(e) => {
                if (e.target.value) {
                  handleBulkAction(e.target.value as BulkAction);
                  e.target.value = '';
                }
              }}
              className="rounded-lg border border-border bg-background-primary py-2 pl-3 pr-8 text-sm text-text-primary focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              defaultValue=""
              disabled={progress?.inProgress}
            >
              <option value="" disabled>
                Bulk Actions
              </option>
              <option value="active">Set as Active</option>
              <option value="draft">Set as Draft</option>
              <option value="delete">Delete selected</option>
            </select>
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="px-3 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              Clear selection
            </button>
          </div>
        </div>
      )}

      {/* Progress indicator */}
      {progress && (
        <div className="mb-4 bg-background-secondary border border-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-text-secondary">
              {progress.inProgress ? 'Processing...' : 'Operation complete'}
            </span>
            <span className="text-sm font-medium text-text-primary">
              {progress.completed}/{progress.total}
            </span>
          </div>
          <div className="w-full bg-background-tertiary rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-200"
              style={{
                width: `${Math.round((progress.completed / progress.total) * 100)}%`,
              }}
            />
          </div>
          {progress.failed > 0 && (
            <p className="mt-2 text-sm text-status-error">
              {progress.failed} failed
            </p>
          )}
        </div>
      )}

      {/* Success/Error messages */}
      {successMessage && (
        <div className="mb-4 bg-status-success/10 border border-status-success/20 rounded-lg p-4">
          <p className="text-sm text-status-success">{successMessage}</p>
        </div>
      )}

      {error && (
        <div className="mb-4 bg-status-error/10 border border-status-error/20 rounded-lg p-4">
          <p className="text-sm text-status-error">{error}</p>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showConfirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <button
            type="button"
            className="absolute inset-0 bg-black/50 cursor-default"
            onClick={() => setShowConfirmDelete(false)}
            aria-label="Close modal"
          />
          <div className="relative bg-background-secondary rounded-xl border border-border shadow-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-text-primary mb-2">
              Confirm Delete
            </h3>
            <p className="text-sm text-text-secondary mb-6">
              Are you sure you want to delete {selectedIds.size}{' '}
              {selectedIds.size === 1 ? 'product' : 'products'}? This action
              cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowConfirmDelete(false)}
                className="px-4 py-2 text-sm font-medium text-text-primary bg-background-tertiary border border-border rounded-lg hover:bg-background-primary transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeBulkDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-status-error rounded-lg hover:bg-red-600 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Products Table */}
      <div className="bg-background-secondary rounded-xl border border-border shadow-sm overflow-hidden">
        {products.length === 0 ? (
          <div className="p-8 text-center">
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
                  d="m21 7.5-9-5.25L3 7.5m18 0-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9"
                />
              </svg>
            </div>
            <h3 className="text-sm font-medium text-text-primary mb-1">
              No products found
            </h3>
            <p className="text-sm text-text-muted mb-4">
              Get started by creating your first product
            </p>
            <a
              href="/products/new"
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
              Add your first product
            </a>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-background-tertiary">
                <tr>
                  <th
                    scope="col"
                    className="py-3.5 pl-4 pr-3 text-left text-xs font-medium uppercase tracking-wide text-text-muted sm:pl-6"
                  >
                    <input
                      ref={selectAllRef}
                      type="checkbox"
                      checked={
                        selectedIds.size === products.length &&
                        products.length > 0
                      }
                      onChange={toggleSelectAll}
                      className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                      aria-label="Select all products"
                    />
                  </th>
                  <th
                    scope="col"
                    className="py-3.5 pl-4 pr-3 text-left text-xs font-medium uppercase tracking-wide text-text-muted"
                  >
                    Product
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-3.5 text-left text-xs font-medium uppercase tracking-wide text-text-muted"
                  >
                    Status
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-3.5 text-left text-xs font-medium uppercase tracking-wide text-text-muted"
                  >
                    Price
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-3.5 text-left text-xs font-medium uppercase tracking-wide text-text-muted"
                  >
                    Variants
                  </th>
                  <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-background-secondary">
                {products.map((product) => (
                  <tr
                    key={product.id}
                    className={`hover:bg-background-tertiary/50 transition-colors duration-normal ${
                      selectedIds.has(product.id) ? 'bg-primary/5' : ''
                    }`}
                  >
                    <td className="whitespace-nowrap py-4 pl-4 pr-3 sm:pl-6">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(product.id)}
                        onChange={() => toggleSelect(product.id)}
                        className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                        aria-label={`Select ${product.title}`}
                      />
                    </td>
                    <td className="whitespace-nowrap py-4 pl-4 pr-3">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 flex-shrink-0">
                          {getPrimaryImage(product) ? (
                            <img
                              className="h-12 w-12 rounded-lg object-cover"
                              src={getPrimaryImage(product)!}
                              alt={product.title}
                            />
                          ) : (
                            <div className="h-12 w-12 rounded-lg bg-background-tertiary flex items-center justify-center">
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
                        <div>
                          <a
                            href={`/products/${product.id}`}
                            className="font-medium text-text-primary hover:text-primary transition-colors"
                          >
                            {product.title}
                          </a>
                          {product.description && (
                            <p className="text-sm text-text-muted truncate max-w-xs">
                              {product.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                          product.status === 'active'
                            ? 'bg-status-success/10 text-status-success'
                            : 'bg-background-tertiary text-text-muted'
                        }`}
                      >
                        {product.status === 'active' ? 'Active' : 'Draft'}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-text-primary">
                      {formatPrice(getPrimaryPrice(product))}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-text-secondary">
                      {product.variants.length}{' '}
                      {product.variants.length === 1 ? 'variant' : 'variants'}
                    </td>
                    <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                      <a
                        href={`/products/${product.id}`}
                        className="text-primary hover:text-primary-600"
                      >
                        Edit<span className="sr-only">, {product.title}</span>
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Product count */}
      {products.length > 0 && (
        <p className="mt-4 text-sm text-text-muted">
          Showing {products.length}{' '}
          {products.length === 1 ? 'product' : 'products'}
        </p>
      )}
    </div>
  );
}

export default ProductListBulk;
