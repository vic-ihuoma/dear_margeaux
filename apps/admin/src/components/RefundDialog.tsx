import { useState } from 'react';

interface RefundDialogProps {
  orderId: string;
  orderTotal: number; // in cents
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function RefundDialog({
  orderId,
  orderTotal,
  isOpen,
  onClose,
  onSuccess,
}: RefundDialogProps) {
  const [refundType, setRefundType] = useState<'full' | 'partial'>('full');
  const [amount, setAmount] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Convert cents to dollars for display
  const orderTotalDollars = orderTotal / 100;
  const maxAmount = orderTotalDollars;

  // Format price from cents
  const formatPrice = (cents: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  // Validate and get error message
  const getValidationError = (): string | null => {
    if (refundType === 'full') {
      return null;
    }

    const amountValue = parseFloat(amount);
    if (!amount || isNaN(amountValue)) {
      return 'Please enter a refund amount';
    }
    if (amountValue <= 0) {
      return 'Refund amount must be greater than $0.00';
    }
    if (amountValue > maxAmount) {
      return `Refund amount cannot exceed order total (${formatPrice(orderTotal)})`;
    }
    return null;
  };

  const validationError = getValidationError();
  const hasError = refundType === 'partial' && validationError !== null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (hasError) {
      setError(validationError);
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      // Build request body
      const body: { amount_cents?: number; reason?: string } = {};

      if (refundType === 'partial') {
        const amountValue = parseFloat(amount);
        // Convert dollars to cents for API
        body.amount_cents = Math.round(amountValue * 100);
      }

      if (reason.trim()) {
        body.reason = reason.trim();
      }

      const response = await fetch(`/api/orders/${orderId}/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: Object.keys(body).length > 0 ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to process refund');
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process refund');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setRefundType('full');
    setAmount('');
    setReason('');
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="refund-dialog-title"
    >
      {/* Backdrop button for closing dialog */}
      <button
        type="button"
        className="absolute inset-0 bg-black/50 backdrop-blur-sm cursor-default"
        onClick={onClose}
        aria-label="Close dialog"
      />
      <div className="relative bg-background-secondary rounded-xl border border-border shadow-xl w-full max-w-md mx-4 overflow-hidden z-10">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h2
            id="refund-dialog-title"
            className="text-lg font-semibold text-text-primary"
          >
            Process Refund
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="text-text-muted hover:text-text-primary transition-colors"
            aria-label="Close dialog"
          >
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
                d="M6 18 18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-6">
            {/* Order Total Reference */}
            <div className="bg-background-tertiary/50 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-text-secondary">Order Total</span>
                <span className="text-lg font-semibold text-text-primary">
                  {formatPrice(orderTotal)}
                </span>
              </div>
            </div>

            {/* Refund Type Selection */}
            <fieldset className="space-y-3">
              <legend className="text-sm font-medium text-text-primary">
                Refund Type
              </legend>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="refundType"
                    value="full"
                    checked={refundType === 'full'}
                    onChange={() => setRefundType('full')}
                    className="w-4 h-4 text-primary focus:ring-primary"
                    disabled={isSubmitting}
                  />
                  <span className="text-sm text-text-primary">
                    Full refund ({formatPrice(orderTotal)})
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="refundType"
                    value="partial"
                    checked={refundType === 'partial'}
                    onChange={() => setRefundType('partial')}
                    className="w-4 h-4 text-primary focus:ring-primary"
                    disabled={isSubmitting}
                  />
                  <span className="text-sm text-text-primary">
                    Partial refund
                  </span>
                </label>
              </div>
            </fieldset>

            {/* Partial Amount Input */}
            {refundType === 'partial' && (
              <div className="space-y-2">
                <label
                  htmlFor="refund-amount"
                  className="text-sm font-medium text-text-primary"
                >
                  Refund Amount
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">
                    $
                  </span>
                  <input
                    type="number"
                    id="refund-amount"
                    value={amount}
                    onChange={(e) => {
                      setAmount(e.target.value);
                      setError(null);
                    }}
                    placeholder="0.00"
                    step="0.01"
                    min="0.01"
                    max={maxAmount}
                    className="w-full pl-7 pr-4 py-2 bg-background-primary border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    disabled={isSubmitting}
                  />
                </div>
                <p className="text-xs text-text-muted">
                  Maximum refund: {formatPrice(orderTotal)}
                </p>
              </div>
            )}

            {/* Reason Input */}
            <div className="space-y-2">
              <label
                htmlFor="refund-reason"
                className="text-sm font-medium text-text-primary"
              >
                Reason (optional)
              </label>
              <textarea
                id="refund-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Enter a reason for the refund..."
                rows={3}
                className="w-full px-4 py-2 bg-background-primary border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                disabled={isSubmitting}
              />
            </div>

            {/* Error Display */}
            {error && (
              <div className="bg-status-error/10 border border-status-error/20 rounded-lg p-3">
                <p className="text-sm text-status-error">{error}</p>
              </div>
            )}

            {/* Warning */}
            <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-900/20 rounded-lg p-3">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                <strong>Warning:</strong> This action cannot be undone. The
                customer will be notified of the refund.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-border flex justify-end gap-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-text-primary bg-background-primary border border-border rounded-lg hover:bg-background-tertiary transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || hasError}
              className="px-4 py-2 text-sm font-medium text-white bg-status-error hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
                  Processing...
                </>
              ) : (
                <>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-4 h-4"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z"
                    />
                  </svg>
                  Refund{' '}
                  {refundType === 'full'
                    ? formatPrice(orderTotal)
                    : amount
                      ? formatPrice(Math.round(parseFloat(amount) * 100))
                      : ''}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
