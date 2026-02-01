import type { APIRoute } from 'astro';
import { MerchantClient, type OrderListItem } from '@dear-margeaux/api';

function getApiConfig() {
  const baseUrl = import.meta.env.MERCHANT_API_URL;
  const apiKey = import.meta.env.MERCHANT_ADMIN_KEY;

  if (!baseUrl || !apiKey) {
    return null;
  }

  return { baseUrl, apiKey };
}

// Escape CSV field to handle special characters
function escapeCsvField(field: string | number | null | undefined): string {
  if (field === null || field === undefined) {
    return '';
  }
  const str = String(field);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// Format cents to dollars
function formatCentsToDollars(cents: number): string {
  return (cents / 100).toFixed(2);
}

// Format date for display
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// Generate CSV content from orders
function generateCsv(
  orders: OrderListItem[],
  startDate: Date,
  endDate: Date,
  range: number
): string {
  // Valid statuses for analytics
  const validStatuses = ['paid', 'processing', 'shipped', 'delivered'];

  // Filter orders by date range and valid statuses
  const filteredOrders = orders.filter((order) => {
    const orderDate = new Date(order.created_at);
    return (
      orderDate >= startDate &&
      orderDate <= endDate &&
      validStatuses.includes(order.status)
    );
  });

  // CSV header
  const headers = ['Order Number', 'Date', 'Customer Email', 'Status', 'Total'];

  const rows: string[] = [];

  // Add header row
  rows.push(headers.join(','));

  // Add data rows
  filteredOrders.forEach((order) => {
    const row = [
      escapeCsvField(order.number),
      escapeCsvField(formatDate(order.created_at)),
      escapeCsvField(order.customer_email),
      escapeCsvField(order.status),
      escapeCsvField(`$${formatCentsToDollars(order.total_cents)}`),
    ];
    rows.push(row.join(','));
  });

  // Calculate summary stats
  const totalOrders = filteredOrders.length;
  const totalRevenue = filteredOrders.reduce(
    (sum, order) => sum + order.total_cents,
    0
  );
  const avgOrderValue =
    totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

  // Add empty row for separation
  rows.push('');

  // Add summary row
  const summaryRow = [
    'SUMMARY',
    `${range} day${range > 1 ? 's' : ''}`,
    `${totalOrders} orders`,
    '',
    `$${formatCentsToDollars(totalRevenue)}`,
  ];
  rows.push(summaryRow.join(','));

  // Add average order value row
  const avgRow = [
    '',
    '',
    'Avg Order Value',
    '',
    `$${formatCentsToDollars(avgOrderValue)}`,
  ];
  rows.push(avgRow.join(','));

  return rows.join('\n');
}

export const GET: APIRoute = async ({ url }) => {
  const config = getApiConfig();

  if (!config) {
    return new Response(JSON.stringify({ error: 'API not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // Get date range from query params
    const rangeParam = url.searchParams.get('range') || '30';
    const range = parseInt(rangeParam, 10);

    // Valid ranges: 7, 30, 90
    const validRanges = [7, 30, 90];
    const selectedRange = validRanges.includes(range) ? range : 30;

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - selectedRange);

    // Fetch orders from API
    const client = new MerchantClient({
      baseUrl: config.baseUrl,
      apiKey: config.apiKey,
    });
    const ordersResponse = await client.getOrders({ limit: 500 });

    // Generate CSV
    const csvContent = generateCsv(
      ordersResponse.items,
      startDate,
      endDate,
      selectedRange
    );

    // Create filename with date range
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    const filename = `analytics-${startDateStr}-to-${endDateStr}.csv`;

    return new Response(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Failed to export analytics:', error);

    const message =
      error instanceof Error ? error.message : 'Failed to export analytics';

    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
