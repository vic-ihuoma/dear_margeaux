import type { APIRoute } from 'astro';
import { getAdminMerchantClient } from '../../../lib/merchant';

export const GET: APIRoute = async ({ params }) => {
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
    const drop = await client.getDrop(id);

    return new Response(JSON.stringify(drop), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Failed to fetch drop:', error);

    const message =
      error instanceof Error ? error.message : 'Failed to fetch drop';

    return new Response(JSON.stringify({ error: message }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const PATCH: APIRoute = async ({ params, request }) => {
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

    const drop = await client.updateDrop(id, {
      name: data.name,
      slug: data.slug,
      description: data.description,
      cover_image: data.cover_image,
      status: data.status,
      start_date: data.start_date,
      end_date: data.end_date,
    });

    return new Response(JSON.stringify(drop), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Failed to update drop:', error);

    const message =
      error instanceof Error ? error.message : 'Failed to update drop';

    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const DELETE: APIRoute = async ({ params }) => {
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
    await client.deleteDrop(id);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Failed to delete drop:', error);

    const message =
      error instanceof Error ? error.message : 'Failed to delete drop';

    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
