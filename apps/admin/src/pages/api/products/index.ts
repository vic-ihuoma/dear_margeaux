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

/**
 * Extended create product payload that includes optional default variant fields.
 * This allows creating a product with its first variant in a single API call.
 */
interface CreateProductWithVariantPayload {
  // Product fields (from CreateProductParams)
  title: string;
  description?: string;
  featured_image_url?: string;
  featured_image_alt?: string;
  status?: 'active' | 'draft';
  tags?: string[];
  drop_id?: string;
  // Optional default variant fields
  sku?: string;
  variant_title?: string;
  price_cents?: number;
  variant_image_url?: string;
  variant_image_alt?: string;
}

export const POST: APIRoute = async ({ request }) => {
  const client = getAdminMerchantClient();

  if (!client) {
    return new Response(JSON.stringify({ error: 'API not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const data: CreateProductWithVariantPayload = await request.json();

    // Create the product with all supported fields
    const product = await client.createProduct({
      title: data.title,
      description: data.description,
      featured_image_url: data.featured_image_url,
      featured_image_alt: data.featured_image_alt,
      status: data.status,
      tags: data.tags,
      drop_id: data.drop_id,
    });

    // If variant fields are provided, create the default variant
    const hasVariantData = data.sku || data.variant_title || data.price_cents;

    if (hasVariantData) {
      // Validate required variant fields
      if (!data.sku) {
        return new Response(
          JSON.stringify({
            error: 'SKU is required when creating a variant',
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      if (!data.variant_title) {
        return new Response(
          JSON.stringify({
            error: 'Variant title is required when creating a variant',
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      if (data.price_cents === undefined || data.price_cents === null) {
        return new Response(
          JSON.stringify({
            error: 'Price is required when creating a variant',
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      // Create the variant
      const variant = await client.createVariant(product.id, {
        sku: data.sku,
        title: data.variant_title,
        price_cents: data.price_cents,
        image_url: data.variant_image_url,
        image_alt: data.variant_image_alt,
      });

      // Return product with the variant populated
      return new Response(
        JSON.stringify({
          ...product,
          variants: [variant],
        }),
        {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Return product without variants
    return new Response(JSON.stringify({ ...product, variants: [] }), {
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
