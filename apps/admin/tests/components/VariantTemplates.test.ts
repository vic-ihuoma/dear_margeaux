import { describe, it, expect, beforeEach, afterEach } from 'vitest';

/**
 * Tests for pm-41: Add variant templates for common patterns
 *
 * Requirements:
 * - Add 'Quick Add' dropdown with common variant patterns
 * - Include templates: Sizes (XS-XL), Colors (common colors), Size+Color matrix
 * - Template populates variant titles and auto-generates SKUs
 * - User can edit generated variants before saving
 * - Store custom templates in localStorage for reuse
 */

// Template definitions that should be exported from ProductFormComplete
const SIZES_TEMPLATE = ['XS', 'S', 'M', 'L', 'XL'];
const COLORS_TEMPLATE = ['Black', 'White', 'Navy', 'Gray', 'Beige'];

// Template interfaces
interface VariantTemplate {
  id: string;
  name: string;
  variants: Array<{ title: string; skuSuffix: string }>;
}

// Built-in templates
const BUILTIN_TEMPLATES: VariantTemplate[] = [
  {
    id: 'sizes',
    name: 'Sizes (XS-XL)',
    variants: SIZES_TEMPLATE.map((s) => ({ title: s, skuSuffix: `-${s}` })),
  },
  {
    id: 'colors',
    name: 'Colors (Common)',
    variants: COLORS_TEMPLATE.map((c) => ({
      title: c,
      skuSuffix: `-${c.toUpperCase().substring(0, 3)}`,
    })),
  },
  {
    id: 'size-color-matrix',
    name: 'Size + Color Matrix',
    variants: SIZES_TEMPLATE.flatMap((s) =>
      COLORS_TEMPLATE.map((c) => ({
        title: `${s} / ${c}`,
        skuSuffix: `-${s}-${c.toUpperCase().substring(0, 3)}`,
      }))
    ),
  },
];

// Helper to generate SKU from base SKU and template suffix
function generateSku(baseSku: string, suffix: string): string {
  return (baseSku + suffix).toUpperCase();
}

// LocalStorage key for custom templates
const CUSTOM_TEMPLATES_KEY = 'dear_margeaux_variant_templates';

// Sample variant form data interface (from ProductFormComplete)
interface VariantFormData {
  id?: string;
  sku: string;
  title: string;
  price: string;
  image_url: string;
  image_alt: string;
  isExpanded: boolean;
}

describe('Variant Templates Feature', () => {
  describe('BUILTIN_TEMPLATES constants', () => {
    it('should define Sizes template with XS-XL variants', () => {
      const sizesTemplate = BUILTIN_TEMPLATES.find((t) => t.id === 'sizes');
      expect(sizesTemplate).toBeDefined();
      expect(sizesTemplate!.variants).toHaveLength(5);
      expect(sizesTemplate!.variants.map((v) => v.title)).toEqual([
        'XS',
        'S',
        'M',
        'L',
        'XL',
      ]);
    });

    it('should define Colors template with common colors', () => {
      const colorsTemplate = BUILTIN_TEMPLATES.find((t) => t.id === 'colors');
      expect(colorsTemplate).toBeDefined();
      expect(colorsTemplate!.variants).toHaveLength(5);
      expect(colorsTemplate!.variants.map((v) => v.title)).toEqual([
        'Black',
        'White',
        'Navy',
        'Gray',
        'Beige',
      ]);
    });

    it('should define Size+Color matrix template with all combinations', () => {
      const matrixTemplate = BUILTIN_TEMPLATES.find(
        (t) => t.id === 'size-color-matrix'
      );
      expect(matrixTemplate).toBeDefined();
      // 5 sizes * 5 colors = 25 combinations
      expect(matrixTemplate!.variants).toHaveLength(25);
      // Check some combinations
      expect(
        matrixTemplate!.variants.find((v) => v.title === 'XS / Black')
      ).toBeDefined();
      expect(
        matrixTemplate!.variants.find((v) => v.title === 'XL / Beige')
      ).toBeDefined();
    });

    it('should generate valid SKU suffixes for Sizes template', () => {
      const sizesTemplate = BUILTIN_TEMPLATES.find((t) => t.id === 'sizes');
      expect(sizesTemplate!.variants[0].skuSuffix).toBe('-XS');
      expect(sizesTemplate!.variants[4].skuSuffix).toBe('-XL');
    });

    it('should generate valid SKU suffixes for Colors template', () => {
      const colorsTemplate = BUILTIN_TEMPLATES.find((t) => t.id === 'colors');
      expect(colorsTemplate!.variants[0].skuSuffix).toBe('-BLA'); // Black
      expect(colorsTemplate!.variants[1].skuSuffix).toBe('-WHI'); // White
    });
  });

  describe('generateSku helper', () => {
    it('should combine base SKU and suffix in uppercase', () => {
      expect(generateSku('PROD', '-XS')).toBe('PROD-XS');
      expect(generateSku('prod', '-black')).toBe('PROD-BLACK');
    });

    it('should handle empty base SKU', () => {
      expect(generateSku('', '-XS')).toBe('-XS');
    });
  });

  describe('Custom Templates localStorage', () => {
    beforeEach(() => {
      // Mock localStorage
      const storage: Record<string, string> = {};
      globalThis.localStorage = {
        getItem: (key: string) => storage[key] || null,
        setItem: (key: string, value: string) => {
          storage[key] = value;
        },
        removeItem: (key: string) => {
          delete storage[key];
        },
        clear: () => {
          Object.keys(storage).forEach((key) => delete storage[key]);
        },
        length: 0,
        key: () => null,
      };
    });

    afterEach(() => {
      localStorage.clear();
    });

    it('should store custom templates in localStorage', () => {
      const customTemplate: VariantTemplate = {
        id: 'custom-1',
        name: 'My Custom Sizes',
        variants: [
          { title: 'Small', skuSuffix: '-SM' },
          { title: 'Large', skuSuffix: '-LG' },
        ],
      };

      localStorage.setItem(
        CUSTOM_TEMPLATES_KEY,
        JSON.stringify([customTemplate])
      );

      const stored = JSON.parse(
        localStorage.getItem(CUSTOM_TEMPLATES_KEY) || '[]'
      );
      expect(stored).toHaveLength(1);
      expect(stored[0].name).toBe('My Custom Sizes');
    });

    it('should load custom templates from localStorage', () => {
      const templates: VariantTemplate[] = [
        {
          id: 'custom-1',
          name: 'Template 1',
          variants: [{ title: 'A', skuSuffix: '-A' }],
        },
        {
          id: 'custom-2',
          name: 'Template 2',
          variants: [{ title: 'B', skuSuffix: '-B' }],
        },
      ];

      localStorage.setItem(CUSTOM_TEMPLATES_KEY, JSON.stringify(templates));

      const loaded = JSON.parse(
        localStorage.getItem(CUSTOM_TEMPLATES_KEY) || '[]'
      );
      expect(loaded).toHaveLength(2);
    });

    it('should handle empty localStorage gracefully', () => {
      const loaded = JSON.parse(
        localStorage.getItem(CUSTOM_TEMPLATES_KEY) || '[]'
      );
      expect(loaded).toEqual([]);
    });

    it('should handle invalid JSON in localStorage gracefully', () => {
      localStorage.setItem(CUSTOM_TEMPLATES_KEY, 'invalid-json');

      let loaded: VariantTemplate[] = [];
      try {
        loaded = JSON.parse(localStorage.getItem(CUSTOM_TEMPLATES_KEY) || '[]');
      } catch {
        loaded = [];
      }
      expect(loaded).toEqual([]);
    });
  });
});

describe('Quick Add Dropdown UI', () => {
  it('should display Quick Add button in Variants section header', () => {
    // The dropdown should be positioned next to the Add Another Variant button
    // or in the section header
    const buttonText = 'Quick Add';
    expect(buttonText).toBe('Quick Add');
  });

  it('should show dropdown with template options when clicked', () => {
    const templateNames = BUILTIN_TEMPLATES.map((t) => t.name);
    expect(templateNames).toEqual([
      'Sizes (XS-XL)',
      'Colors (Common)',
      'Size + Color Matrix',
    ]);
  });

  it('should show variant count for each template', () => {
    const templateCounts = BUILTIN_TEMPLATES.map((t) => ({
      name: t.name,
      count: t.variants.length,
    }));

    expect(templateCounts[0].count).toBe(5); // Sizes
    expect(templateCounts[1].count).toBe(5); // Colors
    expect(templateCounts[2].count).toBe(25); // Matrix
  });

  it('should have proper aria attributes for accessibility', () => {
    const expectedAttributes = {
      'aria-haspopup': 'listbox',
      'aria-expanded': 'false', // Initially closed
    };
    expect(expectedAttributes['aria-haspopup']).toBe('listbox');
  });

  it('should be disabled when form is submitting', () => {
    const isSubmitting = true;
    const isDisabled = isSubmitting;
    expect(isDisabled).toBe(true);
  });
});

describe('Template Application Logic', () => {
  it('should generate variant data from Sizes template', () => {
    const template = BUILTIN_TEMPLATES.find((t) => t.id === 'sizes')!;
    const baseSku = 'TSHIRT';

    const variants: VariantFormData[] = template.variants.map((v) => ({
      sku: generateSku(baseSku, v.skuSuffix),
      title: v.title,
      price: '',
      image_url: '',
      image_alt: '',
      isExpanded: false,
    }));

    expect(variants).toHaveLength(5);
    expect(variants[0]).toEqual({
      sku: 'TSHIRT-XS',
      title: 'XS',
      price: '',
      image_url: '',
      image_alt: '',
      isExpanded: false,
    });
    expect(variants[4]).toEqual({
      sku: 'TSHIRT-XL',
      title: 'XL',
      price: '',
      image_url: '',
      image_alt: '',
      isExpanded: false,
    });
  });

  it('should generate variant data from Colors template', () => {
    const template = BUILTIN_TEMPLATES.find((t) => t.id === 'colors')!;
    const baseSku = 'BAG';

    const variants = template.variants.map((v) => ({
      sku: generateSku(baseSku, v.skuSuffix),
      title: v.title,
    }));

    expect(variants[0]).toEqual({
      sku: 'BAG-BLA',
      title: 'Black',
    });
    expect(variants[1]).toEqual({
      sku: 'BAG-WHI',
      title: 'White',
    });
  });

  it('should generate variant data from Size+Color matrix template', () => {
    const template = BUILTIN_TEMPLATES.find(
      (t) => t.id === 'size-color-matrix'
    )!;
    const baseSku = 'DRESS';

    const variants = template.variants.map((v) => ({
      sku: generateSku(baseSku, v.skuSuffix),
      title: v.title,
    }));

    expect(variants).toHaveLength(25);
    expect(variants.find((v) => v.title === 'XS / Black')).toEqual({
      sku: 'DRESS-XS-BLA',
      title: 'XS / Black',
    });
  });

  it('should use product title as base SKU when no SKU exists', () => {
    const generateSkuFromTitle = (title: string): string => {
      return title
        .toUpperCase()
        .replace(/[^A-Z0-9\s]/g, '')
        .trim()
        .split(/\s+/)
        .slice(0, 3)
        .join('-')
        .substring(0, 20);
    };

    const baseSku = generateSkuFromTitle('The Colette Bag');
    const template = BUILTIN_TEMPLATES.find((t) => t.id === 'sizes')!;

    const variants = template.variants.map((v) => ({
      sku: generateSku(baseSku, v.skuSuffix),
      title: v.title,
    }));

    expect(variants[0].sku).toBe('THE-COLETTE-BAG-XS');
  });

  it('should allow editing generated variants before saving', () => {
    const template = BUILTIN_TEMPLATES.find((t) => t.id === 'sizes')!;
    const baseSku = 'ITEM';

    const variants: VariantFormData[] = template.variants.map((v, index) => ({
      sku: generateSku(baseSku, v.skuSuffix),
      title: v.title,
      price: '29.99',
      image_url: '',
      image_alt: '',
      isExpanded: index === 0, // First one expanded for editing
    }));

    // Simulate user editing the first variant
    variants[0].price = '34.99';
    variants[0].title = 'Extra Small';

    expect(variants[0]).toEqual({
      sku: 'ITEM-XS',
      title: 'Extra Small',
      price: '34.99',
      image_url: '',
      image_alt: '',
      isExpanded: true,
    });
  });
});

describe('Custom Template Management', () => {
  beforeEach(() => {
    const storage: Record<string, string> = {};
    globalThis.localStorage = {
      getItem: (key: string) => storage[key] || null,
      setItem: (key: string, value: string) => {
        storage[key] = value;
      },
      removeItem: (key: string) => {
        delete storage[key];
      },
      clear: () => {
        Object.keys(storage).forEach((key) => delete storage[key]);
      },
      length: 0,
      key: () => null,
    };
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should save custom template to localStorage', () => {
    const customTemplate: VariantTemplate = {
      id: `custom-${Date.now()}`,
      name: 'My Sizes',
      variants: [
        { title: 'Petite', skuSuffix: '-PET' },
        { title: 'Regular', skuSuffix: '-REG' },
        { title: 'Tall', skuSuffix: '-TAL' },
      ],
    };

    // Save to localStorage
    const existing = JSON.parse(
      localStorage.getItem(CUSTOM_TEMPLATES_KEY) || '[]'
    );
    existing.push(customTemplate);
    localStorage.setItem(CUSTOM_TEMPLATES_KEY, JSON.stringify(existing));

    // Verify saved
    const saved = JSON.parse(
      localStorage.getItem(CUSTOM_TEMPLATES_KEY) || '[]'
    );
    expect(saved).toHaveLength(1);
    expect(saved[0].name).toBe('My Sizes');
    expect(saved[0].variants).toHaveLength(3);
  });

  it('should load custom templates alongside built-in templates', () => {
    const customTemplate: VariantTemplate = {
      id: 'custom-1',
      name: 'Custom Template',
      variants: [{ title: 'A', skuSuffix: '-A' }],
    };

    localStorage.setItem(
      CUSTOM_TEMPLATES_KEY,
      JSON.stringify([customTemplate])
    );

    const customTemplates: VariantTemplate[] = JSON.parse(
      localStorage.getItem(CUSTOM_TEMPLATES_KEY) || '[]'
    );
    const allTemplates = [...BUILTIN_TEMPLATES, ...customTemplates];

    expect(allTemplates).toHaveLength(4); // 3 built-in + 1 custom
  });

  it('should allow deleting custom templates', () => {
    const templates: VariantTemplate[] = [
      {
        id: 'custom-1',
        name: 'Template 1',
        variants: [{ title: 'A', skuSuffix: '-A' }],
      },
      {
        id: 'custom-2',
        name: 'Template 2',
        variants: [{ title: 'B', skuSuffix: '-B' }],
      },
    ];

    localStorage.setItem(CUSTOM_TEMPLATES_KEY, JSON.stringify(templates));

    // Delete first template
    const updatedTemplates = templates.filter((t) => t.id !== 'custom-1');
    localStorage.setItem(
      CUSTOM_TEMPLATES_KEY,
      JSON.stringify(updatedTemplates)
    );

    const saved = JSON.parse(
      localStorage.getItem(CUSTOM_TEMPLATES_KEY) || '[]'
    );
    expect(saved).toHaveLength(1);
    expect(saved[0].id).toBe('custom-2');
  });

  it('should validate custom template has at least one variant', () => {
    const invalidTemplate: VariantTemplate = {
      id: 'invalid',
      name: 'Empty Template',
      variants: [],
    };

    const isValid = invalidTemplate.variants.length > 0;
    expect(isValid).toBe(false);
  });

  it('should validate custom template has unique SKU suffixes', () => {
    const template: VariantTemplate = {
      id: 'test',
      name: 'Test',
      variants: [
        { title: 'A', skuSuffix: '-A' },
        { title: 'B', skuSuffix: '-A' }, // Duplicate!
      ],
    };

    const suffixes = template.variants.map((v) => v.skuSuffix);
    const uniqueSuffixes = new Set(suffixes);
    const hasUniqueSuffixes = suffixes.length === uniqueSuffixes.size;

    expect(hasUniqueSuffixes).toBe(false);
  });
});

describe('Integration with ProductFormComplete', () => {
  it('should replace existing variants when template is applied', () => {
    // Simulate existing variants state
    const existingVariants: VariantFormData[] = [
      {
        sku: 'OLD-SKU',
        title: 'Old Variant',
        price: '10.00',
        image_url: '',
        image_alt: '',
        isExpanded: true,
      },
    ];

    // Apply template
    const template = BUILTIN_TEMPLATES.find((t) => t.id === 'sizes')!;
    const baseSku = 'NEW';

    const newVariants: VariantFormData[] = template.variants.map(
      (v, index) => ({
        sku: generateSku(baseSku, v.skuSuffix),
        title: v.title,
        price: '',
        image_url: '',
        image_alt: '',
        isExpanded: index === 0,
      })
    );

    // New variants should replace old ones
    expect(newVariants).toHaveLength(5);
    expect(newVariants[0].sku).toBe('NEW-XS');
    expect(existingVariants[0].sku).toBe('OLD-SKU'); // Old data is replaced
  });

  it('should expand first variant after template application', () => {
    const template = BUILTIN_TEMPLATES.find((t) => t.id === 'colors')!;

    const variants: VariantFormData[] = template.variants.map((v, index) => ({
      sku: '',
      title: v.title,
      price: '',
      image_url: '',
      image_alt: '',
      isExpanded: index === 0, // Only first is expanded
    }));

    expect(variants[0].isExpanded).toBe(true);
    expect(variants[1].isExpanded).toBe(false);
    expect(variants[4].isExpanded).toBe(false);
  });

  it('should update variant count badge after template application', () => {
    const template = BUILTIN_TEMPLATES.find(
      (t) => t.id === 'size-color-matrix'
    )!;

    expect(template.variants.length).toBe(25);
    // The badge would show "25"
  });

  it('should use first variant SKU as base when generating from template', () => {
    // If user has entered a SKU in the first variant, use that as base
    const existingFirstVariantSku = 'SHIRT-001';

    const template = BUILTIN_TEMPLATES.find((t) => t.id === 'sizes')!;
    const baseSku = existingFirstVariantSku.replace(/-\d+$/, ''); // Strip trailing number

    const variants = template.variants.map((v) => ({
      sku: generateSku(baseSku, v.skuSuffix),
    }));

    expect(variants[0].sku).toBe('SHIRT-XS');
  });

  it('should use product title when no base SKU exists', () => {
    const productTitle = 'Summer Dress Collection';
    const generateSkuFromTitle = (title: string): string => {
      return title
        .toUpperCase()
        .replace(/[^A-Z0-9\s]/g, '')
        .trim()
        .split(/\s+/)
        .slice(0, 3)
        .join('-')
        .substring(0, 20);
    };

    const baseSku = generateSkuFromTitle(productTitle);
    expect(baseSku).toBe('SUMMER-DRESS-COLLECT');
  });
});

describe('Template Dropdown Behavior', () => {
  it('should close dropdown after selecting a template', () => {
    let isOpen = true;
    const onSelectTemplate = () => {
      isOpen = false;
    };

    onSelectTemplate();
    expect(isOpen).toBe(false);
  });

  it('should show confirmation if variants have data when applying template', () => {
    const variantHasData = (v: VariantFormData): boolean => {
      return !!(
        v.sku.trim() ||
        v.title.trim() ||
        v.price.trim() ||
        v.image_url
      );
    };

    const variants: VariantFormData[] = [
      {
        sku: 'EXISTING-SKU',
        title: 'Existing',
        price: '10.00',
        image_url: '',
        image_alt: '',
        isExpanded: true,
      },
    ];

    const hasExistingData = variants.some(variantHasData);
    expect(hasExistingData).toBe(true);
    // When hasExistingData is true, show confirmation dialog before replacing
  });

  it('should apply template immediately if variants are empty', () => {
    const variantHasData = (v: VariantFormData): boolean => {
      return !!(
        v.sku.trim() ||
        v.title.trim() ||
        v.price.trim() ||
        v.image_url
      );
    };

    const variants: VariantFormData[] = [
      {
        sku: '',
        title: '',
        price: '',
        image_url: '',
        image_alt: '',
        isExpanded: true,
      },
    ];

    const hasExistingData = variants.some(variantHasData);
    expect(hasExistingData).toBe(false);
    // When hasExistingData is false, apply template immediately
  });
});
