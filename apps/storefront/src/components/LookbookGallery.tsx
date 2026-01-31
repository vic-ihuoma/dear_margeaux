import { useState, useEffect, useRef, useCallback } from 'react';
import ImageLightbox, { type LightboxImage } from './ImageLightbox';

interface LookbookGalleryProps {
  /** Array of images to display in the gallery */
  images: LightboxImage[];
  /** Title of the lookbook (used for alt text context) - passed for future use */
  title: string;
}

/**
 * LookbookGallery - Interactive image gallery with lightbox support
 *
 * Features:
 * - Grid layout with every third image spanning full width
 * - Click to open full-screen lightbox
 * - Keyboard navigation in lightbox (Arrow Left/Right, Escape)
 * - Touch/swipe support for mobile navigation
 * - Lazy loading with IntersectionObserver for optimal performance
 * - Skeleton placeholders while images load
 */
export default function LookbookGallery({ images }: LookbookGalleryProps) {
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loadedImages, setLoadedImages] = useState<Set<number>>(new Set());
  const [visibleImages, setVisibleImages] = useState<Set<number>>(new Set());
  const imageRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Setup IntersectionObserver for lazy loading
  useEffect(() => {
    if (images.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = imageRefs.current.findIndex(
              (ref) => ref === entry.target
            );
            if (index !== -1) {
              setVisibleImages((prev) => new Set(prev).add(index));
              // Mark as loaded on the element for testing
              entry.target.setAttribute('data-loaded', 'true');
            }
          }
        });
      },
      {
        rootMargin: '100px', // Start loading 100px before entering viewport
        threshold: 0,
      }
    );

    // Observe all image containers
    imageRefs.current.forEach((ref) => {
      if (ref) {
        observer.observe(ref);
      }
    });

    return () => {
      observer.disconnect();
    };
  }, [images.length]);

  // Handle image load event
  const handleImageLoad = useCallback((index: number) => {
    setLoadedImages((prev) => new Set(prev).add(index));
  }, []);

  // Don't render anything if no images
  if (images.length === 0) {
    return null;
  }

  const openLightbox = (index: number) => {
    setCurrentIndex(index);
    setIsLightboxOpen(true);
  };

  const closeLightbox = () => {
    setIsLightboxOpen(false);
  };

  const handleNavigate = (newIndex: number) => {
    setCurrentIndex(newIndex);
  };

  return (
    <>
      <section className="py-8 md:py-12 bg-secondary">
        <div className="container mx-auto px-4 max-w-6xl">
          <h2 className="text-2xl font-bold text-text text-center mb-8">
            Gallery
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {images.map((image, index) => (
              <div
                key={image.url}
                ref={(el) => {
                  imageRefs.current[index] = el;
                }}
                className={`overflow-hidden rounded-xl ${
                  (index + 1) % 3 === 0 ? 'md:col-span-2' : ''
                }`}
              >
                <button
                  type="button"
                  onClick={() => openLightbox(index)}
                  className="w-full cursor-zoom-in focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-xl"
                  aria-label={`View ${image.alt} in lightbox`}
                >
                  <div
                    className={`overflow-hidden relative ${
                      (index + 1) % 3 === 0 ? 'aspect-[21/9]' : 'aspect-[4/5]'
                    }`}
                  >
                    {/* Skeleton placeholder - shown while image is loading */}
                    <div
                      className={`absolute inset-0 bg-background-tertiary animate-pulse transition-opacity duration-300 ${
                        loadedImages.has(index) ? 'opacity-0' : 'opacity-100'
                      }`}
                      aria-hidden="true"
                    />
                    {/* Image - only render src when visible for true lazy loading */}
                    <img
                      src={
                        visibleImages.has(index) || loadedImages.has(index)
                          ? image.url
                          : undefined
                      }
                      data-src={image.url}
                      alt={image.alt}
                      className={`w-full h-full object-cover hover:scale-105 transition-transform duration-500 ${
                        loadedImages.has(index) ? 'opacity-100' : 'opacity-0'
                      }`}
                      loading="lazy"
                      onLoad={() => handleImageLoad(index)}
                    />
                  </div>
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {isLightboxOpen && (
        <ImageLightbox
          images={images}
          currentIndex={currentIndex}
          onClose={closeLightbox}
          onNavigate={handleNavigate}
        />
      )}
    </>
  );
}
