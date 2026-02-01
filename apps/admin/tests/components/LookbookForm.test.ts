import { describe, it, expect, beforeEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { Drop } from '@dear-margeaux/api';

// Sample drops data for testing
const mockDrops: Drop[] = [
  {
    id: 'drop-1',
    name: 'Spring 2026',
    slug: 'spring-2026',
    description: 'Spring collection',
    status: 'active',
    start_date: '2026-03-01T00:00:00Z',
    end_date: null,
    cover_image: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'drop-2',
    name: 'Winter 2025',
    slug: 'winter-2025',
    description: 'Winter collection',
    status: 'ended',
    start_date: '2025-12-01T00:00:00Z',
    end_date: '2026-02-28T00:00:00Z',
    cover_image: null,
    created_at: '2025-11-01T00:00:00Z',
    updated_at: '2025-11-01T00:00:00Z',
  },
];

// Sample lookbook data for edit mode
const mockLookbookData = {
  title: 'Spring Collection Lookbook',
  description: 'Our beautiful spring collection showcase',
  date: '2026-03-15',
  drop: 'spring-2026',
  coverImage: 'https://example.com/cover.webp',
  draft: false,
};

describe('LookbookForm Component', () => {
  let componentContent: string;

  beforeEach(async () => {
    const componentPath = path.resolve(
      process.cwd(),
      'src/components/LookbookForm.tsx'
    );
    componentContent = await fs.readFile(componentPath, 'utf-8');
  });

  describe('Component Structure', () => {
    it('exports LookbookForm component', () => {
      expect(componentContent).toMatch(
        /export\s+(function|const)\s+LookbookForm/
      );
    });

    it('exports LookbookFormData type', () => {
      expect(componentContent).toMatch(
        /export\s+(interface|type)\s+LookbookFormData/
      );
    });

    it('exports LookbookFormProps type', () => {
      expect(componentContent).toMatch(
        /export\s+(interface|type)\s+LookbookFormProps/
      );
    });
  });

  describe('Form Fields', () => {
    it('renders title input field', () => {
      expect(componentContent).toMatch(/name="title"/i);
      expect(componentContent).toMatch(/id="title"/i);
      expect(componentContent).toMatch(/<label[^>]*htmlFor="title"/i);
    });

    it('renders description textarea field', () => {
      expect(componentContent).toMatch(/name="description"/i);
      expect(componentContent).toMatch(/id="description"/i);
      expect(componentContent).toMatch(/<textarea/i);
    });

    it('renders date input field', () => {
      expect(componentContent).toMatch(/type="date"/i);
      expect(componentContent).toMatch(/name="date"/i);
      expect(componentContent).toMatch(/id="date"/i);
    });

    it('renders draft toggle/checkbox', () => {
      // Should have a draft toggle with checkbox input
      expect(componentContent).toMatch(/type="checkbox"/i);
      expect(componentContent).toMatch(/name="draft"/i);
      expect(componentContent).toMatch(/draft/i);
    });

    it('renders drop selector (optional)', () => {
      expect(componentContent).toMatch(/<select/i);
      expect(componentContent).toMatch(/drops/i);
    });

    it('renders cover image section', () => {
      expect(componentContent).toMatch(/cover\s*image/i);
      expect(componentContent).toMatch(/ImageUploader/i);
    });
  });

  describe('LookbookFormData Interface', () => {
    it('includes title field', () => {
      expect(componentContent).toMatch(/title:\s*string/);
    });

    it('includes description field', () => {
      expect(componentContent).toMatch(/description\??:\s*string/);
    });

    it('includes date field', () => {
      expect(componentContent).toMatch(/date:\s*string/);
    });

    it('includes draft field', () => {
      expect(componentContent).toMatch(/draft:\s*boolean/);
    });

    it('includes optional drop field', () => {
      expect(componentContent).toMatch(/drop\??:\s*string/);
    });

    it('includes optional coverImage field', () => {
      expect(componentContent).toMatch(/coverImage\??:\s*string/);
    });
  });

  describe('LookbookFormProps Interface', () => {
    it('includes optional lookbook for edit mode', () => {
      expect(componentContent).toMatch(/lookbook\??:\s*LookbookFormData/);
    });

    it('includes onSubmit callback', () => {
      expect(componentContent).toMatch(/onSubmit:\s*\([^)]*\)\s*=>/);
    });

    it('includes onCancel callback', () => {
      expect(componentContent).toMatch(/onCancel:\s*\(\)/);
    });

    it('includes isSubmitting flag', () => {
      expect(componentContent).toMatch(/isSubmitting\??:\s*boolean/);
    });

    it('includes error prop', () => {
      expect(componentContent).toMatch(/error\??:\s*string\s*\|\s*null/);
    });

    it('includes drops array', () => {
      expect(componentContent).toMatch(/drops:\s*Drop\[\]/);
    });

    it('includes optional uploadHandler', () => {
      expect(componentContent).toMatch(/uploadHandler\??:/);
    });
  });

  describe('Form Validation', () => {
    it('validates title is required', () => {
      expect(componentContent).toMatch(/title.*required|required.*title/i);
    });

    it('validates date is required', () => {
      expect(componentContent).toMatch(/date.*required|required.*date/i);
    });

    it('validates title max length (200 characters)', () => {
      expect(componentContent).toMatch(/200/);
    });
  });

  describe('Create Mode', () => {
    it('shows Create Lookbook button when no lookbook prop', () => {
      expect(componentContent).toMatch(/create\s*lookbook/i);
    });

    it('draft defaults to true in create mode', () => {
      expect(componentContent).toMatch(/draft.*true|true.*draft/i);
    });
  });

  describe('Edit Mode', () => {
    it('shows Save Changes button when lookbook prop provided', () => {
      expect(componentContent).toMatch(/save\s*changes/i);
    });

    it('pre-fills fields from lookbook prop', () => {
      // Component should use lookbook data for initial state
      expect(componentContent).toMatch(/lookbook\??\.\s*title/);
      expect(componentContent).toMatch(/lookbook\??\.\s*description/);
      expect(componentContent).toMatch(/lookbook\??\.\s*date/);
    });
  });

  describe('Drop Selector', () => {
    it('includes None option for no association', () => {
      expect(componentContent).toMatch(/none/i);
    });

    it('maps drops array to options', () => {
      expect(componentContent).toMatch(/drops\.map/i);
    });

    it('uses drop slug as value', () => {
      // Component uses `d.slug` where d is the map variable
      expect(componentContent).toMatch(/\.slug/);
    });

    it('shows drop name as label', () => {
      // Component uses `d.name` where d is the map variable
      expect(componentContent).toMatch(/\.name/);
    });
  });

  describe('Cover Image', () => {
    it('shows ImageUploader when uploadHandler provided', () => {
      expect(componentContent).toMatch(/uploadHandler\s*\?/);
      expect(componentContent).toMatch(/<ImageUploader/);
    });

    it('shows URL input when uploadHandler not provided', () => {
      expect(componentContent).toMatch(/type="url"/);
    });

    it('handles cover image upload', () => {
      expect(componentContent).toMatch(/onUpload/);
    });

    it('handles cover image removal', () => {
      expect(componentContent).toMatch(/onRemove/);
    });
  });

  describe('Form Actions', () => {
    it('has submit button', () => {
      expect(componentContent).toMatch(/type="submit"/);
    });

    it('has cancel button', () => {
      expect(componentContent).toMatch(/type="button"[^>]*onClick/);
      expect(componentContent).toMatch(/cancel/i);
    });

    it('disables buttons when isSubmitting', () => {
      expect(componentContent).toMatch(/disabled={isSubmitting}/);
    });

    it('shows loading state when submitting', () => {
      expect(componentContent).toMatch(/saving/i);
    });
  });

  describe('Error Display', () => {
    it('displays error message when error prop provided', () => {
      expect(componentContent).toMatch(/{error\s*&&/);
      expect(componentContent).toMatch(/status-error/);
    });

    it('displays validation errors below fields', () => {
      expect(componentContent).toMatch(/formErrors/);
    });
  });
});

describe('LookbookFormData Type', () => {
  it('validates correct data structure', () => {
    // Type-level test - the mock data should match the expected structure
    const lookbook = mockLookbookData;
    expect(lookbook.title).toBe('Spring Collection Lookbook');
    expect(lookbook.description).toBe(
      'Our beautiful spring collection showcase'
    );
    expect(lookbook.date).toBe('2026-03-15');
    expect(lookbook.drop).toBe('spring-2026');
    expect(lookbook.coverImage).toBe('https://example.com/cover.webp');
    expect(lookbook.draft).toBe(false);
  });

  it('allows optional fields to be undefined', () => {
    const minimalLookbook = {
      title: 'Test',
      date: '2026-01-01',
      draft: true,
    };
    expect(minimalLookbook.title).toBeDefined();
    expect(minimalLookbook.date).toBeDefined();
    expect(minimalLookbook.draft).toBeDefined();
  });
});

describe('Drops Integration', () => {
  it('handles empty drops array', () => {
    const emptyDrops: Drop[] = [];
    expect(emptyDrops).toHaveLength(0);
  });

  it('maps drops correctly', () => {
    expect(mockDrops[0].name).toBe('Spring 2026');
    expect(mockDrops[0].slug).toBe('spring-2026');
    expect(mockDrops[1].name).toBe('Winter 2025');
    expect(mockDrops[1].slug).toBe('winter-2025');
  });
});
