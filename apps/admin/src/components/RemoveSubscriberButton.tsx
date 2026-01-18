import { useState, useRef, useEffect } from 'react';

interface RemoveSubscriberButtonProps {
  subscriberId: string;
  email: string;
  onRemoved?: () => void;
}

export function RemoveSubscriberButton({
  subscriberId,
  email,
  onRemoved,
}: RemoveSubscriberButtonProps) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const confirmRef = useRef<HTMLDivElement>(null);

  // Close confirmation dialog when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        confirmRef.current &&
        !confirmRef.current.contains(event.target as Node)
      ) {
        setIsConfirming(false);
        setError(null);
      }
    }

    if (isConfirming) {
      document.addEventListener('mousedown', handleClickOutside);
      return () =>
        document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isConfirming]);

  // Close on Escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsConfirming(false);
        setError(null);
      }
    }

    if (isConfirming) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isConfirming]);

  async function handleRemove() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/newsletter/subscribers/${subscriberId}`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || data.message || 'Failed to remove subscriber'
        );
      }

      // Success - close dialog and optionally notify parent
      setIsConfirming(false);

      if (onRemoved) {
        onRemoved();
      } else {
        // Reload the page to reflect the change
        window.location.reload();
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to remove subscriber'
      );
    } finally {
      setIsLoading(false);
    }
  }

  if (isConfirming) {
    return (
      <div ref={confirmRef} className="relative inline-block">
        <div className="absolute right-0 z-10 mt-1 w-64 rounded-lg border border-border bg-background-secondary shadow-lg p-4">
          <p className="text-sm text-text-primary mb-3">
            Remove <span className="font-medium">{email}</span> from newsletter?
          </p>
          <p className="text-xs text-text-muted mb-4">
            They will be marked as unsubscribed and will not receive future
            newsletters.
          </p>

          {error && <p className="text-xs text-status-error mb-3">{error}</p>}

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setIsConfirming(false);
                setError(null);
              }}
              disabled={isLoading}
              className="px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-text-primary rounded-md hover:bg-background-tertiary transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleRemove}
              disabled={isLoading}
              className="px-3 py-1.5 text-xs font-medium text-white bg-status-error hover:bg-status-error/90 rounded-md transition-colors disabled:opacity-50 flex items-center gap-1"
            >
              {isLoading ? (
                <>
                  <svg
                    className="animate-spin h-3 w-3"
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
                  <span>Removing...</span>
                </>
              ) : (
                'Remove'
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setIsConfirming(true)}
      className="text-xs font-medium text-status-error hover:text-status-error/80 transition-colors"
      title={`Remove ${email}`}
    >
      Remove
    </button>
  );
}
