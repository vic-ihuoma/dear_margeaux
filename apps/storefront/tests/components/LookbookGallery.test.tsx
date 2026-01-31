import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import LookbookGallery from '../../src/components/LookbookGallery';

const mockImages = [
  {
    url: 'https://r2.example.com/lookbook-1.webp',
    alt: 'Spring Collection - Image 1',
  },
  {
    url: 'https://r2.example.com/lookbook-2.webp',
    alt: 'Spring Collection - Image 2',
  },
  {
    url: 'https://r2.example.com/lookbook-3.webp',
    alt: 'Spring Collection - Image 3',
  },
  {
    url: 'https://r2.example.com/lookbook-4.webp',
    alt: 'Spring Collection - Image 4',
  },
];

const singleImage = [
  { url: 'https://r2.example.com/single.webp', alt: 'Single lookbook image' },
];

describe('LookbookGallery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('rendering', () => {
    it('renders all images in a grid', () => {
      render(<LookbookGallery images={mockImages} title="Spring Collection" />);

      mockImages.forEach((image) => {
        const img = screen.getByAltText(image.alt);
        expect(img).toBeInTheDocument();
        expect(img).toHaveAttribute('src', image.url);
      });
    });

    it('applies full-width class to every third image', () => {
      render(<LookbookGallery images={mockImages} title="Spring Collection" />);

      // The third image (index 2) should have md:col-span-2
      const images = screen.getAllByRole('button');
      // Third image wrapper should span full width
      expect(images[2].parentElement).toHaveClass('md:col-span-2');
    });

    it('renders images as clickable buttons', () => {
      render(<LookbookGallery images={mockImages} title="Spring Collection" />);

      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(mockImages.length);
    });

    it('includes cursor-zoom-in on image buttons', () => {
      render(<LookbookGallery images={mockImages} title="Spring Collection" />);

      const buttons = screen.getAllByRole('button');
      buttons.forEach((button) => {
        expect(button).toHaveClass('cursor-zoom-in');
      });
    });

    it('shows gallery title', () => {
      render(<LookbookGallery images={mockImages} title="Spring Collection" />);

      expect(
        screen.getByRole('heading', { name: 'Gallery' })
      ).toBeInTheDocument();
    });
  });

  describe('lightbox opening', () => {
    it('opens lightbox when clicking an image', () => {
      render(<LookbookGallery images={mockImages} title="Spring Collection" />);

      const firstButton = screen.getAllByRole('button')[0];
      fireEvent.click(firstButton);

      // Lightbox should be open - check for dialog role
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('opens lightbox at the clicked image index', () => {
      render(<LookbookGallery images={mockImages} title="Spring Collection" />);

      // Click the second image
      const secondButton = screen.getAllByRole('button')[1];
      fireEvent.click(secondButton);

      // Lightbox should show counter "2 / 4"
      expect(screen.getByText('2 / 4')).toBeInTheDocument();
    });

    it('opens lightbox showing the clicked image', () => {
      render(<LookbookGallery images={mockImages} title="Spring Collection" />);

      // Click the third image
      const thirdButton = screen.getAllByRole('button')[2];
      fireEvent.click(thirdButton);

      // Should display the full-size image in lightbox
      const lightboxImage = screen.getByRole('dialog').querySelector('img');
      expect(lightboxImage).toHaveAttribute('src', mockImages[2].url);
    });
  });

  describe('lightbox navigation', () => {
    it('allows navigation between images using arrow keys', () => {
      render(<LookbookGallery images={mockImages} title="Spring Collection" />);

      // Open lightbox on first image
      const firstButton = screen.getAllByRole('button')[0];
      fireEvent.click(firstButton);

      // Should show "1 / 4"
      expect(screen.getByText('1 / 4')).toBeInTheDocument();

      // Navigate to next with ArrowRight
      fireEvent.keyDown(document, { key: 'ArrowRight' });

      // Should now show "2 / 4"
      expect(screen.getByText('2 / 4')).toBeInTheDocument();
    });

    it('allows navigation using Previous/Next buttons', () => {
      render(<LookbookGallery images={mockImages} title="Spring Collection" />);

      // Open lightbox on first image
      const firstButton = screen.getAllByRole('button')[0];
      fireEvent.click(firstButton);

      // Click next button
      const nextButton = screen.getByLabelText('Next image');
      fireEvent.click(nextButton);

      expect(screen.getByText('2 / 4')).toBeInTheDocument();

      // Click previous button
      const prevButton = screen.getByLabelText('Previous image');
      fireEvent.click(prevButton);

      expect(screen.getByText('1 / 4')).toBeInTheDocument();
    });

    it('wraps navigation at boundaries', () => {
      render(<LookbookGallery images={mockImages} title="Spring Collection" />);

      // Open lightbox on first image
      const firstButton = screen.getAllByRole('button')[0];
      fireEvent.click(firstButton);

      // Navigate left from first image should wrap to last
      fireEvent.keyDown(document, { key: 'ArrowLeft' });

      expect(screen.getByText('4 / 4')).toBeInTheDocument();
    });
  });

  describe('lightbox closing', () => {
    it('closes lightbox on Escape key', () => {
      render(<LookbookGallery images={mockImages} title="Spring Collection" />);

      // Open lightbox
      const firstButton = screen.getAllByRole('button')[0];
      fireEvent.click(firstButton);

      expect(screen.getByRole('dialog')).toBeInTheDocument();

      // Press Escape
      fireEvent.keyDown(document, { key: 'Escape' });

      // Dialog should be closed
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('closes lightbox on close button click', () => {
      render(<LookbookGallery images={mockImages} title="Spring Collection" />);

      // Open lightbox
      const firstButton = screen.getAllByRole('button')[0];
      fireEvent.click(firstButton);

      // Click close button
      const closeButton = screen.getByLabelText('Close lightbox');
      fireEvent.click(closeButton);

      // Dialog should be closed
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('closes lightbox on backdrop click', () => {
      render(<LookbookGallery images={mockImages} title="Spring Collection" />);

      // Open lightbox
      const firstButton = screen.getAllByRole('button')[0];
      fireEvent.click(firstButton);

      // Click on backdrop
      const backdrop = screen.getByRole('dialog');
      fireEvent.click(backdrop);

      // Dialog should be closed
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('touch/swipe support', () => {
    it('supports swipe navigation in lightbox', () => {
      render(<LookbookGallery images={mockImages} title="Spring Collection" />);

      // Open lightbox
      const firstButton = screen.getAllByRole('button')[0];
      fireEvent.click(firstButton);

      const dialog = screen.getByRole('dialog');

      // Simulate left swipe (next image)
      fireEvent.touchStart(dialog, {
        targetTouches: [{ clientX: 300 }],
      });
      fireEvent.touchMove(dialog, {
        targetTouches: [{ clientX: 100 }],
      });
      fireEvent.touchEnd(dialog);

      expect(screen.getByText('2 / 4')).toBeInTheDocument();
    });
  });

  describe('single image handling', () => {
    it('renders single image without navigation UI', () => {
      render(<LookbookGallery images={singleImage} title="Single Shot" />);

      // Open lightbox
      const button = screen.getByRole('button');
      fireEvent.click(button);

      // Should have dialog
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      // Should NOT have navigation arrows
      expect(screen.queryByLabelText('Next image')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('Previous image')).not.toBeInTheDocument();

      // Should NOT have counter
      expect(screen.queryByText(/\d+ \/ \d+/)).not.toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('image buttons have accessible names', () => {
      render(<LookbookGallery images={mockImages} title="Spring Collection" />);

      const buttons = screen.getAllByRole('button');
      buttons.forEach((button, index) => {
        expect(button).toHaveAttribute(
          'aria-label',
          `View ${mockImages[index].alt} in lightbox`
        );
      });
    });

    it('images have correct alt text', () => {
      render(<LookbookGallery images={mockImages} title="Spring Collection" />);

      mockImages.forEach((image) => {
        expect(screen.getByAltText(image.alt)).toBeInTheDocument();
      });
    });
  });

  describe('empty state', () => {
    it('renders nothing when images array is empty', () => {
      const { container } = render(
        <LookbookGallery images={[]} title="Empty Gallery" />
      );

      // Should not render any gallery content
      expect(container.querySelector('section')).not.toBeInTheDocument();
    });
  });

  describe('lazy loading', () => {
    it('images have loading=lazy attribute', () => {
      render(<LookbookGallery images={mockImages} title="Spring Collection" />);

      const images = screen.getAllByRole('img');
      images.forEach((img) => {
        expect(img).toHaveAttribute('loading', 'lazy');
      });
    });

    it('shows skeleton placeholder for images before they load', () => {
      render(<LookbookGallery images={mockImages} title="Spring Collection" />);

      // Each image container should have a skeleton element
      const skeletons = document.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('hides skeleton when image loads', () => {
      render(<LookbookGallery images={mockImages} title="Spring Collection" />);

      // Get first image and simulate load event
      const firstImage = screen.getAllByRole('img')[0];
      fireEvent.load(firstImage);

      // Skeleton for loaded image should be hidden (opacity-0)
      const imageContainer = firstImage.closest('.relative');
      const skeleton = imageContainer?.querySelector('.animate-pulse');
      expect(skeleton).toHaveClass('opacity-0');
    });

    it('images are observed by IntersectionObserver', () => {
      render(<LookbookGallery images={mockImages} title="Spring Collection" />);

      // With the mock IntersectionObserver, images are immediately "visible"
      // so they should have src attributes set
      const images = screen.getAllByRole('img');
      images.forEach((img, index) => {
        expect(img).toHaveAttribute('src', mockImages[index].url);
      });
    });

    it('image containers have data-loaded attribute when observed', () => {
      render(<LookbookGallery images={mockImages} title="Spring Collection" />);

      // The mock IntersectionObserver calls observe which sets data-loaded
      const containers = document.querySelectorAll('[data-loaded]');
      expect(containers.length).toBe(mockImages.length);
    });

    it('skeleton has correct aspect ratio matching image container', () => {
      render(<LookbookGallery images={mockImages} title="Spring Collection" />);

      // Find skeleton elements
      const skeletons = document.querySelectorAll('.animate-pulse');

      // Verify skeletons exist within aspect ratio containers
      skeletons.forEach((skeleton) => {
        const aspectContainer = skeleton.closest('[class*="aspect-"]');
        expect(aspectContainer).toBeInTheDocument();
      });
    });

    it('images have data-src attribute for fallback', () => {
      render(<LookbookGallery images={mockImages} title="Spring Collection" />);

      const images = screen.getAllByRole('img');
      images.forEach((img, index) => {
        expect(img).toHaveAttribute('data-src', mockImages[index].url);
      });
    });
  });
});
