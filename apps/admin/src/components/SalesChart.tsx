import { useMemo } from 'react';

export interface SalesDataPoint {
  /** Date label (e.g., "Jan 15") */
  date: string;
  /** Revenue in cents */
  revenue: number;
  /** Number of orders */
  orders: number;
}

export interface SalesChartProps {
  /** Array of sales data points */
  data: SalesDataPoint[];
  /** Whether data is still loading */
  loading?: boolean;
}

/**
 * Format cents to a currency string (e.g., 1999 -> "$19.99")
 */
function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

/**
 * SalesChart component displays revenue over time as a simple bar chart
 * Uses pure CSS/HTML for chart rendering (no external charting library)
 */
export function SalesChart({ data, loading = false }: SalesChartProps) {
  // Calculate max revenue for scaling
  const maxRevenue = useMemo(() => {
    if (data.length === 0) return 0;
    return Math.max(...data.map((d) => d.revenue));
  }, [data]);

  // Calculate totals
  const totals = useMemo(() => {
    return data.reduce(
      (acc, d) => ({
        revenue: acc.revenue + d.revenue,
        orders: acc.orders + d.orders,
      }),
      { revenue: 0, orders: 0 }
    );
  }, [data]);

  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary-300 border-t-primary-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-text-muted">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="1.5"
          stroke="currentColor"
          className="w-12 h-12 mb-3 opacity-50"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z"
          />
        </svg>
        <p className="text-sm">No sales data for this period</p>
      </div>
    );
  }

  return (
    <div>
      {/* Summary stats */}
      <div className="flex gap-6 mb-6">
        <div>
          <p className="text-sm text-text-secondary">Total Revenue</p>
          <p className="text-2xl font-semibold text-text-primary">
            {formatCurrency(totals.revenue)}
          </p>
        </div>
        <div>
          <p className="text-sm text-text-secondary">Total Orders</p>
          <p className="text-2xl font-semibold text-text-primary">
            {totals.orders}
          </p>
        </div>
        <div>
          <p className="text-sm text-text-secondary">Avg Order Value</p>
          <p className="text-2xl font-semibold text-text-primary">
            {totals.orders > 0
              ? formatCurrency(Math.round(totals.revenue / totals.orders))
              : '$0'}
          </p>
        </div>
      </div>

      {/* Bar chart */}
      <div className="h-48 flex items-end gap-1">
        {data.map((point, index) => {
          const heightPercent =
            maxRevenue > 0 ? (point.revenue / maxRevenue) * 100 : 0;

          return (
            <div
              key={index}
              className="flex-1 flex flex-col items-center group"
            >
              {/* Tooltip */}
              <div className="opacity-0 group-hover:opacity-100 transition-opacity mb-2 bg-text-primary text-background-secondary px-2 py-1 rounded text-xs whitespace-nowrap">
                <p className="font-medium">{formatCurrency(point.revenue)}</p>
                <p className="text-text-muted">{point.orders} orders</p>
              </div>

              {/* Bar */}
              <div
                className="w-full bg-primary-500 rounded-t-sm transition-all duration-200 hover:bg-primary-600 min-h-[4px]"
                style={{ height: `${Math.max(heightPercent, 2)}%` }}
                title={`${point.date}: ${formatCurrency(point.revenue)}`}
              />

              {/* Date label (only show every nth label to avoid crowding) */}
              {index % Math.ceil(data.length / 7) === 0 && (
                <p className="text-xs text-text-muted mt-2 -rotate-45 origin-left">
                  {point.date}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
