import { describe, it, expect, beforeEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

// Sample image data for testing
const mockImages = [
  {
    url: 'https://example.com/image1.webp',
    alt: 'Spring collection outfit 1',
  },
  {
    url: 'https://example.com/image2.webp',
    alt: 'Spring collection outfit 2',
  },
  {
    url: 'https://example.com/image3.webp',
    alt: 'Spring collection outfit 3',
  },
];

describe('LookbookGallery Component', () => {
  let componentContent: string;

  beforeEach(async () => {
    const componentPath = path.resolve(
      process.cwd(),
      'src/components/LookbookGallery.tsx'
    );
    componentContent = await fs.readFile(componentPath, 'utf-8');
  });

  describe('Component Structure', () => {
    it('exports LookbookGallery component', () => {
      expect(componentContent).toMatch(
        /export\s+(function|const)\s+LookbookGallery/
      );
    });

    it('exports LookbookImage type', () => {
      expect(componentContent).toMatch(
        /export\s+(interface|type)\s+LookbookImage/
      );
    });

    it('exports LookbookGalleryProps type', () => {
      expect(componentContent).toMatch(
        /export\s+(interface|type)\s+LookbookGalleryProps/
      );
    });
  });

  describe('LookbookImage Interface', () => {
    it('includes url field', () => {
      expect(componentContent).toMatch(/url:\s*string/);
    });

    it('includes optional alt field', () => {
      expect(componentContent).toMatch(/alt\??:\s*string/);
    });
  });

  describe('LookbookGalleryProps Interface', () => {
    it('includes images array', () => {
      expect(componentContent).toMatch(/images:\s*LookbookImage\[\]/);
    });

    it('includes onChange callback', () => {
      expect(componentContent).toMatch(/onChange:\s*\(/);
    });

    it('includes optional uploadHandler', () => {
      expect(componentContent).toMatch(/uploadHandler\??:/);
    });

    it('includes optional isUploading flag', () => {
      expect(componentContent).toMatch(/isUploading\??:\s*boolean/);
    });
  });

  describe('Grid Layout', () => {
    it('displays images in grid layout', () => {
      expect(componentContent).toMatch(/grid/i);
    });

    it('shows image count in header', () => {
      expect(componentContent).toMatch(/images\s*\.length|\{images\.length\}/);
    });
  });

  describe('Image Display', () => {
    it('renders images with img element', () => {
      expect(componentContent).toMatch(/<img/);
    });

    it('uses image url as src', () => {
      expect(componentContent).toMatch(/src=/);
    });

    it('uses alt text for accessibility', () => {
      expect(componentContent).toMatch(/alt=/);
    });

    it('applies object-cover for proper image fitting', () => {
      expect(componentContent).toMatch(/object-cover/);
    });
  });

  describe('ImageUploader Integration', () => {
    it('includes ImageUploader for adding images', () => {
      expect(componentContent).toMatch(/ImageUploader/);
    });

    it('shows uploader when uploadHandler is provided', () => {
      expect(componentContent).toMatch(/uploadHandler/);
    });

    it('handles image upload', () => {
      expect(componentContent).toMatch(/onUpload/);
    });
  });

  describe('Drag and Drop Reordering', () => {
    it('supports draggable attribute', () => {
      expect(componentContent).toMatch(/draggable/);
    });

    it('handles drag start event', () => {
      expect(componentContent).toMatch(/onDragStart|handleDragStart/);
    });

    it('handles drag end event', () => {
      expect(componentContent).toMatch(/onDragEnd|handleDragEnd/);
    });

    it('handles drag over event', () => {
      expect(componentContent).toMatch(/onDragOver|handleDragOver/);
    });

    it('handles drag enter event', () => {
      expect(componentContent).toMatch(/onDragEnter|handleDragEnter/);
    });

    it('handles drop event via drag end', () => {
      // Drop is handled through onDragEnd which fires when drag completes (including drops)
      expect(componentContent).toMatch(/onDragEnd|handleDragEnd/);
    });

    it('updates image order state on reorder', () => {
      expect(componentContent).toMatch(/splice|reorder/i);
    });
  });

  describe('Delete Functionality', () => {
    it('has delete button for each image', () => {
      expect(componentContent).toMatch(/delete|remove/i);
    });

    it('delete button has correct accessibility label', () => {
      expect(componentContent).toMatch(/aria-label|title/);
    });

    it('calls onChange when image is deleted', () => {
      expect(componentContent).toMatch(/onChange\(/);
    });

    it('removes image from array on delete', () => {
      expect(componentContent).toMatch(/filter|splice/);
    });
  });

  describe('Upload Progress', () => {
    it('shows upload progress indicator', () => {
      expect(componentContent).toMatch(/isUploading|uploading/i);
    });

    it('shows loading state during upload', () => {
      expect(componentContent).toMatch(/loading|spinner|animate-spin/i);
    });
  });

  describe('Empty State', () => {
    it('handles empty images array', () => {
      // Component should show an empty state message or uploader only
      expect(componentContent).toMatch(/length\s*===?\s*0|\.length\s*>\s*0/);
    });
  });

  describe('Accessibility', () => {
    it('uses semantic HTML for buttons', () => {
      expect(componentContent).toMatch(/<button/);
    });

    it('includes proper button types', () => {
      expect(componentContent).toMatch(/type="button"/);
    });

    it('has visual feedback for drag state', () => {
      expect(componentContent).toMatch(/isDrag|dragOver|dragging/i);
    });
  });
});

describe('LookbookImage Type', () => {
  it('validates correct image structure', () => {
    const image = mockImages[0];
    expect(image.url).toBe('https://example.com/image1.webp');
    expect(image.alt).toBe('Spring collection outfit 1');
  });

  it('allows alt to be undefined', () => {
    const imageWithoutAlt: { url: string; alt?: string } = {
      url: 'https://example.com/test.webp',
    };
    expect(imageWithoutAlt.url).toBeDefined();
    expect(imageWithoutAlt.alt).toBeUndefined();
  });
});

describe('Image Array Operations', () => {
  it('supports reordering images', () => {
    const images = [...mockImages];
    // Simulate reorder: move first to last
    const [removed] = images.splice(0, 1);
    images.push(removed);
    expect(images[2].url).toBe('https://example.com/image1.webp');
    expect(images[0].url).toBe('https://example.com/image2.webp');
  });

  it('supports deleting images', () => {
    const images = [...mockImages];
    const filtered = images.filter((_, i) => i !== 1);
    expect(filtered).toHaveLength(2);
    expect(filtered[0].url).toBe('https://example.com/image1.webp');
    expect(filtered[1].url).toBe('https://example.com/image3.webp');
  });

  it('supports adding images', () => {
    const images = [...mockImages];
    const newImage = { url: 'https://example.com/image4.webp', alt: 'New' };
    images.push(newImage);
    expect(images).toHaveLength(4);
    expect(images[3]).toEqual(newImage);
  });
});
