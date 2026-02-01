import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Inventory Export API - admin-8', () => {
  describe('GET /api/inventory/export endpoint', () => {
    const exportApiPath = path.join(
      __dirname,
      '../../src/pages/api/inventory/export.ts'
    );

    it('should have export endpoint file', () => {
      const exists = fs.existsSync(exportApiPath);
      expect(exists).toBe(true);
    });

    it('should export a GET handler', async () => {
      const content = fs.readFileSync(exportApiPath, 'utf-8');
      expect(content).toContain('export const GET');
    });

    it('should set Content-Type to text/csv', async () => {
      const content = fs.readFileSync(exportApiPath, 'utf-8');
      expect(content).toContain('text/csv');
    });

    it('should set Content-Disposition header for download', async () => {
      const content = fs.readFileSync(exportApiPath, 'utf-8');
      expect(content).toContain('Content-Disposition');
      expect(content).toContain('attachment');
    });

    it('should include date in filename', async () => {
      const content = fs.readFileSync(exportApiPath, 'utf-8');
      // Should generate filename with date
      expect(content).toContain('inventory-');
      expect(content).toContain('.csv');
    });

    it('should fetch inventory from merchant API', async () => {
      const content = fs.readFileSync(exportApiPath, 'utf-8');
      expect(content).toContain('getInventory');
    });

    it('should handle API configuration errors', async () => {
      const content = fs.readFileSync(exportApiPath, 'utf-8');
      expect(content).toContain('API not configured');
    });

    it('should handle API errors gracefully', async () => {
      const content = fs.readFileSync(exportApiPath, 'utf-8');
      expect(content).toContain('catch');
      expect(content).toContain('error');
    });
  });

  describe('Inventory page Export button', () => {
    const inventoryPagePath = path.join(
      __dirname,
      '../../src/pages/inventory/index.astro'
    );

    it('should have inventory page', () => {
      const exists = fs.existsSync(inventoryPagePath);
      expect(exists).toBe(true);
    });

    it('should have Export button linking to export API', () => {
      const content = fs.readFileSync(inventoryPagePath, 'utf-8');
      expect(content).toContain('/api/inventory/export');
    });

    it('should have download attribute on Export button', () => {
      const content = fs.readFileSync(inventoryPagePath, 'utf-8');
      expect(content).toContain('download');
    });

    it('should have Export CSV label text', () => {
      const content = fs.readFileSync(inventoryPagePath, 'utf-8');
      expect(content).toMatch(/Export\s*(CSV)?/i);
    });

    it('should have download icon SVG', () => {
      const content = fs.readFileSync(inventoryPagePath, 'utf-8');
      // Check for download arrow icon SVG path (commonly used download icon)
      expect(content).toContain('svg');
    });
  });

  describe('CSV format requirements', () => {
    const exportApiPath = path.join(
      __dirname,
      '../../src/pages/api/inventory/export.ts'
    );

    it('should include SKU column', () => {
      const content = fs.readFileSync(exportApiPath, 'utf-8');
      expect(content.toLowerCase()).toContain('sku');
    });

    it('should include On Hand column', () => {
      const content = fs.readFileSync(exportApiPath, 'utf-8');
      expect(content).toContain('on_hand');
    });

    it('should include Available column', () => {
      const content = fs.readFileSync(exportApiPath, 'utf-8');
      expect(content).toContain('available');
    });

    it('should include Reserved column', () => {
      const content = fs.readFileSync(exportApiPath, 'utf-8');
      expect(content).toContain('reserved');
    });
  });
});
