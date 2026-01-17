import { useState, useCallback } from 'react';
import { DiscountForm, type DiscountFormData } from './DiscountForm';

interface Discount {
  id: string;
  code: string;
  type: 'percentage' | 'fixed_amount';
  value: number;
  status: 'active' | 'inactive';
  min_purchase_cents: number;
  max_discount_cents: number | null;
  starts_at: string | null;
  expires_at: string | null;
  usage_limit: number | null;
  usage_limit_per_customer: number | null;
  usage_count: number;
}

interface DiscountEditorProps {
  discount: Discount;
}

export function DiscountEditor({
  discount: initialDiscount,
}: DiscountEditorProps) {
  const [discount, setDiscount] = useState<Discount>(initialDiscount);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleSubmit = useCallback(
    async (data: DiscountFormData) => {
      setIsSubmitting(true);
      setError(null);
      setSuccessMessage(null);

      try {
        const response = await fetch(`/api/discounts/${discount.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to update discount');
        }

        const updatedDiscount = await response.json();
        setDiscount(updatedDiscount);
        setSuccessMessage('Discount updated successfully');

        // Clear success message after 3 seconds
        setTimeout(() => setSuccessMessage(null), 3000);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to update discount'
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [discount.id]
  );

  const handleCancel = useCallback(() => {
    window.location.href = '/discounts';
  }, []);

  const handleDelete = useCallback(async () => {
    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/discounts/${discount.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to deactivate discount');
      }

      // Redirect to discounts list
      window.location.href = '/discounts';
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to deactivate discount'
      );
      setShowDeleteConfirm(false);
    } finally {
      setIsDeleting(false);
    }
  }, [discount.id]);

  // Convert value to display format for the form
  const formData: DiscountFormData = {
    code: discount.code,
    type: discount.type,
    // For fixed_amount, API stores cents but form expects dollars
    value:
      discount.type === 'fixed_amount' ? discount.value / 100 : discount.value,
    status: discount.status,
    min_purchase_cents: discount.min_purchase_cents,
    max_discount_cents: discount.max_discount_cents,
    starts_at: discount.starts_at,
    expires_at: discount.expires_at,
    usage_limit: discount.usage_limit,
    usage_limit_per_customer: discount.usage_limit_per_customer,
  };

  return (
    <div className="space-y-8">
      {/* Success Message */}
      {successMessage && (
        <div className="p-4 bg-status-success/10 border border-status-success/20 rounded-lg">
          <p className="text-sm text-status-success flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-5 h-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
              />
            </svg>
            {successMessage}
          </p>
        </div>
      )}

      {/* Usage Stats */}
      <div className="bg-background-secondary rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border bg-background-tertiary">
          <h2 className="text-lg font-medium text-text-primary">
            Usage Statistics
          </h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-background-tertiary rounded-lg">
              <p className="text-2xl font-semibold text-text-primary">
                {discount.usage_count}
              </p>
              <p className="text-sm text-text-muted">Times Used</p>
            </div>
            <div className="text-center p-4 bg-background-tertiary rounded-lg">
              <p className="text-2xl font-semibold text-text-primary">
                {discount.usage_limit ?? '∞'}
              </p>
              <p className="text-sm text-text-muted">Total Limit</p>
            </div>
            <div className="text-center p-4 bg-background-tertiary rounded-lg">
              <p className="text-2xl font-semibold text-text-primary">
                {discount.usage_limit
                  ? Math.max(0, discount.usage_limit - discount.usage_count)
                  : '∞'}
              </p>
              <p className="text-sm text-text-muted">Remaining</p>
            </div>
            <div className="text-center p-4 bg-background-tertiary rounded-lg">
              <p className="text-2xl font-semibold text-text-primary">
                {discount.usage_limit_per_customer ?? '∞'}
              </p>
              <p className="text-sm text-text-muted">Per Customer</p>
            </div>
          </div>
        </div>
      </div>

      {/* Discount Details */}
      <div className="bg-background-secondary rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border bg-background-tertiary">
          <h2 className="text-lg font-medium text-text-primary">
            Discount Details
          </h2>
          <p className="mt-1 text-sm text-text-muted">
            Update the discount settings. Code and type cannot be changed.
          </p>
        </div>
        <div className="p-6">
          <DiscountForm
            discount={formData}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isSubmitting={isSubmitting}
            error={error}
          />
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-background-secondary rounded-xl border border-status-error/30 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-status-error/30 bg-status-error/5">
          <h2 className="text-lg font-medium text-status-error">Danger Zone</h2>
          <p className="mt-1 text-sm text-text-muted">
            Deactivating this discount will prevent it from being used.
          </p>
        </div>
        <div className="p-6">
          {!showDeleteConfirm ? (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={discount.status === 'inactive'}
              className="px-4 py-2 text-sm font-medium text-status-error border border-status-error/50 rounded-lg hover:bg-status-error/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {discount.status === 'inactive'
                ? 'Already Deactivated'
                : 'Deactivate Discount'}
            </button>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-text-secondary">
                Are you sure you want to deactivate{' '}
                <strong>{discount.code}</strong>? Customers will no longer be
                able to use this code.
              </p>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="px-4 py-2 text-sm font-medium text-white bg-status-error hover:bg-status-error/90 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isDeleting && (
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
                  )}
                  Yes, Deactivate
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                  className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
