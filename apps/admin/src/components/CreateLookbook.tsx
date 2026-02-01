import { useState, useCallback } from 'react';
import { LookbookForm, type LookbookFormData } from './LookbookForm';
import { LookbookGallery, type LookbookImage } from './LookbookGallery';
import type { Drop } from '@dear-margeaux/api';

interface CreateLookbookProps {
  drops: Drop[];
}

/**
 * Upload an image file to R2 storage
 */
async function uploadImageToR2(
  file: File
): Promise<{ url: string; key: string }> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('/api/images/upload', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to upload image');
  }

  return response.json();
}

export function CreateLookbook({ drops }: CreateLookbookProps) {
  const [images, setImages] = useState<LookbookImage[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleSubmit = useCallback(
    async (data: LookbookFormData) => {
      setIsSubmitting(true);
      setError(null);

      try {
        const response = await fetch('/api/lookbook', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...data,
            images: images.map((img) => img.url),
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to create lookbook');
        }

        const newLookbook = await response.json();
        // Redirect to edit page
        window.location.href = `/lookbook/${newLookbook.slug}`;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to create lookbook'
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [images]
  );

  const handleCancel = useCallback(() => {
    window.location.href = '/lookbook';
  }, []);

  const handleImageUpload = useCallback(async (file: File) => {
    setIsUploading(true);
    try {
      const result = await uploadImageToR2(file);
      return result;
    } finally {
      setIsUploading(false);
    }
  }, []);

  const handleImagesChange = useCallback((newImages: LookbookImage[]) => {
    setImages(newImages);
  }, []);

  return (
    <div className="space-y-8">
      {/* Lookbook Details Section */}
      <div className="bg-background-secondary rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border bg-background-tertiary">
          <h2 className="text-lg font-medium text-text-primary">
            Lookbook Details
          </h2>
          <p className="mt-1 text-sm text-text-muted">
            Set the title, description, and metadata for your lookbook.
          </p>
        </div>
        <div className="p-6">
          <LookbookForm
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isSubmitting={isSubmitting}
            error={error}
            drops={drops}
            uploadHandler={handleImageUpload}
          />
        </div>
      </div>

      {/* Gallery Section */}
      <div className="bg-background-secondary rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border bg-background-tertiary">
          <h2 className="text-lg font-medium text-text-primary">
            Gallery Images
          </h2>
          <p className="mt-1 text-sm text-text-muted">
            Add images to your lookbook gallery. You can drag to reorder them.
          </p>
        </div>
        <div className="p-6">
          <LookbookGallery
            images={images}
            onChange={handleImagesChange}
            uploadHandler={handleImageUpload}
            isUploading={isUploading}
          />
        </div>
      </div>
    </div>
  );
}
