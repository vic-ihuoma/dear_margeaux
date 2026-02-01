import { describe, it, expect, beforeAll } from 'vitest';

/**
 * Tests for initial content data in seed-config
 * Verifies that The Debut drop and the 7 initial products are configured correctly
 */

// R2 Public URL from seed-config
const R2_PUBLIC_URL = 'https://pub-bf88a85e013c44b6a3a965d48812aa90.r2.dev';

// Expected products from implementations.json initial-content-2 through initial-content-8
const EXPECTED_PRODUCTS = [
  {
    title: 'The Colette',
    description:
      'A refined everyday companion. The Colette features clean lines and supple leather, designed for the woman who values understated elegance.',
    sku: 'COLETTE-001',
    price_cents: 39500,
    inventory: 20,
    image_index: 1,
  },
  {
    title: 'The Amélie',
    description:
      'Effortlessly chic with a touch of Parisian flair. The Amélie combines timeless silhouette with modern functionality.',
    sku: 'AMELIE-001',
    price_cents: 45000,
    inventory: 15,
    image_index: 2,
  },
  {
    title: 'The Giselle',
    description:
      'Graceful and sophisticated. The Giselle is crafted for those special moments when presence matters.',
    sku: 'GISELLE-001',
    price_cents: 52500,
    inventory: 12,
    image_index: 3,
  },
  {
    title: 'The Margot',
    description:
      'Our namesake piece. The Margot embodies everything Dear Margeaux stands for—timeless beauty, exceptional craftsmanship, and quiet luxury.',
    sku: 'MARGOT-001',
    price_cents: 47500,
    inventory: 18,
    image_index: 4,
  },
  {
    title: 'The Vivienne',
    description:
      'Bold yet refined. The Vivienne makes a statement without saying a word, perfect for the confident woman.',
    sku: 'VIVIENNE-001',
    price_cents: 59500,
    inventory: 10,
    image_index: 5,
  },
  {
    title: 'The Eloise',
    description:
      'Delicate and dreamy. The Eloise is a petite treasure for evenings out and intimate gatherings.',
    sku: 'ELOISE-001',
    price_cents: 34500,
    inventory: 25,
    image_index: 6,
  },
  {
    title: 'The Céline',
    description:
      'Structured sophistication meets everyday practicality. The Céline transitions seamlessly from day to evening.',
    sku: 'CELINE-001',
    price_cents: 42500,
    inventory: 15,
    image_index: 7,
  },
];

describe('initial-content-1: The Debut Drop Configuration', () => {
  let seedConfig: typeof import('../../scripts/seed-config');

  beforeAll(async () => {
    seedConfig = await import('../../scripts/seed-config');
  });

  it('DROP_CONFIG exists with correct name', () => {
    expect(seedConfig.DROP_CONFIG).toBeDefined();
    expect(seedConfig.DROP_CONFIG.name).toBe('The Debut');
  });

  it('DROP_CONFIG has correct description', () => {
    expect(seedConfig.DROP_CONFIG.description).toBe(
      'Our inaugural collection of handcrafted luxury bags'
    );
  });

  it('DROP_CONFIG has status active', () => {
    expect(seedConfig.DROP_CONFIG.status).toBe('active');
  });

  it('DROP_CONFIG has slug the-debut', () => {
    expect(seedConfig.DROP_CONFIG.slug).toBe('the-debut');
  });
});

describe('initial-content-2 through initial-content-8: Product Configuration', () => {
  let seedConfig: typeof import('../../scripts/seed-config');

  beforeAll(async () => {
    seedConfig = await import('../../scripts/seed-config');
  });

  it('has exactly 7 products', () => {
    expect(seedConfig.PRODUCTS.length).toBe(7);
  });

  it('products have correct titles', () => {
    const titles = seedConfig.PRODUCTS.map((p: { title: string }) => p.title);
    const expectedTitles = EXPECTED_PRODUCTS.map((p) => p.title);
    expect(titles).toEqual(expectedTitles);
  });

  it('Product: The Colette exists with correct data', () => {
    const colette = seedConfig.PRODUCTS.find((p: { title: string }) => p.title === 'The Colette');
    expect(colette).toBeDefined();
    expect(colette.description).toBe(EXPECTED_PRODUCTS[0].description);
    expect(colette.image_url).toBe(`${R2_PUBLIC_URL}/products/prod-1.webp`);
  });

  it('Product: The Amélie exists with correct data', () => {
    const amelie = seedConfig.PRODUCTS.find((p: { title: string }) => p.title === 'The Amélie');
    expect(amelie).toBeDefined();
    expect(amelie.description).toBe(EXPECTED_PRODUCTS[1].description);
    expect(amelie.image_url).toBe(`${R2_PUBLIC_URL}/products/prod-2.webp`);
  });

  it('Product: The Giselle exists with correct data', () => {
    const giselle = seedConfig.PRODUCTS.find((p: { title: string }) => p.title === 'The Giselle');
    expect(giselle).toBeDefined();
    expect(giselle.description).toBe(EXPECTED_PRODUCTS[2].description);
    expect(giselle.image_url).toBe(`${R2_PUBLIC_URL}/products/prod-3.webp`);
  });

  it('Product: The Margot exists with correct data', () => {
    const margot = seedConfig.PRODUCTS.find((p: { title: string }) => p.title === 'The Margot');
    expect(margot).toBeDefined();
    expect(margot.description).toBe(EXPECTED_PRODUCTS[3].description);
    expect(margot.image_url).toBe(`${R2_PUBLIC_URL}/products/prod-4.webp`);
  });

  it('Product: The Vivienne exists with correct data', () => {
    const vivienne = seedConfig.PRODUCTS.find((p: { title: string }) => p.title === 'The Vivienne');
    expect(vivienne).toBeDefined();
    expect(vivienne.description).toBe(EXPECTED_PRODUCTS[4].description);
    expect(vivienne.image_url).toBe(`${R2_PUBLIC_URL}/products/prod-5.webp`);
  });

  it('Product: The Eloise exists with correct data', () => {
    const eloise = seedConfig.PRODUCTS.find((p: { title: string }) => p.title === 'The Eloise');
    expect(eloise).toBeDefined();
    expect(eloise.description).toBe(EXPECTED_PRODUCTS[5].description);
    expect(eloise.image_url).toBe(`${R2_PUBLIC_URL}/products/prod-6.webp`);
  });

  it('Product: The Céline exists with correct data', () => {
    const celine = seedConfig.PRODUCTS.find((p: { title: string }) => p.title === 'The Céline');
    expect(celine).toBeDefined();
    expect(celine.description).toBe(EXPECTED_PRODUCTS[6].description);
    expect(celine.image_url).toBe(`${R2_PUBLIC_URL}/products/prod-7.webp`);
  });
});

describe('initial-content-9: Variant and Inventory Configuration', () => {
  let seedConfig: typeof import('../../scripts/seed-config');

  beforeAll(async () => {
    seedConfig = await import('../../scripts/seed-config');
  });

  it('The Colette variant has correct SKU and price', () => {
    const variants = seedConfig.VARIANTS['The Colette'];
    expect(variants).toBeDefined();
    expect(variants.length).toBeGreaterThan(0);
    const variant = variants[0];
    expect(variant.sku).toBe('COLETTE-001');
    expect(variant.price_cents).toBe(39500);
  });

  it('The Amélie variant has correct SKU and price', () => {
    const variants = seedConfig.VARIANTS['The Amélie'];
    expect(variants).toBeDefined();
    expect(variants.length).toBeGreaterThan(0);
    const variant = variants[0];
    expect(variant.sku).toBe('AMELIE-001');
    expect(variant.price_cents).toBe(45000);
  });

  it('The Giselle variant has correct SKU and price', () => {
    const variants = seedConfig.VARIANTS['The Giselle'];
    expect(variants).toBeDefined();
    expect(variants.length).toBeGreaterThan(0);
    const variant = variants[0];
    expect(variant.sku).toBe('GISELLE-001');
    expect(variant.price_cents).toBe(52500);
  });

  it('The Margot variant has correct SKU and price', () => {
    const variants = seedConfig.VARIANTS['The Margot'];
    expect(variants).toBeDefined();
    expect(variants.length).toBeGreaterThan(0);
    const variant = variants[0];
    expect(variant.sku).toBe('MARGOT-001');
    expect(variant.price_cents).toBe(47500);
  });

  it('The Vivienne variant has correct SKU and price', () => {
    const variants = seedConfig.VARIANTS['The Vivienne'];
    expect(variants).toBeDefined();
    expect(variants.length).toBeGreaterThan(0);
    const variant = variants[0];
    expect(variant.sku).toBe('VIVIENNE-001');
    expect(variant.price_cents).toBe(59500);
  });

  it('The Eloise variant has correct SKU and price', () => {
    const variants = seedConfig.VARIANTS['The Eloise'];
    expect(variants).toBeDefined();
    expect(variants.length).toBeGreaterThan(0);
    const variant = variants[0];
    expect(variant.sku).toBe('ELOISE-001');
    expect(variant.price_cents).toBe(34500);
  });

  it('The Céline variant has correct SKU and price', () => {
    const variants = seedConfig.VARIANTS['The Céline'];
    expect(variants).toBeDefined();
    expect(variants.length).toBeGreaterThan(0);
    const variant = variants[0];
    expect(variant.sku).toBe('CELINE-001');
    expect(variant.price_cents).toBe(42500);
  });

  it('The Colette inventory is 20 units', () => {
    const variants = seedConfig.VARIANTS['The Colette'];
    expect(variants[0].stock).toBe(20);
  });

  it('The Amélie inventory is 15 units', () => {
    const variants = seedConfig.VARIANTS['The Amélie'];
    expect(variants[0].stock).toBe(15);
  });

  it('The Giselle inventory is 12 units', () => {
    const variants = seedConfig.VARIANTS['The Giselle'];
    expect(variants[0].stock).toBe(12);
  });

  it('The Margot inventory is 18 units', () => {
    const variants = seedConfig.VARIANTS['The Margot'];
    expect(variants[0].stock).toBe(18);
  });

  it('The Vivienne inventory is 10 units', () => {
    const variants = seedConfig.VARIANTS['The Vivienne'];
    expect(variants[0].stock).toBe(10);
  });

  it('The Eloise inventory is 25 units', () => {
    const variants = seedConfig.VARIANTS['The Eloise'];
    expect(variants[0].stock).toBe(25);
  });

  it('The Céline inventory is 15 units', () => {
    const variants = seedConfig.VARIANTS['The Céline'];
    expect(variants[0].stock).toBe(15);
  });
});
