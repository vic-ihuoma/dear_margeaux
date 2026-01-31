import { useState, useCallback, useMemo, useRef } from 'react';

export interface MDXEditorProps {
  /** Initial content */
  value: string;
  /** Called when content changes */
  onChange: (value: string) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Minimum height for the editor */
  minHeight?: string;
  /** Optional image upload handler - enables image upload button when provided */
  onImageUpload?: (file: File) => Promise<{ url: string; key: string }>;
}

// Supported MDX component types
type MDXComponentType = 'Callout' | 'Note' | 'Tip' | 'Warning' | 'ProductCard';

const SUPPORTED_MDX_COMPONENTS: MDXComponentType[] = [
  'Callout',
  'Note',
  'Tip',
  'Warning',
  'ProductCard',
];

/**
 * Check if a component type is supported
 */
function isSupportedMDXComponent(type: string): type is MDXComponentType {
  return SUPPORTED_MDX_COMPONENTS.includes(type as MDXComponentType);
}

/**
 * Render an MDX component to HTML for preview
 */
function renderMDXComponentToHtml(
  type: string,
  props: Record<string, string>,
  children: string
): string {
  if (!isSupportedMDXComponent(type)) {
    return `<div class="bg-red-50 border border-red-200 text-red-700 p-4 my-4 rounded" data-error="unsupported-component">
      <p class="font-semibold">Unsupported Component</p>
      <p class="text-sm">The component &lt;${type}&gt; is not supported in preview. Supported: Callout, Note, Tip, Warning, ProductCard.</p>
    </div>`;
  }

  switch (type) {
    case 'Callout': {
      const variant = props.type || 'info';
      const variantStyles: Record<string, string> = {
        info: 'bg-blue-50 border-blue-500 text-blue-800',
        success: 'bg-green-50 border-green-500 text-green-800',
        warning: 'bg-yellow-50 border-yellow-500 text-yellow-800',
        error: 'bg-red-50 border-red-500 text-red-800',
      };
      const styles = variantStyles[variant] || variantStyles.info;
      return `<div class="mdx-callout border-l-4 p-4 my-4 rounded-r ${styles}" data-component="Callout">${children}</div>`;
    }

    case 'Note':
      return `<div class="mdx-note bg-blue-50 border-l-4 border-blue-500 p-4 my-4 rounded-r text-blue-800" data-component="Note">${children}</div>`;

    case 'Tip':
      return `<div class="mdx-tip bg-green-50 border-l-4 border-green-500 p-4 my-4 rounded-r text-green-800" data-component="Tip">${children}</div>`;

    case 'Warning':
      return `<div class="mdx-warning bg-yellow-50 border-l-4 border-yellow-500 p-4 my-4 rounded-r text-yellow-800" data-component="Warning">${children}</div>`;

    case 'ProductCard': {
      const { sku, name } = props;
      return `<div class="mdx-product-card border border-gray-200 rounded-lg p-4 my-4 bg-white" data-component="ProductCard" data-sku="${sku || ''}">
        <p class="font-semibold">${name || 'Product'}</p>
        <p class="text-sm text-gray-500">SKU: ${sku || 'N/A'}</p>
      </div>`;
    }

    default:
      return '';
  }
}

/**
 * Process MDX components in markdown content
 * Finds <ComponentName props>content</ComponentName> patterns and renders them
 */
function processMDXComponents(html: string): string {
  // Match MDX component patterns: <ComponentName props?>content</ComponentName>
  // This regex captures: component name, props string, and inner content
  const componentRegex = /&lt;(\w+)([^&]*?)&gt;([\s\S]*?)&lt;\/\1&gt;/g;

  return html.replace(
    componentRegex,
    (match, componentType, propsString, children) => {
      // Parse props from string like ' type="warning" title="Hello"'
      const props: Record<string, string> = {};
      const propRegex = /(\w+)=["']([^"']*)["']/g;
      let propMatch;
      while ((propMatch = propRegex.exec(propsString)) !== null) {
        props[propMatch[1]] = propMatch[2];
      }

      return renderMDXComponentToHtml(componentType, props, children.trim());
    }
  );
}

/**
 * Validates a URL to prevent XSS via javascript: or data: protocols
 * Only allows http, https, mailto, and relative URLs
 */
function isValidUrl(url: string): boolean {
  const trimmedUrl = url.trim().toLowerCase();
  // Block dangerous protocols
  if (
    trimmedUrl.startsWith('javascript:') ||
    trimmedUrl.startsWith('data:') ||
    trimmedUrl.startsWith('vbscript:')
  ) {
    return false;
  }
  // Allow safe protocols and relative URLs
  if (
    trimmedUrl.startsWith('http://') ||
    trimmedUrl.startsWith('https://') ||
    trimmedUrl.startsWith('mailto:') ||
    trimmedUrl.startsWith('/') ||
    trimmedUrl.startsWith('#') ||
    !trimmedUrl.includes(':')
  ) {
    return true;
  }
  return false;
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

  // Images (must come before links to handle ![alt](url) before [text](url))
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_match, alt, url) => {
    if (isValidUrl(url)) {
      return `<img src="${url}" alt="${alt}" class="max-w-full h-auto rounded-lg my-4" />`;
    }
    // Invalid URL - render as placeholder
    return `[Image: ${alt}]`;
  });

  // Links (with URL protocol validation to prevent XSS)
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, text, url) => {
    if (isValidUrl(url)) {
      return `<a href="${url}" class="text-primary hover:underline">${text}</a>`;
    }
    // Invalid URL - render as plain text
    return `${text} (invalid link)`;
  });

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

  // Process MDX components (after HTML escaping but before returning)
  html = processMDXComponents(html);

  // Clean up paragraphs around MDX components
  html = html.replace(/<p class="my-4"><div class="mdx-/g, '<div class="mdx-');
  html = html.replace(/<\/div><\/p>/g, '</div>');

  return html;
}

type ViewMode = 'write' | 'preview' | 'split';

export function MDXEditor({
  value,
  onChange,
  placeholder = 'Start writing your content...',
  minHeight = '400px',
  onImageUpload,
}: MDXEditorProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('write');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

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

  const handleImageFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !onImageUpload) return;

      // Validate file type
      const acceptedTypes = [
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/gif',
      ];
      if (!acceptedTypes.includes(file.type)) {
        setUploadError('Please upload a JPEG, PNG, WebP, or GIF image');
        return;
      }

      // Validate file size (5MB max)
      const maxFileSize = 5 * 1024 * 1024;
      if (file.size > maxFileSize) {
        setUploadError('File size must be less than 5MB');
        return;
      }

      setUploadError(null);
      setIsUploadingImage(true);

      try {
        const result = await onImageUpload(file);
        // Extract filename for alt text
        const altText = file.name
          .replace(/\.[^/.]+$/, '')
          .replace(/[-_]/g, ' ');
        // Insert markdown image syntax
        insertMarkdown(`![${altText}](${result.url})\n`);
      } catch (err) {
        console.error('Image upload failed:', err);
        setUploadError('Failed to upload image. Please try again.');
      } finally {
        setIsUploadingImage(false);
        // Reset the input
        if (imageInputRef.current) {
          imageInputRef.current.value = '';
        }
      }
    },
    [onImageUpload, insertMarkdown]
  );

  const handleImageButtonClick = useCallback(() => {
    if (onImageUpload && !isUploadingImage) {
      imageInputRef.current?.click();
    }
  }, [onImageUpload, isUploadingImage]);

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

  // MDX component toolbar buttons
  const componentButtons = [
    {
      label: 'Callout',
      title: 'Insert Callout (info, warning, error, success)',
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
            d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
          />
        </svg>
      ),
      action: () => insertMarkdown('<Callout type="info">\n', '\n</Callout>'),
    },
    {
      label: 'Note',
      title: 'Insert Note',
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
            d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
          />
        </svg>
      ),
      action: () => insertMarkdown('<Note>\n', '\n</Note>'),
    },
    {
      label: 'Tip',
      title: 'Insert Tip',
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
            d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18"
          />
        </svg>
      ),
      action: () => insertMarkdown('<Tip>\n', '\n</Tip>'),
    },
    {
      label: 'Warning',
      title: 'Insert Warning',
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
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
          />
        </svg>
      ),
      action: () => insertMarkdown('<Warning>\n', '\n</Warning>'),
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

          {/* MDX Component buttons separator */}
          <div className="w-px h-4 bg-border mx-1" aria-hidden="true" />

          {/* MDX Component insertion buttons */}
          {componentButtons.map((button) => (
            <button
              key={button.label}
              type="button"
              onClick={button.action}
              title={button.title}
              className="p-1.5 text-text-secondary hover:text-text-primary hover:bg-background-primary rounded transition-colors"
            >
              {button.icon}
            </button>
          ))}

          {/* Image upload button - only shown when onImageUpload is provided */}
          {onImageUpload && (
            <>
              <div className="w-px h-4 bg-border mx-1" aria-hidden="true" />
              <button
                type="button"
                onClick={handleImageButtonClick}
                disabled={isUploadingImage}
                title="Upload Image"
                className={`p-1.5 text-text-secondary hover:text-text-primary hover:bg-background-primary rounded transition-colors ${isUploadingImage ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isUploadingImage ? (
                  <svg
                    className="animate-spin w-4 h-4"
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
                ) : (
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
                      d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
                    />
                  </svg>
                )}
              </button>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleImageFileSelect}
                className="hidden"
                aria-label="Upload image"
              />
            </>
          )}
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

      {/* Upload error message */}
      {uploadError && (
        <div className="px-4 py-2 bg-status-error/10 border-t border-status-error/20">
          <p className="text-xs text-status-error">{uploadError}</p>
        </div>
      )}

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
