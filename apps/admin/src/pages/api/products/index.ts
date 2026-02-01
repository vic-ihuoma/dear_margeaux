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
 * Variant data for creating a variant alongside a product.
 */
interface VariantPayload {
  sku: string;
  title: string;
  price_cents: number;
  image_url?: string;
  image_alt?: string;
}

/**
 * Extended create product payload that includes optional variant fields.
 * Supports both:
 * - Legacy single variant fields (sku, variant_title, price_cents)
 * - New variants array for creating multiple variants at once
 */
interface CreateProductWithVariantsPayload {
  // Product fields (from CreateProductParams)
  title: string;
  description?: string;
  featured_image_url?: string;
  featured_image_alt?: string;
  status?: 'active' | 'draft';
  tags?: string[];
  drop_id?: string;
  // New: Array of variants to create
  variants?: VariantPayload[];
  // Legacy single variant fields (for backwards compatibility)
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
    const data: CreateProductWithVariantsPayload = await request.json();

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

    // Check if we have a variants array (new format takes precedence)
    if (data.variants && data.variants.length > 0) {
      // Validate each variant in the array
      for (let i = 0; i < data.variants.length; i++) {
        const variant = data.variants[i];
        if (!variant.sku) {
          return new Response(
            JSON.stringify({
              error: `Variant ${i + 1}: SKU is required`,
            }),
            {
              status: 400,
              headers: { 'Content-Type': 'application/json' },
            }
          );
        }
        if (!variant.title) {
          return new Response(
            JSON.stringify({
              error: `Variant ${i + 1}: title is required`,
            }),
            {
              status: 400,
              headers: { 'Content-Type': 'application/json' },
            }
          );
        }
        if (variant.price_cents === undefined || variant.price_cents === null) {
          return new Response(
            JSON.stringify({
              error: `Variant ${i + 1}: price is required`,
            }),
            {
              status: 400,
              headers: { 'Content-Type': 'application/json' },
            }
          );
        }
      }

      // Create all variants
      const createdVariants = [];
      for (const variantData of data.variants) {
        const variant = await client.createVariant(product.id, {
          sku: variantData.sku,
          title: variantData.title,
          price_cents: variantData.price_cents,
          image_url: variantData.image_url,
          image_alt: variantData.image_alt,
        });
        createdVariants.push(variant);
      }

      // Return product with all variants
      return new Response(
        JSON.stringify({
          ...product,
          variants: createdVariants,
        }),
        {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Fallback to legacy single variant fields (for backwards compatibility)
    const hasLegacyVariantData =
      data.sku || data.variant_title || data.price_cents;

    if (hasLegacyVariantData) {
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
