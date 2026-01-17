import type { APIRoute } from 'astro';
import { MerchantClient } from '@dear-margeaux/api';
import type { RefundParams } from '@dear-margeaux/api';

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
    return new Response(JSON.stringify({ error: 'Order ID is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // Get optional refund params from request body
    let refundParams: RefundParams | undefined;

    const contentType = request.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      const data = await request.json();

      if (data.amount_cents !== undefined) {
        const amountCents = parseInt(data.amount_cents, 10);
        if (isNaN(amountCents) || amountCents <= 0) {
          return new Response(
            JSON.stringify({ error: 'Invalid refund amount' }),
            {
              status: 400,
              headers: { 'Content-Type': 'application/json' },
            }
          );
        }
        refundParams = { ...refundParams, amount_cents: amountCents };
      }

      if (data.reason) {
        refundParams = { ...refundParams, reason: data.reason };
      }
    }

    const order = await client.refundOrder(id, refundParams);

    return new Response(JSON.stringify(order), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Failed to process refund:', error);

    const message =
      error instanceof Error ? error.message : 'Failed to process refund';

    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
