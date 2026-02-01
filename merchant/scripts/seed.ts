#!/usr/bin/env npx tsx
/**
 * Seed script - creates demo data via the API
 *
 * Usage:
 *   npx tsx scripts/seed.ts <api_url> <admin_key>
 *   npx tsx scripts/seed.ts http://localhost:8787 sk_...
 */

import { DROP_CONFIG, PRODUCTS, VARIANTS, TEST_ORDERS } from './seed-config';

const API_URL = process.argv[2] || 'http://localhost:8787';
const API_KEY = process.argv[3];

if (!API_KEY) {
  console.log(`
🌱 Seed Script - Create demo data

Usage:
  npx tsx scripts/seed.ts <api_url> <admin_key>

Example:
  npx tsx scripts/seed.ts http://localhost:8787 sk_abc123...

First, start the API and create a store:
  npm run dev
  # Then in browser or curl, the first request will prompt you to set up
`);
  process.exit(1);
}

async function api(path: string, body?: unknown) {
  const res = await fetch(`${API_URL}${path}`, {
    method: body ? 'POST' : 'GET',
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      `${path}: ${(err as { error?: { message?: string } }).error?.message || res.statusText}`
    );
  }

  return res.json();
}

async function apiPut(path: string, body: unknown) {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      `${path}: ${(err as { error?: { message?: string } }).error?.message || res.statusText}`
    );
  }

  return res.json();
}

async function seed() {
  console.log('🌱 Seeding demo data...\n');

  // Create the Debut drop first
  console.log(`🎯 Creating "${DROP_CONFIG.name}" drop...`);
  const drop = (await api('/v1/drops', {
    name: DROP_CONFIG.name,
    slug: DROP_CONFIG.slug,
    description: DROP_CONFIG.description,
    status: DROP_CONFIG.status,
  })) as { id: string };
  console.log(`   └─ Drop created: ${drop.id}\n`);

  // Create products with R2 image URLs
  const productIds: string[] = [];
  for (const prod of PRODUCTS) {
    console.log(`📦 Creating ${prod.title}...`);

    const product = await api('/v1/products', {
      title: prod.title,
      description: prod.description,
      featured_image_url: prod.image_url,
    });

    productIds.push((product as { id: string }).id);

    const productVariants = VARIANTS[prod.title];
    if (productVariants) {
      for (const v of productVariants) {
        const { stock, ...variant } = v;
        console.log(`   └─ ${variant.sku}`);

        await api(`/v1/products/${(product as { id: string }).id}/variants`, variant);

        // Add inventory
        await api(`/v1/inventory/${encodeURIComponent(variant.sku)}/adjust`, {
          delta: stock,
          reason: 'restock',
        });
      }
    }
  }

  // Assign all products to the Debut drop
  console.log('\n🔗 Assigning products to "The Debut" drop...');
  await apiPut(`/v1/drops/${drop.id}/products`, { productIds });
  console.log(`   └─ ${productIds.length} products assigned to drop`);

  // Create test orders
  console.log('\n🛒 Creating test orders...');

  for (const order of TEST_ORDERS) {
    const result = await api('/v1/orders/test', order);
    const itemsSummary = order.items.map((i) => `${i.qty}x ${i.sku}`).join(', ');
    console.log(
      `   └─ ${(result as { number: string }).number}: ${order.customer_email} (${itemsSummary})`
    );
  }

  console.log('\n✅ Done! Demo data created.\n');

  // Show summary
  const { items: allProducts } = (await api('/v1/products')) as {
    items: Array<{ variants: unknown[] }>;
  };
  const { items: allOrders } = (await api('/v1/orders')) as {
    items: Array<{ amounts: { total_cents: number } }>;
  };
  console.log(`Products: ${allProducts.length}`);
  console.log(`Variants: ${allProducts.reduce((sum: number, p) => sum + p.variants.length, 0)}`);
  console.log(`Orders: ${allOrders.length}`);

  const totalRevenue = allOrders.reduce((sum: number, o) => sum + o.amounts.total_cents, 0);
  console.log(`Revenue: $${(totalRevenue / 100).toFixed(2)}`);

  console.log(`\n📊 Admin dashboard: cd admin && npm run dev`);
  console.log(`   Connect with: ${API_URL}`);
}

seed().catch((err: Error) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
