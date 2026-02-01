/**
 * Seed Configuration - Product and variant data for seeding the database
 *
 * This file contains the configuration data used by the seed script.
 * Images are sourced from the Cloudflare R2 bucket.
 *
 * Product names from the Dear Margeaux brand story:
 * French-inspired elegance, Italian leather, timeless craftsmanship
 */

// R2 Public URL for product images
export const R2_PUBLIC_URL = 'https://pub-bf88a85e013c44b6a3a965d48812aa90.r2.dev';

// Drop configuration for "The Debut" - initial-content-1
export const DROP_CONFIG = {
  name: 'The Debut',
  slug: 'the-debut',
  description: 'Our inaugural collection of handcrafted luxury bags',
  status: 'active' as const,
};

// Product definitions with R2 image URLs
// Named in the Dear Margeaux style - French-inspired, elegant bag names
// Products correspond to initial-content-2 through initial-content-8
export const PRODUCTS = [
  {
    title: 'The Colette',
    description:
      'A refined everyday companion. The Colette features clean lines and supple leather, designed for the woman who values understated elegance.',
    image_url: `${R2_PUBLIC_URL}/products/prod-1.webp`,
  },
  {
    title: 'The Amélie',
    description:
      'Effortlessly chic with a touch of Parisian flair. The Amélie combines timeless silhouette with modern functionality.',
    image_url: `${R2_PUBLIC_URL}/products/prod-2.webp`,
  },
  {
    title: 'The Giselle',
    description:
      'Graceful and sophisticated. The Giselle is crafted for those special moments when presence matters.',
    image_url: `${R2_PUBLIC_URL}/products/prod-3.webp`,
  },
  {
    title: 'The Margot',
    description:
      'Our namesake piece. The Margot embodies everything Dear Margeaux stands for—timeless beauty, exceptional craftsmanship, and quiet luxury.',
    image_url: `${R2_PUBLIC_URL}/products/prod-4.webp`,
  },
  {
    title: 'The Vivienne',
    description:
      'Bold yet refined. The Vivienne makes a statement without saying a word, perfect for the confident woman.',
    image_url: `${R2_PUBLIC_URL}/products/prod-5.webp`,
  },
  {
    title: 'The Eloise',
    description:
      'Delicate and dreamy. The Eloise is a petite treasure for evenings out and intimate gatherings.',
    image_url: `${R2_PUBLIC_URL}/products/prod-6.webp`,
  },
  {
    title: 'The Céline',
    description:
      'Structured sophistication meets everyday practicality. The Céline transitions seamlessly from day to evening.',
    image_url: `${R2_PUBLIC_URL}/products/prod-7.webp`,
  },
];

// Variant definitions for each product
// Prices and inventory from initial-content-2 through initial-content-9
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
  'The Colette': [
    {
      sku: 'COLETTE-001',
      title: 'Default',
      price_cents: 39500, // $395
      weight_g: 450,
      stock: 20,
      image_url: `${R2_PUBLIC_URL}/products/prod-1.webp`,
    },
  ],
  'The Amélie': [
    {
      sku: 'AMELIE-001',
      title: 'Default',
      price_cents: 45000, // $450
      weight_g: 520,
      stock: 15,
      image_url: `${R2_PUBLIC_URL}/products/prod-2.webp`,
    },
  ],
  'The Giselle': [
    {
      sku: 'GISELLE-001',
      title: 'Default',
      price_cents: 52500, // $525
      weight_g: 580,
      stock: 12,
      image_url: `${R2_PUBLIC_URL}/products/prod-3.webp`,
    },
  ],
  'The Margot': [
    {
      sku: 'MARGOT-001',
      title: 'Default',
      price_cents: 47500, // $475
      weight_g: 500,
      stock: 18,
      image_url: `${R2_PUBLIC_URL}/products/prod-4.webp`,
    },
  ],
  'The Vivienne': [
    {
      sku: 'VIVIENNE-001',
      title: 'Default',
      price_cents: 59500, // $595
      weight_g: 620,
      stock: 10,
      image_url: `${R2_PUBLIC_URL}/products/prod-5.webp`,
    },
  ],
  'The Eloise': [
    {
      sku: 'ELOISE-001',
      title: 'Default',
      price_cents: 34500, // $345
      weight_g: 280,
      stock: 25,
      image_url: `${R2_PUBLIC_URL}/products/prod-6.webp`,
    },
  ],
  'The Céline': [
    {
      sku: 'CELINE-001',
      title: 'Default',
      price_cents: 42500, // $425
      weight_g: 480,
      stock: 15,
      image_url: `${R2_PUBLIC_URL}/products/prod-7.webp`,
    },
  ],
};

// Test orders configuration with new SKUs
export const TEST_ORDERS = [
  {
    customer_email: 'sarah@example.com',
    items: [
      { sku: 'COLETTE-001', qty: 1 },
      { sku: 'ELOISE-001', qty: 1 },
    ],
  },
  {
    customer_email: 'mike@example.com',
    items: [{ sku: 'VIVIENNE-001', qty: 1 }],
  },
  {
    customer_email: 'emma@example.com',
    items: [
      { sku: 'GISELLE-001', qty: 1 },
      { sku: 'CELINE-001', qty: 1 },
    ],
  },
  {
    customer_email: 'james@example.com',
    items: [
      { sku: 'MARGOT-001', qty: 1 },
      { sku: 'AMELIE-001', qty: 1 },
    ],
  },
  {
    customer_email: 'olivia@example.com',
    items: [{ sku: 'COLETTE-001', qty: 1 }],
  },
  {
    customer_email: 'noah@example.com',
    items: [
      { sku: 'ELOISE-001', qty: 1 },
      { sku: 'CELINE-001', qty: 1 },
    ],
  },
  {
    customer_email: 'ava@example.com',
    items: [{ sku: 'AMELIE-001', qty: 2 }],
  },
  {
    customer_email: 'liam@example.com',
    items: [
      { sku: 'GISELLE-001', qty: 1 },
      { sku: 'MARGOT-001', qty: 1 },
    ],
  },
];
