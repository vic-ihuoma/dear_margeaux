import { useState } from 'react';

export interface PaginationInfo {
  has_more: boolean;
  next_cursor: string | null;
  current_page?: number;
  total_pages?: number;
}

export interface PaginationProps {
  /** Current page number (1-indexed) */
  currentPage: number;
  /** Total number of pages (optional - may not be known with cursor-based pagination) */
  totalPages?: number;
  /** Number of items per page */
  pageSize: number;
  /** Total items (optional - used to calculate total pages) */
  totalItems?: number;
  /** Whether there are more items to load */
  hasMore?: boolean;
  /** Callback when page changes */
  onPageChange: (page: number) => void;
  /** Callback when page size changes */
  onPageSizeChange?: (size: number) => void;
  /** Available page size options */
  pageSizeOptions?: number[];
  /** Whether pagination is loading */
  isLoading?: boolean;
  /** Show page size selector */
  showPageSizeSelector?: boolean;
}

const DEFAULT_PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

export default function Pagination({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  hasMore,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
  isLoading = false,
  showPageSizeSelector = true,
}: PaginationProps) {
  // Calculate total pages from totalItems if not provided
  const calculatedTotalPages =
    totalPages ?? (totalItems ? Math.ceil(totalItems / pageSize) : undefined);

  // Determine if navigation is possible
  const canGoBack = currentPage > 1;
  const canGoForward =
    hasMore ??
    (calculatedTotalPages ? currentPage < calculatedTotalPages : false);

  const handlePreviousPage = () => {
    if (canGoBack && !isLoading) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (canGoForward && !isLoading) {
      onPageChange(currentPage + 1);
    }
  };

  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSize = parseInt(e.target.value, 10);
    if (onPageSizeChange && !isLoading) {
      onPageSizeChange(newSize);
    }
  };

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-background-secondary border-t border-border">
      <div className="flex items-center gap-4">
        {/* Page size selector */}
        {showPageSizeSelector && onPageSizeChange && (
          <div className="flex items-center gap-2">
            <label htmlFor="page-size" className="text-sm text-text-secondary">
              Show
            </label>
            <select
              id="page-size"
              value={pageSize}
              onChange={handlePageSizeChange}
              disabled={isLoading}
              className="px-2 py-1 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary-200 disabled:opacity-50"
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
            <span className="text-sm text-text-secondary">per page</span>
          </div>
        )}

        {/* Items info */}
        {totalItems !== undefined && (
          <span className="text-sm text-text-secondary">
            {totalItems} total items
          </span>
        )}
      </div>

      <div className="flex items-center gap-4">
        {/* Page info */}
        <span className="text-sm text-text-secondary">
          Page {currentPage}
          {calculatedTotalPages !== undefined && ` of ${calculatedTotalPages}`}
        </span>

        {/* Navigation buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePreviousPage}
            disabled={!canGoBack || isLoading}
            aria-label="Previous page"
            className="px-3 py-1.5 text-sm font-medium text-text-secondary border border-border rounded-md hover:bg-background-tertiary disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-fast"
          >
            <span className="flex items-center gap-1">
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 19.5L8.25 12l7.5-7.5"
                />
              </svg>
              Previous
            </span>
          </button>

          <button
            type="button"
            onClick={handleNextPage}
            disabled={!canGoForward || isLoading}
            aria-label="Next page"
            className="px-3 py-1.5 text-sm font-medium text-text-secondary border border-border rounded-md hover:bg-background-tertiary disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-fast"
          >
            <span className="flex items-center gap-1">
              Next
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8.25 4.5l7.5 7.5-7.5 7.5"
                />
              </svg>
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
