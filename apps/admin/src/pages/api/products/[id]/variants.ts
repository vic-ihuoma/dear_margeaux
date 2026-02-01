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

export const POST: APIRoute = async ({ params, request }) => {
  const client = getClient();

  if (!client) {
    return new Response(JSON.stringify({ error: 'API not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { id } = params;

  if (!id) {
    return new Response(JSON.stringify({ error: 'Product ID is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const data = await request.json();

    const variant = await client.createVariant(id, {
      sku: data.sku,
      title: data.title,
      price_cents: data.price_cents,
      image_url: data.image_url,
    });

    return new Response(JSON.stringify(variant), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Failed to create variant:', error);

    const message =
      error instanceof Error ? error.message : 'Failed to create variant';

    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
