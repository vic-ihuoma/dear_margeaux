import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ImageLightbox, {
  type LightboxImage,
} from '../../src/components/ImageLightbox';

const mockImages: LightboxImage[] = [
  { url: 'https://example.com/image1.jpg', alt: 'Product image 1' },
  { url: 'https://example.com/image2.jpg', alt: 'Product image 2' },
  { url: 'https://example.com/image3.jpg', alt: 'Product image 3' },
];

const singleImage: LightboxImage[] = [
  { url: 'https://example.com/single.jpg', alt: 'Single product image' },
];

describe('ImageLightbox', () => {
  const onClose = vi.fn();
  const onNavigate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('opening and displaying', () => {
    it('displays the current image', () => {
      render(
        <ImageLightbox images={mockImages} currentIndex={0} onClose={onClose} />
      );

      const image = screen.getByAltText('Product image 1');
      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute('src', 'https://example.com/image1.jpg');
    });

    it('displays full-size image with object-contain', () => {
      render(
        <ImageLightbox images={mockImages} currentIndex={0} onClose={onClose} />
      );

      const image = screen.getByAltText('Product image 1');
      expect(image).toHaveClass('object-contain');
    });

    it('displays image at specified index', () => {
      render(
        <ImageLightbox images={mockImages} currentIndex={1} onClose={onClose} />
      );

      const image = screen.getByAltText('Product image 2');
      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute('src', 'https://example.com/image2.jpg');
    });
  });

  describe('closing', () => {
    it('closes on Escape key press', () => {
      render(
        <ImageLightbox images={mockImages} currentIndex={0} onClose={onClose} />
      );

      fireEvent.keyDown(document, { key: 'Escape' });
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('closes on backdrop click', () => {
      render(
        <ImageLightbox images={mockImages} currentIndex={0} onClose={onClose} />
      );

      // Click on the backdrop (the dialog element itself)
      const backdrop = screen.getByRole('dialog');
      fireEvent.click(backdrop);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('closes via close button click', () => {
      render(
        <ImageLightbox images={mockImages} currentIndex={0} onClose={onClose} />
      );

      const closeButton = screen.getByLabelText('Close lightbox');
      fireEvent.click(closeButton);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('does not close when clicking on the image', () => {
      render(
        <ImageLightbox images={mockImages} currentIndex={0} onClose={onClose} />
      );

      const image = screen.getByAltText('Product image 1');
      fireEvent.click(image);
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('keyboard navigation', () => {
    it('navigates to next image with ArrowRight key', () => {
      render(
        <ImageLightbox
          images={mockImages}
          currentIndex={0}
          onClose={onClose}
          onNavigate={onNavigate}
        />
      );

      // Initially showing image 1
      expect(screen.getByAltText('Product image 1')).toBeInTheDocument();

      // Press ArrowRight
      fireEvent.keyDown(document, { key: 'ArrowRight' });

      // Should now show image 2
      expect(screen.getByAltText('Product image 2')).toBeInTheDocument();
      expect(onNavigate).toHaveBeenCalledWith(1);
    });

    it('navigates to previous image with ArrowLeft key', () => {
      render(
        <ImageLightbox
          images={mockImages}
          currentIndex={1}
          onClose={onClose}
          onNavigate={onNavigate}
        />
      );

      // Initially showing image 2
      expect(screen.getByAltText('Product image 2')).toBeInTheDocument();

      // Press ArrowLeft
      fireEvent.keyDown(document, { key: 'ArrowLeft' });

      // Should now show image 1
      expect(screen.getByAltText('Product image 1')).toBeInTheDocument();
      expect(onNavigate).toHaveBeenCalledWith(0);
    });

    it('wraps to last image when pressing ArrowLeft on first image', () => {
      render(
        <ImageLightbox
          images={mockImages}
          currentIndex={0}
          onClose={onClose}
          onNavigate={onNavigate}
        />
      );

      fireEvent.keyDown(document, { key: 'ArrowLeft' });

      // Should wrap to last image (index 2)
      expect(screen.getByAltText('Product image 3')).toBeInTheDocument();
      expect(onNavigate).toHaveBeenCalledWith(2);
    });

    it('wraps to first image when pressing ArrowRight on last image', () => {
      render(
        <ImageLightbox
          images={mockImages}
          currentIndex={2}
          onClose={onClose}
          onNavigate={onNavigate}
        />
      );

      fireEvent.keyDown(document, { key: 'ArrowRight' });

      // Should wrap to first image (index 0)
      expect(screen.getByAltText('Product image 1')).toBeInTheDocument();
      expect(onNavigate).toHaveBeenCalledWith(0);
    });
  });

  describe('button navigation', () => {
    it('navigates to next image with Next button', () => {
      render(
        <ImageLightbox
          images={mockImages}
          currentIndex={0}
          onClose={onClose}
          onNavigate={onNavigate}
        />
      );

      const nextButton = screen.getByLabelText('Next image');
      fireEvent.click(nextButton);

      expect(screen.getByAltText('Product image 2')).toBeInTheDocument();
      expect(onNavigate).toHaveBeenCalledWith(1);
    });

    it('navigates to previous image with Previous button', () => {
      render(
        <ImageLightbox
          images={mockImages}
          currentIndex={1}
          onClose={onClose}
          onNavigate={onNavigate}
        />
      );

      const prevButton = screen.getByLabelText('Previous image');
      fireEvent.click(prevButton);

      expect(screen.getByAltText('Product image 1')).toBeInTheDocument();
      expect(onNavigate).toHaveBeenCalledWith(0);
    });
  });

  describe('single image handling', () => {
    it('does not show navigation arrows for single image', () => {
      render(
        <ImageLightbox
          images={singleImage}
          currentIndex={0}
          onClose={onClose}
        />
      );

      expect(screen.queryByLabelText('Next image')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('Previous image')).not.toBeInTheDocument();
    });

    it('does not show image counter for single image', () => {
      render(
        <ImageLightbox
          images={singleImage}
          currentIndex={0}
          onClose={onClose}
        />
      );

      // Counter format is "1 / 3" - should not exist
      expect(screen.queryByText(/\d+ \/ \d+/)).not.toBeInTheDocument();
    });

    it('does not navigate on arrow keys with single image', () => {
      render(
        <ImageLightbox
          images={singleImage}
          currentIndex={0}
          onClose={onClose}
          onNavigate={onNavigate}
        />
      );

      fireEvent.keyDown(document, { key: 'ArrowRight' });
      fireEvent.keyDown(document, { key: 'ArrowLeft' });

      // onNavigate should not be called
      expect(onNavigate).not.toHaveBeenCalled();
      // Image should still be the same
      expect(screen.getByAltText('Single product image')).toBeInTheDocument();
    });
  });

  describe('image counter', () => {
    it('shows correct image counter for multiple images', () => {
      render(
        <ImageLightbox images={mockImages} currentIndex={0} onClose={onClose} />
      );

      expect(screen.getByText('1 / 3')).toBeInTheDocument();
    });

    it('updates counter when navigating', () => {
      render(
        <ImageLightbox images={mockImages} currentIndex={0} onClose={onClose} />
      );

      expect(screen.getByText('1 / 3')).toBeInTheDocument();

      fireEvent.keyDown(document, { key: 'ArrowRight' });
      expect(screen.getByText('2 / 3')).toBeInTheDocument();

      fireEvent.keyDown(document, { key: 'ArrowRight' });
      expect(screen.getByText('3 / 3')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('has role="dialog" and aria-modal="true"', () => {
      render(
        <ImageLightbox images={mockImages} currentIndex={0} onClose={onClose} />
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-label', 'Image lightbox');
    });

    it('has accessible button labels', () => {
      render(
        <ImageLightbox images={mockImages} currentIndex={0} onClose={onClose} />
      );

      expect(screen.getByLabelText('Close lightbox')).toBeInTheDocument();
      expect(screen.getByLabelText('Next image')).toBeInTheDocument();
      expect(screen.getByLabelText('Previous image')).toBeInTheDocument();
    });
  });

  describe('body scroll lock', () => {
    it('prevents body scroll when open', () => {
      const originalOverflow = document.body.style.overflow;

      const { unmount } = render(
        <ImageLightbox images={mockImages} currentIndex={0} onClose={onClose} />
      );

      expect(document.body.style.overflow).toBe('hidden');

      unmount();

      // Should restore original overflow
      expect(document.body.style.overflow).toBe(originalOverflow);
    });
  });

  describe('touch swipe navigation', () => {
    it('navigates to next image on left swipe', () => {
      render(
        <ImageLightbox
          images={mockImages}
          currentIndex={0}
          onClose={onClose}
          onNavigate={onNavigate}
        />
      );

      const dialog = screen.getByRole('dialog');

      // Simulate a left swipe (start right, end left)
      fireEvent.touchStart(dialog, {
        targetTouches: [{ clientX: 300 }],
      });
      fireEvent.touchMove(dialog, {
        targetTouches: [{ clientX: 100 }],
      });
      fireEvent.touchEnd(dialog);

      expect(screen.getByAltText('Product image 2')).toBeInTheDocument();
      expect(onNavigate).toHaveBeenCalledWith(1);
    });

    it('navigates to previous image on right swipe', () => {
      render(
        <ImageLightbox
          images={mockImages}
          currentIndex={1}
          onClose={onClose}
          onNavigate={onNavigate}
        />
      );

      const dialog = screen.getByRole('dialog');

      // Simulate a right swipe (start left, end right)
      fireEvent.touchStart(dialog, {
        targetTouches: [{ clientX: 100 }],
      });
      fireEvent.touchMove(dialog, {
        targetTouches: [{ clientX: 300 }],
      });
      fireEvent.touchEnd(dialog);

      expect(screen.getByAltText('Product image 1')).toBeInTheDocument();
      expect(onNavigate).toHaveBeenCalledWith(0);
    });

    it('does not navigate on small swipe distance', () => {
      render(
        <ImageLightbox
          images={mockImages}
          currentIndex={0}
          onClose={onClose}
          onNavigate={onNavigate}
        />
      );

      const dialog = screen.getByRole('dialog');

      // Simulate a small swipe (less than 50px)
      fireEvent.touchStart(dialog, {
        targetTouches: [{ clientX: 200 }],
      });
      fireEvent.touchMove(dialog, {
        targetTouches: [{ clientX: 180 }],
      });
      fireEvent.touchEnd(dialog);

      // Should still show the first image
      expect(screen.getByAltText('Product image 1')).toBeInTheDocument();
      expect(onNavigate).not.toHaveBeenCalled();
    });
  });

  describe('currentIndex sync', () => {
    it('updates when currentIndex prop changes', () => {
      const { rerender } = render(
        <ImageLightbox images={mockImages} currentIndex={0} onClose={onClose} />
      );

      expect(screen.getByAltText('Product image 1')).toBeInTheDocument();

      rerender(
        <ImageLightbox images={mockImages} currentIndex={2} onClose={onClose} />
      );

      expect(screen.getByAltText('Product image 3')).toBeInTheDocument();
    });
  });
});
