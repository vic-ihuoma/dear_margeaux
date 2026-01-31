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

// PATCH /api/orders/[id]/notes/[noteId] - Update a note
export const PATCH: APIRoute = async ({ params, request }) => {
  const client = getClient();

  if (!client) {
    return new Response(JSON.stringify({ error: 'API not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { id, noteId } = params;

  if (!id) {
    return new Response(JSON.stringify({ error: 'Order ID is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!noteId) {
    return new Response(JSON.stringify({ error: 'Note ID is required' }), {
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
      return new Response(
        JSON.stringify({ error: 'admin_id is required for permission check' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const note = await client.updateOrderNote(id, noteId, {
      content: data.content,
      admin_id: data.admin_id,
    });

    return new Response(JSON.stringify(note), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Failed to update order note:', error);

    const message =
      error instanceof Error ? error.message : 'Failed to update order note';

    // Check for forbidden error (editing others' notes)
    const status =
      message.includes('forbidden') || message.includes('other admins')
        ? 403
        : 400;

    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// DELETE /api/orders/[id]/notes/[noteId] - Delete a note
export const DELETE: APIRoute = async ({ params, url }) => {
  const client = getClient();

  if (!client) {
    return new Response(JSON.stringify({ error: 'API not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { id, noteId } = params;
  const adminId = url.searchParams.get('admin_id');

  if (!id) {
    return new Response(JSON.stringify({ error: 'Order ID is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!noteId) {
    return new Response(JSON.stringify({ error: 'Note ID is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!adminId) {
    return new Response(
      JSON.stringify({
        error: 'admin_id query param is required for permission check',
      }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    const result = await client.deleteOrderNote(id, noteId, adminId);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Failed to delete order note:', error);

    const message =
      error instanceof Error ? error.message : 'Failed to delete order note';

    // Check for forbidden error (deleting others' notes)
    const status =
      message.includes('forbidden') || message.includes('other admins')
        ? 403
        : 400;

    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
