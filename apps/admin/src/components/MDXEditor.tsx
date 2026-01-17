import { useState, useCallback, useMemo } from 'react';

export interface MDXEditorProps {
  /** Initial content */
  value: string;
  /** Called when content changes */
  onChange: (value: string) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Minimum height for the editor */
  minHeight?: string;
}

/**
 * Simple markdown to HTML converter for preview
 * Handles basic markdown syntax
 */
function markdownToHtml(markdown: string): string {
  let html = markdown;

  // Escape HTML
  html = html.replace(/&/g, '&amp;');
  html = html.replace(/</g, '&lt;');
  html = html.replace(/>/g, '&gt;');

  // Headers
  html = html.replace(/^### (.*$)/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gm, '<h1>$1</h1>');

  // Bold and italic
  html = html.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  html = html.replace(/___(.*?)___/g, '<strong><em>$1</em></strong>');
  html = html.replace(/__(.*?)__/g, '<strong>$1</strong>');
  html = html.replace(/_(.*?)_/g, '<em>$1</em>');

  // Links
  html = html.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" class="text-primary hover:underline">$1</a>'
  );

  // Inline code
  html = html.replace(
    /`([^`]+)`/g,
    '<code class="bg-background-tertiary px-1 py-0.5 rounded text-sm">$1</code>'
  );

  // Code blocks
  html = html.replace(
    /```(\w*)\n([\s\S]*?)```/g,
    '<pre class="bg-background-tertiary p-4 rounded-lg overflow-x-auto my-4"><code>$2</code></pre>'
  );

  // Blockquotes
  html = html.replace(
    /^&gt; (.*$)/gm,
    '<blockquote class="border-l-4 border-primary pl-4 italic text-text-secondary">$1</blockquote>'
  );

  // Unordered lists
  html = html.replace(/^- (.*$)/gm, '<li>$1</li>');
  html = html.replace(
    /(<li>.*<\/li>\n?)+/g,
    '<ul class="list-disc list-inside my-4 space-y-1">$&</ul>'
  );

  // Ordered lists (simple version)
  html = html.replace(/^\d+\. (.*$)/gm, '<li>$1</li>');

  // Horizontal rule
  html = html.replace(/^---$/gm, '<hr class="border-border my-6">');

  // Paragraphs (basic)
  html = html.replace(/\n\n/g, '</p><p class="my-4">');
  html = `<p class="my-4">${html}</p>`;

  // Clean up empty paragraphs
  html = html.replace(/<p class="my-4"><\/p>/g, '');
  html = html.replace(/<p class="my-4"><h/g, '<h');
  html = html.replace(/<\/h(\d)><\/p>/g, '</h$1>');
  html = html.replace(/<p class="my-4"><pre/g, '<pre');
  html = html.replace(/<\/pre><\/p>/g, '</pre>');
  html = html.replace(/<p class="my-4"><ul/g, '<ul');
  html = html.replace(/<\/ul><\/p>/g, '</ul>');
  html = html.replace(/<p class="my-4"><blockquote/g, '<blockquote');
  html = html.replace(/<\/blockquote><\/p>/g, '</blockquote>');
  html = html.replace(/<p class="my-4"><hr/g, '<hr');

  return html;
}

type ViewMode = 'write' | 'preview' | 'split';

export function MDXEditor({
  value,
  onChange,
  placeholder = 'Start writing your content...',
  minHeight = '400px',
}: MDXEditorProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('write');

  const previewHtml = useMemo(() => markdownToHtml(value), [value]);

  const handleTextChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange(e.target.value);
    },
    [onChange]
  );

  const insertMarkdown = useCallback(
    (before: string, after: string = '') => {
      const textarea = document.getElementById(
        'mdx-editor-textarea'
      ) as HTMLTextAreaElement;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selectedText = value.substring(start, end);
      const newText =
        value.substring(0, start) +
        before +
        selectedText +
        after +
        value.substring(end);

      onChange(newText);

      // Restore cursor position
      setTimeout(() => {
        textarea.focus();
        const newCursorPos = start + before.length + selectedText.length;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      }, 0);
    },
    [value, onChange]
  );

  const toolbarButtons = [
    {
      label: 'Bold',
      icon: 'B',
      action: () => insertMarkdown('**', '**'),
      className: 'font-bold',
    },
    {
      label: 'Italic',
      icon: 'I',
      action: () => insertMarkdown('*', '*'),
      className: 'italic',
    },
    {
      label: 'Heading 1',
      icon: 'H1',
      action: () => insertMarkdown('# '),
      className: 'text-xs font-semibold',
    },
    {
      label: 'Heading 2',
      icon: 'H2',
      action: () => insertMarkdown('## '),
      className: 'text-xs font-semibold',
    },
    {
      label: 'Heading 3',
      icon: 'H3',
      action: () => insertMarkdown('### '),
      className: 'text-xs font-semibold',
    },
    {
      label: 'Link',
      icon: (
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
            d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244"
          />
        </svg>
      ),
      action: () => insertMarkdown('[', '](url)'),
    },
    {
      label: 'Code',
      icon: (
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
            d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5"
          />
        </svg>
      ),
      action: () => insertMarkdown('`', '`'),
    },
    {
      label: 'Code Block',
      icon: '{ }',
      action: () => insertMarkdown('```\n', '\n```'),
      className: 'text-xs',
    },
    {
      label: 'Quote',
      icon: (
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
            d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z"
          />
        </svg>
      ),
      action: () => insertMarkdown('> '),
    },
    {
      label: 'List',
      icon: (
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
            d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 5.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
          />
        </svg>
      ),
      action: () => insertMarkdown('- '),
    },
  ];

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 p-2 bg-background-tertiary border-b border-border">
        {/* Formatting buttons */}
        <div className="flex items-center gap-1">
          {toolbarButtons.map((button) => (
            <button
              key={button.label}
              type="button"
              onClick={button.action}
              title={button.label}
              className={`p-1.5 text-text-secondary hover:text-text-primary hover:bg-background-primary rounded transition-colors ${button.className || ''}`}
            >
              {typeof button.icon === 'string' ? (
                <span className="w-4 h-4 flex items-center justify-center">
                  {button.icon}
                </span>
              ) : (
                button.icon
              )}
            </button>
          ))}
        </div>

        {/* View mode toggle */}
        <div className="flex items-center gap-1 p-1 bg-background-primary rounded-lg">
          <button
            type="button"
            onClick={() => setViewMode('write')}
            className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
              viewMode === 'write'
                ? 'bg-primary text-white'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Write
          </button>
          <button
            type="button"
            onClick={() => setViewMode('split')}
            className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
              viewMode === 'split'
                ? 'bg-primary text-white'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Split
          </button>
          <button
            type="button"
            onClick={() => setViewMode('preview')}
            className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
              viewMode === 'preview'
                ? 'bg-primary text-white'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Preview
          </button>
        </div>
      </div>

      {/* Editor area */}
      <div
        className={`${viewMode === 'split' ? 'grid grid-cols-2' : ''}`}
        style={{ minHeight }}
      >
        {/* Write mode */}
        {(viewMode === 'write' || viewMode === 'split') && (
          <div
            className={`${viewMode === 'split' ? 'border-r border-border' : ''}`}
          >
            <textarea
              id="mdx-editor-textarea"
              value={value}
              onChange={handleTextChange}
              placeholder={placeholder}
              className="w-full h-full p-4 text-sm text-text-primary bg-background-primary font-mono resize-none focus:outline-none"
              style={{
                minHeight: viewMode === 'split' ? minHeight : minHeight,
              }}
            />
          </div>
        )}

        {/* Preview mode */}
        {(viewMode === 'preview' || viewMode === 'split') && (
          <div
            className="p-4 prose prose-sm max-w-none overflow-auto bg-background-secondary"
            style={{ minHeight: viewMode === 'split' ? minHeight : minHeight }}
          >
            {value ? (
              <div
                className="text-text-primary"
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            ) : (
              <p className="text-text-muted italic">
                Nothing to preview yet...
              </p>
            )}
          </div>
        )}
      </div>

      {/* Footer with character count */}
      <div className="flex items-center justify-between px-4 py-2 bg-background-tertiary border-t border-border">
        <p className="text-xs text-text-muted">
          Supports Markdown and MDX syntax
        </p>
        <p className="text-xs text-text-muted">{value.length} characters</p>
      </div>
    </div>
  );
}
