import { useState, useEffect, useCallback } from 'react';

export interface UndoToastProps {
  /** Message to display */
  message: string;
  /** Callback when undo is clicked */
  onUndo: () => Promise<void>;
  /** Callback when toast is dismissed (either by timeout or close) */
  onDismiss: () => void;
  /** Duration in milliseconds before auto-dismiss (default: 30000) */
  duration?: number;
}

export function UndoToast({
  message,
  onUndo,
  onDismiss,
  duration = 30000,
}: UndoToastProps) {
  const [isUndoing, setIsUndoing] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(duration / 1000);

  // Countdown timer
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Auto-dismiss after duration
  useEffect(() => {
    const timeout = setTimeout(() => {
      onDismiss();
    }, duration);

    return () => clearTimeout(timeout);
  }, [duration, onDismiss]);

  const handleUndo = useCallback(async () => {
    setIsUndoing(true);
    try {
      await onUndo();
    } finally {
      setIsUndoing(false);
      onDismiss();
    }
  }, [onUndo, onDismiss]);

  return (
    <div
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 animate-slide-up"
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-center gap-4 bg-background-secondary border border-border rounded-lg shadow-lg px-4 py-3">
        {/* Message */}
        <span className="text-sm text-text-primary">{message}</span>

        {/* Timer */}
        <span className="text-xs text-text-muted tabular-nums">
          {timeRemaining}s
        </span>

        {/* Undo button */}
        <button
          type="button"
          onClick={handleUndo}
          disabled={isUndoing}
          className="text-sm font-medium text-primary hover:text-primary/80 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isUndoing ? 'Restoring...' : 'Undo'}
        </button>

        {/* Close button */}
        <button
          type="button"
          onClick={onDismiss}
          className="p-1 text-text-muted hover:text-text-primary rounded transition-colors"
          aria-label="Dismiss"
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
              d="M6 18 18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
