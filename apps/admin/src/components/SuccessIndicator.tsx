import { useEffect, useState } from 'react';

export interface SuccessIndicatorProps {
  /** Whether to show the success indicator */
  show: boolean;
  /** Message to display (optional) */
  message?: string;
  /** Duration in ms before fading out (default: 2500) */
  duration?: number;
  /** Callback when animation completes */
  onComplete?: () => void;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Animated success checkmark indicator that appears and smoothly fades out.
 * Use this to provide visual feedback after successful save operations.
 */
export function SuccessIndicator({
  show,
  message,
  duration = 2500,
  onComplete,
  size = 'md',
}: SuccessIndicatorProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [key, setKey] = useState(0);

  useEffect(() => {
    if (show) {
      // Increment key to force re-render and restart animations
      setKey((k) => k + 1);
      setIsVisible(true);
      setIsFadingOut(false);

      // Start fade out after duration
      const fadeTimer = setTimeout(() => {
        setIsFadingOut(true);
      }, duration);

      // Complete hide after fade animation (400ms)
      const hideTimer = setTimeout(() => {
        setIsVisible(false);
        setIsFadingOut(false);
        onComplete?.();
      }, duration + 400);

      return () => {
        clearTimeout(fadeTimer);
        clearTimeout(hideTimer);
      };
    }
  }, [show, duration, onComplete]);

  if (!isVisible) return null;

  const iconSizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  return (
    <div
      key={key}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-status-success/10 border border-status-success/20 transition-all duration-400 ease-out ${
        isFadingOut
          ? 'opacity-0 transform scale-95'
          : 'opacity-100 transform scale-100'
      }`}
      role="status"
      aria-live="polite"
      style={{
        animation: isFadingOut
          ? undefined
          : 'success-container-pop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}
    >
      <span
        className={`inline-flex items-center justify-center ${iconSizeClasses[size]} rounded-full bg-status-success text-white`}
        style={{
          animation: 'success-pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="3"
          stroke="currentColor"
          className="w-3 h-3"
          style={{
            animation: 'success-check 0.3s ease-out 0.15s forwards',
            strokeDasharray: 30,
            strokeDashoffset: 30,
          }}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4.5 12.75l6 6 9-13.5"
          />
        </svg>
      </span>
      {message && (
        <span
          className={`font-medium text-status-success ${textSizeClasses[size]}`}
        >
          {message}
        </span>
      )}
    </div>
  );
}

/**
 * Hook to manage success indicator state
 */
export function useSuccessIndicator() {
  const [showSuccess, setShowSuccess] = useState(false);

  const triggerSuccess = () => {
    setShowSuccess(true);
  };

  const resetSuccess = () => {
    setShowSuccess(false);
  };

  return {
    showSuccess,
    triggerSuccess,
    resetSuccess,
  };
}
