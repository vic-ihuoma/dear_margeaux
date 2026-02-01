import type { APIRoute } from 'astro';
import { getAdminMerchantClient } from '../../../lib/merchant';

// GET /api/discounts/[id] - Get a single discount
export const GET: APIRoute = async ({ params }) => {
  const { id } = params;
  const client = getAdminMerchantClient();

  if (!client) {
    return new Response(
      JSON.stringify({ error: 'Merchant client not configured' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (!id) {
    return new Response(JSON.stringify({ error: 'Discount ID required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const discount = await client.getDiscount(id);
    return new Response(JSON.stringify(discount), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Failed to fetch discount:', error);
    const err = error as { statusCode?: number };
    if (err?.statusCode === 404) {
      return new Response(JSON.stringify({ error: 'Discount not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ error: 'Failed to fetch discount' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// PATCH /api/discounts/[id] - Update a discount
export const PATCH: APIRoute = async ({ params, request }) => {
  const { id } = params;
  const client = getAdminMerchantClient();

  if (!client) {
    return new Response(
      JSON.stringify({ error: 'Merchant client not configured' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (!id) {
    return new Response(JSON.stringify({ error: 'Discount ID required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const data = await request.json();

    const discount = await client.updateDiscount(id, {
      code: data.code,
      value: data.value,
      status: data.status,
      min_purchase_cents: data.min_purchase_cents,
      max_discount_cents: data.max_discount_cents,
      starts_at: data.starts_at,
      expires_at: data.expires_at,
      usage_limit: data.usage_limit,
      usage_limit_per_customer: data.usage_limit_per_customer,
    });

    return new Response(JSON.stringify(discount), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Failed to update discount:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to update discount';
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// DELETE /api/discounts/[id] - Deactivate a discount
export const DELETE: APIRoute = async ({ params }) => {
  const { id } = params;
  const client = getAdminMerchantClient();

  if (!client) {
    return new Response(
      JSON.stringify({ error: 'Merchant client not configured' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (!id) {
    return new Response(JSON.stringify({ error: 'Discount ID required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    await client.deleteDiscount(id);
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Failed to delete discount:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to delete discount';
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
