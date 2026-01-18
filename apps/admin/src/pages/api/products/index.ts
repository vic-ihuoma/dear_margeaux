import type { APIRoute } from 'astro';
import { getAdminMerchantClient } from '../../../lib/merchant';

export const GET: APIRoute = async ({ url }) => {
  const client = getAdminMerchantClient();

  if (!client) {
    return new Response(JSON.stringify({ error: 'API not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const limit = parseInt(url.searchParams.get('limit') || '100', 10);
    const status = url.searchParams.get('status') as 'active' | 'draft' | null;

    const response = await client.getProducts({
      limit,
      ...(status && { status }),
    });

    // Fetch full product details for each product to get variants
    const products = await Promise.all(
      response.items.map(async (item) => {
        return client.getProduct(item.id);
      })
    );

    return new Response(JSON.stringify({ items: products }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Failed to fetch products:', error);

    const message =
      error instanceof Error ? error.message : 'Failed to fetch products';

    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const POST: APIRoute = async ({ request }) => {
  const client = getAdminMerchantClient();

  if (!client) {
    return new Response(JSON.stringify({ error: 'API not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const data = await request.json();

    const product = await client.createProduct({
      title: data.title,
      description: data.description,
      status: data.status,
    });

    return new Response(JSON.stringify(product), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Failed to create product:', error);

    const message =
      error instanceof Error ? error.message : 'Failed to create product';

    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
