import { useState, useEffect, useCallback, useMemo } from 'react';
import type { Drop, DropStatus, PaginatedResponse } from '@dear-margeaux/api';

export interface DropSelectorProps {
  /** Currently selected drop ID */
  value: string | null;
  /** Called when selection changes */
  onChange: (dropId: string | null) => void;
  /** Whether the selector is disabled */
  disabled?: boolean;
  /** Label for the field */
  label?: string;
  /** ID for the select element */
  id?: string;
  /** Error message to display */
  error?: string;
  /** API URL to fetch drops from (defaults to /api/drops) */
  apiUrl?: string;
  /** Whether to allow creating new drops inline */
  allowCreate?: boolean;
}

/** Status badge configuration */
const STATUS_BADGE_CONFIG: Record<
  DropStatus,
  { label: string; className: string }
> = {
  active: {
    label: 'Active',
    className: 'bg-status-success/10 text-status-success',
  },
  scheduled: {
    label: 'Scheduled',
    className: 'bg-status-warning/10 text-status-warning',
  },
  draft: {
    label: 'Draft',
    className: 'bg-text-muted/10 text-text-muted',
  },
  ended: {
    label: 'Ended',
    className: 'bg-text-muted/20 text-text-secondary',
  },
};

/**
 * Get the badge configuration for a drop status
 */
export function getStatusBadgeConfig(status: DropStatus): {
  label: string;
  className: string;
} {
  return STATUS_BADGE_CONFIG[status] || STATUS_BADGE_CONFIG.draft;
}

/**
 * Generate a URL-friendly slug from a string
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

interface CreateDropModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (drop: Drop) => void;
  apiUrl: string;
}

function CreateDropModal({
  isOpen,
  onClose,
  onCreated,
  apiUrl,
}: CreateDropModalProps) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<DropStatus>('draft');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  // Auto-generate slug from name unless manually edited
  useEffect(() => {
    if (!slugManuallyEdited && name) {
      setSlug(generateSlug(name));
    }
  }, [name, slugManuallyEdited]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          slug: slug.trim(),
          description: description.trim() || undefined,
          status,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error?.message ||
            errorData.error ||
            `Failed to create drop: ${response.status}`
        );
      }

      const newDrop: Drop = await response.json();
      onCreated(newDrop);
      handleClose();
    } catch (err) {
      console.error('Failed to create drop:', err);
      setError(err instanceof Error ? err.message : 'Failed to create drop');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setName('');
    setSlug('');
    setDescription('');
    setStatus('draft');
    setError(null);
    setSlugManuallyEdited(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative bg-background-primary rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        <h2 className="text-lg font-semibold text-text-primary mb-4">
          Create New Drop
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label
              htmlFor="new-drop-name"
              className="block text-sm font-medium text-text-primary mb-1"
            >
              Name *
            </label>
            <input
              id="new-drop-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Summer 2026 Collection"
              required
              maxLength={100}
              className="block w-full rounded-lg border border-border bg-background-primary py-2 px-3 text-sm text-text-primary focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none"
            />
          </div>

          {/* Slug */}
          <div>
            <label
              htmlFor="new-drop-slug"
              className="block text-sm font-medium text-text-primary mb-1"
            >
              Slug *
            </label>
            <input
              id="new-drop-slug"
              type="text"
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value);
                setSlugManuallyEdited(true);
              }}
              placeholder="summer-2026"
              required
              maxLength={100}
              pattern="^[a-z0-9-]+$"
              className="block w-full rounded-lg border border-border bg-background-primary py-2 px-3 text-sm text-text-primary focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none"
            />
            <p className="mt-1 text-xs text-text-muted">
              URL-friendly identifier (lowercase, hyphens only)
            </p>
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="new-drop-description"
              className="block text-sm font-medium text-text-primary mb-1"
            >
              Description
            </label>
            <textarea
              id="new-drop-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this drop..."
              rows={2}
              maxLength={500}
              className="block w-full rounded-lg border border-border bg-background-primary py-2 px-3 text-sm text-text-primary focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none resize-none"
            />
          </div>

          {/* Status */}
          <div>
            <label
              htmlFor="new-drop-status"
              className="block text-sm font-medium text-text-primary mb-1"
            >
              Status
            </label>
            <select
              id="new-drop-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as DropStatus)}
              className="block w-full rounded-lg border border-border bg-background-primary py-2 px-3 text-sm text-text-primary focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none"
            >
              <option value="draft">Draft</option>
              <option value="scheduled">Scheduled</option>
              <option value="active">Active</option>
              <option value="ended">Ended</option>
            </select>
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-status-error bg-status-error/10 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim() || !slug.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? 'Creating...' : 'Create Drop'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/**
 * DropSelector component for selecting a drop to assign to a product
 * - Fetches available drops from API on mount
 * - Shows drop names with status badges
 * - Includes 'No drop' option for unassigned products
 * - Optionally allows creating new drops inline
 * - Displays loading and error states
 */
export function DropSelector({
  value,
  onChange,
  disabled = false,
  label = 'Assign to Drop',
  id = 'drop-selector',
  error,
  apiUrl = '/api/drops',
  allowCreate = true,
}: DropSelectorProps) {
  const [drops, setDrops] = useState<Drop[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Fetch drops on mount
  const fetchDrops = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);

    try {
      const response = await fetch(apiUrl);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `Failed to fetch drops: ${response.status}`
        );
      }

      const data: PaginatedResponse<Drop> = await response.json();
      setDrops(data.items || []);
    } catch (err) {
      console.error('Failed to fetch drops:', err);
      setFetchError(
        err instanceof Error ? err.message : 'Failed to fetch drops'
      );
    } finally {
      setIsLoading(false);
    }
  }, [apiUrl]);

  useEffect(() => {
    fetchDrops();
  }, [fetchDrops]);

  // Sort drops: active first, then scheduled, then draft, then ended
  const sortedDrops = useMemo(() => {
    const statusOrder: DropStatus[] = ['active', 'scheduled', 'draft', 'ended'];
    return [...drops].sort((a, b) => {
      const aIndex = statusOrder.indexOf(a.status);
      const bIndex = statusOrder.indexOf(b.status);
      if (aIndex !== bIndex) {
        return aIndex - bIndex;
      }
      // Within same status, sort by name alphabetically
      return a.name.localeCompare(b.name);
    });
  }, [drops]);

  // Find the currently selected drop
  const selectedDrop = useMemo(() => {
    if (!value) return null;
    return drops.find((drop) => drop.id === value) || null;
  }, [value, drops]);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newValue = e.target.value;
    if (newValue === '__create_new__') {
      setShowCreateModal(true);
      return;
    }
    onChange(newValue === '' ? null : newValue);
  };

  const handleDropCreated = (newDrop: Drop) => {
    setDrops((prev) => [...prev, newDrop]);
    onChange(newDrop.id);
  };

  const displayError = error || fetchError;

  return (
    <div className="space-y-1">
      {label && (
        <label
          htmlFor={id}
          className="block text-sm font-medium text-text-primary"
        >
          {label}
        </label>
      )}

      <div className="relative">
        <select
          id={id}
          value={value || ''}
          onChange={handleChange}
          disabled={disabled || isLoading}
          className={`block w-full rounded-lg border ${
            displayError
              ? 'border-status-error focus:border-status-error focus:ring-status-error'
              : 'border-border focus:border-primary-500 focus:ring-primary-500'
          } bg-background-primary py-2 pl-3 pr-10 text-sm text-text-primary focus:outline-none focus:ring-1 ${
            disabled || isLoading ? 'opacity-50 cursor-not-allowed' : ''
          }`}
          aria-describedby={displayError ? `${id}-error` : undefined}
        >
          <option value="">
            {isLoading ? 'Loading drops...' : 'No drop (unassigned)'}
          </option>
          {sortedDrops.map((drop) => {
            const badge = getStatusBadgeConfig(drop.status);
            return (
              <option key={drop.id} value={drop.id}>
                {drop.name} ({badge.label})
              </option>
            );
          })}
          {allowCreate && !isLoading && (
            <option value="__create_new__">+ Create new drop...</option>
          )}
        </select>

        {/* Loading spinner */}
        {isLoading && (
          <div className="absolute inset-y-0 right-8 flex items-center pointer-events-none">
            <svg
              className="animate-spin h-4 w-4 text-text-muted"
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
        )}
      </div>

      {/* Status badge for selected drop */}
      {selectedDrop && !isLoading && (
        <div className="flex items-center gap-2 mt-1">
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
              getStatusBadgeConfig(selectedDrop.status).className
            }`}
          >
            {getStatusBadgeConfig(selectedDrop.status).label}
          </span>
          {selectedDrop.description && (
            <span className="text-xs text-text-muted truncate max-w-xs">
              {selectedDrop.description}
            </span>
          )}
        </div>
      )}

      {/* Error message */}
      {displayError && (
        <p id={`${id}-error`} className="text-sm text-status-error">
          {displayError}
        </p>
      )}

      {/* Help text */}
      {!displayError && (
        <p className="text-xs text-text-muted">
          {value
            ? 'Product will appear in this drop collection'
            : 'Product will not be part of any drop'}
        </p>
      )}

      {/* Create Drop Modal */}
      {allowCreate && (
        <CreateDropModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onCreated={handleDropCreated}
          apiUrl={apiUrl}
        />
      )}
    </div>
  );
}
