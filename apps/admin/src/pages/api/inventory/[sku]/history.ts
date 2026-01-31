import type { APIRoute } from 'astro';
import { MerchantClient } from '@dear-margeaux/api';

function getClient(): MerchantClient | null {
  const baseUrl = import.meta.env.MERCHANT_API_URL;
  const apiKey = import.meta.env.MERCHANT_ADMIN_KEY;

  if (!baseUrl || !apiKey) {
    return null;
  }

  return new MerchantClient({
    baseUrl,
    apiKey,
  });
}

export const GET: APIRoute = async ({ params, url }) => {
  const client = getClient();

  if (!client) {
    return new Response(JSON.stringify({ error: 'API not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { sku } = params;

  if (!sku) {
    return new Response(JSON.stringify({ error: 'SKU is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // Extract query params for filtering
    const limit = url.searchParams.get('limit');
    const cursor = url.searchParams.get('cursor');
    const start_date = url.searchParams.get('start_date');
    const end_date = url.searchParams.get('end_date');

    const queryParams: Record<string, string | number | undefined> = {};
    if (limit) queryParams.limit = parseInt(limit, 10);
    if (cursor) queryParams.cursor = cursor;
    if (start_date) queryParams.start_date = start_date;
    if (end_date) queryParams.end_date = end_date;

    const history = await client.getInventoryHistory(sku, queryParams);

    return new Response(JSON.stringify(history), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Failed to fetch inventory history:', error);

    const message =
      error instanceof Error
        ? error.message
        : 'Failed to fetch inventory history';

    // Check if it's a not found error
    if (message.toLowerCase().includes('not found')) {
      return new Response(JSON.stringify({ error: message }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
