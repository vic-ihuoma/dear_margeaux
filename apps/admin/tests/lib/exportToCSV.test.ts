import { describe, it, expect } from 'vitest';

describe('exportToCSV utility', () => {
  describe('escapeCsvField', () => {
    it('should return empty string for null or undefined', async () => {
      const { escapeCsvField } = await import('../../src/lib/exportToCSV');
      expect(escapeCsvField(null)).toBe('');
      expect(escapeCsvField(undefined)).toBe('');
    });

    it('should convert numbers to strings', async () => {
      const { escapeCsvField } = await import('../../src/lib/exportToCSV');
      expect(escapeCsvField(42)).toBe('42');
      expect(escapeCsvField(0)).toBe('0');
      expect(escapeCsvField(-10)).toBe('-10');
    });

    it('should return plain strings unchanged', async () => {
      const { escapeCsvField } = await import('../../src/lib/exportToCSV');
      expect(escapeCsvField('hello')).toBe('hello');
      expect(escapeCsvField('simple text')).toBe('simple text');
    });

    it('should escape strings containing commas', async () => {
      const { escapeCsvField } = await import('../../src/lib/exportToCSV');
      expect(escapeCsvField('hello, world')).toBe('"hello, world"');
    });

    it('should escape strings containing double quotes', async () => {
      const { escapeCsvField } = await import('../../src/lib/exportToCSV');
      expect(escapeCsvField('say "hello"')).toBe('"say ""hello"""');
    });

    it('should escape strings containing newlines', async () => {
      const { escapeCsvField } = await import('../../src/lib/exportToCSV');
      expect(escapeCsvField('line1\nline2')).toBe('"line1\nline2"');
    });

    it('should handle complex strings with multiple special characters', async () => {
      const { escapeCsvField } = await import('../../src/lib/exportToCSV');
      expect(escapeCsvField('hello, "world"\ntest')).toBe(
        '"hello, ""world""\ntest"'
      );
    });
  });

  describe('generateCSV', () => {
    it('should generate CSV with headers only when data is empty', async () => {
      const { generateCSV } = await import('../../src/lib/exportToCSV');
      const result = generateCSV([], ['sku', 'on_hand']);
      expect(result).toBe('SKU,On Hand');
    });

    it('should generate CSV with data rows', async () => {
      const { generateCSV } = await import('../../src/lib/exportToCSV');
      const data = [
        { sku: 'ABC-123', on_hand: 10 },
        { sku: 'DEF-456', on_hand: 5 },
      ];
      const result = generateCSV(data, ['sku', 'on_hand']);
      const lines = result.split('\n');
      expect(lines).toHaveLength(3);
      expect(lines[0]).toBe('SKU,On Hand');
      expect(lines[1]).toBe('ABC-123,10');
      expect(lines[2]).toBe('DEF-456,5');
    });

    it('should format column headers from snake_case to Title Case', async () => {
      const { generateCSV } = await import('../../src/lib/exportToCSV');
      const result = generateCSV(
        [],
        ['sku', 'on_hand', 'low_stock_threshold', 'reorder_point']
      );
      expect(result).toBe('SKU,On Hand,Low Stock Threshold,Reorder Point');
    });

    it('should handle null values in data', async () => {
      const { generateCSV } = await import('../../src/lib/exportToCSV');
      const data = [{ sku: 'ABC-123', threshold: null }];
      const result = generateCSV(data, ['sku', 'threshold']);
      const lines = result.split('\n');
      expect(lines[1]).toBe('ABC-123,');
    });

    it('should escape special characters in data', async () => {
      const { generateCSV } = await import('../../src/lib/exportToCSV');
      const data = [{ name: 'Product, "Deluxe"', notes: 'Line1\nLine2' }];
      const result = generateCSV(data, ['name', 'notes']);
      // The result contains a newline in the quoted field, so we check the full content
      // Header line + data line with escaped characters
      expect(result).toContain('"Product, ""Deluxe"""');
      expect(result).toContain('"Line1\nLine2"');
    });

    it('should use custom headers when provided', async () => {
      const { generateCSV } = await import('../../src/lib/exportToCSV');
      const data = [{ sku: 'ABC-123', on_hand: 10 }];
      const result = generateCSV(data, ['sku', 'on_hand'], {
        headers: ['Item SKU', 'Quantity'],
      });
      const lines = result.split('\n');
      expect(lines[0]).toBe('Item SKU,Quantity');
    });
  });

  describe('formatColumnHeader', () => {
    it('should convert sku to SKU (all caps for short abbreviations)', async () => {
      const { formatColumnHeader } = await import('../../src/lib/exportToCSV');
      expect(formatColumnHeader('sku')).toBe('SKU');
    });

    it('should convert snake_case to Title Case', async () => {
      const { formatColumnHeader } = await import('../../src/lib/exportToCSV');
      expect(formatColumnHeader('on_hand')).toBe('On Hand');
      expect(formatColumnHeader('low_stock_threshold')).toBe(
        'Low Stock Threshold'
      );
      expect(formatColumnHeader('reorder_point')).toBe('Reorder Point');
    });

    it('should handle single word columns', async () => {
      const { formatColumnHeader } = await import('../../src/lib/exportToCSV');
      expect(formatColumnHeader('available')).toBe('Available');
      expect(formatColumnHeader('reserved')).toBe('Reserved');
    });
  });

  describe('downloadCSV', () => {
    // downloadCSV is a browser-only function that triggers file downloads
    // It requires DOM APIs (document.createElement, URL.createObjectURL)
    // We verify its export and structure via file-based tests

    it('should be exported from the module', async () => {
      const module = await import('../../src/lib/exportToCSV');
      expect(typeof module.downloadCSV).toBe('function');
    });

    it('should have correct function signature (csvContent, filename)', async () => {
      const module = await import('../../src/lib/exportToCSV');
      // Function should accept 2 parameters (csvContent required, filename optional)
      expect(module.downloadCSV.length).toBeLessThanOrEqual(2);
    });

    it('should generate date-based filename in function body', async () => {
      // Read the source file to verify the logic
      const fs = await import('fs');
      const path = await import('path');
      const content = fs.readFileSync(
        path.join(__dirname, '../../src/lib/exportToCSV.ts'),
        'utf-8'
      );
      // Verify it creates ISO date string for filename
      expect(content).toContain('toISOString');
      expect(content).toContain('inventory-');
      expect(content).toContain('.csv');
    });

    it('should revoke object URL after download (cleanup)', async () => {
      // Read the source file to verify cleanup logic
      const fs = await import('fs');
      const path = await import('path');
      const content = fs.readFileSync(
        path.join(__dirname, '../../src/lib/exportToCSV.ts'),
        'utf-8'
      );
      // Verify it revokes the object URL for memory cleanup
      expect(content).toContain('URL.revokeObjectURL');
    });
  });

  describe('generateInventoryCSV', () => {
    it('should include all inventory columns', async () => {
      const { generateInventoryCSV } =
        await import('../../src/lib/exportToCSV');
      const data = [
        {
          sku: 'ABC-123',
          product_title: 'Test Product',
          variant_title: 'Small',
          on_hand: 10,
          reserved: 2,
          available: 8,
          low_stock_threshold: 5,
          reorder_point: 10,
          status: 'In Stock',
        },
      ];

      const result = generateInventoryCSV(data);
      const lines = result.split('\n');

      // Check header includes all expected columns
      expect(lines[0]).toContain('SKU');
      expect(lines[0]).toContain('Product');
      expect(lines[0]).toContain('Variant');
      expect(lines[0]).toContain('On Hand');
      expect(lines[0]).toContain('Reserved');
      expect(lines[0]).toContain('Available');
      expect(lines[0]).toContain('Low Stock Threshold');
      expect(lines[0]).toContain('Reorder Point');
      expect(lines[0]).toContain('Status');
    });

    it('should format all data correctly', async () => {
      const { generateInventoryCSV } =
        await import('../../src/lib/exportToCSV');
      const data = [
        {
          sku: 'ABC-123',
          product_title: 'Test Product',
          variant_title: 'Small',
          on_hand: 10,
          reserved: 2,
          available: 8,
          low_stock_threshold: 5,
          reorder_point: 10,
          status: 'In Stock',
        },
      ];

      const result = generateInventoryCSV(data);
      const lines = result.split('\n');

      // Check data row
      expect(lines[1]).toContain('ABC-123');
      expect(lines[1]).toContain('Test Product');
      expect(lines[1]).toContain('Small');
      expect(lines[1]).toContain('10');
      expect(lines[1]).toContain('In Stock');
    });

    it('should handle null thresholds gracefully', async () => {
      const { generateInventoryCSV } =
        await import('../../src/lib/exportToCSV');
      const data = [
        {
          sku: 'ABC-123',
          product_title: 'Test',
          variant_title: 'Default',
          on_hand: 10,
          reserved: 0,
          available: 10,
          low_stock_threshold: null,
          reorder_point: null,
          status: 'In Stock',
        },
      ];

      const result = generateInventoryCSV(data);
      const lines = result.split('\n');

      // Should not throw and should handle nulls
      expect(lines).toHaveLength(2);
    });
  });
});
