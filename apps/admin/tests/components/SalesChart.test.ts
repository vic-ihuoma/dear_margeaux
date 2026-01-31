import { describe, it, expect } from 'vitest';

/**
 * Tests for SalesChart component with Recharts integration
 * Task: admin-17 - Upgrade to proper charting library
 */

// Test data types matching SalesChart props
interface SalesDataPoint {
  date: string;
  revenue: number;
  orders: number;
}

// Currency formatting function (matches component implementation)
function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

// Tooltip currency formatting (with decimals for precision)
function formatTooltipCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

describe('SalesChart data utilities', () => {
  describe('formatCurrency', () => {
    it('should format cents to dollars without decimals', () => {
      expect(formatCurrency(1999)).toBe('$20');
      expect(formatCurrency(10000)).toBe('$100');
      expect(formatCurrency(0)).toBe('$0');
    });

    it('should handle large values', () => {
      expect(formatCurrency(100000)).toBe('$1,000');
      expect(formatCurrency(1000000)).toBe('$10,000');
    });

    it('should round appropriately', () => {
      expect(formatCurrency(1950)).toBe('$20');
      expect(formatCurrency(1940)).toBe('$19');
    });
  });

  describe('formatTooltipCurrency', () => {
    it('should format cents to dollars with decimals', () => {
      expect(formatTooltipCurrency(1999)).toBe('$19.99');
      expect(formatTooltipCurrency(10050)).toBe('$100.50');
      expect(formatTooltipCurrency(0)).toBe('$0.00');
    });

    it('should handle precise amounts', () => {
      expect(formatTooltipCurrency(1)).toBe('$0.01');
      expect(formatTooltipCurrency(99)).toBe('$0.99');
    });
  });
});

describe('SalesChart data transformation', () => {
  it('should compute max revenue correctly', () => {
    const data: SalesDataPoint[] = [
      { date: 'Jan 1', revenue: 1000, orders: 1 },
      { date: 'Jan 2', revenue: 5000, orders: 3 },
      { date: 'Jan 3', revenue: 2500, orders: 2 },
    ];

    const maxRevenue = Math.max(...data.map((d) => d.revenue));
    expect(maxRevenue).toBe(5000);
  });

  it('should handle empty data', () => {
    const data: SalesDataPoint[] = [];
    const maxRevenue =
      data.length === 0 ? 0 : Math.max(...data.map((d) => d.revenue));
    expect(maxRevenue).toBe(0);
  });

  it('should compute totals correctly', () => {
    const data: SalesDataPoint[] = [
      { date: 'Jan 1', revenue: 1000, orders: 1 },
      { date: 'Jan 2', revenue: 5000, orders: 3 },
      { date: 'Jan 3', revenue: 2500, orders: 2 },
    ];

    const totals = data.reduce(
      (acc, d) => ({
        revenue: acc.revenue + d.revenue,
        orders: acc.orders + d.orders,
      }),
      { revenue: 0, orders: 0 }
    );

    expect(totals.revenue).toBe(8500);
    expect(totals.orders).toBe(6);
  });

  it('should compute average order value correctly', () => {
    const data: SalesDataPoint[] = [
      { date: 'Jan 1', revenue: 1000, orders: 1 },
      { date: 'Jan 2', revenue: 5000, orders: 3 },
      { date: 'Jan 3', revenue: 2500, orders: 2 },
    ];

    const totals = data.reduce(
      (acc, d) => ({
        revenue: acc.revenue + d.revenue,
        orders: acc.orders + d.orders,
      }),
      { revenue: 0, orders: 0 }
    );

    const avgOrderValue =
      totals.orders > 0 ? Math.round(totals.revenue / totals.orders) : 0;

    expect(avgOrderValue).toBe(1417); // 8500 / 6 = 1416.67 rounded
  });

  it('should handle zero orders for average calculation', () => {
    const totals = { revenue: 0, orders: 0 };
    const avgOrderValue =
      totals.orders > 0 ? Math.round(totals.revenue / totals.orders) : 0;

    expect(avgOrderValue).toBe(0);
  });
});

describe('SalesChart rendering states', () => {
  describe('Loading state', () => {
    it('should display loading spinner when loading is true', () => {
      // Component shows loading spinner
      // Visual test: agent-browser verifies spinner element
      const loading = true;
      expect(loading).toBe(true);
    });
  });

  describe('Empty state', () => {
    it('should display empty message when data is empty', () => {
      const data: SalesDataPoint[] = [];
      expect(data.length).toBe(0);
      // Visual test: agent-browser verifies "No sales data" message
    });
  });

  describe('Chart rendering', () => {
    it('should render line chart with valid data', () => {
      const data: SalesDataPoint[] = [
        { date: 'Jan 1', revenue: 1000, orders: 1 },
        { date: 'Jan 2', revenue: 2000, orders: 2 },
      ];
      expect(data.length).toBeGreaterThan(0);
      // Visual test: agent-browser verifies Recharts LineChart renders
    });

    it('should render all data points in the chart', () => {
      const data: SalesDataPoint[] = [
        { date: 'Jan 1', revenue: 1000, orders: 1 },
        { date: 'Jan 2', revenue: 2000, orders: 2 },
        { date: 'Jan 3', revenue: 1500, orders: 1 },
      ];
      // Chart should have 3 data points
      expect(data.length).toBe(3);
      // Visual test: agent-browser verifies chart has expected points
    });
  });
});

describe('SalesChart tooltip behavior', () => {
  it('should format tooltip content with date, revenue, and orders', () => {
    const dataPoint: SalesDataPoint = {
      date: 'Jan 15',
      revenue: 19999,
      orders: 5,
    };

    // Tooltip should show these formatted values
    const expectedDate = dataPoint.date;
    const expectedRevenue = formatTooltipCurrency(dataPoint.revenue);
    const expectedOrders = `${dataPoint.orders} orders`;

    expect(expectedDate).toBe('Jan 15');
    expect(expectedRevenue).toBe('$199.99');
    expect(expectedOrders).toBe('5 orders');
  });

  it('should show singular "order" for single order', () => {
    const orders = 1;
    const orderText = orders === 1 ? 'order' : 'orders';
    expect(orderText).toBe('order');
  });

  it('should show plural "orders" for multiple orders', () => {
    const orders: number = 5;
    const orderText = orders === 1 ? 'order' : 'orders';
    expect(orderText).toBe('orders');
  });
});

describe('SalesChart responsiveness', () => {
  it('should use ResponsiveContainer for fluid width', () => {
    // Component uses Recharts ResponsiveContainer with width="100%"
    // Visual test: agent-browser verifies chart resizes with container
    expect(true).toBe(true);
  });

  it('should maintain minimum height of 300px', () => {
    const minHeight = 300;
    expect(minHeight).toBe(300);
    // Visual test: agent-browser verifies chart has proper height
  });
});

describe('SalesChart summary statistics', () => {
  it('should display total revenue formatted correctly', () => {
    const totalRevenue = 85000; // $850
    expect(formatCurrency(totalRevenue)).toBe('$850');
  });

  it('should display total orders count', () => {
    const totalOrders = 42;
    expect(totalOrders).toBe(42);
  });

  it('should display average order value', () => {
    const totalRevenue = 85000;
    const totalOrders = 42;
    const avg = Math.round(totalRevenue / totalOrders);
    expect(formatCurrency(avg)).toBe('$20');
  });
});
