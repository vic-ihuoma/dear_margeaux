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

// GET /api/orders/[id]/notes - List notes for an order
export const GET: APIRoute = async ({ params }) => {
  const client = getClient();

  if (!client) {
    return new Response(JSON.stringify({ error: 'API not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { id } = params;

  if (!id) {
    return new Response(JSON.stringify({ error: 'Order ID is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const result = await client.getOrderNotes(id);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Failed to fetch order notes:', error);

    const message =
      error instanceof Error ? error.message : 'Failed to fetch order notes';

    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// POST /api/orders/[id]/notes - Create a note on an order
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
    return new Response(JSON.stringify({ error: 'Order ID is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const data = await request.json();

    if (!data.content || typeof data.content !== 'string') {
      return new Response(JSON.stringify({ error: 'content is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!data.admin_id || typeof data.admin_id !== 'string') {
      return new Response(JSON.stringify({ error: 'admin_id is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!data.admin_name || typeof data.admin_name !== 'string') {
      return new Response(JSON.stringify({ error: 'admin_name is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const note = await client.createOrderNote(id, {
      content: data.content,
      admin_id: data.admin_id,
      admin_name: data.admin_name,
    });

    return new Response(JSON.stringify(note), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Failed to create order note:', error);

    const message =
      error instanceof Error ? error.message : 'Failed to create order note';

    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
