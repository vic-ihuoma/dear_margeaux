import type { APIRoute } from 'astro';
import { getAdminMerchantClient } from '../../../lib/merchant';

// GET /api/discounts - List all discounts
export const GET: APIRoute = async () => {
  const client = getAdminMerchantClient();

  if (!client) {
    return new Response(
      JSON.stringify({ error: 'Merchant client not configured' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const discounts = await client.getDiscounts();
    return new Response(JSON.stringify({ items: discounts }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Failed to fetch discounts:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch discounts' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

// POST /api/discounts - Create a new discount
export const POST: APIRoute = async ({ request }) => {
  const client = getAdminMerchantClient();

  if (!client) {
    return new Response(
      JSON.stringify({ error: 'Merchant client not configured' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const data = await request.json();

    const discount = await client.createDiscount({
      code: data.code,
      type: data.type,
      value: data.value,
      min_purchase_cents: data.min_purchase_cents,
      max_discount_cents: data.max_discount_cents,
      starts_at: data.starts_at,
      expires_at: data.expires_at,
      usage_limit: data.usage_limit,
      usage_limit_per_customer: data.usage_limit_per_customer,
    });

    return new Response(JSON.stringify(discount), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Failed to create discount:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to create discount';
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
