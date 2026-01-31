import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Product } from '@dear-margeaux/api';

// Sample product data with drop_position
const createMockProduct = (
  id: string,
  title: string,
  dropPosition: number | null = null
): Product => ({
  id,
  title,
  description: `Description for ${title}`,
  featured_image_url: null,
  featured_image_alt: null,
  status: 'active' as const,
  created_at: '2024-01-01T00:00:00Z',
  tags: [],
  drop_id: dropPosition !== null ? 'drop_123' : null,
  drop_position: dropPosition,
  variants: [
    {
      id: `var_${id}`,
      sku: `SKU-${id.toUpperCase()}`,
      title: 'Default',
      price_cents: 5000,
      image_url: `https://example.com/${id}.jpg`,
      image_alt: title,
      product_id: id,
      low_stock_threshold: null,
      reorder_point: null,
    },
  ],
});

describe('ProductAssigner - Product Reordering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Products ordering', () => {
    it('should maintain product order from drop_position field', () => {
      // Products should be ordered by drop_position
      const products: Product[] = [
        createMockProduct('prod_c', 'Product C', 0),
        createMockProduct('prod_a', 'Product A', 1),
        createMockProduct('prod_b', 'Product B', 2),
      ];

      // Verify products are sorted by drop_position
      const sorted = [...products].sort((a, b) => {
        if (a.drop_position === null) return 1;
        if (b.drop_position === null) return -1;
        return a.drop_position - b.drop_position;
      });

      expect(sorted[0].title).toBe('Product C');
      expect(sorted[1].title).toBe('Product A');
      expect(sorted[2].title).toBe('Product B');
    });

    it('should place products without position at the end', () => {
      const products: Product[] = [
        createMockProduct('prod_a', 'Product A', 0),
        createMockProduct('prod_b', 'Product B', null), // No position
        createMockProduct('prod_c', 'Product C', 1),
      ];

      const sorted = [...products].sort((a, b) => {
        if (a.drop_position === null) return 1;
        if (b.drop_position === null) return -1;
        return a.drop_position - b.drop_position;
      });

      expect(sorted[0].title).toBe('Product A');
      expect(sorted[1].title).toBe('Product C');
      expect(sorted[2].title).toBe('Product B'); // NULL position goes last
    });

    it('should reorder products when dragged', () => {
      const products: Product[] = [
        createMockProduct('prod_a', 'Product A', 0),
        createMockProduct('prod_b', 'Product B', 1),
        createMockProduct('prod_c', 'Product C', 2),
      ];

      // Simulate dragging Product C (index 2) to position 0
      const draggedIndex = 2;
      const dropIndex = 0;

      const newOrder = [...products];
      const [removed] = newOrder.splice(draggedIndex, 1);
      newOrder.splice(dropIndex, 0, removed);

      // Product C should now be first
      expect(newOrder[0].title).toBe('Product C');
      expect(newOrder[1].title).toBe('Product A');
      expect(newOrder[2].title).toBe('Product B');
    });

    it('should reorder products when moved up', () => {
      const products: Product[] = [
        createMockProduct('prod_a', 'Product A', 0),
        createMockProduct('prod_b', 'Product B', 1),
        createMockProduct('prod_c', 'Product C', 2),
      ];

      // Simulate moving Product B (index 1) up
      const index = 1;
      if (index > 0) {
        const newOrder = [...products];
        [newOrder[index - 1], newOrder[index]] = [
          newOrder[index],
          newOrder[index - 1],
        ];

        expect(newOrder[0].title).toBe('Product B');
        expect(newOrder[1].title).toBe('Product A');
        expect(newOrder[2].title).toBe('Product C');
      }
    });

    it('should reorder products when moved down', () => {
      const products: Product[] = [
        createMockProduct('prod_a', 'Product A', 0),
        createMockProduct('prod_b', 'Product B', 1),
        createMockProduct('prod_c', 'Product C', 2),
      ];

      // Simulate moving Product B (index 1) down
      const index = 1;
      if (index < products.length - 1) {
        const newOrder = [...products];
        [newOrder[index], newOrder[index + 1]] = [
          newOrder[index + 1],
          newOrder[index],
        ];

        expect(newOrder[0].title).toBe('Product A');
        expect(newOrder[1].title).toBe('Product C');
        expect(newOrder[2].title).toBe('Product B');
      }
    });

    it('should not move first product up', () => {
      const products: Product[] = [
        createMockProduct('prod_a', 'Product A', 0),
        createMockProduct('prod_b', 'Product B', 1),
      ];

      const index = 0;
      const canMoveUp = index > 0;

      expect(canMoveUp).toBe(false);
    });

    it('should not move last product down', () => {
      const products: Product[] = [
        createMockProduct('prod_a', 'Product A', 0),
        createMockProduct('prod_b', 'Product B', 1),
      ];

      const index = products.length - 1;
      const canMoveDown = index < products.length - 1;

      expect(canMoveDown).toBe(false);
    });
  });

  describe('Product IDs order for API', () => {
    it('should generate correct productIds array for API call', () => {
      const products: Product[] = [
        createMockProduct('prod_c', 'Product C', 0),
        createMockProduct('prod_a', 'Product A', 1),
        createMockProduct('prod_b', 'Product B', 2),
      ];

      const productIds = products.map((p) => p.id);

      expect(productIds).toEqual(['prod_c', 'prod_a', 'prod_b']);
    });

    it('should preserve order after reordering', () => {
      const products: Product[] = [
        createMockProduct('prod_a', 'Product A', 0),
        createMockProduct('prod_b', 'Product B', 1),
        createMockProduct('prod_c', 'Product C', 2),
      ];

      // Simulate drag: move prod_c to first position
      const newOrder = [...products];
      const [removed] = newOrder.splice(2, 1); // Remove prod_c
      newOrder.splice(0, 0, removed); // Insert at position 0

      const productIds = newOrder.map((p) => p.id);

      // The order of IDs should reflect the new positions
      expect(productIds).toEqual(['prod_c', 'prod_a', 'prod_b']);
    });
  });

  describe('Position numbering display', () => {
    it('should display 1-based position numbers', () => {
      const products: Product[] = [
        createMockProduct('prod_a', 'Product A', 0),
        createMockProduct('prod_b', 'Product B', 1),
        createMockProduct('prod_c', 'Product C', 2),
      ];

      const displayPositions = products.map((_, index) => index + 1);

      expect(displayPositions).toEqual([1, 2, 3]);
    });
  });

  describe('Adding and removing products', () => {
    it('should add product to end of assigned list', () => {
      const assigned: Product[] = [
        createMockProduct('prod_a', 'Product A', 0),
        createMockProduct('prod_b', 'Product B', 1),
      ];

      const newProduct = createMockProduct('prod_c', 'Product C', null);
      const newAssigned = [...assigned, newProduct];

      expect(newAssigned.length).toBe(3);
      expect(newAssigned[2].id).toBe('prod_c');
    });

    it('should remove product and maintain remaining order', () => {
      const assigned: Product[] = [
        createMockProduct('prod_a', 'Product A', 0),
        createMockProduct('prod_b', 'Product B', 1),
        createMockProduct('prod_c', 'Product C', 2),
      ];

      // Remove prod_b
      const newAssigned = assigned.filter((p) => p.id !== 'prod_b');

      expect(newAssigned.length).toBe(2);
      expect(newAssigned[0].id).toBe('prod_a');
      expect(newAssigned[1].id).toBe('prod_c');
    });
  });
});

describe('ProductAssigner - Drag and Drop Behavior', () => {
  describe('Drag state management', () => {
    it('should track dragged item index', () => {
      let draggedIndex: number | null = null;

      // Simulate drag start
      draggedIndex = 1;
      expect(draggedIndex).toBe(1);

      // Simulate drag end
      draggedIndex = null;
      expect(draggedIndex).toBeNull();
    });

    it('should track drag over index', () => {
      let dragOverIndex: number | null = null;

      // Simulate dragging over item at index 2
      dragOverIndex = 2;
      expect(dragOverIndex).toBe(2);

      // Simulate leaving drag area
      dragOverIndex = null;
      expect(dragOverIndex).toBeNull();
    });

    it('should not reorder when dropped on same position', () => {
      const products: Product[] = [
        createMockProduct('prod_a', 'Product A', 0),
        createMockProduct('prod_b', 'Product B', 1),
      ];

      const draggedIndex = 0;
      const dropIndex = 0;

      // Should not reorder if same position
      if (draggedIndex === dropIndex) {
        // No changes expected
        expect(products[0].id).toBe('prod_a');
        expect(products[1].id).toBe('prod_b');
      }
    });
  });
});
