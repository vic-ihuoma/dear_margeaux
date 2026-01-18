/**
 * Seed Configuration - Product and variant data for seeding the database
 *
 * This file contains the configuration data used by the seed script.
 * Images are sourced from the Cloudflare R2 bucket.
 *
 * Product names inspired by the Dear Margeaux brand story:
 * French-inspired elegance, Italian leather, timeless craftsmanship
 */

// R2 Public URL for product images
export const R2_PUBLIC_URL = 'https://pub-bf88a85e013c44b6a3a965d48812aa90.r2.dev';

// Product definitions with R2 image URLs
// Named in the Dear Margeaux style - French-inspired, elegant bag names
export const PRODUCTS = [
  {
    title: 'Le Classique Tote',
    description:
      'Our signature everyday tote in supple Italian leather. Clean lines and balanced proportions make this the perfect companion for your daily journey.',
    image_url: `${R2_PUBLIC_URL}/products/prod-1.webp`,
  },
  {
    title: 'The Margot Satchel',
    description:
      'A structured satchel with vintage brass hardware. Inspired by the understated elegance of French fashion, designed to age gracefully.',
    image_url: `${R2_PUBLIC_URL}/products/prod-2.webp`,
  },
  {
    title: 'Petit Crossbody',
    description:
      'A compact crossbody for the essentials. Handcrafted with care, featuring an adjustable strap and secure clasp closure.',
    image_url: `${R2_PUBLIC_URL}/products/prod-3.webp`,
  },
  {
    title: 'The Parisian Clutch',
    description:
      'Evening elegance in your palm. This minimalist clutch captures the spirit of sun-drenched leather workshops and timeless craftsmanship.',
    image_url: `${R2_PUBLIC_URL}/products/prod-4.webp`,
  },
  {
    title: 'Le Weekend Duffle',
    description:
      'Your perfect travel companion. Spacious yet refined, with Italian leather that develops a beautiful patina telling the story of your journeys.',
    image_url: `${R2_PUBLIC_URL}/products/prod-5.webp`,
  },
  {
    title: 'The Élise Hobo',
    description:
      'A relaxed silhouette with sophisticated details. Soft, slouchy leather meets thoughtful design for effortless everyday style.',
    image_url: `${R2_PUBLIC_URL}/products/prod-6.webp`,
  },
  {
    title: 'Mini Margeaux',
    description:
      'Petite perfection. All the craftsmanship of our full-size bags in a charming compact form. Limited edition for the debut collection.',
    image_url: `${R2_PUBLIC_URL}/products/prod-7.webp`,
  },
];

// Variant definitions for each product
// Colors named elegantly: Noir (Black), Cognac (Brown), Crème (Cream), Marine (Navy)
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
  'Le Classique Tote': [
    {
      sku: 'TOTE-NOIR',
      title: 'Noir',
      price_cents: 45000,
      weight_g: 680,
      stock: 25,
      image_url: `${R2_PUBLIC_URL}/products/prod-1.webp`,
    },
    {
      sku: 'TOTE-COGNAC',
      title: 'Cognac',
      price_cents: 45000,
      weight_g: 680,
      stock: 20,
      image_url: `${R2_PUBLIC_URL}/products/prod-1.webp`,
    },
    {
      sku: 'TOTE-CREME',
      title: 'Crème',
      price_cents: 45000,
      weight_g: 680,
      stock: 15,
      image_url: `${R2_PUBLIC_URL}/products/prod-1.webp`,
    },
  ],
  'The Margot Satchel': [
    {
      sku: 'SATCHEL-NOIR',
      title: 'Noir',
      price_cents: 52000,
      weight_g: 750,
      stock: 18,
      image_url: `${R2_PUBLIC_URL}/products/prod-2.webp`,
    },
    {
      sku: 'SATCHEL-COGNAC',
      title: 'Cognac',
      price_cents: 52000,
      weight_g: 750,
      stock: 15,
      image_url: `${R2_PUBLIC_URL}/products/prod-2.webp`,
    },
  ],
  'Petit Crossbody': [
    {
      sku: 'CROSS-NOIR',
      title: 'Noir',
      price_cents: 28500,
      weight_g: 320,
      stock: 30,
      image_url: `${R2_PUBLIC_URL}/products/prod-3.webp`,
    },
    {
      sku: 'CROSS-COGNAC',
      title: 'Cognac',
      price_cents: 28500,
      weight_g: 320,
      stock: 25,
      image_url: `${R2_PUBLIC_URL}/products/prod-3.webp`,
    },
    {
      sku: 'CROSS-MARINE',
      title: 'Marine',
      price_cents: 28500,
      weight_g: 320,
      stock: 20,
      image_url: `${R2_PUBLIC_URL}/products/prod-3.webp`,
    },
  ],
  'The Parisian Clutch': [
    {
      sku: 'CLUTCH-NOIR',
      title: 'Noir',
      price_cents: 22000,
      weight_g: 180,
      stock: 35,
      image_url: `${R2_PUBLIC_URL}/products/prod-4.webp`,
    },
    {
      sku: 'CLUTCH-CREME',
      title: 'Crème',
      price_cents: 22000,
      weight_g: 180,
      stock: 25,
      image_url: `${R2_PUBLIC_URL}/products/prod-4.webp`,
    },
  ],
  'Le Weekend Duffle': [
    {
      sku: 'DUFFLE-NOIR',
      title: 'Noir',
      price_cents: 68000,
      weight_g: 1200,
      stock: 12,
      image_url: `${R2_PUBLIC_URL}/products/prod-5.webp`,
    },
    {
      sku: 'DUFFLE-COGNAC',
      title: 'Cognac',
      price_cents: 68000,
      weight_g: 1200,
      stock: 10,
      image_url: `${R2_PUBLIC_URL}/products/prod-5.webp`,
    },
  ],
  'The Élise Hobo': [
    {
      sku: 'HOBO-NOIR',
      title: 'Noir',
      price_cents: 38500,
      weight_g: 520,
      stock: 22,
      image_url: `${R2_PUBLIC_URL}/products/prod-6.webp`,
    },
    {
      sku: 'HOBO-COGNAC',
      title: 'Cognac',
      price_cents: 38500,
      weight_g: 520,
      stock: 18,
      image_url: `${R2_PUBLIC_URL}/products/prod-6.webp`,
    },
    {
      sku: 'HOBO-CREME',
      title: 'Crème',
      price_cents: 38500,
      weight_g: 520,
      stock: 15,
      image_url: `${R2_PUBLIC_URL}/products/prod-6.webp`,
    },
  ],
  'Mini Margeaux': [
    {
      sku: 'MINI-NOIR',
      title: 'Noir',
      price_cents: 24500,
      weight_g: 280,
      stock: 28,
      image_url: `${R2_PUBLIC_URL}/products/prod-7.webp`,
    },
    {
      sku: 'MINI-COGNAC',
      title: 'Cognac',
      price_cents: 24500,
      weight_g: 280,
      stock: 22,
      image_url: `${R2_PUBLIC_URL}/products/prod-7.webp`,
    },
    {
      sku: 'MINI-CREME',
      title: 'Crème',
      price_cents: 24500,
      weight_g: 280,
      stock: 18,
      image_url: `${R2_PUBLIC_URL}/products/prod-7.webp`,
    },
  ],
};

// Test orders configuration with new SKUs
export const TEST_ORDERS = [
  {
    customer_email: 'sarah@example.com',
    items: [
      { sku: 'TOTE-NOIR', qty: 1 },
      { sku: 'CLUTCH-CREME', qty: 1 },
    ],
  },
  {
    customer_email: 'mike@example.com',
    items: [{ sku: 'DUFFLE-COGNAC', qty: 1 }],
  },
  {
    customer_email: 'emma@example.com',
    items: [
      { sku: 'CROSS-MARINE', qty: 1 },
      { sku: 'MINI-CREME', qty: 1 },
    ],
  },
  {
    customer_email: 'james@example.com',
    items: [
      { sku: 'SATCHEL-NOIR', qty: 1 },
      { sku: 'TOTE-COGNAC', qty: 1 },
    ],
  },
  {
    customer_email: 'olivia@example.com',
    items: [{ sku: 'HOBO-COGNAC', qty: 1 }],
  },
  {
    customer_email: 'noah@example.com',
    items: [
      { sku: 'MINI-NOIR', qty: 1 },
      { sku: 'CLUTCH-NOIR', qty: 1 },
    ],
  },
  {
    customer_email: 'ava@example.com',
    items: [{ sku: 'CROSS-COGNAC', qty: 2 }],
  },
  {
    customer_email: 'liam@example.com',
    items: [
      { sku: 'TOTE-CREME', qty: 1 },
      { sku: 'HOBO-CREME', qty: 1 },
    ],
  },
];
