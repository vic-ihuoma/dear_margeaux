import { useState, useCallback } from 'react';
import { DiscountForm, type DiscountFormData } from './DiscountForm';

export function CreateDiscount() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(async (data: DiscountFormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/discounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create discount');
      }

      const newDiscount = await response.json();
      // Redirect to discount detail page
      window.location.href = `/discounts/${newDiscount.id}`;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to create discount'
      );
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const handleCancel = useCallback(() => {
    window.location.href = '/discounts';
  }, []);

  return (
    <div className="bg-background-secondary rounded-xl border border-border shadow-sm overflow-hidden">
      <div className="p-4 border-b border-border bg-background-tertiary">
        <h2 className="text-lg font-medium text-text-primary">
          Discount Details
        </h2>
        <p className="mt-1 text-sm text-text-muted">
          Configure the discount code, value, and usage limits.
        </p>
      </div>
      <div className="p-6">
        <DiscountForm
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isSubmitting={isSubmitting}
          error={error}
        />
      </div>
    </div>
  );
}
