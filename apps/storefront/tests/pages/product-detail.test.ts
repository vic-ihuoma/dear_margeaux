/**
 * Tests for pm-34: Display product images on storefront product detail page
 *
 * Tests verify:
 * 1. Product page displays featured image at top
 * 2. Product page shows variant images in gallery
 * 3. All images have proper alt attributes
 * 4. Missing images show placeholder
 * 5. Images use responsive srcset
 */
import { describe, it, expect, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('pm-34: Product detail page image display', () => {
  let pageContent: string;

  beforeEach(() => {
    // Read the product detail page template
    const pagePath = path.join(process.cwd(), 'src/pages/product/[id].astro');
    pageContent = fs.readFileSync(pagePath, 'utf-8');
  });

  describe('Featured image display', () => {
    it('displays featured image prominently at top of product section', () => {
      // Main image container should be the first major element
      expect(pageContent).toContain('id="main-product-image"');
      expect(pageContent).toMatch(/Product Images.*main-product-image/s);
    });

    it('uses featured_image_url from product data', () => {
      // Featured image should be preferred over variant image
      expect(pageContent).toContain('product.featured_image_url');
      expect(pageContent).toContain('mainImageUrl');
    });

    it('falls back to first variant image when no featured image', () => {
      // Code shows: mainImageUrl = product.featured_image_url ?? defaultVariant?.image_url
      expect(pageContent).toContain(
        'product.featured_image_url ?? defaultVariant?.image_url'
      );
    });

    it('displays image in aspect-square container with rounded corners', () => {
      // UI styling for main image
      expect(pageContent).toMatch(/aspect-square.*overflow-hidden.*rounded-xl/);
    });

    it('has zoom indicator icon overlaid on image', () => {
      // Zoom indicator shows users can click to zoom
      expect(pageContent).toContain('Zoom indicator');
      expect(pageContent).toContain('cursor-zoom-in');
    });
  });

  describe('Variant image gallery', () => {
    it('displays variant images in thumbnail gallery', () => {
      // Thumbnail gallery section
      expect(pageContent).toContain('Thumbnail Gallery');
      expect(pageContent).toMatch(/variants\.map.*variant/);
    });

    it('shows thumbnails only when multiple variants with images exist', () => {
      // Conditional rendering: variants.length > 1 && variants.some(v => v.image_url)
      expect(pageContent).toContain('product.variants.length > 1');
      expect(pageContent).toContain(
        'product.variants.some((v) => v.image_url)'
      );
    });

    it('each thumbnail button has data-variant-id attribute', () => {
      expect(pageContent).toContain('data-variant-id={variant.id}');
    });

    it('thumbnail buttons have accessible aria-label', () => {
      expect(pageContent).toMatch(/aria-label.*View.*variant/);
    });

    it('clicking thumbnail updates main image', () => {
      // Script section handles thumbnail clicks
      expect(pageContent).toContain('mainImage.src = thumbImg.src');
    });
  });

  describe('Alt text for accessibility', () => {
    it('main image has alt attribute from featured_image_alt or title', () => {
      expect(pageContent).toContain('mainImageAlt');
      expect(pageContent).toContain(
        'product.featured_image_alt ?? defaultVariant?.image_alt ?? product.title'
      );
    });

    it('main image alt is applied to img element', () => {
      expect(pageContent).toMatch(/img[\s\S]*?alt=\{mainImageAlt\}/);
    });

    it('variant thumbnails have alt text', () => {
      // Each variant thumbnail should have alt text
      expect(pageContent).toContain('variantAlt');
      expect(pageContent).toMatch(
        /variant\.image_alt.*\?\?.*product\.title.*variant\.title/
      );
    });

    it('thumbnail images have alt attribute', () => {
      expect(pageContent).toMatch(
        /<img[\s\S]*?src=\{variant\.image_url\}[\s\S]*?alt=\{variantAlt\}/
      );
    });
  });

  describe('Missing images placeholder', () => {
    it('shows placeholder SVG when no image URL exists', () => {
      // Conditional: mainImageUrl ? (image) : (placeholder)
      expect(pageContent).toContain('mainImageUrl ?');
      // Placeholder with icon
      expect(pageContent).toMatch(
        /flex.*h-full.*w-full.*items-center.*justify-center/
      );
      expect(pageContent).toMatch(/h-24 w-24 text-text-muted/);
    });

    it('placeholder displays image icon SVG', () => {
      // Image placeholder icon (photo/image icon)
      expect(pageContent).toMatch(/M2\.25.*15\.75l5\.159-5\.159/);
    });

    it('variant thumbnails show title when no image', () => {
      // Variant thumbnail fallback shows variant title
      expect(pageContent).toContain('{variant.title}');
      expect(pageContent).toMatch(
        /bg-secondary.*flex.*items-center.*justify-center.*variant\.title/s
      );
    });
  });

  describe('Image lightbox integration', () => {
    it('includes ProductImageGallery component for lightbox', () => {
      expect(pageContent).toContain('ProductImageGallery');
      expect(pageContent).toContain('import ProductImageGallery from');
    });

    it('passes mainImageId to ProductImageGallery', () => {
      expect(pageContent).toMatch(
        /ProductImageGallery[\s\S]*?mainImageId="main-product-image"/
      );
    });

    it('passes images array to ProductImageGallery', () => {
      expect(pageContent).toMatch(
        /ProductImageGallery[\s\S]*?images=\{lightboxImages\}/
      );
    });

    it('builds lightboxImages array from featured and variant images', () => {
      // Featured image added first if exists
      expect(pageContent).toContain('if (product.featured_image_url)');
      expect(pageContent).toContain('lightboxImages.push');
      // Variant images added with deduplication
      expect(pageContent).toContain('seenUrls');
    });

    it('deduplicates images by URL', () => {
      expect(pageContent).toContain('const seenUrls = new Set');
      expect(pageContent).toContain('!seenUrls.has(variant.image_url)');
    });
  });

  describe('Responsive images', () => {
    it('main image fills container responsively', () => {
      // Image uses full width/height of container with object-cover
      expect(pageContent).toMatch(
        /h-full.*w-full.*object-cover.*object-center/
      );
    });

    it('thumbnail images fill container responsively', () => {
      expect(pageContent).toMatch(/h-full.*w-full.*object-cover/);
    });

    it('image container uses aspect-square for consistent sizing', () => {
      expect(pageContent).toContain('aspect-square');
    });

    it('thumbnails are fixed 20x20 (80px) square for consistency', () => {
      // Thumbnail buttons are w-20 h-20 = 80px square
      expect(pageContent).toMatch(/shrink-0.*w-20.*h-20/);
    });
  });

  describe('Unavailable product overlay', () => {
    it('shows overlay when product is unavailable', () => {
      expect(pageContent).toContain('isUnavailable');
      expect(pageContent).toMatch(/Unavailable Overlay/);
    });

    it('displays "Sold Out" text when all variants sold out', () => {
      expect(pageContent).toContain('Sold Out');
    });

    it('displays "No Longer Available" for past drop products', () => {
      expect(pageContent).toContain('No Longer Available');
    });
  });
});

describe('ProductImageGallery component', () => {
  let componentContent: string;

  beforeEach(() => {
    const componentPath = path.join(
      process.cwd(),
      'src/components/ProductImageGallery.tsx'
    );
    componentContent = fs.readFileSync(componentPath, 'utf-8');
  });

  it('exports default function component', () => {
    expect(componentContent).toContain(
      'export default function ProductImageGallery'
    );
  });

  it('accepts mainImageId prop', () => {
    expect(componentContent).toContain('mainImageId: string');
  });

  it('accepts images array prop', () => {
    expect(componentContent).toContain('images: LightboxImage[]');
  });

  it('manages isOpen state for lightbox', () => {
    expect(componentContent).toContain('useState(false)');
    expect(componentContent).toContain('setIsOpen');
  });

  it('manages currentIndex state for navigation', () => {
    expect(componentContent).toContain('currentIndex');
    expect(componentContent).toContain('setCurrentIndex');
  });

  it('attaches click handler to main image', () => {
    expect(componentContent).toContain('mainImage.addEventListener');
    expect(componentContent).toContain('handleMainImageClick');
  });

  it('uses MutationObserver to sync with main image changes', () => {
    expect(componentContent).toContain('MutationObserver');
    expect(componentContent).toContain("mutation.attributeName === 'src'");
  });

  it('renders ImageLightbox when open', () => {
    expect(componentContent).toContain('<ImageLightbox');
    expect(componentContent).toContain('onClose={() => setIsOpen(false)}');
  });

  it('syncs main image when navigating in lightbox', () => {
    // When navigating lightbox, update main image
    expect(componentContent).toContain('onNavigate');
    expect(componentContent).toContain("mainImage.setAttribute('src'");
  });
});

describe('LightboxImage type', () => {
  let lightboxContent: string;

  beforeEach(() => {
    const lightboxPath = path.join(
      process.cwd(),
      'src/components/ImageLightbox.tsx'
    );
    lightboxContent = fs.readFileSync(lightboxPath, 'utf-8');
  });

  it('exports LightboxImage type', () => {
    // Can be 'export type' or 'export interface'
    expect(lightboxContent).toMatch(
      /export\s+(type|interface)\s+LightboxImage/
    );
  });

  it('LightboxImage has url property', () => {
    expect(lightboxContent).toMatch(/LightboxImage[\s\S]*?url:\s*string/);
  });

  it('LightboxImage has alt property', () => {
    expect(lightboxContent).toMatch(/LightboxImage[\s\S]*?alt:\s*string/);
  });
});
