/**
 * Seed Configuration - Product and variant data for seeding the database
 *
 * This file contains the configuration data used by the seed script.
 * Images are sourced from the Cloudflare R2 bucket.
 */

// R2 Public URL for product images
export const R2_PUBLIC_URL = 'https://pub-bf88a85e013c44b6a3a965d48812aa90.r2.dev';

// Product definitions with R2 image URLs
export const PRODUCTS = [
  {
    title: 'Classic Tee',
    description: 'Premium cotton t-shirt. Soft, breathable, and built to last.',
    image_url: `${R2_PUBLIC_URL}/products/prod-1.webp`,
  },
  {
    title: 'Hoodie',
    description: 'Cozy pullover hoodie. Perfect for coding sessions.',
    image_url: `${R2_PUBLIC_URL}/products/prod-2.webp`,
  },
  {
    title: 'Cap',
    description: 'Embroidered baseball cap. One size fits most.',
    image_url: `${R2_PUBLIC_URL}/products/prod-3.webp`,
  },
  {
    title: 'Sticker Pack',
    description: 'Set of 5 die-cut vinyl stickers. Waterproof and durable.',
    image_url: `${R2_PUBLIC_URL}/products/prod-4.webp`,
  },
  {
    title: 'Mug',
    description: 'Ceramic mug with minimalist design. 11oz capacity.',
    image_url: `${R2_PUBLIC_URL}/products/prod-5.webp`,
  },
  {
    title: 'Tote Bag',
    description: 'Canvas tote bag. Spacious and eco-friendly.',
    image_url: `${R2_PUBLIC_URL}/products/prod-6.webp`,
  },
  {
    title: 'Notebook',
    description: 'Lined notebook with soft cover. 200 pages of premium paper.',
    image_url: `${R2_PUBLIC_URL}/products/prod-7.webp`,
  },
];

// Variant definitions for each product
export const VARIANTS: Record<
  string,
  Array<{
    sku: string;
    title: string;
    price_cents: number;
    weight_g: number;
    stock: number;
    image_url?: string;
  }>
> = {
  'Classic Tee': [
    {
      sku: 'TEE-BLK-S',
      title: 'Black / S',
      price_cents: 2999,
      weight_g: 180,
      stock: 50,
      image_url: `${R2_PUBLIC_URL}/products/prod-1.webp`,
    },
    {
      sku: 'TEE-BLK-M',
      title: 'Black / M',
      price_cents: 2999,
      weight_g: 200,
      stock: 75,
      image_url: `${R2_PUBLIC_URL}/products/prod-1.webp`,
    },
    {
      sku: 'TEE-BLK-L',
      title: 'Black / L',
      price_cents: 2999,
      weight_g: 220,
      stock: 60,
      image_url: `${R2_PUBLIC_URL}/products/prod-1.webp`,
    },
    {
      sku: 'TEE-WHT-S',
      title: 'White / S',
      price_cents: 2999,
      weight_g: 180,
      stock: 40,
      image_url: `${R2_PUBLIC_URL}/products/prod-1.webp`,
    },
    {
      sku: 'TEE-WHT-M',
      title: 'White / M',
      price_cents: 2999,
      weight_g: 200,
      stock: 55,
      image_url: `${R2_PUBLIC_URL}/products/prod-1.webp`,
    },
    {
      sku: 'TEE-WHT-L',
      title: 'White / L',
      price_cents: 2999,
      weight_g: 220,
      stock: 45,
      image_url: `${R2_PUBLIC_URL}/products/prod-1.webp`,
    },
  ],
  Hoodie: [
    {
      sku: 'HOOD-BLK-M',
      title: 'Black / M',
      price_cents: 5999,
      weight_g: 450,
      stock: 30,
      image_url: `${R2_PUBLIC_URL}/products/prod-2.webp`,
    },
    {
      sku: 'HOOD-BLK-L',
      title: 'Black / L',
      price_cents: 5999,
      weight_g: 500,
      stock: 25,
      image_url: `${R2_PUBLIC_URL}/products/prod-2.webp`,
    },
    {
      sku: 'HOOD-GRY-M',
      title: 'Gray / M',
      price_cents: 5999,
      weight_g: 450,
      stock: 20,
      image_url: `${R2_PUBLIC_URL}/products/prod-2.webp`,
    },
    {
      sku: 'HOOD-GRY-L',
      title: 'Gray / L',
      price_cents: 5999,
      weight_g: 500,
      stock: 15,
      image_url: `${R2_PUBLIC_URL}/products/prod-2.webp`,
    },
  ],
  Cap: [
    {
      sku: 'CAP-BLK',
      title: 'Black',
      price_cents: 2499,
      weight_g: 100,
      stock: 100,
      image_url: `${R2_PUBLIC_URL}/products/prod-3.webp`,
    },
    {
      sku: 'CAP-NVY',
      title: 'Navy',
      price_cents: 2499,
      weight_g: 100,
      stock: 80,
      image_url: `${R2_PUBLIC_URL}/products/prod-3.webp`,
    },
  ],
  'Sticker Pack': [
    {
      sku: 'STICKER-5PK',
      title: '5 Pack',
      price_cents: 999,
      weight_g: 20,
      stock: 200,
      image_url: `${R2_PUBLIC_URL}/products/prod-4.webp`,
    },
  ],
  Mug: [
    {
      sku: 'MUG-WHT',
      title: 'White',
      price_cents: 1999,
      weight_g: 350,
      stock: 100,
      image_url: `${R2_PUBLIC_URL}/products/prod-5.webp`,
    },
    {
      sku: 'MUG-BLK',
      title: 'Black',
      price_cents: 1999,
      weight_g: 350,
      stock: 80,
      image_url: `${R2_PUBLIC_URL}/products/prod-5.webp`,
    },
  ],
  'Tote Bag': [
    {
      sku: 'TOTE-NAT',
      title: 'Natural',
      price_cents: 2499,
      weight_g: 200,
      stock: 75,
      image_url: `${R2_PUBLIC_URL}/products/prod-6.webp`,
    },
    {
      sku: 'TOTE-BLK',
      title: 'Black',
      price_cents: 2499,
      weight_g: 200,
      stock: 60,
      image_url: `${R2_PUBLIC_URL}/products/prod-6.webp`,
    },
  ],
  Notebook: [
    {
      sku: 'NOTE-LINED',
      title: 'Lined',
      price_cents: 1499,
      weight_g: 250,
      stock: 150,
      image_url: `${R2_PUBLIC_URL}/products/prod-7.webp`,
    },
    {
      sku: 'NOTE-BLANK',
      title: 'Blank',
      price_cents: 1499,
      weight_g: 250,
      stock: 120,
      image_url: `${R2_PUBLIC_URL}/products/prod-7.webp`,
    },
  ],
};

// Test orders configuration
export const TEST_ORDERS = [
  {
    customer_email: 'sarah@example.com',
    items: [
      { sku: 'TEE-BLK-M', qty: 2 },
      { sku: 'CAP-BLK', qty: 1 },
    ],
  },
  {
    customer_email: 'mike@example.com',
    items: [{ sku: 'HOOD-BLK-L', qty: 1 }],
  },
  {
    customer_email: 'emma@example.com',
    items: [
      { sku: 'TEE-WHT-S', qty: 1 },
      { sku: 'TEE-WHT-M', qty: 1 },
      { sku: 'CAP-NVY', qty: 2 },
    ],
  },
  {
    customer_email: 'james@example.com',
    items: [
      { sku: 'HOOD-GRY-M', qty: 1 },
      { sku: 'TEE-BLK-L', qty: 3 },
    ],
  },
  {
    customer_email: 'olivia@example.com',
    items: [{ sku: 'CAP-BLK', qty: 1 }],
  },
  {
    customer_email: 'noah@example.com',
    items: [
      { sku: 'TEE-BLK-S', qty: 1 },
      { sku: 'TEE-WHT-L', qty: 1 },
      { sku: 'HOOD-BLK-M', qty: 1 },
    ],
  },
  {
    customer_email: 'ava@example.com',
    items: [{ sku: 'HOOD-GRY-L', qty: 2 }],
  },
  {
    customer_email: 'liam@example.com',
    items: [
      { sku: 'TEE-BLK-M', qty: 1 },
      { sku: 'CAP-NVY', qty: 1 },
    ],
  },
];
