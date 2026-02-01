import { useState, useCallback } from 'react';
import { ProductForm } from './ProductForm';
import type { CreateProductParams } from '@dear-margeaux/api';

export interface CreateProductProps {
  /** URL to redirect on success - product ID will be appended */
  successRedirect?: string;
  /** URL to redirect on cancel */
  cancelRedirect?: string;
}

export function CreateProduct({
  successRedirect = '/products',
  cancelRedirect = '/products',
}: CreateProductProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(
    async (data: CreateProductParams) => {
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

  return (
    <ProductForm
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      isSubmitting={isSubmitting}
      error={error}
    />
  );
}
