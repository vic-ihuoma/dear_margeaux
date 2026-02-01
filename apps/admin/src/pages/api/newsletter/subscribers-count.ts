import type { APIRoute } from 'astro';

function getApiConfig() {
  const baseUrl = import.meta.env.MERCHANT_API_URL;
  const apiKey = import.meta.env.MERCHANT_ADMIN_KEY;

  if (!baseUrl || !apiKey) {
    return null;
  }

  return { baseUrl, apiKey };
}

export const GET: APIRoute = async () => {
  const config = getApiConfig();

  if (!config) {
    return new Response(JSON.stringify({ error: 'API not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const response = await fetch(
      `${config.baseUrl}/v1/newsletter/subscribers/count`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

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
    console.error('Failed to fetch subscriber count:', error);

    const message =
      error instanceof Error
        ? error.message
        : 'Failed to fetch subscriber count';

    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
