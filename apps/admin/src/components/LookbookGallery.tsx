import { useState, useCallback, useRef } from 'react';
import { ImageUploader } from './ImageUploader';

/**
 * Single image in the lookbook gallery
 */
export interface LookbookImage {
  url: string;
  alt?: string;
}

/**
 * Props for the LookbookGallery component
 */
export interface LookbookGalleryProps {
  /** Array of images in the gallery */
  images: LookbookImage[];
  /** Called when images change (add, remove, reorder) */
  onChange: (images: LookbookImage[]) => void;
  /** Handler function for image upload */
  uploadHandler?: (file: File) => Promise<{ url: string; key: string }>;
  /** Whether an upload is in progress */
  isUploading?: boolean;
}

export function LookbookGallery({
  images,
  onChange,
  uploadHandler,
  isUploading = false,
}: LookbookGalleryProps) {
  // Drag state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const dragCounter = useRef(0);

  // Handle image upload
  const handleImageUpload = useCallback(
    (url: string) => {
      const newImage: LookbookImage = {
        url,
        alt: '',
      };
      onChange([...images, newImage]);
    },
    [images, onChange]
  );

  // Handle image delete
  const handleDeleteImage = useCallback(
    (index: number) => {
      const newImages = images.filter((_, i) => i !== index);
      onChange(newImages);
    },
    [images, onChange]
  );

  // Drag and drop handlers
  const handleDragStart = useCallback((index: number) => {
    setDraggedIndex(index);
  }, []);

  const handleDragEnd = useCallback(() => {
    if (
      draggedIndex !== null &&
      dragOverIndex !== null &&
      draggedIndex !== dragOverIndex
    ) {
      // Reorder the array
      const newImages = [...images];
      const [removed] = newImages.splice(draggedIndex, 1);
      newImages.splice(dragOverIndex, 0, removed);
      onChange(newImages);
    }

    setDraggedIndex(null);
    setDragOverIndex(null);
    dragCounter.current = 0;
  }, [images, draggedIndex, dragOverIndex, onChange]);

  const handleDragEnter = useCallback((index: number) => {
    dragCounter.current++;
    setDragOverIndex(index);
  }, []);

  const handleDragLeave = useCallback(() => {
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setDragOverIndex(null);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault(); // Allow drop
  }, []);

  return (
    <div className="space-y-4">
      {/* Header with image count */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-text-primary">
          Gallery Images ({images.length})
          {images.length > 1 && (
            <span className="font-normal text-text-muted ml-2">
              Drag to reorder
            </span>
          )}
        </h3>
      </div>

      {/* Image Grid */}
      {images.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {images.map((image, index) => (
            <GalleryImage
              key={`${image.url}-${index}`}
              image={image}
              index={index}
              isDragging={draggedIndex === index}
              isDragOver={dragOverIndex === index && draggedIndex !== index}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDelete={() => handleDeleteImage(index)}
            />
          ))}
        </div>
      ) : (
        <div className="bg-background-tertiary/50 rounded-lg border border-border border-dashed p-8 text-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
            className="w-8 h-8 mx-auto text-text-muted mb-2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
            />
          </svg>
          <p className="text-sm text-text-muted">
            No images in this lookbook yet.
          </p>
          <p className="text-xs text-text-muted mt-1">
            Add images to create your gallery.
          </p>
        </div>
      )}

      {/* Upload Section */}
      {uploadHandler && (
        <div className="pt-4 border-t border-border">
          <p className="text-sm font-medium text-text-primary mb-3">
            Add Image
          </p>
          {isUploading ? (
            <div className="flex items-center justify-center py-8 border-2 border-dashed border-border rounded-lg">
              <div className="flex flex-col items-center">
                <svg
                  className="animate-spin h-8 w-8 text-primary mb-3"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <p className="text-sm text-text-secondary">Uploading...</p>
              </div>
            </div>
          ) : (
            <ImageUploader
              value={null}
              onUpload={handleImageUpload}
              uploadHandler={uploadHandler}
              isUploading={isUploading}
            />
          )}
        </div>
      )}
    </div>
  );
}

interface GalleryImageProps {
  image: LookbookImage;
  index: number;
  isDragging: boolean;
  isDragOver: boolean;
  onDragStart: (index: number) => void;
  onDragEnd: () => void;
  onDragEnter: (index: number) => void;
  onDragLeave: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDelete: () => void;
}

function GalleryImage({
  image,
  index,
  isDragging,
  isDragOver,
  onDragStart,
  onDragEnd,
  onDragEnter,
  onDragLeave,
  onDragOver,
  onDelete,
}: GalleryImageProps) {
  return (
    <div
      draggable
      onDragStart={() => onDragStart(index)}
      onDragEnd={onDragEnd}
      onDragEnter={() => onDragEnter(index)}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      className={`relative group aspect-square rounded-lg overflow-hidden border transition-all cursor-grab active:cursor-grabbing ${
        isDragging
          ? 'opacity-50 border-primary-500 ring-2 ring-primary-500'
          : isDragOver
            ? 'border-primary-500 ring-2 ring-primary-500/50'
            : 'border-border hover:border-primary-300'
      }`}
    >
      {/* Image */}
      <img
        src={image.url}
        alt={image.alt || `Gallery image ${index + 1}`}
        className="w-full h-full object-cover"
      />

      {/* Overlay with delete button */}
      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="p-2 bg-status-error text-white rounded-lg hover:bg-status-error/80 transition-colors"
          aria-label={`Remove image ${index + 1}`}
          title={`Remove image ${index + 1}`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
            className="w-5 h-5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
            />
          </svg>
        </button>
      </div>

      {/* Position indicator */}
      <div className="absolute top-2 left-2 w-6 h-6 rounded-full bg-black/50 flex items-center justify-center">
        <span className="text-xs font-medium text-white">{index + 1}</span>
      </div>

      {/* Drag handle indicator */}
      <div className="absolute top-2 right-2 p-1 rounded bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="1.5"
          stroke="currentColor"
          className="w-4 h-4"
          aria-label="Drag to reorder"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
          />
        </svg>
      </div>
    </div>
  );
}
