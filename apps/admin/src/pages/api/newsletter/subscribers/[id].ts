import type { APIRoute } from 'astro';

function getApiConfig() {
  const baseUrl = import.meta.env.MERCHANT_API_URL;
  const apiKey = import.meta.env.MERCHANT_ADMIN_KEY;

  if (!baseUrl || !apiKey) {
    return null;
  }

  return { baseUrl, apiKey };
}

export const DELETE: APIRoute = async ({ params }) => {
  const config = getApiConfig();

  if (!config) {
    return new Response(JSON.stringify({ error: 'API not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { id } = params;

  if (!id) {
    return new Response(
      JSON.stringify({ error: 'Subscriber ID is required' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    // Forward to Merchant API
    const response = await fetch(
      `${config.baseUrl}/v1/newsletter/subscribers/${id}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const data = await response.json();

    // Return the response with the same status code
    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Failed to remove subscriber:', error);

    const message =
      error instanceof Error ? error.message : 'Failed to remove subscriber';

    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
