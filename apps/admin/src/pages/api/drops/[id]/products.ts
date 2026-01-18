import type { APIRoute } from 'astro';
import { getAdminMerchantClient } from '../../../../lib/merchant';

export const PUT: APIRoute = async ({ params, request }) => {
  const client = getAdminMerchantClient();

  if (!client) {
    return new Response(JSON.stringify({ error: 'API not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { id } = params;

  if (!id) {
    return new Response(JSON.stringify({ error: 'Drop ID is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const data = await request.json();

    if (!Array.isArray(data.productIds)) {
      return new Response(
        JSON.stringify({ error: 'productIds must be an array' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const result = await client.assignDropProducts(id, data.productIds);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Failed to assign products to drop:', error);

    const message =
      error instanceof Error
        ? error.message
        : 'Failed to assign products to drop';

    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
