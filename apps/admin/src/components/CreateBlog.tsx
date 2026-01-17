import { useState, useCallback } from 'react';
import { BlogForm, type BlogPostData } from './BlogForm';
import { MDXEditor } from './MDXEditor';

export function CreateBlog() {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(
    async (data: BlogPostData) => {
      setIsSubmitting(true);
      setError(null);

      try {
        const response = await fetch('/api/blog', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...data,
            content: content || `# ${data.title}\n\nStart writing...`,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to create post');
        }

        const newPost = await response.json();
        // Redirect to edit page
        window.location.href = `/blog/${newPost.slug}`;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create post');
      } finally {
        setIsSubmitting(false);
      }
    },
    [content]
  );

  const handleCancel = useCallback(() => {
    window.location.href = '/blog';
  }, []);

  return (
    <div className="space-y-8">
      {/* Post Details Section */}
      <div className="bg-background-secondary rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border bg-background-tertiary">
          <h2 className="text-lg font-medium text-text-primary">
            Post Details
          </h2>
          <p className="mt-1 text-sm text-text-muted">
            Set the title, description, and metadata for your new post.
          </p>
        </div>
        <div className="p-6">
          <BlogForm
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isSubmitting={isSubmitting}
            error={error}
          />
        </div>
      </div>

      {/* Content Preview Section */}
      <div className="bg-background-secondary rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border bg-background-tertiary">
          <h2 className="text-lg font-medium text-text-primary">
            Content Preview
          </h2>
          <p className="mt-1 text-sm text-text-muted">
            Optional: Start writing your content now. You can also write it
            after creating the post.
          </p>
        </div>
        <div className="p-6">
          <MDXEditor
            value={content}
            onChange={setContent}
            minHeight="300px"
            placeholder="# Your Post Title

Start writing your blog post content here...

You can use **bold**, *italic*, and [links](url).

## Subheadings

- Bullet points
- Lists"
          />
        </div>
      </div>
    </div>
  );
}
