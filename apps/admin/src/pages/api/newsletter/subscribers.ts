import type { APIRoute } from 'astro';

function getApiConfig() {
  const baseUrl = import.meta.env.MERCHANT_API_URL;
  const apiKey = import.meta.env.MERCHANT_ADMIN_KEY;

  if (!baseUrl || !apiKey) {
    return null;
  }

  return { baseUrl, apiKey };
}

export const GET: APIRoute = async ({ url }) => {
  const config = getApiConfig();

  if (!config) {
    return new Response(JSON.stringify({ error: 'API not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Forward query parameters
  const cursor = url.searchParams.get('cursor') || '';
  const limit = url.searchParams.get('limit') || '50';
  const status = url.searchParams.get('status') || '';
  const search = url.searchParams.get('search') || '';

  // Build query string
  const params = new URLSearchParams();
  if (cursor) params.set('cursor', cursor);
  if (limit) params.set('limit', limit);
  if (status) params.set('status', status);
  if (search) params.set('search', search);

  const queryString = params.toString();
  const apiUrl = `${config.baseUrl}/v1/newsletter/subscribers${queryString ? `?${queryString}` : ''}`;

  try {
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        (errorData as Record<string, string>).error ||
          `API returned ${response.status}`
      );
    }

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Failed to fetch subscribers:', error);

    const message =
      error instanceof Error ? error.message : 'Failed to fetch subscribers';

    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
