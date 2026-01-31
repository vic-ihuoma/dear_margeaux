import { useState, useCallback } from 'react';
import { BlogForm, type BlogPostData } from './BlogForm';
import { MDXEditor } from './MDXEditor';

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

export interface BlogPost extends BlogPostData {
  content: string;
}

export interface BlogEditorProps {
  /** Existing blog post for editing */
  post: BlogPost;
}

export function BlogEditor({ post: initialPost }: BlogEditorProps) {
  const [post, setPost] = useState<BlogPost>(initialPost);
  const [content, setContent] = useState(initialPost.content);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleMetadataSubmit = useCallback(
    async (data: BlogPostData) => {
      setIsSubmitting(true);
      setError(null);
      setSuccessMessage(null);

      try {
        const response = await fetch(`/api/blog/${post.slug}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...data,
            content,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to update post');
        }

        const updatedPost = await response.json();
        setPost(updatedPost);

        // If sendAsNewsletter is true, send the newsletter
        if (data.sendAsNewsletter) {
          try {
            const newsletterResponse = await fetch('/api/newsletter/send', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                blog_slug: data.slug,
                title: data.title,
                excerpt: data.description,
                featured_image_url: data.image,
              }),
            });

            if (!newsletterResponse.ok) {
              const errorData = await newsletterResponse.json();
              throw new Error(errorData.error || 'Failed to send newsletter');
            }

            const newsletterResult = await newsletterResponse.json();
            setSuccessMessage(
              `Post published and newsletter sent to ${newsletterResult.recipient_count} subscriber${newsletterResult.recipient_count === 1 ? '' : 's'}!`
            );
          } catch (newsletterErr) {
            // Blog was saved successfully, but newsletter failed
            const newsletterError =
              newsletterErr instanceof Error
                ? newsletterErr.message
                : 'Failed to send newsletter';
            setSuccessMessage('Post updated successfully!');
            setError(`Newsletter send failed: ${newsletterError}`);
          }
        } else {
          setSuccessMessage('Post updated successfully!');
        }

        // Clear success message after 5 seconds (longer to read newsletter info)
        setTimeout(() => setSuccessMessage(null), 5000);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update post');
      } finally {
        setIsSubmitting(false);
      }
    },
    [post.slug, content]
  );

  const handleContentSave = useCallback(async () => {
    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(`/api/blog/${post.slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save content');
      }

      setSuccessMessage('Content saved!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save content');
    } finally {
      setIsSubmitting(false);
    }
  }, [post.slug, content]);

  const handleDelete = useCallback(async () => {
    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/blog/${post.slug}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete post');
      }

      // Redirect to blog list
      window.location.href = '/blog';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete post');
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  }, [post.slug]);

  const handleCancel = useCallback(() => {
    window.location.href = '/blog';
  }, []);

  return (
    <div className="space-y-8">
      {/* Success Message */}
      {successMessage && (
        <div className="rounded-lg bg-status-success/10 border border-status-success/20 p-4">
          <div className="flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-5 h-5 text-status-success"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
              />
            </svg>
            <p className="text-sm text-status-success">{successMessage}</p>
          </div>
        </div>
      )}

      {/* Post Details Section */}
      <div className="bg-background-secondary rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border bg-background-tertiary">
          <h2 className="text-lg font-medium text-text-primary">
            Post Details
          </h2>
          <p className="mt-1 text-sm text-text-muted">
            Edit the title, description, and metadata for this post.
          </p>
        </div>
        <div className="p-6">
          <BlogForm
            post={post}
            onSubmit={handleMetadataSubmit}
            onCancel={handleCancel}
            isSubmitting={isSubmitting}
            error={error}
          />
        </div>
      </div>

      {/* Content Editor Section */}
      <div className="bg-background-secondary rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border bg-background-tertiary">
          <div>
            <h2 className="text-lg font-medium text-text-primary">Content</h2>
            <p className="mt-1 text-sm text-text-muted">
              Write your blog post content using Markdown or MDX.
            </p>
          </div>
          <button
            type="button"
            onClick={handleContentSave}
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
            ) : (
              <>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-4 h-4"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m4.5 12.75 6 6 9-13.5"
                  />
                </svg>
                Save Content
              </>
            )}
          </button>
        </div>
        <div className="p-6">
          <MDXEditor
            value={content}
            onChange={setContent}
            minHeight="500px"
            onImageUpload={uploadImageToR2}
            placeholder="# Your Post Title

Start writing your blog post content here...

You can use **bold**, *italic*, and [links](url).

## Subheadings

- Bullet points
- Lists

> Blockquotes

```js
// Code blocks
const hello = 'world';
```"
          />
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-background-secondary rounded-xl border border-status-error/30 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-status-error/30 bg-status-error/5">
          <h2 className="text-lg font-medium text-status-error">Danger Zone</h2>
          <p className="mt-1 text-sm text-text-muted">
            Permanently delete this blog post.
          </p>
        </div>
        <div className="p-6">
          {showDeleteConfirm ? (
            <div className="space-y-4">
              <p className="text-sm text-text-secondary">
                Are you sure you want to delete &quot;{post.title}&quot;? This
                action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-status-error rounded-lg hover:bg-status-error/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isDeleting ? (
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
                      Deleting...
                    </>
                  ) : (
                    'Yes, Delete Post'
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                  className="px-4 py-2 text-sm font-medium text-text-primary bg-background-tertiary border border-border rounded-lg hover:bg-background-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-status-error bg-status-error/10 border border-status-error/20 rounded-lg hover:bg-status-error/20 transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-4 h-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                />
              </svg>
              Delete This Post
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
