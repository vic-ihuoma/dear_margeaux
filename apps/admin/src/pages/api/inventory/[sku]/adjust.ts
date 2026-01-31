import type { APIRoute } from 'astro';
import { MerchantClient } from '@dear-margeaux/api';
import type { InventoryAdjustmentReason } from '@dear-margeaux/api';

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

const VALID_REASONS: InventoryAdjustmentReason[] = [
  'restock',
  'correction',
  'damaged',
  'return',
];

export const POST: APIRoute = async ({ params, request }) => {
  const client = getClient();

  if (!client) {
    return new Response(JSON.stringify({ error: 'API not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { sku } = params;

  if (!sku) {
    return new Response(JSON.stringify({ error: 'SKU is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const data = await request.json();

    // Validate delta
    const delta = parseInt(data.delta, 10);
    if (isNaN(delta) || delta === 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid adjustment quantity' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate reason
    const reason = data.reason as InventoryAdjustmentReason;
    if (!VALID_REASONS.includes(reason)) {
      return new Response(
        JSON.stringify({
          error: `Invalid reason. Must be one of: ${VALID_REASONS.join(', ')}`,
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Pass admin info for audit trail (optional fields from request)
    const admin_id = data.admin_id;
    const admin_name = data.admin_name;

    const inventoryItem = await client.adjustInventory(sku, {
      delta,
      reason,
      admin_id,
      admin_name,
    });

    return new Response(JSON.stringify(inventoryItem), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Failed to adjust inventory:', error);

    const message =
      error instanceof Error ? error.message : 'Failed to adjust inventory';

    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
