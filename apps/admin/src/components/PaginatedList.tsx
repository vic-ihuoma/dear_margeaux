import { useState, useEffect } from 'react';
import Pagination from './Pagination';

interface PaginatedListProps<T> {
  /** All items to paginate (client-side pagination) */
  items: T[];
  /** Render function for each item */
  renderItem: (item: T, index: number) => React.ReactNode;
  /** Items per page (default: 20) */
  pageSize?: number;
  /** Render function for table header */
  renderHeader?: () => React.ReactNode;
  /** CSS class for the list container */
  className?: string;
  /** Empty state message */
  emptyMessage?: string;
  /** Show page size selector */
  showPageSizeSelector?: boolean;
}

/**
 * Client-side paginated list component.
 * Paginates a list of items and provides navigation controls.
 */
export default function PaginatedList<T>({
  items,
  renderItem,
  pageSize: initialPageSize = 20,
  renderHeader,
  className = '',
  emptyMessage = 'No items found',
  showPageSizeSelector = true,
}: PaginatedListProps<T>) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  // Reset to first page when items change
  useEffect(() => {
    setCurrentPage(1);
  }, [items.length]);

  // Calculate pagination
  const totalItems = items.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const currentItems = items.slice(startIndex, endIndex);

  // Determine if there are more items
  const hasMore = currentPage < totalPages;

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Scroll to top of list
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1); // Reset to first page when changing page size
  };

  if (totalItems === 0) {
    return (
      <div className="p-8 text-center text-text-secondary">{emptyMessage}</div>
    );
  }

  return (
    <div className={className}>
      {/* List content */}
      <div>
        {renderHeader && renderHeader()}
        {currentItems.map((item, index) =>
          renderItem(item, startIndex + index)
        )}
      </div>

      {/* Pagination controls */}
      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={totalItems}
          hasMore={hasMore}
          onPageChange={handlePageChange}
          onPageSizeChange={
            showPageSizeSelector ? handlePageSizeChange : undefined
          }
          showPageSizeSelector={showPageSizeSelector}
        />
      )}

      {/* Items info for single page */}
      {totalPages === 1 && (
        <div className="px-4 py-3 bg-background-secondary border-t border-border text-sm text-text-secondary">
          Showing {totalItems} {totalItems === 1 ? 'item' : 'items'}
        </div>
      )}
    </div>
  );
}
