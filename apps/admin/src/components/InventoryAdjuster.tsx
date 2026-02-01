import { useState, useCallback } from 'react';
import type { InventoryAdjustmentReason } from '@dear-margeaux/api';

export interface InventoryAdjusterProps {
  sku: string;
  currentOnHand: number;
  currentAvailable: number;
}

const ADJUSTMENT_REASONS: {
  value: InventoryAdjustmentReason;
  label: string;
}[] = [
  { value: 'restock', label: 'Restock' },
  { value: 'correction', label: 'Correction' },
  { value: 'damaged', label: 'Damaged' },
  { value: 'return', label: 'Return' },
];

export default function InventoryAdjuster({
  sku,
  currentOnHand,
  currentAvailable,
}: InventoryAdjusterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [delta, setDelta] = useState<string>('');
  const [reason, setReason] = useState<InventoryAdjustmentReason>('restock');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      const deltaValue = parseInt(delta, 10);
      if (isNaN(deltaValue) || deltaValue === 0) {
        setError('Please enter a valid quantity');
        return;
      }

      // Validate negative adjustments don't exceed on_hand
      if (deltaValue < 0 && Math.abs(deltaValue) > currentOnHand) {
        setError(
          `Cannot reduce by more than current on-hand quantity (${currentOnHand})`
        );
        return;
      }

      setIsSubmitting(true);
      setError(null);

      try {
        const response = await fetch(`/api/inventory/${sku}/adjust`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            delta: deltaValue,
            reason,
          }),
        });

        if (!response.ok) {
          const result = await response.json();
          throw new Error(result.error || 'Failed to adjust inventory');
        }

        setSuccess(true);
        setDelta('');

        // Close modal after a brief delay and refresh the page
        setTimeout(() => {
          setIsOpen(false);
          setSuccess(false);
          window.location.reload();
        }, 1000);
      } catch (err) {
        console.error('Adjust inventory error:', err);
        setError(
          err instanceof Error ? err.message : 'Failed to adjust inventory'
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [sku, delta, reason, currentOnHand]
  );

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setDelta('');
    setReason('restock');
    setError(null);
    setSuccess(false);
  }, []);

  const newOnHand = delta ? currentOnHand + parseInt(delta, 10) : currentOnHand;
  const isValidDelta =
    delta && !isNaN(parseInt(delta, 10)) && parseInt(delta, 10) !== 0;

  return (
    <>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-primary hover:text-primary-600 transition-colors"
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
            d="M12 4.5v15m0 0-6.75-6.75M12 19.5l6.75-6.75"
          />
        </svg>
        Adjust
      </button>

      {/* Modal Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto"
          aria-labelledby="adjust-inventory-title"
          role="dialog"
          aria-modal="true"
        >
          <div className="flex min-h-screen items-center justify-center p-4 text-center sm:p-0">
            {/* Backdrop overlay */}
            <div
              className="fixed inset-0 bg-black/50 transition-opacity"
              aria-hidden="true"
              onClick={handleClose}
            />

            {/* Modal content */}
            <div className="relative transform overflow-hidden rounded-xl bg-background-secondary text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-md border border-border">
              {/* Header */}
              <div className="px-6 py-4 border-b border-border">
                <div className="flex items-center justify-between">
                  <h3
                    className="text-lg font-semibold text-text-primary"
                    id="adjust-inventory-title"
                  >
                    Adjust Inventory
                  </h3>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="p-1 text-text-muted hover:text-text-primary rounded-lg transition-colors"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth="1.5"
                      stroke="currentColor"
                      className="w-5 h-5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6 18 18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Body */}
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {/* SKU Info */}
                <div className="bg-background-tertiary rounded-lg p-4">
                  <p className="text-sm text-text-muted">SKU</p>
                  <p className="font-mono font-medium text-text-primary">
                    {sku}
                  </p>
                  <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-text-muted">Current On Hand</p>
                      <p className="font-medium text-text-primary">
                        {currentOnHand}
                      </p>
                    </div>
                    <div>
                      <p className="text-text-muted">Available</p>
                      <p className="font-medium text-text-primary">
                        {currentAvailable}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="rounded-lg bg-status-error/10 border border-status-error/20 p-3">
                    <p className="text-sm text-status-error">{error}</p>
                  </div>
                )}

                {/* Success Message */}
                {success && (
                  <div className="rounded-lg bg-status-success/10 border border-status-success/20 p-3">
                    <p className="text-sm text-status-success">
                      Inventory adjusted successfully!
                    </p>
                  </div>
                )}

                {/* Delta Input */}
                <div>
                  <label
                    htmlFor="delta"
                    className="block text-sm font-medium text-text-primary mb-1"
                  >
                    Quantity Adjustment
                  </label>
                  <p className="text-xs text-text-muted mb-2">
                    Use positive numbers to add stock, negative to remove
                  </p>
                  <div className="relative">
                    <input
                      type="number"
                      id="delta"
                      value={delta}
                      onChange={(e) => setDelta(e.target.value)}
                      placeholder="e.g., 10 or -5"
                      className="block w-full rounded-lg border border-border bg-background-primary py-2 px-3 text-text-primary placeholder:text-text-muted focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                      disabled={isSubmitting || success}
                    />
                  </div>
                  {isValidDelta && (
                    <p className="mt-2 text-sm">
                      <span className="text-text-muted">New on-hand: </span>
                      <span
                        className={`font-medium ${newOnHand < 0 ? 'text-status-error' : 'text-text-primary'}`}
                      >
                        {newOnHand}
                      </span>
                    </p>
                  )}
                </div>

                {/* Reason Select */}
                <div>
                  <label
                    htmlFor="reason"
                    className="block text-sm font-medium text-text-primary mb-1"
                  >
                    Reason
                  </label>
                  <select
                    id="reason"
                    value={reason}
                    onChange={(e) =>
                      setReason(e.target.value as InventoryAdjustmentReason)
                    }
                    className="block w-full rounded-lg border border-border bg-background-primary py-2 px-3 text-text-primary focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    disabled={isSubmitting || success}
                  >
                    {ADJUSTMENT_REASONS.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-2 text-sm font-medium text-text-primary bg-background-tertiary border border-border rounded-lg hover:bg-background-primary transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={
                      isSubmitting || !isValidDelta || newOnHand < 0 || success
                    }
                    className="flex-1 px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <span className="inline-flex items-center gap-2">
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
                        Adjusting...
                      </span>
                    ) : (
                      'Adjust Stock'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
