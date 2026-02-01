import { useState, useEffect, useCallback, useRef } from 'react';

export interface LightboxImage {
  url: string;
  alt: string;
}

interface ImageLightboxProps {
  /** Array of images to display in the lightbox */
  images: LightboxImage[];
  /** Index of the currently selected image (0-based) */
  currentIndex: number;
  /** Callback when lightbox should close */
  onClose: () => void;
  /** Callback when navigating to a different image */
  onNavigate?: (newIndex: number) => void;
}

/**
 * ImageLightbox - Full-screen image viewer with navigation
 *
 * Features:
 * - Displays images in a full-screen overlay
 * - Navigation via arrow buttons or keyboard (Left/Right arrows)
 * - Close via Escape key or clicking backdrop
 * - Touch/swipe support for mobile
 */
export default function ImageLightbox({
  images,
  currentIndex,
  onClose,
  onNavigate,
}: ImageLightboxProps) {
  const [activeIndex, setActiveIndex] = useState(currentIndex);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  const hasMultipleImages = images.length > 1;
  const currentImage = images[activeIndex];

  // Navigate to previous image
  const goToPrevious = useCallback(() => {
    const newIndex = activeIndex === 0 ? images.length - 1 : activeIndex - 1;
    setActiveIndex(newIndex);
    onNavigate?.(newIndex);
  }, [activeIndex, images.length, onNavigate]);

  // Navigate to next image
  const goToNext = useCallback(() => {
    const newIndex = activeIndex === images.length - 1 ? 0 : activeIndex + 1;
    setActiveIndex(newIndex);
    onNavigate?.(newIndex);
  }, [activeIndex, images.length, onNavigate]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
        case 'ArrowLeft':
          if (hasMultipleImages) {
            e.preventDefault();
            goToPrevious();
          }
          break;
        case 'ArrowRight':
          if (hasMultipleImages) {
            e.preventDefault();
            goToNext();
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, goToPrevious, goToNext, hasMultipleImages]);

  // Prevent body scroll when lightbox is open
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  // Sync with external currentIndex changes
  useEffect(() => {
    setActiveIndex(currentIndex);
  }, [currentIndex]);

  // Handle backdrop click to close
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === backdropRef.current) {
      onClose();
    }
  };

  // Touch handlers for swipe navigation
  const minSwipeDistance = 50;

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (hasMultipleImages) {
      if (isLeftSwipe) {
        goToNext();
      } else if (isRightSwipe) {
        goToPrevious();
      }
    }
  };

  return (
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/click-events-have-key-events
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background-inverse/90 backdrop-blur-sm"
      onClick={handleBackdropClick}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      role="dialog"
      aria-modal="true"
      aria-label="Image lightbox"
    >
      {/* Close button */}
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 z-10 p-2 rounded-full bg-background/80 hover:bg-background text-text transition-colors duration-normal focus:outline-none focus:ring-2 focus:ring-primary"
        aria-label="Close lightbox"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>

      {/* Previous button */}
      {hasMultipleImages && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            goToPrevious();
          }}
          className="absolute left-4 z-10 p-3 rounded-full bg-background/80 hover:bg-background text-text transition-colors duration-normal focus:outline-none focus:ring-2 focus:ring-primary"
          aria-label="Previous image"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 19.5L8.25 12l7.5-7.5"
            />
          </svg>
        </button>
      )}

      {/* Image container */}
      <div className="relative max-w-[90vw] max-h-[90vh] flex items-center justify-center">
        {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/click-events-have-key-events */}
        <img
          src={currentImage.url}
          alt={currentImage.alt}
          className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-lg"
          onClick={(e) => e.stopPropagation()}
        />
      </div>

      {/* Next button */}
      {hasMultipleImages && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            goToNext();
          }}
          className="absolute right-4 z-10 p-3 rounded-full bg-background/80 hover:bg-background text-text transition-colors duration-normal focus:outline-none focus:ring-2 focus:ring-primary"
          aria-label="Next image"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8.25 4.5l7.5 7.5-7.5 7.5"
            />
          </svg>
        </button>
      )}

      {/* Image counter */}
      {hasMultipleImages && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-background/80 text-text text-sm font-medium">
          {activeIndex + 1} / {images.length}
        </div>
      )}
    </div>
  );
}
