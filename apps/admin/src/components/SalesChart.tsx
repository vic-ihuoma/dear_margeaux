import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

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
 * Format cents to a currency string without decimals (e.g., 1999 -> "$20")
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
 * Format cents to a currency string with decimals for tooltip (e.g., 1999 -> "$19.99")
 */
function formatTooltipCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

/**
 * Custom tooltip props interface
 */
interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: SalesDataPoint;
    value: number;
    name: string;
  }>;
  label?: string;
}

/**
 * Custom tooltip component for the chart
 */
function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (active && payload && payload.length > 0) {
    const data = payload[0].payload;
    return (
      <div className="bg-text-primary text-background-secondary px-3 py-2 rounded-lg shadow-lg">
        <p className="font-medium text-sm mb-1">{label}</p>
        <p className="text-sm">
          <span className="text-primary-300">Revenue:</span>{' '}
          {formatTooltipCurrency(data.revenue)}
        </p>
        <p className="text-sm text-text-muted">
          {data.orders} {data.orders === 1 ? 'order' : 'orders'}
        </p>
      </div>
    );
  }
  return null;
}

/**
 * SalesChart component displays revenue over time as a line chart
 * Uses Recharts for professional charting with tooltips and responsive behavior
 */
export function SalesChart({ data, loading = false }: SalesChartProps) {
  // Calculate totals for summary stats
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

      {/* Line chart */}
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12, fill: 'var(--color-text-secondary)' }}
              tickLine={false}
              axisLine={{ stroke: 'var(--color-border)' }}
              interval="preserveStartEnd"
            />
            <YAxis
              tickFormatter={(value: number) => formatCurrency(value)}
              tick={{ fontSize: 12, fill: 'var(--color-text-secondary)' }}
              tickLine={false}
              axisLine={{ stroke: 'var(--color-border)' }}
              width={80}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="var(--color-primary-500)"
              strokeWidth={2}
              dot={{ fill: 'var(--color-primary-500)', strokeWidth: 0, r: 4 }}
              activeDot={{
                r: 6,
                fill: 'var(--color-primary-600)',
                stroke: 'var(--color-background-secondary)',
                strokeWidth: 2,
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
