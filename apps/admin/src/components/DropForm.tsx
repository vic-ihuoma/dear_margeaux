import { useState, useCallback } from 'react';
import type {
  Drop,
  CreateDropParams,
  UpdateDropParams,
  DropStatus,
} from '@dear-margeaux/api';
import { ImageUploader } from './ImageUploader';

export interface DropFormProps {
  /** Existing drop for editing, or undefined for create mode */
  drop?: Drop;
  /** Called when form is submitted */
  onSubmit: (data: CreateDropParams | UpdateDropParams) => Promise<void>;
  /** Called when cancel button is clicked */
  onCancel: () => void;
  /** Whether form is currently submitting */
  isSubmitting?: boolean;
  /** Error message to display */
  error?: string | null;
  /** Handler function for image upload */
  uploadHandler?: (file: File) => Promise<{ url: string; key: string }>;
}

export function DropForm({
  drop,
  onSubmit,
  onCancel,
  isSubmitting = false,
  error,
  uploadHandler,
}: DropFormProps) {
  const [name, setName] = useState(drop?.name || '');
  const [slug, setSlug] = useState(drop?.slug || '');
  const [description, setDescription] = useState(drop?.description || '');
  const [coverImage, setCoverImage] = useState(drop?.cover_image || '');
  const [status, setStatus] = useState<DropStatus>(drop?.status || 'draft');
  const [startDate, setStartDate] = useState(
    drop?.start_date ? drop.start_date.split('T')[0] : ''
  );
  const [endDate, setEndDate] = useState(
    drop?.end_date ? drop.end_date.split('T')[0] : ''
  );
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Auto-generate slug from name
  const handleNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newName = e.target.value;
      setName(newName);

      // Only auto-generate slug if it hasn't been manually edited or is empty
      if (!drop && !slug) {
        const newSlug = newName
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .trim();
        setSlug(newSlug);
      }
    },
    [drop, slug]
  );

  const validate = useCallback(() => {
    const errors: Record<string, string> = {};

    if (!name.trim()) {
      errors.name = 'Name is required';
    } else if (name.length > 200) {
      errors.name = 'Name must be 200 characters or less';
    }

    if (!slug.trim()) {
      errors.slug = 'Slug is required';
    } else if (!/^[a-z0-9-]+$/.test(slug)) {
      errors.slug =
        'Slug can only contain lowercase letters, numbers, and hyphens';
    } else if (slug.length > 100) {
      errors.slug = 'Slug must be 100 characters or less';
    }

    if (description && description.length > 2000) {
      errors.description = 'Description must be 2000 characters or less';
    }

    if (startDate && endDate && new Date(endDate) <= new Date(startDate)) {
      errors.endDate = 'End date must be after start date';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [name, slug, description, startDate, endDate]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!validate()) {
        return;
      }

      const data: CreateDropParams | UpdateDropParams = {
        name: name.trim(),
        slug: slug.trim(),
        description: description.trim() || undefined,
        cover_image: coverImage.trim() || undefined,
        status,
        start_date: startDate ? new Date(startDate).toISOString() : undefined,
        end_date: endDate ? new Date(endDate).toISOString() : undefined,
      };

      await onSubmit(data);
    },
    [
      name,
      slug,
      description,
      coverImage,
      status,
      startDate,
      endDate,
      validate,
      onSubmit,
    ]
  );

  const handleCoverImageUpload = (url: string) => {
    setCoverImage(url);
  };

  const handleCoverImageRemove = () => {
    setCoverImage('');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Error Message */}
      {error && (
        <div className="rounded-lg bg-status-error/10 border border-status-error/20 p-4">
          <p className="text-sm text-status-error">{error}</p>
        </div>
      )}

      {/* Name Field */}
      <div>
        <label
          htmlFor="name"
          className="block text-sm font-medium text-text-primary mb-1.5"
        >
          Name <span className="text-status-error">*</span>
        </label>
        <input
          type="text"
          id="name"
          name="name"
          value={name}
          onChange={handleNameChange}
          className={`block w-full rounded-lg border bg-background-primary py-2 px-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 ${
            formErrors.name
              ? 'border-status-error focus:border-status-error focus:ring-status-error'
              : 'border-border focus:border-primary-500 focus:ring-primary-500'
          }`}
          placeholder="e.g., Spring 2026 Collection"
          maxLength={200}
        />
        {formErrors.name && (
          <p className="mt-1 text-sm text-status-error">{formErrors.name}</p>
        )}
        <p className="mt-1 text-xs text-text-muted">{name.length}/200</p>
      </div>

      {/* Slug Field */}
      <div>
        <label
          htmlFor="slug"
          className="block text-sm font-medium text-text-primary mb-1.5"
        >
          Slug <span className="text-status-error">*</span>
        </label>
        <input
          type="text"
          id="slug"
          name="slug"
          value={slug}
          onChange={(e) => setSlug(e.target.value.toLowerCase())}
          className={`block w-full rounded-lg border bg-background-primary py-2 px-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 ${
            formErrors.slug
              ? 'border-status-error focus:border-status-error focus:ring-status-error'
              : 'border-border focus:border-primary-500 focus:ring-primary-500'
          }`}
          placeholder="e.g., spring-2026"
          maxLength={100}
        />
        {formErrors.slug && (
          <p className="mt-1 text-sm text-status-error">{formErrors.slug}</p>
        )}
        <p className="mt-1 text-xs text-text-muted">
          URL-friendly identifier. Used in /shop/{slug || 'your-slug'}
        </p>
      </div>

      {/* Description Field */}
      <div>
        <label
          htmlFor="description"
          className="block text-sm font-medium text-text-primary mb-1.5"
        >
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={`block w-full rounded-lg border bg-background-primary py-2 px-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 resize-none ${
            formErrors.description
              ? 'border-status-error focus:border-status-error focus:ring-status-error'
              : 'border-border focus:border-primary-500 focus:ring-primary-500'
          }`}
          placeholder="Describe this drop..."
          maxLength={2000}
        />
        {formErrors.description && (
          <p className="mt-1 text-sm text-status-error">
            {formErrors.description}
          </p>
        )}
        <p className="mt-1 text-xs text-text-muted">
          {description.length}/2000
        </p>
      </div>

      {/* Cover Image Field */}
      <div>
        <label
          htmlFor="cover-image"
          className="block text-sm font-medium text-text-primary mb-1.5"
        >
          Cover Image
        </label>
        <p className="text-xs text-text-muted mb-3">
          This image will be displayed in the drop listing and on the drop page
        </p>
        {uploadHandler ? (
          <ImageUploader
            value={coverImage || null}
            onUpload={handleCoverImageUpload}
            onRemove={handleCoverImageRemove}
            isUploading={isSubmitting}
            uploadHandler={uploadHandler}
          />
        ) : (
          <div>
            <input
              type="url"
              id="cover-image"
              name="cover_image"
              value={coverImage}
              onChange={(e) => setCoverImage(e.target.value)}
              className="block w-full rounded-lg border border-border bg-background-primary py-2 px-3 text-sm text-text-primary placeholder:text-text-muted focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              placeholder="https://example.com/cover-image.jpg"
            />
            {coverImage && (
              <div className="mt-2 relative inline-block">
                <img
                  src={coverImage}
                  alt="Cover preview"
                  className="h-32 w-auto rounded-lg object-cover border border-border"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Status Field */}
      <div>
        <label
          htmlFor="status"
          className="block text-sm font-medium text-text-primary mb-1.5"
        >
          Status
        </label>
        <select
          id="status"
          name="status"
          value={status}
          onChange={(e) => setStatus(e.target.value as DropStatus)}
          className="block w-full rounded-lg border border-border bg-background-primary py-2 px-3 text-sm text-text-primary focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        >
          <option value="draft">Draft</option>
          <option value="scheduled">Scheduled</option>
          <option value="active">Active</option>
          <option value="ended">Ended</option>
        </select>
        <p className="mt-1 text-xs text-text-muted">
          Draft drops are not visible. Scheduled drops become active on the
          start date.
        </p>
      </div>

      {/* Date Fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="startDate"
            className="block text-sm font-medium text-text-primary mb-1.5"
          >
            Start Date
          </label>
          <input
            type="date"
            id="startDate"
            name="startDate"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="block w-full rounded-lg border border-border bg-background-primary py-2 px-3 text-sm text-text-primary focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
          <p className="mt-1 text-xs text-text-muted">
            When this drop becomes available
          </p>
        </div>

        <div>
          <label
            htmlFor="endDate"
            className="block text-sm font-medium text-text-primary mb-1.5"
          >
            End Date
          </label>
          <input
            type="date"
            id="endDate"
            name="endDate"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className={`block w-full rounded-lg border bg-background-primary py-2 px-3 text-sm text-text-primary focus:outline-none focus:ring-1 ${
              formErrors.endDate
                ? 'border-status-error focus:border-status-error focus:ring-status-error'
                : 'border-border focus:border-primary-500 focus:ring-primary-500'
            }`}
          />
          {formErrors.endDate && (
            <p className="mt-1 text-sm text-status-error">
              {formErrors.endDate}
            </p>
          )}
          <p className="mt-1 text-xs text-text-muted">
            When this drop ends (optional)
          </p>
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t border-border">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="px-4 py-2 text-sm font-medium text-text-primary bg-background-tertiary border border-border rounded-lg hover:bg-background-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
          ) : drop ? (
            'Save Changes'
          ) : (
            'Create Drop'
          )}
        </button>
      </div>
    </form>
  );
}
