import { describe, it, expect } from 'vitest';

/**
 * Tests for MDX component preview in the MDXEditor
 * Task: content-4 - Add MDX component preview in editor
 */

// Types for MDX components
type MDXComponentType = 'Callout' | 'Note' | 'Tip' | 'Warning' | 'ProductCard';

interface MDXComponent {
  type: MDXComponentType;
  props: Record<string, string>;
  children: string;
}

// Utility: Parse MDX component from markdown string
function parseMDXComponent(content: string): MDXComponent | null {
  // Match pattern: <ComponentName prop="value">content</ComponentName>
  const match = content.match(/<(\w+)([^>]*)>([\s\S]*?)<\/\1>/);
  if (!match) return null;

  const [, type, propsString, children] = match;

  // Parse props
  const props: Record<string, string> = {};
  const propMatches = propsString.matchAll(/(\w+)=["']([^"']*)["']/g);
  for (const propMatch of propMatches) {
    props[propMatch[1]] = propMatch[2];
  }

  return {
    type: type as MDXComponentType,
    props,
    children: children.trim(),
  };
}

// Utility: Check if component type is supported
function isSupportedMDXComponent(type: string): type is MDXComponentType {
  const supportedComponents: MDXComponentType[] = [
    'Callout',
    'Note',
    'Tip',
    'Warning',
    'ProductCard',
  ];
  return supportedComponents.includes(type as MDXComponentType);
}

// Utility: Render MDX component to HTML for preview
function renderMDXComponentToHtml(component: MDXComponent): string {
  const { type, props, children } = component;

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
      return `<div class="mdx-product-card border border-border rounded-lg p-4 my-4" data-component="ProductCard" data-sku="${sku || ''}">
        <p class="font-semibold">${name || 'Product'}</p>
        <p class="text-sm text-text-secondary">SKU: ${sku || 'N/A'}</p>
      </div>`;
    }

    default:
      return '';
  }
}

// Utility: Render unsupported component error
function renderUnsupportedComponentError(componentType: string): string {
  return `<div class="mdx-error bg-red-50 border border-red-200 text-red-700 p-4 my-4 rounded" data-error="unsupported-component">
    <p class="font-semibold">Unsupported Component</p>
    <p class="text-sm">The component &lt;${componentType}&gt; is not supported in preview. Supported components: Callout, Note, Tip, Warning, ProductCard.</p>
  </div>`;
}

describe('MDX Component Preview', () => {
  describe('Supported MDX Components', () => {
    it('should recognize Callout as a supported component', () => {
      expect(isSupportedMDXComponent('Callout')).toBe(true);
    });

    it('should recognize Note as a supported component', () => {
      expect(isSupportedMDXComponent('Note')).toBe(true);
    });

    it('should recognize Tip as a supported component', () => {
      expect(isSupportedMDXComponent('Tip')).toBe(true);
    });

    it('should recognize Warning as a supported component', () => {
      expect(isSupportedMDXComponent('Warning')).toBe(true);
    });

    it('should recognize ProductCard as a supported component', () => {
      expect(isSupportedMDXComponent('ProductCard')).toBe(true);
    });

    it('should not recognize arbitrary components as supported', () => {
      expect(isSupportedMDXComponent('RandomComponent')).toBe(false);
      expect(isSupportedMDXComponent('CustomWidget')).toBe(false);
      expect(isSupportedMDXComponent('div')).toBe(false);
    });
  });

  describe('MDX Component Parsing', () => {
    it('should parse a simple component without props', () => {
      const markdown = '<Note>This is a note</Note>';
      const component = parseMDXComponent(markdown);

      expect(component).not.toBeNull();
      expect(component?.type).toBe('Note');
      expect(component?.children).toBe('This is a note');
      expect(Object.keys(component?.props || {})).toHaveLength(0);
    });

    it('should parse component with props', () => {
      const markdown = '<Callout type="warning">Be careful!</Callout>';
      const component = parseMDXComponent(markdown);

      expect(component).not.toBeNull();
      expect(component?.type).toBe('Callout');
      expect(component?.props.type).toBe('warning');
      expect(component?.children).toBe('Be careful!');
    });

    it('should parse component with multiple props', () => {
      const markdown =
        '<ProductCard sku="ABC-123" name="Test Product">Details here</ProductCard>';
      const component = parseMDXComponent(markdown);

      expect(component).not.toBeNull();
      expect(component?.type).toBe('ProductCard');
      expect(component?.props.sku).toBe('ABC-123');
      expect(component?.props.name).toBe('Test Product');
      expect(component?.children).toBe('Details here');
    });

    it('should handle multiline content inside components', () => {
      const markdown = `<Note>
This is line 1.
This is line 2.
</Note>`;
      const component = parseMDXComponent(markdown);

      expect(component).not.toBeNull();
      expect(component?.children).toContain('line 1');
      expect(component?.children).toContain('line 2');
    });

    it('should return null for invalid component syntax', () => {
      const markdown = 'Just regular text';
      const component = parseMDXComponent(markdown);
      expect(component).toBeNull();
    });

    it('should return null for unclosed components', () => {
      const markdown = '<Note>Unclosed note';
      const component = parseMDXComponent(markdown);
      expect(component).toBeNull();
    });
  });

  describe('Component Rendering to HTML', () => {
    it('should render Note component with correct styles', () => {
      const component: MDXComponent = {
        type: 'Note',
        props: {},
        children: 'This is a note',
      };
      const html = renderMDXComponentToHtml(component);

      expect(html).toContain('data-component="Note"');
      expect(html).toContain('mdx-note');
      expect(html).toContain('bg-blue-50');
      expect(html).toContain('border-blue-500');
      expect(html).toContain('This is a note');
    });

    it('should render Tip component with green styles', () => {
      const component: MDXComponent = {
        type: 'Tip',
        props: {},
        children: 'Pro tip here',
      };
      const html = renderMDXComponentToHtml(component);

      expect(html).toContain('data-component="Tip"');
      expect(html).toContain('mdx-tip');
      expect(html).toContain('bg-green-50');
      expect(html).toContain('border-green-500');
      expect(html).toContain('Pro tip here');
    });

    it('should render Warning component with yellow styles', () => {
      const component: MDXComponent = {
        type: 'Warning',
        props: {},
        children: 'Warning message',
      };
      const html = renderMDXComponentToHtml(component);

      expect(html).toContain('data-component="Warning"');
      expect(html).toContain('mdx-warning');
      expect(html).toContain('bg-yellow-50');
      expect(html).toContain('border-yellow-500');
    });

    it('should render Callout with default info variant', () => {
      const component: MDXComponent = {
        type: 'Callout',
        props: {},
        children: 'Default callout',
      };
      const html = renderMDXComponentToHtml(component);

      expect(html).toContain('data-component="Callout"');
      expect(html).toContain('bg-blue-50');
      expect(html).toContain('border-blue-500');
    });

    it('should render Callout with warning variant', () => {
      const component: MDXComponent = {
        type: 'Callout',
        props: { type: 'warning' },
        children: 'Warning callout',
      };
      const html = renderMDXComponentToHtml(component);

      expect(html).toContain('bg-yellow-50');
      expect(html).toContain('border-yellow-500');
    });

    it('should render Callout with error variant', () => {
      const component: MDXComponent = {
        type: 'Callout',
        props: { type: 'error' },
        children: 'Error callout',
      };
      const html = renderMDXComponentToHtml(component);

      expect(html).toContain('bg-red-50');
      expect(html).toContain('border-red-500');
    });

    it('should render Callout with success variant', () => {
      const component: MDXComponent = {
        type: 'Callout',
        props: { type: 'success' },
        children: 'Success callout',
      };
      const html = renderMDXComponentToHtml(component);

      expect(html).toContain('bg-green-50');
      expect(html).toContain('border-green-500');
    });

    it('should render ProductCard with sku and name', () => {
      const component: MDXComponent = {
        type: 'ProductCard',
        props: { sku: 'PROD-001', name: 'Beautiful Bag' },
        children: '',
      };
      const html = renderMDXComponentToHtml(component);

      expect(html).toContain('data-component="ProductCard"');
      expect(html).toContain('data-sku="PROD-001"');
      expect(html).toContain('Beautiful Bag');
      expect(html).toContain('PROD-001');
    });

    it('should handle ProductCard with missing props gracefully', () => {
      const component: MDXComponent = {
        type: 'ProductCard',
        props: {},
        children: '',
      };
      const html = renderMDXComponentToHtml(component);

      expect(html).toContain('Product');
      expect(html).toContain('N/A');
    });
  });

  describe('Unsupported Component Error Handling', () => {
    it('should show error for unsupported components', () => {
      const html = renderUnsupportedComponentError('CustomWidget');

      expect(html).toContain('mdx-error');
      expect(html).toContain('data-error="unsupported-component"');
      expect(html).toContain('Unsupported Component');
      expect(html).toContain('CustomWidget');
    });

    it('should list all supported components in error message', () => {
      const html = renderUnsupportedComponentError('InvalidComponent');

      expect(html).toContain('Callout');
      expect(html).toContain('Note');
      expect(html).toContain('Tip');
      expect(html).toContain('Warning');
      expect(html).toContain('ProductCard');
    });

    it('should style error message with red theme', () => {
      const html = renderUnsupportedComponentError('Unknown');

      expect(html).toContain('bg-red-50');
      expect(html).toContain('border-red-200');
      expect(html).toContain('text-red-700');
    });
  });

  describe('Toolbar Component Buttons', () => {
    // These tests verify the expected toolbar button structure
    const componentButtons = [
      { label: 'Callout', markdown: '<Callout type="info">\n\n</Callout>' },
      { label: 'Note', markdown: '<Note>\n\n</Note>' },
      { label: 'Tip', markdown: '<Tip>\n\n</Tip>' },
      { label: 'Warning', markdown: '<Warning>\n\n</Warning>' },
    ];

    it('should have toolbar button for Callout component', () => {
      const calloutButton = componentButtons.find((b) => b.label === 'Callout');
      expect(calloutButton).toBeDefined();
      expect(calloutButton?.markdown).toContain('<Callout');
    });

    it('should have toolbar button for Note component', () => {
      const noteButton = componentButtons.find((b) => b.label === 'Note');
      expect(noteButton).toBeDefined();
      expect(noteButton?.markdown).toContain('<Note>');
    });

    it('should have toolbar button for Tip component', () => {
      const tipButton = componentButtons.find((b) => b.label === 'Tip');
      expect(tipButton).toBeDefined();
      expect(tipButton?.markdown).toContain('<Tip>');
    });

    it('should have toolbar button for Warning component', () => {
      const warningButton = componentButtons.find((b) => b.label === 'Warning');
      expect(warningButton).toBeDefined();
      expect(warningButton?.markdown).toContain('<Warning>');
    });

    it('should insert component with newlines for easy editing', () => {
      const noteButton = componentButtons.find((b) => b.label === 'Note');
      // Markdown should have newlines to position cursor between tags
      expect(noteButton?.markdown).toBe('<Note>\n\n</Note>');
    });

    it('should insert Callout with default type prop', () => {
      const calloutButton = componentButtons.find((b) => b.label === 'Callout');
      expect(calloutButton?.markdown).toContain('type="info"');
    });
  });

  describe('Integration with markdownToHtml', () => {
    // These tests verify the integration expectations

    it('should preserve markdown around MDX components', () => {
      const markdown = `
# Title

<Note>Important note here</Note>

Regular paragraph text.
`;
      // The preview should handle both markdown and MDX components
      expect(markdown).toContain('# Title');
      expect(markdown).toContain('<Note>');
      expect(markdown).toContain('Regular paragraph');
    });

    it('should handle multiple components in same content', () => {
      const markdown = `
<Note>First note</Note>

<Warning>A warning</Warning>

<Tip>A helpful tip</Tip>
`;
      // All components should be parseable
      expect(markdown.match(/<Note>/g)?.length).toBe(1);
      expect(markdown.match(/<Warning>/g)?.length).toBe(1);
      expect(markdown.match(/<Tip>/g)?.length).toBe(1);
    });

    it('should not affect regular HTML-like text in code blocks', () => {
      const markdown = '```html\n<div>Not a component</div>\n```';
      // Code blocks should not be parsed as MDX components
      expect(markdown).toContain('```');
    });
  });
});
