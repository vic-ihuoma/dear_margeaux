import { useState, useCallback } from 'react';
import type { Drop } from '@dear-margeaux/api';
import { ImageUploader } from './ImageUploader';

/**
 * Data structure for lookbook form
 */
export interface LookbookFormData {
  title: string;
  description?: string;
  date: string;
  drop?: string;
  coverImage?: string;
  draft: boolean;
}

/**
 * Props for the LookbookForm component
 */
export interface LookbookFormProps {
  /** Existing lookbook for editing, or undefined for create mode */
  lookbook?: LookbookFormData;
  /** Called when form is submitted */
  onSubmit: (data: LookbookFormData) => Promise<void>;
  /** Called when cancel button is clicked */
  onCancel: () => void;
  /** Whether form is currently submitting */
  isSubmitting?: boolean;
  /** Error message to display */
  error?: string | null;
  /** Available drops for association */
  drops: Drop[];
  /** Handler function for image upload */
  uploadHandler?: (file: File) => Promise<{ url: string; key: string }>;
}

export function LookbookForm({
  lookbook,
  onSubmit,
  onCancel,
  isSubmitting = false,
  error,
  drops,
  uploadHandler,
}: LookbookFormProps) {
  const [title, setTitle] = useState(lookbook?.title || '');
  const [description, setDescription] = useState(lookbook?.description || '');
  const [date, setDate] = useState(lookbook?.date || '');
  const [drop, setDrop] = useState(lookbook?.drop || '');
  const [coverImage, setCoverImage] = useState(lookbook?.coverImage || '');
  const [draft, setDraft] = useState(lookbook?.draft ?? true);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const validate = useCallback(() => {
    const errors: Record<string, string> = {};

    if (!title.trim()) {
      errors.title = 'Title is required';
    } else if (title.length > 200) {
      errors.title = 'Title must be 200 characters or less';
    }

    if (!date) {
      errors.date = 'Date is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [title, date]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!validate()) {
        return;
      }

      const data: LookbookFormData = {
        title: title.trim(),
        description: description.trim() || undefined,
        date,
        drop: drop || undefined,
        coverImage: coverImage.trim() || undefined,
        draft,
      };

      await onSubmit(data);
    },
    [title, description, date, drop, coverImage, draft, validate, onSubmit]
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

      {/* Title Field */}
      <div>
        <label
          htmlFor="title"
          className="block text-sm font-medium text-text-primary mb-1.5"
        >
          Title <span className="text-status-error">*</span>
        </label>
        <input
          type="text"
          id="title"
          name="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={`block w-full rounded-lg border bg-background-primary py-2 px-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 ${
            formErrors.title
              ? 'border-status-error focus:border-status-error focus:ring-status-error'
              : 'border-border focus:border-primary-500 focus:ring-primary-500'
          }`}
          placeholder="e.g., Spring 2026 Lookbook"
          maxLength={200}
        />
        {formErrors.title && (
          <p className="mt-1 text-sm text-status-error">{formErrors.title}</p>
        )}
        <p className="mt-1 text-xs text-text-muted">{title.length}/200</p>
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
          className="block w-full rounded-lg border border-border bg-background-primary py-2 px-3 text-sm text-text-primary placeholder:text-text-muted focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 resize-none"
          placeholder="Describe this lookbook..."
        />
        <p className="mt-1 text-xs text-text-muted">
          A brief description for this lookbook collection
        </p>
      </div>

      {/* Date Field */}
      <div>
        <label
          htmlFor="date"
          className="block text-sm font-medium text-text-primary mb-1.5"
        >
          Date <span className="text-status-error">*</span>
        </label>
        <input
          type="date"
          id="date"
          name="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className={`block w-full rounded-lg border bg-background-primary py-2 px-3 text-sm text-text-primary focus:outline-none focus:ring-1 ${
            formErrors.date
              ? 'border-status-error focus:border-status-error focus:ring-status-error'
              : 'border-border focus:border-primary-500 focus:ring-primary-500'
          }`}
        />
        {formErrors.date && (
          <p className="mt-1 text-sm text-status-error">{formErrors.date}</p>
        )}
        <p className="mt-1 text-xs text-text-muted">
          The date this lookbook was created or published
        </p>
      </div>

      {/* Associated Drop Selector */}
      <div>
        <label
          htmlFor="drop"
          className="block text-sm font-medium text-text-primary mb-1.5"
        >
          Associated Drop (Optional)
        </label>
        <select
          id="drop"
          name="drop"
          value={drop}
          onChange={(e) => setDrop(e.target.value)}
          className="block w-full rounded-lg border border-border bg-background-primary py-2 px-3 text-sm text-text-primary focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        >
          <option value="">None</option>
          {drops.map((d) => (
            <option key={d.id} value={d.slug}>
              {d.name}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-text-muted">
          Link this lookbook to a specific product drop
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
          This image will be displayed as the lookbook thumbnail
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
              name="coverImage"
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

      {/* Draft Toggle */}
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="draft"
          name="draft"
          checked={draft}
          onChange={(e) => setDraft(e.target.checked)}
          className="h-4 w-4 rounded border-border text-primary focus:ring-primary-500"
        />
        <label htmlFor="draft" className="text-sm text-text-primary">
          Save as draft
        </label>
      </div>
      <p className="text-xs text-text-muted -mt-4 ml-7">
        Draft lookbooks are not visible on the storefront
      </p>

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
          ) : lookbook ? (
            'Save Changes'
          ) : (
            'Create Lookbook'
          )}
        </button>
      </div>
    </form>
  );
}
