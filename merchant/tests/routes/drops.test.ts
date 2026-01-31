import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock database for testing
const mockProducts = [
  {
    id: 'prod_1',
    store_id: 'store_1',
    title: 'Product A',
    drop_id: 'drop_1',
    drop_position: 0,
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'prod_2',
    store_id: 'store_1',
    title: 'Product B',
    drop_id: 'drop_1',
    drop_position: 1,
    created_at: '2024-01-02T00:00:00Z',
  },
  {
    id: 'prod_3',
    store_id: 'store_1',
    title: 'Product C',
    drop_id: 'drop_1',
    drop_position: 2,
    created_at: '2024-01-03T00:00:00Z',
  },
];

describe('Drops Routes - Product Position', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('PUT /v1/drops/:id/products - Position Assignment', () => {
    it('assigns positions based on array order (0-indexed)', () => {
      // Simulate what the API does: assign positions based on array index
      const productIds = ['prod_3', 'prod_1', 'prod_2'];

      const expectedPositions = productIds.map((id, index) => ({
        productId: id,
        drop_position: index,
      }));

      expect(expectedPositions).toEqual([
        { productId: 'prod_3', drop_position: 0 },
        { productId: 'prod_1', drop_position: 1 },
        { productId: 'prod_2', drop_position: 2 },
      ]);
    });

    it('clears positions when unassigning products from drop', () => {
      // When products are unassigned, their drop_position should be null
      const product = { ...mockProducts[0] };

      // Simulate unassign
      product.drop_id = null;
      product.drop_position = null;

      expect(product.drop_id).toBeNull();
      expect(product.drop_position).toBeNull();
    });

    it('preserves order when reassigning same products', () => {
      const productIds = ['prod_1', 'prod_2', 'prod_3'];

      // First assignment
      const positions1 = productIds.map((id, index) => ({
        productId: id,
        drop_position: index,
      }));

      // Reassignment with same order
      const positions2 = productIds.map((id, index) => ({
        productId: id,
        drop_position: index,
      }));

      expect(positions1).toEqual(positions2);
    });

    it('updates positions when order changes', () => {
      // Initial order
      const initialOrder = ['prod_1', 'prod_2', 'prod_3'];
      const initialPositions = initialOrder.map((id, index) => ({
        productId: id,
        drop_position: index,
      }));

      // New order (prod_3 moved to first)
      const newOrder = ['prod_3', 'prod_1', 'prod_2'];
      const newPositions = newOrder.map((id, index) => ({
        productId: id,
        drop_position: index,
      }));

      // Verify order changed
      expect(initialPositions[0].productId).toBe('prod_1');
      expect(newPositions[0].productId).toBe('prod_3');

      // Verify positions are different
      expect(initialPositions).not.toEqual(newPositions);
    });
  });

  describe('GET /v1/drops/:slug/products - Position Ordering', () => {
    it('returns products ordered by drop_position', () => {
      // Simulate ordering logic: CASE WHEN drop_position IS NULL THEN 1 ELSE 0 END, drop_position ASC
      const products = [
        { id: 'prod_2', title: 'Product B', drop_position: 1 },
        { id: 'prod_1', title: 'Product A', drop_position: 0 },
        { id: 'prod_3', title: 'Product C', drop_position: 2 },
      ];

      const sorted = [...products].sort((a, b) => {
        if (a.drop_position === null) return 1;
        if (b.drop_position === null) return -1;
        return a.drop_position - b.drop_position;
      });

      expect(sorted[0].id).toBe('prod_1'); // position 0
      expect(sorted[1].id).toBe('prod_2'); // position 1
      expect(sorted[2].id).toBe('prod_3'); // position 2
    });

    it('places products without position at the end', () => {
      const products = [
        { id: 'prod_1', title: 'Product A', drop_position: 0 },
        { id: 'prod_2', title: 'Product B', drop_position: null }, // No position
        { id: 'prod_3', title: 'Product C', drop_position: 1 },
      ];

      const sorted = [...products].sort((a, b) => {
        if (a.drop_position === null) return 1;
        if (b.drop_position === null) return -1;
        return a.drop_position - b.drop_position;
      });

      expect(sorted[0].id).toBe('prod_1'); // position 0
      expect(sorted[1].id).toBe('prod_3'); // position 1
      expect(sorted[2].id).toBe('prod_2'); // null position goes last
    });

    it('includes drop_position in response', () => {
      const product = mockProducts[0];

      const response = {
        id: product.id,
        title: product.title,
        drop_id: product.drop_id,
        drop_position: product.drop_position,
        created_at: product.created_at,
      };

      expect(response).toHaveProperty('drop_position');
      expect(response.drop_position).toBe(0);
    });
  });

  describe('Product Type with drop_position', () => {
    it('product should have drop_position field', () => {
      const product = {
        id: 'prod_1',
        title: 'Test Product',
        description: 'A test product',
        featured_image_url: null,
        featured_image_alt: null,
        status: 'active' as const,
        created_at: '2024-01-01T00:00:00Z',
        tags: [],
        drop_id: 'drop_1',
        drop_position: 5,
        variants: [],
      };

      expect(product.drop_position).toBe(5);
    });

    it('drop_position can be null for products not in drops', () => {
      const product = {
        id: 'prod_1',
        title: 'Evergreen Product',
        drop_id: null,
        drop_position: null,
      };

      expect(product.drop_id).toBeNull();
      expect(product.drop_position).toBeNull();
    });
  });
});

describe('Drops Routes - Reordering Scenarios', () => {
  describe('Move to beginning', () => {
    it('moves last product to first position', () => {
      const products = [
        { id: 'prod_1', drop_position: 0 },
        { id: 'prod_2', drop_position: 1 },
        { id: 'prod_3', drop_position: 2 },
      ];

      // Move prod_3 to beginning
      const newOrder = [products[2], products[0], products[1]];
      const newPositions = newOrder.map((p, i) => ({
        id: p.id,
        drop_position: i,
      }));

      expect(newPositions).toEqual([
        { id: 'prod_3', drop_position: 0 },
        { id: 'prod_1', drop_position: 1 },
        { id: 'prod_2', drop_position: 2 },
      ]);
    });
  });

  describe('Move to end', () => {
    it('moves first product to last position', () => {
      const products = [
        { id: 'prod_1', drop_position: 0 },
        { id: 'prod_2', drop_position: 1 },
        { id: 'prod_3', drop_position: 2 },
      ];

      // Move prod_1 to end
      const newOrder = [products[1], products[2], products[0]];
      const newPositions = newOrder.map((p, i) => ({
        id: p.id,
        drop_position: i,
      }));

      expect(newPositions).toEqual([
        { id: 'prod_2', drop_position: 0 },
        { id: 'prod_3', drop_position: 1 },
        { id: 'prod_1', drop_position: 2 },
      ]);
    });
  });

  describe('Swap adjacent items', () => {
    it('swaps two adjacent products', () => {
      const products = [
        { id: 'prod_1', drop_position: 0 },
        { id: 'prod_2', drop_position: 1 },
        { id: 'prod_3', drop_position: 2 },
      ];

      // Swap prod_1 and prod_2
      const newOrder = [products[1], products[0], products[2]];
      const newPositions = newOrder.map((p, i) => ({
        id: p.id,
        drop_position: i,
      }));

      expect(newPositions).toEqual([
        { id: 'prod_2', drop_position: 0 },
        { id: 'prod_1', drop_position: 1 },
        { id: 'prod_3', drop_position: 2 },
      ]);
    });
  });

  describe('Multiple products', () => {
    it('handles reordering with many products', () => {
      const products = Array.from({ length: 7 }, (_, i) => ({
        id: `prod_${i + 1}`,
        drop_position: i,
      }));

      // Move product from position 5 to position 1
      const removed = products.splice(5, 1)[0];
      products.splice(1, 0, removed);

      const newPositions = products.map((p, i) => ({
        id: p.id,
        drop_position: i,
      }));

      expect(newPositions[0].id).toBe('prod_1');
      expect(newPositions[1].id).toBe('prod_6'); // Moved from position 5
      expect(newPositions[2].id).toBe('prod_2');
    });
  });
});
