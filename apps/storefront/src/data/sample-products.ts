/**
 * Sample products for development and fallback when API is unavailable
 */

export interface SampleVariant {
  id: string;
  sku: string;
  title: string;
  price_cents: number;
  image_url: string | null;
  available: boolean;
}

export interface SampleProduct {
  id: string;
  title: string;
  description: string;
  collection: string;
  variants: SampleVariant[];
}

export const sampleProducts: SampleProduct[] = [
  {
    id: '1',
    title: 'Classic Leather Tote',
    description:
      'Our signature tote, handcrafted from the finest Italian leather. Features a spacious interior with organizational pockets, reinforced handles, and a detachable shoulder strap. The perfect companion for work or weekend adventures.',
    collection: 'Spring 2026',
    variants: [
      {
        id: 'v1a',
        sku: 'CLT-TAN-001',
        title: 'Tan',
        price_cents: 45000,
        image_url: null,
        available: true,
      },
      {
        id: 'v1b',
        sku: 'CLT-BLK-001',
        title: 'Black',
        price_cents: 45000,
        image_url: null,
        available: true,
      },
      {
        id: 'v1c',
        sku: 'CLT-COG-001',
        title: 'Cognac',
        price_cents: 48000,
        image_url: null,
        available: false,
      },
    ],
  },
  {
    id: '2',
    title: 'Mini Crossbody',
    description:
      'Compact yet surprisingly spacious, our Mini Crossbody is perfect for those days when you want to travel light. Crafted from buttery-soft leather with an adjustable strap and secure magnetic closure.',
    collection: 'Spring 2026',
    variants: [
      {
        id: 'v2a',
        sku: 'MCB-BRN-001',
        title: 'Chestnut',
        price_cents: 28500,
        image_url: null,
        available: true,
      },
    ],
  },
  {
    id: '3',
    title: 'Structured Satchel',
    description:
      'A timeless silhouette reimagined for the modern age. The Structured Satchel features a top handle, optional crossbody strap, and multiple compartments to keep you organized in style.',
    collection: 'Spring 2026',
    variants: [
      {
        id: 'v3a',
        sku: 'SS-BLK-001',
        title: 'Black',
        price_cents: 52000,
        image_url: null,
        available: false,
      },
    ],
  },
  {
    id: '4',
    title: 'Weekend Duffle',
    description:
      'Your perfect travel companion. This roomy duffle is made from durable full-grain leather with brass hardware, a removable shoulder strap, and enough space for a weekend getaway or a trip to the gym.',
    collection: 'Spring 2026',
    variants: [
      {
        id: 'v4a',
        sku: 'WD-TAN-001',
        title: 'Tan',
        price_cents: 68000,
        image_url: null,
        available: true,
      },
      {
        id: 'v4b',
        sku: 'WD-OLV-001',
        title: 'Olive',
        price_cents: 68000,
        image_url: null,
        available: true,
      },
    ],
  },
  {
    id: '5',
    title: 'Evening Clutch',
    description:
      'Elevate your evening look with our slim leather clutch. Features a hidden magnetic closure, interior card slots, and a detachable chain strap for versatile styling.',
    collection: 'Winter 2025',
    variants: [
      {
        id: 'v5a',
        sku: 'EC-GLD-001',
        title: 'Gold',
        price_cents: 32000,
        image_url: null,
        available: false,
      },
    ],
  },
  {
    id: '6',
    title: 'Everyday Hobo',
    description:
      'Effortlessly chic, our hobo bag drapes beautifully and offers generous room for all your daily essentials. Soft, slouchy leather with a comfortable shoulder strap.',
    collection: 'Winter 2025',
    variants: [
      {
        id: 'v6a',
        sku: 'EH-CAM-001',
        title: 'Camel',
        price_cents: 48000,
        image_url: null,
        available: true,
      },
    ],
  },
  {
    id: '7',
    title: 'Bucket Bag',
    description:
      'A modern take on a classic shape. Our bucket bag features a drawstring closure, interior pocket, and elegant proportions that work from day to night.',
    collection: 'Winter 2025',
    variants: [
      {
        id: 'v7a',
        sku: 'BB-BUR-001',
        title: 'Burgundy',
        price_cents: 38000,
        image_url: null,
        available: true,
      },
    ],
  },
  {
    id: '8',
    title: 'Messenger Bag',
    description:
      'Professional meets practical in our leather messenger bag. Features a padded laptop compartment, multiple organizational pockets, and a comfortable crossbody strap.',
    collection: 'Fall 2025',
    variants: [
      {
        id: 'v8a',
        sku: 'MB-NAV-001',
        title: 'Navy',
        price_cents: 55000,
        image_url: null,
        available: true,
      },
    ],
  },
];
