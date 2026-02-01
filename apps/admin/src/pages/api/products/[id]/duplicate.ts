import type { APIRoute } from 'astro';
import { getAdminMerchantClient } from '../../../../lib/merchant';

export const POST: APIRoute = async ({ params }) => {
  const client = getAdminMerchantClient();

  if (!client) {
    return new Response(JSON.stringify({ error: 'API not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { id } = params;

  if (!id) {
    return new Response(JSON.stringify({ error: 'Product ID is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // 1. Get the original product with all its variants
    const originalProduct = await client.getProduct(id);

    // 2. Create the duplicated product
    const duplicatedProduct = await client.createProduct({
      title: `${originalProduct.title} (Copy)`,
      description: originalProduct.description ?? undefined,
      featured_image_url: originalProduct.featured_image_url ?? undefined,
      featured_image_alt: originalProduct.featured_image_alt ?? undefined,
      status: 'draft', // Always set duplicate to draft for safety
      tags: originalProduct.tags,
      drop_id: originalProduct.drop_id ?? undefined,
    });

    // 3. Duplicate all variants with new SKUs (sequentially to avoid race conditions)
    // Sequential creation prevents issues with rate limits and SKU uniqueness checks
    const duplicatedVariants = [];
    for (const variant of originalProduct.variants) {
      const createdVariant = await client.createVariant(duplicatedProduct.id, {
        sku: `${variant.sku}-COPY`,
        title: variant.title,
        price_cents: variant.price_cents,
        image_url: variant.image_url ?? undefined,
        image_alt: variant.image_alt ?? undefined,
      });
      duplicatedVariants.push(createdVariant);
    }

    // 4. Return the complete duplicated product with variants
    return new Response(
      JSON.stringify({
        ...duplicatedProduct,
        variants: duplicatedVariants,
      }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Failed to duplicate product:', error);

    const message =
      error instanceof Error ? error.message : 'Failed to duplicate product';

    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
