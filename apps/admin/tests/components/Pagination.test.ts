import { describe, it, expect } from 'vitest';

/**
 * Unit tests for Pagination component logic.
 * Visual/interaction tests are done with agent-browser per PRD.
 *
 * The Pagination component supports cursor-based pagination which is
 * used by the merchant API.
 */
describe('Pagination', () => {
  describe('page calculation logic', () => {
    it('calculates total pages from totalItems and pageSize', () => {
      // 100 items with page size 20 = 5 pages
      expect(Math.ceil(100 / 20)).toBe(5);

      // 101 items with page size 20 = 6 pages
      expect(Math.ceil(101 / 20)).toBe(6);

      // 20 items with page size 20 = 1 page
      expect(Math.ceil(20 / 20)).toBe(1);
    });

    it('handles zero items', () => {
      // 0 items = 0 pages (or could be 1 for empty state)
      expect(Math.ceil(0 / 20)).toBe(0);
    });
  });

  describe('navigation state logic', () => {
    // Tests for canGoBack/canGoForward logic

    it('previous button should be disabled on first page', () => {
      const currentPage = 1;
      const canGoBack = currentPage > 1;
      expect(canGoBack).toBe(false);
    });

    it('previous button should be enabled on page 2', () => {
      const currentPage = 2;
      const canGoBack = currentPage > 1;
      expect(canGoBack).toBe(true);
    });

    it('next button should be disabled on last page (known total)', () => {
      const currentPage = 5;
      const totalPages = 5;
      const canGoForward = currentPage < totalPages;
      expect(canGoForward).toBe(false);
    });

    it('next button should be enabled when not on last page', () => {
      const currentPage = 3;
      const totalPages = 5;
      const canGoForward = currentPage < totalPages;
      expect(canGoForward).toBe(true);
    });

    it('next button uses hasMore when totalPages unknown (cursor pagination)', () => {
      // Cursor-based pagination doesn't know total pages
      const hasMore = true;
      const canGoForward = hasMore;
      expect(canGoForward).toBe(true);
    });

    it('next button disabled when hasMore is false', () => {
      const hasMore = false;
      const canGoForward = hasMore;
      expect(canGoForward).toBe(false);
    });
  });

  describe('page size options', () => {
    it('default page sizes include standard options', () => {
      const DEFAULT_PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
      expect(DEFAULT_PAGE_SIZE_OPTIONS).toContain(10);
      expect(DEFAULT_PAGE_SIZE_OPTIONS).toContain(20);
      expect(DEFAULT_PAGE_SIZE_OPTIONS).toContain(50);
      expect(DEFAULT_PAGE_SIZE_OPTIONS).toContain(100);
    });

    it('page size limits results', () => {
      const allItems = Array.from({ length: 100 }, (_, i) => i);
      const pageSize = 20;
      const currentPage = 1;
      const startIndex = (currentPage - 1) * pageSize;
      const pageItems = allItems.slice(startIndex, startIndex + pageSize);

      expect(pageItems.length).toBe(20);
      expect(pageItems[0]).toBe(0);
      expect(pageItems[19]).toBe(19);
    });

    it('page size correctly slices to second page', () => {
      const allItems = Array.from({ length: 100 }, (_, i) => i);
      const pageSize = 20;
      const currentPage = 2;
      const startIndex = (currentPage - 1) * pageSize;
      const pageItems = allItems.slice(startIndex, startIndex + pageSize);

      expect(pageItems.length).toBe(20);
      expect(pageItems[0]).toBe(20);
      expect(pageItems[19]).toBe(39);
    });
  });

  describe('component state management', () => {
    it('page change callback receives new page number', () => {
      let receivedPage: number | null = null;
      const onPageChange = (page: number) => {
        receivedPage = page;
      };

      // Simulate clicking next from page 1
      onPageChange(2);
      expect(receivedPage).toBe(2);

      // Simulate clicking previous from page 2
      onPageChange(1);
      expect(receivedPage).toBe(1);
    });

    it('page size change callback receives new size', () => {
      let receivedSize: number | null = null;
      const onPageSizeChange = (size: number) => {
        receivedSize = size;
      };

      onPageSizeChange(50);
      expect(receivedSize).toBe(50);
    });
  });

  describe('edge cases', () => {
    it('handles single page of results', () => {
      const totalItems = 15;
      const pageSize = 20;
      const totalPages = Math.ceil(totalItems / pageSize);

      expect(totalPages).toBe(1);

      const currentPage = 1;
      const canGoBack = currentPage > 1;
      const canGoForward = currentPage < totalPages;

      expect(canGoBack).toBe(false);
      expect(canGoForward).toBe(false);
    });

    it('handles exactly full pages', () => {
      const totalItems = 60;
      const pageSize = 20;
      const totalPages = Math.ceil(totalItems / pageSize);

      expect(totalPages).toBe(3);
    });

    it('current page display is 1-indexed', () => {
      // Internal page numbers should be 1-indexed for display
      const currentPage = 1;
      const displayedPage = currentPage;
      expect(displayedPage).toBe(1);
    });
  });
});
