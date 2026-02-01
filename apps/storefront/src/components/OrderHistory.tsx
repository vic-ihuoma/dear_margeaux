import { useEffect, useState } from 'react';
import { useStore } from '@nanostores/react';
import { authState, initializeAuth, getSessionId } from '../stores/auth';
import { getMerchantClient } from '../lib/merchant';
import type { CustomerOrder } from '@dear-margeaux/api';

export default function OrderHistory() {
  const $authState = useStore(authState);
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initializeAuth();
  }, []);

  useEffect(() => {
    async function fetchOrders() {
      const sessionId = getSessionId();
      if (!sessionId) {
        setIsLoading(false);
        return;
      }

      try {
        const client = getMerchantClient();
        const result = await client.getMyOrders(sessionId);
        setOrders(result.items);
      } catch (err) {
        console.error('Error fetching orders:', err);
        setError('Unable to load orders. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }

    if (!$authState.isLoading && $authState.session) {
      fetchOrders();
    }
  }, [$authState.isLoading, $authState.session]);

  if (isLoading || $authState.isLoading) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-text-primary">
          Order History
        </h2>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-background-secondary rounded-lg border border-border p-6">
                <div className="h-4 bg-background-tertiary rounded w-1/4 mb-4" />
                <div className="h-3 bg-background-tertiary rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-text-primary">
          Order History
        </h2>
        <div className="p-6 bg-error/10 border border-error/20 rounded-lg">
          <p className="text-error">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 text-sm font-medium text-primary hover:underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-text-primary">
          Order History
        </h2>
        <div className="text-center py-12 bg-background-secondary rounded-lg border border-border">
          <svg
            className="w-12 h-12 mx-auto text-text-muted mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
            />
          </svg>
          <h3 className="text-lg font-medium text-text-primary mb-2">
            No orders yet
          </h3>
          <p className="text-text-secondary mb-6">
            When you place an order, it will appear here.
          </p>
          <a
            href="/shop"
            className="inline-flex items-center px-6 py-2.5 bg-primary text-white rounded-lg hover:bg-primary-600 transition-colors"
          >
            Start shopping
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-text-primary">Order History</h2>

      <div className="space-y-4">
        {orders.map((order) => (
          <OrderCard key={order.id} order={order} />
        ))}
      </div>
    </div>
  );
}

// Order status badge component
function StatusBadge({ status }: { status: string }) {
  const statusStyles: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    paid: 'bg-blue-100 text-blue-800',
    processing: 'bg-purple-100 text-purple-800',
    shipped: 'bg-cyan-100 text-cyan-800',
    delivered: 'bg-green-100 text-green-800',
    refunded: 'bg-gray-100 text-gray-800',
    canceled: 'bg-red-100 text-red-800',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
        statusStyles[status] || 'bg-gray-100 text-gray-800'
      }`}
    >
      {status}
    </span>
  );
}

// Individual order card
function OrderCard({ order }: { order: CustomerOrder }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const formatPrice = (cents: number, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(cents / 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="bg-background-secondary rounded-lg border border-border overflow-hidden">
      {/* Order header */}
      <div className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h3 className="font-semibold text-text-primary">
                Order {order.number}
              </h3>
              <StatusBadge status={order.status} />
            </div>
            <p className="text-sm text-text-muted mt-1">
              {formatDate(order.created_at)}
            </p>
          </div>
          <div className="text-right">
            <p className="font-semibold text-text-primary">
              {formatPrice(order.amounts.total_cents, order.amounts.currency)}
            </p>
            <p className="text-sm text-text-muted">
              {order.items.length} item(s)
            </p>
          </div>
        </div>

        {/* Tracking info */}
        {order.tracking && (
          <div className="mt-4 p-3 bg-background-tertiary rounded-lg">
            <p className="text-sm text-text-secondary">
              <span className="font-medium">Tracking:</span>{' '}
              {order.tracking.url ? (
                <a
                  href={order.tracking.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  {order.tracking.number}
                </a>
              ) : (
                <span>{order.tracking.number}</span>
              )}
            </p>
          </div>
        )}

        {/* Toggle button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-4 text-sm font-medium text-primary hover:text-primary-600 flex items-center gap-1"
        >
          {isExpanded ? 'Hide details' : 'View details'}
          <svg
            className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
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
      </div>

      {/* Expanded order details */}
      {isExpanded && (
        <div className="border-t border-border">
          {/* Order items */}
          <div className="p-6 space-y-4">
            {order.items.map((item, index) => (
              <div key={index} className="flex gap-4">
                {/* Item image */}
                <div className="w-16 h-16 bg-background-tertiary rounded-lg flex-shrink-0 overflow-hidden">
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <svg
                        className="w-6 h-6 text-text-muted"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                        />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Item details */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-text-primary truncate">
                    {item.title}
                  </p>
                  <p className="text-sm text-text-muted">SKU: {item.sku}</p>
                  <p className="text-sm text-text-secondary">Qty: {item.qty}</p>
                </div>

                {/* Item price */}
                <div className="text-right">
                  <p className="font-medium text-text-primary">
                    {formatPrice(
                      item.unit_price_cents * item.qty,
                      order.amounts.currency
                    )}
                  </p>
                  <p className="text-sm text-text-muted">
                    {formatPrice(item.unit_price_cents, order.amounts.currency)}{' '}
                    each
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Order summary */}
          <div className="border-t border-border p-6 bg-background-tertiary">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-text-secondary">Subtotal</span>
                <span className="text-text-primary">
                  {formatPrice(
                    order.amounts.subtotal_cents,
                    order.amounts.currency
                  )}
                </span>
              </div>
              {order.amounts.discount_cents > 0 && (
                <div className="flex justify-between text-success">
                  <span>Discount</span>
                  <span>
                    -
                    {formatPrice(
                      order.amounts.discount_cents,
                      order.amounts.currency
                    )}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-text-secondary">Shipping</span>
                <span className="text-text-primary">
                  {order.amounts.shipping_cents > 0
                    ? formatPrice(
                        order.amounts.shipping_cents,
                        order.amounts.currency
                      )
                    : 'Free'}
                </span>
              </div>
              {order.amounts.tax_cents > 0 && (
                <div className="flex justify-between">
                  <span className="text-text-secondary">Tax</span>
                  <span className="text-text-primary">
                    {formatPrice(
                      order.amounts.tax_cents,
                      order.amounts.currency
                    )}
                  </span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-border font-semibold">
                <span className="text-text-primary">Total</span>
                <span className="text-text-primary">
                  {formatPrice(
                    order.amounts.total_cents,
                    order.amounts.currency
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
