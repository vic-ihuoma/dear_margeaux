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

  // Forward query parameters for pagination
  const limit = url.searchParams.get('limit') || '50';
  const offset = url.searchParams.get('offset') || '0';

  // Build query string
  const params = new URLSearchParams();
  params.set('limit', limit);
  params.set('offset', offset);

  const apiUrl = `${config.baseUrl}/v1/newsletter/sends?${params.toString()}`;

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
    console.error('Failed to fetch newsletter sends:', error);

    const message =
      error instanceof Error
        ? error.message
        : 'Failed to fetch newsletter sends';

    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
