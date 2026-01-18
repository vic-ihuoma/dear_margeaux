import { useState, useEffect } from 'react';
import ImageLightbox, { type LightboxImage } from './ImageLightbox';

interface ProductImageGalleryProps {
  /** Main image container ID to attach click handler */
  mainImageId: string;
  /** Array of all product images */
  images: LightboxImage[];
  /** CSS selector for thumbnail buttons (optional) */
  thumbnailSelector?: string;
}

/**
 * ProductImageGallery - Manages lightbox state for product images
 *
 * This component attaches click handlers to the main image and thumbnails
 * to open a lightbox view. It works with the existing Astro page structure.
 */
export default function ProductImageGallery({
  mainImageId,
  images,
  thumbnailSelector = '[data-variant-id]',
}: ProductImageGalleryProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    // Find the main image element
    const mainImage = document.getElementById(mainImageId);
    if (!mainImage) return;

    // Click handler for main image
    const handleMainImageClick = () => {
      // Find current image index based on main image src
      const currentSrc = mainImage.getAttribute('src');
      const index = images.findIndex((img) => img.url === currentSrc);
      setCurrentIndex(index >= 0 ? index : 0);
      setIsOpen(true);
    };

    // Make main image clickable
    mainImage.style.cursor = 'zoom-in';
    mainImage.addEventListener('click', handleMainImageClick);

    // Attach click handlers to thumbnails
    const thumbnails = document.querySelectorAll(thumbnailSelector);
    const thumbnailClickHandlers: Array<{
      el: Element;
      handler: () => void;
    }> = [];

    thumbnails.forEach((thumb, index) => {
      const handler = () => {
        // Update current index and open lightbox
        setCurrentIndex(index);
        setIsOpen(true);
      };

      // We want to open lightbox on double-click or if user holds click
      // Single click changes the main image (existing behavior)
      // For now, we'll add a small zoom icon that users can click

      thumbnailClickHandlers.push({ el: thumb, handler });
    });

    return () => {
      mainImage.removeEventListener('click', handleMainImageClick);
      thumbnailClickHandlers.forEach(({ el, handler }) => {
        el.removeEventListener('click', handler);
      });
    };
  }, [mainImageId, images, thumbnailSelector]);

  // Sync lightbox with main image changes (when user clicks thumbnails)
  useEffect(() => {
    const mainImage = document.getElementById(mainImageId);
    if (!mainImage) return;

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (
          mutation.type === 'attributes' &&
          mutation.attributeName === 'src'
        ) {
          const currentSrc = mainImage.getAttribute('src');
          const index = images.findIndex((img) => img.url === currentSrc);
          if (index >= 0) {
            setCurrentIndex(index);
          }
        }
      });
    });

    observer.observe(mainImage, { attributes: true });

    return () => observer.disconnect();
  }, [mainImageId, images]);

  if (!isOpen || images.length === 0) {
    return null;
  }

  return (
    <ImageLightbox
      images={images}
      currentIndex={currentIndex}
      onClose={() => setIsOpen(false)}
      onNavigate={(newIndex) => {
        setCurrentIndex(newIndex);
        // Optionally sync main image with lightbox navigation
        const mainImage = document.getElementById(mainImageId);
        if (mainImage && images[newIndex]) {
          mainImage.setAttribute('src', images[newIndex].url);
          mainImage.setAttribute('alt', images[newIndex].alt);
        }
      }}
    />
  );
}
