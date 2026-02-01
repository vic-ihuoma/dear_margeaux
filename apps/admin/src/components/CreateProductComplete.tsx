import { useState, useCallback } from 'react';
import {
  ProductFormComplete,
  type ProductFormCompleteSubmitData,
} from './ProductFormComplete';

export interface CreateProductCompleteProps {
  /** URL to redirect on success - product ID will be appended */
  successRedirect?: string;
  /** URL to redirect on cancel */
  cancelRedirect?: string;
}

export function CreateProductComplete({
  successRedirect = '/products',
  cancelRedirect = '/products',
}: CreateProductCompleteProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(
    async (data: ProductFormCompleteSubmitData) => {
      setIsSubmitting(true);
      setError(null);

      try {
        const response = await fetch('/api/products', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const result = await response.json();
          throw new Error(result.error || 'Failed to create product');
        }

        const product = await response.json();
        window.location.href = `${successRedirect}/${product.id}`;
      } catch (err) {
        console.error('Create product error:', err);
        setError(
          err instanceof Error ? err.message : 'Failed to create product'
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [successRedirect]
  );

  const handleCancel = useCallback(() => {
    window.location.href = cancelRedirect;
  }, [cancelRedirect]);

  const handleImageUpload = useCallback(
    async (file: File): Promise<{ url: string; key: string }> => {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/images/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to upload image');
      }

      return response.json();
    },
    []
  );

  return (
    <ProductFormComplete
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      isSubmitting={isSubmitting}
      error={error}
      uploadHandler={handleImageUpload}
    />
  );
}
