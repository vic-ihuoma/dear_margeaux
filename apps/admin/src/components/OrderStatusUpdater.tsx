import { useState } from 'react';
import type { OrderStatus } from '@dear-margeaux/api';

interface OrderStatusUpdaterProps {
  orderId: string;
  currentStatus: OrderStatus;
  trackingNumber?: string;
  trackingUrl?: string;
}

interface OrderStatusOption {
  value: OrderStatus;
  label: string;
  description: string;
}

const statusOptions: OrderStatusOption[] = [
  {
    value: 'paid',
    label: 'Paid',
    description: 'Payment received, awaiting processing',
  },
  {
    value: 'processing',
    label: 'Processing',
    description: 'Order is being prepared',
  },
  {
    value: 'shipped',
    label: 'Shipped',
    description: 'Order has been shipped',
  },
  {
    value: 'delivered',
    label: 'Delivered',
    description: 'Order has been delivered',
  },
];

export default function OrderStatusUpdater({
  orderId,
  currentStatus,
  trackingNumber: initialTrackingNumber = '',
  trackingUrl: initialTrackingUrl = '',
}: OrderStatusUpdaterProps) {
  const [status, setStatus] = useState<OrderStatus>(currentStatus);
  const [trackingNumber, setTrackingNumber] = useState(initialTrackingNumber);
  const [trackingUrl, setTrackingUrl] = useState(initialTrackingUrl);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Get available status transitions
  const getAvailableStatuses = (): OrderStatusOption[] => {
    const currentIndex = statusOptions.findIndex(
      (s) => s.value === currentStatus
    );
    // Allow moving forward in the status flow, or staying at current
    return statusOptions.filter((_, index) => index >= currentIndex);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      const body: {
        status?: OrderStatus;
        tracking_number?: string;
        tracking_url?: string;
      } = {};

      if (status !== currentStatus) {
        body.status = status;
      }

      if (trackingNumber !== initialTrackingNumber) {
        body.tracking_number = trackingNumber;
      }

      if (trackingUrl !== initialTrackingUrl) {
        body.tracking_url = trackingUrl;
      }

      // Only submit if there are changes
      if (Object.keys(body).length === 0) {
        setError('No changes to save');
        setIsSubmitting(false);
        return;
      }

      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to update order');
      }

      setSuccess(true);
      // Reload after brief delay to show updated status
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update order');
    } finally {
      setIsSubmitting(false);
    }
  };

  const availableStatuses = getAvailableStatuses();
  const showTrackingFields = status === 'shipped' || status === 'delivered';

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Status Selection */}
      <div>
        <label
          htmlFor="status"
          className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2"
        >
          Order Status
        </label>
        <div className="space-y-2" role="radiogroup" aria-label="Order status">
          {availableStatuses.map((option) => (
            <label
              key={option.value}
              htmlFor={`status-${option.value}`}
              className={`relative flex items-start p-4 border rounded-lg cursor-pointer transition-colors duration-150 ${
                status === option.value
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5'
                  : 'border-[var(--color-border)] hover:bg-[var(--color-background-tertiary)]'
              }`}
            >
              <input
                type="radio"
                id={`status-${option.value}`}
                name="status"
                value={option.value}
                checked={status === option.value}
                onChange={() => setStatus(option.value)}
                className="mt-0.5 h-4 w-4 border-[var(--color-border)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
              />
              <div className="ml-3">
                <span
                  className={`block text-sm font-medium ${
                    status === option.value
                      ? 'text-[var(--color-primary)]'
                      : 'text-[var(--color-text-primary)]'
                  }`}
                >
                  {option.label}
                </span>
                <span className="block text-sm text-[var(--color-text-muted)]">
                  {option.description}
                </span>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Tracking Fields (shown when status is shipped or delivered) */}
      {showTrackingFields && (
        <div className="space-y-4 pt-4 border-t border-[var(--color-border)]">
          <h3 className="text-sm font-medium text-[var(--color-text-primary)]">
            Tracking Information
          </h3>
          <div>
            <label
              htmlFor="tracking-number"
              className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1"
            >
              Tracking Number
            </label>
            <input
              type="text"
              id="tracking-number"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              placeholder="Enter tracking number"
              className="block w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background-primary)] py-2 px-3 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
            />
          </div>
          <div>
            <label
              htmlFor="tracking-url"
              className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1"
            >
              Tracking URL
            </label>
            <input
              type="url"
              id="tracking-url"
              value={trackingUrl}
              onChange={(e) => setTrackingUrl(e.target.value)}
              placeholder="https://..."
              className="block w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background-primary)] py-2 px-3 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
            />
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-3 rounded-lg bg-[var(--color-status-error)]/10 text-[var(--color-status-error)] text-sm">
          {error}
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="p-3 rounded-lg bg-[var(--color-status-success)]/10 text-[var(--color-status-success)] text-sm flex items-center gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="w-5 h-5"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
              clipRule="evenodd"
            />
          </svg>
          Order updated successfully!
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary-700)] rounded-lg transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
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
            Updating...
          </>
        ) : (
          'Update Order'
        )}
      </button>
    </form>
  );
}
