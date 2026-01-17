import type { APIRoute } from 'astro';
import { MerchantClient } from '@dear-margeaux/api';
import type { OrderStatus, UpdateOrderParams } from '@dear-margeaux/api';

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

const VALID_STATUSES: OrderStatus[] = [
  'pending',
  'paid',
  'processing',
  'shipped',
  'delivered',
  'refunded',
  'canceled',
];

export const PATCH: APIRoute = async ({ params, request }) => {
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
    const updateParams: UpdateOrderParams = {};

    // Validate and set status if provided
    if (data.status !== undefined) {
      const status = data.status as OrderStatus;
      if (!VALID_STATUSES.includes(status)) {
        return new Response(
          JSON.stringify({
            error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`,
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
      updateParams.status = status;
    }

    // Set tracking number if provided
    if (data.tracking_number !== undefined) {
      updateParams.tracking_number = data.tracking_number;
    }

    // Set tracking URL if provided
    if (data.tracking_url !== undefined) {
      updateParams.tracking_url = data.tracking_url;
    }

    // Ensure there are fields to update
    if (Object.keys(updateParams).length === 0) {
      return new Response(
        JSON.stringify({ error: 'No valid fields to update' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const order = await client.updateOrder(id, updateParams);

    return new Response(JSON.stringify(order), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Failed to update order:', error);

    const message =
      error instanceof Error ? error.message : 'Failed to update order';

    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
