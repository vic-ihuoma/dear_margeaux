import { useState, useCallback } from 'react';

export interface BlogPostData {
  slug?: string;
  title: string;
  description: string;
  date: string;
  author: string;
  tags: string[];
  image?: string;
  draft: boolean;
  pinned: boolean;
}

export interface BlogFormProps {
  /** Existing blog post for editing, or undefined for create mode */
  post?: BlogPostData;
  /** Called when form is submitted */
  onSubmit: (data: BlogPostData) => Promise<void>;
  /** Called when cancel button is clicked */
  onCancel: () => void;
  /** Whether form is currently submitting */
  isSubmitting?: boolean;
  /** Error message to display */
  error?: string | null;
}

export function BlogForm({
  post,
  onSubmit,
  onCancel,
  isSubmitting = false,
  error,
}: BlogFormProps) {
  const [title, setTitle] = useState(post?.title || '');
  const [slug, setSlug] = useState(post?.slug || '');
  const [description, setDescription] = useState(post?.description || '');
  const [author, setAuthor] = useState(post?.author || 'Dear Margeaux Team');
  const [date, setDate] = useState(
    post?.date
      ? post.date.split('T')[0]
      : new Date().toISOString().split('T')[0]
  );
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>(post?.tags || []);
  const [image, setImage] = useState(post?.image || '');
  const [draft, setDraft] = useState(post?.draft ?? true);
  const [pinned, setPinned] = useState(post?.pinned ?? false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Auto-generate slug from title
  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newTitle = e.target.value;
      setTitle(newTitle);

      // Only auto-generate slug if it hasn't been manually edited or is empty
      if (!post && !slug) {
        const newSlug = newTitle
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .trim();
        setSlug(newSlug);
      }
    },
    [post, slug]
  );

  const handleAddTag = useCallback(() => {
    const trimmedTag = tagInput.trim().toLowerCase();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      setTags([...tags, trimmedTag]);
      setTagInput('');
    }
  }, [tagInput, tags]);

  const handleRemoveTag = useCallback((tagToRemove: string) => {
    setTags((prev) => prev.filter((tag) => tag !== tagToRemove));
  }, []);

  const handleTagKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleAddTag();
      }
    },
    [handleAddTag]
  );

  const validate = useCallback(() => {
    const errors: Record<string, string> = {};

    if (!title.trim()) {
      errors.title = 'Title is required';
    } else if (title.length > 200) {
      errors.title = 'Title must be 200 characters or less';
    }

    if (!slug.trim()) {
      errors.slug = 'Slug is required';
    } else if (!/^[a-z0-9-]+$/.test(slug)) {
      errors.slug =
        'Slug can only contain lowercase letters, numbers, and hyphens';
    } else if (slug.length > 100) {
      errors.slug = 'Slug must be 100 characters or less';
    }

    if (!description.trim()) {
      errors.description = 'Description is required';
    } else if (description.length > 500) {
      errors.description = 'Description must be 500 characters or less';
    }

    if (!author.trim()) {
      errors.author = 'Author is required';
    }

    if (!date) {
      errors.date = 'Date is required';
    }

    if (image && !/^https?:\/\/.+/.test(image)) {
      errors.image = 'Image must be a valid URL';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [title, slug, description, author, date, image]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!validate()) {
        return;
      }

      const data: BlogPostData = {
        slug: slug.trim(),
        title: title.trim(),
        description: description.trim(),
        date,
        author: author.trim(),
        tags,
        image: image.trim() || undefined,
        draft,
        pinned,
      };

      await onSubmit(data);
    },
    [
      title,
      slug,
      description,
      author,
      date,
      tags,
      image,
      draft,
      pinned,
      validate,
      onSubmit,
    ]
  );

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
          onChange={handleTitleChange}
          className={`block w-full rounded-lg border bg-background-primary py-2 px-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 ${
            formErrors.title
              ? 'border-status-error focus:border-status-error focus:ring-status-error'
              : 'border-border focus:border-primary-500 focus:ring-primary-500'
          }`}
          placeholder="Enter post title..."
          maxLength={200}
        />
        {formErrors.title && (
          <p className="mt-1 text-sm text-status-error">{formErrors.title}</p>
        )}
        <p className="mt-1 text-xs text-text-muted">{title.length}/200</p>
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
          disabled={!!post}
          className={`block w-full rounded-lg border bg-background-primary py-2 px-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 ${
            formErrors.slug
              ? 'border-status-error focus:border-status-error focus:ring-status-error'
              : 'border-border focus:border-primary-500 focus:ring-primary-500'
          } ${post ? 'bg-background-tertiary cursor-not-allowed' : ''}`}
          placeholder="e.g., my-blog-post"
          maxLength={100}
        />
        {formErrors.slug && (
          <p className="mt-1 text-sm text-status-error">{formErrors.slug}</p>
        )}
        <p className="mt-1 text-xs text-text-muted">
          URL-friendly identifier. Used in /blog/{slug || 'your-slug'}
        </p>
      </div>

      {/* Description Field */}
      <div>
        <label
          htmlFor="description"
          className="block text-sm font-medium text-text-primary mb-1.5"
        >
          Description <span className="text-status-error">*</span>
        </label>
        <textarea
          id="description"
          name="description"
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={`block w-full rounded-lg border bg-background-primary py-2 px-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 resize-none ${
            formErrors.description
              ? 'border-status-error focus:border-status-error focus:ring-status-error'
              : 'border-border focus:border-primary-500 focus:ring-primary-500'
          }`}
          placeholder="Brief summary for SEO and previews..."
          maxLength={500}
        />
        {formErrors.description && (
          <p className="mt-1 text-sm text-status-error">
            {formErrors.description}
          </p>
        )}
        <p className="mt-1 text-xs text-text-muted">{description.length}/500</p>
      </div>

      {/* Author and Date Fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="author"
            className="block text-sm font-medium text-text-primary mb-1.5"
          >
            Author <span className="text-status-error">*</span>
          </label>
          <input
            type="text"
            id="author"
            name="author"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            className={`block w-full rounded-lg border bg-background-primary py-2 px-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 ${
              formErrors.author
                ? 'border-status-error focus:border-status-error focus:ring-status-error'
                : 'border-border focus:border-primary-500 focus:ring-primary-500'
            }`}
            placeholder="Author name"
          />
          {formErrors.author && (
            <p className="mt-1 text-sm text-status-error">
              {formErrors.author}
            </p>
          )}
        </div>

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
        </div>
      </div>

      {/* Tags Field */}
      <div>
        <label
          htmlFor="tags"
          className="block text-sm font-medium text-text-primary mb-1.5"
        >
          Tags
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            id="tags"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleTagKeyDown}
            className="flex-1 block rounded-lg border border-border bg-background-primary py-2 px-3 text-sm text-text-primary placeholder:text-text-muted focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            placeholder="Type a tag and press Enter..."
          />
          <button
            type="button"
            onClick={handleAddTag}
            className="px-3 py-2 text-sm font-medium text-text-primary bg-background-tertiary border border-border rounded-lg hover:bg-background-primary transition-colors"
          >
            Add
          </button>
        </div>
        {tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-primary-100 text-primary-700 rounded-full"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  className="hover:text-primary-900"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-3.5 h-3.5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18 18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </span>
            ))}
          </div>
        )}
        <p className="mt-1 text-xs text-text-muted">
          Add tags for categorization
        </p>
      </div>

      {/* Image URL Field */}
      <div>
        <label
          htmlFor="image"
          className="block text-sm font-medium text-text-primary mb-1.5"
        >
          Featured Image URL
        </label>
        <input
          type="url"
          id="image"
          name="image"
          value={image}
          onChange={(e) => setImage(e.target.value)}
          className={`block w-full rounded-lg border bg-background-primary py-2 px-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 ${
            formErrors.image
              ? 'border-status-error focus:border-status-error focus:ring-status-error'
              : 'border-border focus:border-primary-500 focus:ring-primary-500'
          }`}
          placeholder="https://example.com/image.jpg"
        />
        {formErrors.image && (
          <p className="mt-1 text-sm text-status-error">{formErrors.image}</p>
        )}
        {image && !formErrors.image && (
          <div className="mt-2">
            <img
              src={image}
              alt="Preview"
              className="max-w-xs max-h-32 rounded-lg object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
        )}
      </div>

      {/* Draft Toggle */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          role="switch"
          aria-checked={!draft}
          onClick={() => setDraft(!draft)}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
            draft ? 'bg-background-tertiary' : 'bg-status-success'
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
              draft ? 'translate-x-0' : 'translate-x-5'
            }`}
          />
        </button>
        <span className="text-sm font-medium text-text-primary">
          {draft ? 'Draft' : 'Published'}
        </span>
        <span className="text-xs text-text-muted">
          {draft
            ? 'This post is not visible to the public'
            : 'This post is visible to the public'}
        </span>
      </div>

      {/* Pinned Toggle */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          role="switch"
          aria-checked={pinned}
          onClick={() => setPinned(!pinned)}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
            pinned ? 'bg-primary' : 'bg-background-tertiary'
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
              pinned ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
        <span className="text-sm font-medium text-text-primary">
          {pinned ? 'Pinned' : 'Not Pinned'}
        </span>
        <span className="text-xs text-text-muted">
          Pinned posts appear first in the blog
        </span>
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
          ) : post ? (
            'Save Changes'
          ) : (
            'Create Post'
          )}
        </button>
      </div>
    </form>
  );
}
