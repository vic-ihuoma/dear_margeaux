import type { APIRoute } from 'astro';
import { MerchantClient } from '@dear-margeaux/api';
import type { EmailSendType, EmailSendStatus } from '@dear-margeaux/api';

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

export const GET: APIRoute = async ({ request }) => {
  const client = getClient();

  if (!client) {
    return new Response(JSON.stringify({ error: 'API not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const url = new URL(request.url);
    const email_type = url.searchParams.get(
      'email_type'
    ) as EmailSendType | null;
    const status = url.searchParams.get('status') as EmailSendStatus | null;
    const start_date = url.searchParams.get('start_date');
    const end_date = url.searchParams.get('end_date');
    const limit = url.searchParams.get('limit');
    const cursor = url.searchParams.get('cursor');

    const params: Record<string, string | number | undefined> = {};
    if (email_type) params.email_type = email_type;
    if (status) params.status = status;
    if (start_date) params.start_date = start_date;
    if (end_date) params.end_date = end_date;
    if (limit) params.limit = parseInt(limit, 10);
    if (cursor) params.cursor = cursor;

    const result = await client.getEmailSends(params);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Failed to get email sends:', error);

    const message =
      error instanceof Error ? error.message : 'Failed to get email sends';

    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
