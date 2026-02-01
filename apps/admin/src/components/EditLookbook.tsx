import { useState, useCallback } from 'react';
import { LookbookForm, type LookbookFormData } from './LookbookForm';
import { LookbookGallery, type LookbookImage } from './LookbookGallery';
import type { Drop } from '@dear-margeaux/api';

export interface LookbookData {
  slug: string;
  title: string;
  description?: string;
  date: string;
  drop?: string;
  coverImage?: string;
  images: string[];
  draft: boolean;
}

interface EditLookbookProps {
  lookbook: LookbookData;
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

export function EditLookbook({ lookbook, drops }: EditLookbookProps) {
  // Convert initial images from string array to LookbookImage array
  const initialImages: LookbookImage[] = lookbook.images.map((url) => ({
    url,
    alt: '',
  }));

  const [images, setImages] = useState<LookbookImage[]>(initialImages);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Convert lookbook data to form data format
  const formData: LookbookFormData = {
    title: lookbook.title,
    description: lookbook.description,
    date: lookbook.date,
    drop: lookbook.drop,
    coverImage: lookbook.coverImage,
    draft: lookbook.draft,
  };

  const handleSubmit = useCallback(
    async (data: LookbookFormData) => {
      setIsSubmitting(true);
      setError(null);
      setSuccessMessage(null);

      try {
        const response = await fetch(`/api/lookbook/${lookbook.slug}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...data,
            images: images.map((img) => img.url),
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to save lookbook');
        }

        setSuccessMessage('Lookbook saved successfully!');

        // Clear success message after 3 seconds
        setTimeout(() => {
          setSuccessMessage(null);
        }, 3000);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to save lookbook'
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [lookbook.slug, images]
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
      {/* Success Message */}
      {successMessage && (
        <div className="rounded-lg bg-status-success/10 border border-status-success/20 p-4">
          <div className="flex items-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
              className="w-5 h-5 text-status-success mr-2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m4.5 12.75 6 6 9-13.5"
              />
            </svg>
            <p className="text-sm text-status-success">{successMessage}</p>
          </div>
        </div>
      )}

      {/* Lookbook Details Section */}
      <div className="bg-background-secondary rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border bg-background-tertiary">
          <h2 className="text-lg font-medium text-text-primary">
            Lookbook Details
          </h2>
          <p className="mt-1 text-sm text-text-muted">
            Edit the title, description, and metadata for your lookbook.
          </p>
        </div>
        <div className="p-6">
          <LookbookForm
            lookbook={formData}
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
            Manage your lookbook gallery images. Drag to reorder.
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
