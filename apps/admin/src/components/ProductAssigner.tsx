import { useState, useCallback, useEffect, useRef } from 'react';
import type { Product } from '@dear-margeaux/api';

export interface ProductAssignerProps {
  /** Products already assigned to this drop */
  assignedProducts: Product[];
  /** Callback when products are assigned or unassigned */
  onUpdate: (productIds: string[]) => Promise<void>;
}

function formatPrice(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
}

function getPrimaryPrice(product: Product): number {
  return product.variants[0]?.price_cents || 0;
}

function getPrimaryImage(product: Product): string | null {
  return product.variants.find((v) => v.image_url)?.image_url || null;
}

export function ProductAssigner({
  assignedProducts: initialAssigned,
  onUpdate,
}: ProductAssignerProps) {
  const [assignedProducts, setAssignedProducts] =
    useState<Product[]>(initialAssigned);
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Drag state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const dragCounter = useRef(0);

  // Fetch all products
  useEffect(() => {
    async function fetchProducts() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/products?limit=100');
        if (!response.ok) {
          throw new Error('Failed to fetch products');
        }
        const data = await response.json();
        const allProducts = data.items || [];

        // Filter out products already assigned to this drop
        const assignedIds = new Set(assignedProducts.map((p) => p.id));
        setAvailableProducts(
          allProducts.filter((p: Product) => !assignedIds.has(p.id))
        );
      } catch (err) {
        console.error('Fetch products error:', err);
        setError(
          err instanceof Error ? err.message : 'Failed to load products'
        );
      } finally {
        setIsLoading(false);
      }
    }

    fetchProducts();
  }, [assignedProducts]);

  const handleAssignProduct = useCallback(
    async (product: Product) => {
      setIsUpdating(true);
      setError(null);

      try {
        const newAssigned = [...assignedProducts, product];
        await onUpdate(newAssigned.map((p) => p.id));
        setAssignedProducts(newAssigned);
        setAvailableProducts((prev) => prev.filter((p) => p.id !== product.id));
      } catch (err) {
        console.error('Assign product error:', err);
        setError(
          err instanceof Error ? err.message : 'Failed to assign product'
        );
      } finally {
        setIsUpdating(false);
      }
    },
    [assignedProducts, onUpdate]
  );

  const handleUnassignProduct = useCallback(
    async (product: Product) => {
      setIsUpdating(true);
      setError(null);

      try {
        const newAssigned = assignedProducts.filter((p) => p.id !== product.id);
        await onUpdate(newAssigned.map((p) => p.id));
        setAssignedProducts(newAssigned);
        setAvailableProducts((prev) => [...prev, product]);
      } catch (err) {
        console.error('Unassign product error:', err);
        setError(
          err instanceof Error ? err.message : 'Failed to remove product'
        );
      } finally {
        setIsUpdating(false);
      }
    },
    [assignedProducts, onUpdate]
  );

  // Drag and drop handlers
  const handleDragStart = useCallback((index: number) => {
    setDraggedIndex(index);
  }, []);

  const handleDragEnd = useCallback(async () => {
    if (
      draggedIndex !== null &&
      dragOverIndex !== null &&
      draggedIndex !== dragOverIndex
    ) {
      // Reorder the array
      const newAssigned = [...assignedProducts];
      const [removed] = newAssigned.splice(draggedIndex, 1);
      newAssigned.splice(dragOverIndex, 0, removed);

      setAssignedProducts(newAssigned);
      setIsUpdating(true);
      setError(null);

      try {
        await onUpdate(newAssigned.map((p) => p.id));
      } catch (err) {
        console.error('Reorder error:', err);
        setError(
          err instanceof Error ? err.message : 'Failed to reorder products'
        );
        // Revert on error
        setAssignedProducts(assignedProducts);
      } finally {
        setIsUpdating(false);
      }
    }

    setDraggedIndex(null);
    setDragOverIndex(null);
    dragCounter.current = 0;
  }, [assignedProducts, draggedIndex, dragOverIndex, onUpdate]);

  const handleDragEnter = useCallback((index: number) => {
    dragCounter.current++;
    setDragOverIndex(index);
  }, []);

  const handleDragLeave = useCallback(() => {
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setDragOverIndex(null);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault(); // Allow drop
  }, []);

  // Move up/down handlers for keyboard accessibility
  const handleMoveUp = useCallback(
    async (index: number) => {
      if (index === 0) return;

      const newAssigned = [...assignedProducts];
      [newAssigned[index - 1], newAssigned[index]] = [
        newAssigned[index],
        newAssigned[index - 1],
      ];

      setAssignedProducts(newAssigned);
      setIsUpdating(true);
      setError(null);

      try {
        await onUpdate(newAssigned.map((p) => p.id));
      } catch (err) {
        console.error('Move error:', err);
        setError(
          err instanceof Error ? err.message : 'Failed to reorder products'
        );
        setAssignedProducts(assignedProducts);
      } finally {
        setIsUpdating(false);
      }
    },
    [assignedProducts, onUpdate]
  );

  const handleMoveDown = useCallback(
    async (index: number) => {
      if (index === assignedProducts.length - 1) return;

      const newAssigned = [...assignedProducts];
      [newAssigned[index], newAssigned[index + 1]] = [
        newAssigned[index + 1],
        newAssigned[index],
      ];

      setAssignedProducts(newAssigned);
      setIsUpdating(true);
      setError(null);

      try {
        await onUpdate(newAssigned.map((p) => p.id));
      } catch (err) {
        console.error('Move error:', err);
        setError(
          err instanceof Error ? err.message : 'Failed to reorder products'
        );
        setAssignedProducts(assignedProducts);
      } finally {
        setIsUpdating(false);
      }
    },
    [assignedProducts, onUpdate]
  );

  // Filter available products by search
  const filteredAvailable = searchQuery
    ? availableProducts.filter(
        (p) =>
          p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.variants.some((v) =>
            v.sku.toLowerCase().includes(searchQuery.toLowerCase())
          )
      )
    : availableProducts;

  return (
    <div className="space-y-6">
      {/* Error Message */}
      {error && (
        <div className="rounded-lg bg-status-error/10 border border-status-error/20 p-4">
          <p className="text-sm text-status-error">{error}</p>
        </div>
      )}

      {/* Assigned Products */}
      <div>
        <h3 className="text-sm font-medium text-text-primary mb-3">
          Products in This Drop ({assignedProducts.length})
          {assignedProducts.length > 1 && (
            <span className="font-normal text-text-muted ml-2">
              Drag to reorder
            </span>
          )}
        </h3>
        {assignedProducts.length === 0 ? (
          <div className="bg-background-tertiary/50 rounded-lg border border-border border-dashed p-8 text-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
              className="w-8 h-8 mx-auto text-text-muted mb-2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m21 7.5-9-5.25L3 7.5m18 0-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9"
              />
            </svg>
            <p className="text-sm text-text-muted">
              No products assigned to this drop yet.
            </p>
            <p className="text-xs text-text-muted mt-1">
              Add products from the list below.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {assignedProducts.map((product, index) => (
              <DraggableProductCard
                key={product.id}
                product={product}
                index={index}
                totalCount={assignedProducts.length}
                isDragging={draggedIndex === index}
                isDragOver={dragOverIndex === index && draggedIndex !== index}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onRemove={() => handleUnassignProduct(product)}
                onMoveUp={() => handleMoveUp(index)}
                onMoveDown={() => handleMoveDown(index)}
                isUpdating={isUpdating}
              />
            ))}
          </div>
        )}
      </div>

      {/* Available Products */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-text-primary">
            Available Products ({filteredAvailable.length})
          </h3>
        </div>

        {/* Search */}
        <div className="mb-4">
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <svg
                className="h-4 w-4 text-text-muted"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full rounded-lg border border-border bg-background-primary py-2 pl-9 pr-3 text-sm text-text-primary placeholder:text-text-muted focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              placeholder="Search products..."
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <svg
              className="animate-spin h-6 w-6 text-primary"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </div>
        ) : filteredAvailable.length === 0 ? (
          <div className="bg-background-tertiary/50 rounded-lg border border-border border-dashed p-6 text-center">
            <p className="text-sm text-text-muted">
              {searchQuery
                ? 'No products match your search.'
                : 'All products are assigned to drops.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
            {filteredAvailable.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                action="add"
                onAction={() => handleAssignProduct(product)}
                isUpdating={isUpdating}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface DraggableProductCardProps {
  product: Product;
  index: number;
  totalCount: number;
  isDragging: boolean;
  isDragOver: boolean;
  onDragStart: (index: number) => void;
  onDragEnd: () => void;
  onDragEnter: (index: number) => void;
  onDragLeave: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isUpdating: boolean;
}

function DraggableProductCard({
  product,
  index,
  totalCount,
  isDragging,
  isDragOver,
  onDragStart,
  onDragEnd,
  onDragEnter,
  onDragLeave,
  onDragOver,
  onRemove,
  onMoveUp,
  onMoveDown,
  isUpdating,
}: DraggableProductCardProps) {
  const image = getPrimaryImage(product);
  const price = getPrimaryPrice(product);

  return (
    <div
      draggable
      onDragStart={() => onDragStart(index)}
      onDragEnd={onDragEnd}
      onDragEnter={() => onDragEnter(index)}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
        isDragging
          ? 'opacity-50 bg-background-secondary border-primary-500'
          : isDragOver
            ? 'border-primary-500 bg-primary-500/10'
            : 'bg-background-tertiary/50 border-border'
      }`}
    >
      {/* Drag Handle */}
      <div className="flex-shrink-0 cursor-grab active:cursor-grabbing text-text-muted hover:text-text-secondary">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="1.5"
          stroke="currentColor"
          className="w-5 h-5"
          aria-label="Drag handle"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
          />
        </svg>
      </div>

      {/* Position Number */}
      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-background-tertiary flex items-center justify-center">
        <span className="text-xs font-medium text-text-muted">{index + 1}</span>
      </div>

      {/* Image */}
      <div className="flex-shrink-0">
        {image ? (
          <img
            src={image}
            alt={product.title}
            className="h-12 w-12 rounded-lg object-cover"
          />
        ) : (
          <div className="h-12 w-12 rounded-lg bg-background-tertiary flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
              className="w-5 h-5 text-text-muted"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
              />
            </svg>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-primary truncate">
          {product.title}
        </p>
        <p className="text-xs text-text-muted">
          {formatPrice(price)} &middot; {product.variants.length} variant
          {product.variants.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Up/Down Buttons for Accessibility */}
      <div className="flex flex-col gap-0.5">
        <button
          type="button"
          onClick={onMoveUp}
          disabled={isUpdating || index === 0}
          className="p-1 rounded text-text-muted hover:text-text-secondary hover:bg-background-tertiary disabled:opacity-30 disabled:cursor-not-allowed"
          title="Move up"
          aria-label="Move product up"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
            className="w-4 h-4"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m4.5 15.75 7.5-7.5 7.5 7.5"
            />
          </svg>
        </button>
        <button
          type="button"
          onClick={onMoveDown}
          disabled={isUpdating || index === totalCount - 1}
          className="p-1 rounded text-text-muted hover:text-text-secondary hover:bg-background-tertiary disabled:opacity-30 disabled:cursor-not-allowed"
          title="Move down"
          aria-label="Move product down"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
            className="w-4 h-4"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m19.5 8.25-7.5 7.5-7.5-7.5"
            />
          </svg>
        </button>
      </div>

      {/* Remove Button */}
      <button
        type="button"
        onClick={onRemove}
        disabled={isUpdating}
        className="flex-shrink-0 p-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-status-error hover:bg-status-error/10"
        title="Remove from drop"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="1.5"
          stroke="currentColor"
          className="w-5 h-5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6 18 18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>
  );
}

interface ProductCardProps {
  product: Product;
  action: 'add' | 'remove';
  onAction: () => void;
  isUpdating: boolean;
}

function ProductCard({
  product,
  action,
  onAction,
  isUpdating,
}: ProductCardProps) {
  const image = getPrimaryImage(product);
  const price = getPrimaryPrice(product);

  return (
    <div className="flex items-center gap-3 p-3 bg-background-tertiary/50 rounded-lg border border-border">
      {/* Image */}
      <div className="flex-shrink-0">
        {image ? (
          <img
            src={image}
            alt={product.title}
            className="h-12 w-12 rounded-lg object-cover"
          />
        ) : (
          <div className="h-12 w-12 rounded-lg bg-background-tertiary flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
              className="w-5 h-5 text-text-muted"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
              />
            </svg>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-primary truncate">
          {product.title}
        </p>
        <p className="text-xs text-text-muted">
          {formatPrice(price)} &middot; {product.variants.length} variant
          {product.variants.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Action Button */}
      <button
        type="button"
        onClick={onAction}
        disabled={isUpdating}
        className={`flex-shrink-0 p-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
          action === 'add'
            ? 'text-status-success hover:bg-status-success/10'
            : 'text-status-error hover:bg-status-error/10'
        }`}
        title={action === 'add' ? 'Add to drop' : 'Remove from drop'}
      >
        {action === 'add' ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
            className="w-5 h-5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 4.5v15m7.5-7.5h-15"
            />
          </svg>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
            className="w-5 h-5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18 18 6M6 6l12 12"
            />
          </svg>
        )}
      </button>
    </div>
  );
}
