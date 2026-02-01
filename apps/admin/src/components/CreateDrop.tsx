import { useState, useCallback } from 'react';
import { DropForm } from './DropForm';
import type { CreateDropParams, UpdateDropParams } from '@dear-margeaux/api';

export interface CreateDropProps {
  /** URL to redirect to after successful creation */
  successRedirect?: string;
  /** URL to redirect to when cancel is clicked */
  cancelRedirect?: string;
}

/** Upload handler for cover image */
async function uploadHandler(
  file: File
): Promise<{ url: string; key: string }> {
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
}

export function CreateDrop({
  successRedirect = '/drops',
  cancelRedirect = '/drops',
}: CreateDropProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(
    async (data: CreateDropParams | UpdateDropParams) => {
      setIsSubmitting(true);
      setError(null);

      try {
        const response = await fetch('/api/drops', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const result = await response.json();
          throw new Error(result.error || 'Failed to create drop');
        }

        const drop = await response.json();
        // Redirect to the edit page for the new drop
        window.location.href = `${successRedirect}/${drop.id}`;
      } catch (err) {
        console.error('Create drop error:', err);
        setError(err instanceof Error ? err.message : 'Failed to create drop');
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
    <DropForm
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      isSubmitting={isSubmitting}
      error={error}
      uploadHandler={uploadHandler}
    />
  );
}
