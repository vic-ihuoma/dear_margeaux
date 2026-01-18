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
    // Forward to Merchant API
    const response = await fetch(
      `${config.baseUrl}/v1/newsletter/subscribers/export`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
        },
      }
    );

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ error: 'Export failed' }));
      return new Response(JSON.stringify(errorData), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get the CSV content
    const csvContent = await response.text();

    // Get the Content-Disposition header from the API response
    const contentDisposition =
      response.headers.get('Content-Disposition') ||
      `attachment; filename="subscribers-${new Date().toISOString().split('T')[0]}.csv"`;

    // Return the CSV with appropriate headers for download
    return new Response(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': contentDisposition,
      },
    });
  } catch (error) {
    console.error('Failed to export subscribers:', error);

    const message =
      error instanceof Error ? error.message : 'Failed to export subscribers';

    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
