import { useState, useCallback, type FormEvent } from 'react';
import type { Product, ProductStatus } from '@dear-margeaux/api';
import { TagInput } from './TagInput';
import { DropSelector } from './DropSelector';

export interface ProductFormData {
  title: string;
  description: string;
  status: ProductStatus;
  tags: string[];
  drop_id: string | null;
}

/** The data shape that ProductForm submits */
export interface ProductFormSubmitData {
  title: string;
  description?: string;
  status: ProductStatus;
  tags?: string[];
  drop_id?: string;
}

export interface ProductFormProps {
  /** Existing product data for editing, undefined for new products */
  product?: Product;
  /** Called when form is submitted */
  onSubmit: (data: ProductFormSubmitData) => Promise<void>;
  /** Called when user cancels */
  onCancel: () => void;
  /** Whether the form is currently submitting */
  isSubmitting?: boolean;
  /** Error message to display */
  error?: string | null;
}

export function ProductForm({
  product,
  onSubmit,
  onCancel,
  isSubmitting = false,
  error,
}: ProductFormProps) {
  const [formData, setFormData] = useState<ProductFormData>({
    title: product?.title || '',
    description: product?.description || '',
    status: product?.status || 'draft',
    tags: product?.tags || [],
    drop_id: product?.drop_id || null,
  });

  const [formErrors, setFormErrors] = useState<
    Partial<Record<keyof ProductFormData, string>>
  >({});

  const validate = useCallback((): boolean => {
    const errors: Partial<Record<keyof ProductFormData, string>> = {};

    if (!formData.title.trim()) {
      errors.title = 'Title is required';
    } else if (formData.title.length > 200) {
      errors.title = 'Title must be less than 200 characters';
    }

    if (formData.description && formData.description.length > 5000) {
      errors.description = 'Description must be less than 5000 characters';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    await onSubmit({
      title: formData.title.trim(),
      description: formData.description.trim() || undefined,
      status: formData.status,
      tags: formData.tags.length > 0 ? formData.tags : undefined,
      drop_id: formData.drop_id || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-lg bg-status-error/10 border border-status-error/20 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-status-error"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-status-error">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Title */}
      <div>
        <label
          htmlFor="title"
          className="block text-sm font-medium text-text-primary mb-1"
        >
          Title <span className="text-status-error">*</span>
        </label>
        <input
          type="text"
          id="title"
          name="title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          className={`block w-full rounded-lg border ${
            formErrors.title
              ? 'border-status-error focus:border-status-error focus:ring-status-error'
              : 'border-border focus:border-primary-500 focus:ring-primary-500'
          } bg-background-primary py-2 px-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1`}
          placeholder="Enter product title"
          disabled={isSubmitting}
        />
        {formErrors.title && (
          <p className="mt-1 text-sm text-status-error">{formErrors.title}</p>
        )}
      </div>

      {/* Description */}
      <div>
        <label
          htmlFor="description"
          className="block text-sm font-medium text-text-primary mb-1"
        >
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={4}
          value={formData.description}
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })
          }
          className={`block w-full rounded-lg border ${
            formErrors.description
              ? 'border-status-error focus:border-status-error focus:ring-status-error'
              : 'border-border focus:border-primary-500 focus:ring-primary-500'
          } bg-background-primary py-2 px-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 resize-none`}
          placeholder="Enter product description"
          disabled={isSubmitting}
        />
        {formErrors.description && (
          <p className="mt-1 text-sm text-status-error">
            {formErrors.description}
          </p>
        )}
        <p className="mt-1 text-xs text-text-muted">
          {formData.description.length}/5000 characters
        </p>
      </div>

      {/* Tags */}
      <TagInput
        id="tags"
        label="Tags"
        value={formData.tags}
        onChange={(tags) => setFormData({ ...formData, tags })}
        placeholder="Add tags (press Enter or comma to add)"
        disabled={isSubmitting}
        maxTags={10}
      />

      {/* Drop Assignment */}
      <DropSelector
        id="drop_id"
        label="Assign to Drop"
        value={formData.drop_id}
        onChange={(drop_id) => setFormData({ ...formData, drop_id })}
        disabled={isSubmitting}
      />

      {/* Status */}
      <div>
        <label
          htmlFor="status"
          className="block text-sm font-medium text-text-primary mb-1"
        >
          Status
        </label>
        <select
          id="status"
          name="status"
          value={formData.status}
          onChange={(e) =>
            setFormData({
              ...formData,
              status: e.target.value as ProductStatus,
            })
          }
          className="block w-full rounded-lg border border-border bg-background-primary py-2 pl-3 pr-10 text-sm text-text-primary focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          disabled={isSubmitting}
        >
          <option value="draft">Draft</option>
          <option value="active">Active</option>
        </select>
        <p className="mt-1 text-xs text-text-muted">
          {formData.status === 'draft'
            ? 'Draft products are not visible to customers'
            : 'Active products are visible and purchasable'}
        </p>
      </div>

      {/* Form Actions */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="px-4 py-2 text-sm font-medium text-text-primary bg-background-tertiary border border-border rounded-lg hover:bg-background-primary transition-colors duration-normal disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-600 transition-colors duration-normal disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <>
              <svg
                className="animate-spin h-4 w-4"
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
              Saving...
            </>
          ) : product ? (
            'Save Changes'
          ) : (
            'Create Product'
          )}
        </button>
      </div>
    </form>
  );
}
