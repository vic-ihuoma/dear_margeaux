import { useState, useCallback } from 'react';
import { DropForm } from './DropForm';
import { ProductAssigner } from './ProductAssigner';
import { SuccessIndicator } from './SuccessIndicator';
import type { Drop, Product, UpdateDropParams } from '@dear-margeaux/api';

export interface DropEditorProps {
  drop: Drop;
  assignedProducts: Product[];
  /** URL to redirect after drop deletion */
  deleteRedirect?: string;
}

/** Upload handler for cover image */
async function uploadHandler(
  file: File
): Promise<{ url: string; key: string }> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('/api/images/upload', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const result = await response.json();
    throw new Error(result.error || 'Failed to upload image');
  }

  return response.json();
}

export function DropEditor({
  drop: initialDrop,
  assignedProducts: initialProducts,
  deleteRedirect = '/drops',
}: DropEditorProps) {
  const [drop, setDrop] = useState<Drop>(initialDrop);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDeletingDrop, setIsDeletingDrop] = useState(false);
  const [showDropSuccess, setShowDropSuccess] = useState(false);
  const [showProductsSuccess, setShowProductsSuccess] = useState(false);

  const handleDropSubmit = useCallback(
    async (data: UpdateDropParams) => {
      setIsSubmitting(true);
      setError(null);

      try {
        const response = await fetch(`/api/drops/${drop.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const result = await response.json();
          throw new Error(result.error || 'Failed to update drop');
        }

        const updatedDrop = await response.json();
        setDrop((prev) => ({ ...prev, ...updatedDrop }));
        setShowDropSuccess(true);
      } catch (err) {
        console.error('Update drop error:', err);
        setError(err instanceof Error ? err.message : 'Failed to update drop');
      } finally {
        setIsSubmitting(false);
      }
    },
    [drop.id]
  );

  const handleDeleteDrop = useCallback(async () => {
    if (
      !confirm(
        'Are you sure you want to delete this drop? This will not delete the products, but they will no longer be associated with this drop.'
      )
    ) {
      return;
    }

    setIsDeletingDrop(true);
    setError(null);

    try {
      const response = await fetch(`/api/drops/${drop.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to delete drop');
      }

      window.location.href = deleteRedirect;
    } catch (err) {
      console.error('Delete drop error:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete drop');
    } finally {
      setIsDeletingDrop(false);
    }
  }, [drop.id, deleteRedirect]);

  const handleProductsUpdate = useCallback(
    async (productIds: string[]) => {
      // Update products by assigning/unassigning them from the drop
      const response = await fetch(`/api/drops/${drop.id}/products`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ productIds }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to update products');
      }

      setShowProductsSuccess(true);
    },
    [drop.id]
  );

  return (
    <div className="space-y-8">
      {/* Drop Details Section */}
      <div className="bg-background-secondary rounded-xl border border-border shadow-sm">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-text-primary">
            Drop Details
          </h2>
        </div>
        <div className="p-6">
          <DropForm
            drop={drop}
            onSubmit={handleDropSubmit}
            onCancel={() => window.history.back()}
            isSubmitting={isSubmitting}
            error={error}
            uploadHandler={uploadHandler}
            showSuccess={showDropSuccess}
            onSuccessComplete={() => setShowDropSuccess(false)}
          />
        </div>
      </div>

      {/* Products Section */}
      <div className="bg-background-secondary rounded-xl border border-border shadow-sm">
        <div className="px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-text-primary">
              Products in This Drop
            </h2>
            <SuccessIndicator
              show={showProductsSuccess}
              message="Updated"
              onComplete={() => setShowProductsSuccess(false)}
              size="sm"
            />
          </div>
          <p className="mt-1 text-sm text-text-muted">
            Assign products to this drop. Products can only belong to one drop
            at a time.
          </p>
        </div>
        <div className="p-6">
          <ProductAssigner
            assignedProducts={initialProducts}
            onUpdate={handleProductsUpdate}
          />
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
                Delete this drop
              </h3>
              <p className="text-sm text-text-muted">
                Products will remain but will no longer be associated with this
                drop.
              </p>
            </div>
            <button
              type="button"
              onClick={handleDeleteDrop}
              disabled={isDeletingDrop}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-status-error rounded-lg hover:bg-status-error/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDeletingDrop ? 'Deleting...' : 'Delete Drop'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
