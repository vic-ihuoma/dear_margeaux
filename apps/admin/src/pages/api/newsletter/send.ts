import type { APIRoute } from 'astro';

function getApiConfig() {
  const baseUrl = import.meta.env.MERCHANT_API_URL;
  const apiKey = import.meta.env.MERCHANT_ADMIN_KEY;

  if (!baseUrl || !apiKey) {
    return null;
  }

  return { baseUrl, apiKey };
}

export interface SendNewsletterRequest {
  blog_slug: string;
  title: string;
  excerpt: string;
  featured_image_url?: string;
}

export interface SendNewsletterResponse {
  success: boolean;
  recipient_count: number;
  send_id?: string;
  errors?: string[];
}

export const POST: APIRoute = async ({ request }) => {
  const config = getApiConfig();

  if (!config) {
    return new Response(JSON.stringify({ error: 'API not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = (await request.json()) as SendNewsletterRequest;

    // Validate required fields
    if (!body.blog_slug) {
      return new Response(JSON.stringify({ error: 'blog_slug is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!body.title) {
      return new Response(JSON.stringify({ error: 'title is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!body.excerpt) {
      return new Response(JSON.stringify({ error: 'excerpt is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const response = await fetch(`${config.baseUrl}/v1/newsletter/send`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        (errorData as Record<string, string>).error ||
          `API returned ${response.status}`
      );
    }

    const data = (await response.json()) as SendNewsletterResponse;

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Failed to send newsletter:', error);

    const message =
      error instanceof Error ? error.message : 'Failed to send newsletter';

    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
