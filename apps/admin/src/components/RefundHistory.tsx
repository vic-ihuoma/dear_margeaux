import { useState, useEffect } from 'react';
import type { Refund } from '@dear-margeaux/api';

interface RefundHistoryProps {
  orderId: string;
  orderTotal: number; // in cents
}

export default function RefundHistory({
  orderId,
  orderTotal,
}: RefundHistoryProps) {
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRefunds() {
      try {
        const response = await fetch(`/api/orders/${orderId}/refunds`);
        if (!response.ok) {
          throw new Error('Failed to fetch refunds');
        }
        const data = await response.json();
        setRefunds(data.items || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load refunds');
      } finally {
        setLoading(false);
      }
    }

    fetchRefunds();
  }, [orderId]);

  // Format price from cents
  const formatPrice = (cents: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  // Format date
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  // Calculate total refunded amount
  const totalRefunded = refunds.reduce((sum, r) => sum + r.amount_cents, 0);
  const isPartialRefund = totalRefunded < orderTotal && totalRefunded > 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
      </div>
    );
  }

  if (error) {
    return <div className="text-sm text-status-error py-2">{error}</div>;
  }

  if (refunds.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {/* Refund Summary */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-text-primary">
          Refund History
        </span>
        <span
          className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
            isPartialRefund
              ? 'bg-yellow-100 text-yellow-800'
              : 'bg-orange-100 text-orange-800'
          }`}
        >
          {isPartialRefund ? 'Partial Refund' : 'Full Refund'}
        </span>
      </div>

      {/* Refund List */}
      <div className="space-y-2">
        {refunds.map((refund) => (
          <div
            key={refund.id}
            className="flex items-center justify-between py-2 px-3 bg-background-tertiary/50 rounded-lg"
          >
            <div>
              <p className="text-sm font-medium text-text-primary">
                {formatPrice(refund.amount_cents)}
              </p>
              <p className="text-xs text-text-muted">
                {formatDate(refund.created_at)}
              </p>
            </div>
            <div className="text-right">
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                  refund.status === 'succeeded'
                    ? 'bg-status-success/10 text-status-success'
                    : refund.status === 'pending'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-status-error/10 text-status-error'
                }`}
              >
                {refund.status}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Total Refunded */}
      <div className="pt-2 border-t border-border">
        <div className="flex items-center justify-between text-sm">
          <span className="text-text-secondary">Total Refunded</span>
          <span className="font-semibold text-text-primary">
            {formatPrice(totalRefunded)}
          </span>
        </div>
        {isPartialRefund && (
          <div className="flex items-center justify-between text-sm mt-1">
            <span className="text-text-secondary">Remaining</span>
            <span className="text-text-primary">
              {formatPrice(orderTotal - totalRefunded)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
