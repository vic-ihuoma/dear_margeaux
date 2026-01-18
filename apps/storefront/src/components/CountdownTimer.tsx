import { useState, useEffect, useCallback, useRef } from 'react';

interface CountdownTimerProps {
  /** ISO date string for the target date/time */
  targetDate: string;
  /** Optional callback when countdown reaches zero */
  onComplete?: () => void;
}

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
}

/**
 * CountdownTimer - displays a live countdown to a target date
 * Shows days, hours, minutes, seconds and updates every second
 * Displays "Live Now!" when the countdown reaches zero
 */
export default function CountdownTimer({
  targetDate,
  onComplete,
}: CountdownTimerProps) {
  const calculateTimeRemaining = useCallback((): TimeRemaining => {
    const now = new Date().getTime();
    const target = new Date(targetDate).getTime();
    const difference = target - now;

    if (difference <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 };
    }

    return {
      days: Math.floor(difference / (1000 * 60 * 60 * 24)),
      hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((difference / (1000 * 60)) % 60),
      seconds: Math.floor((difference / 1000) % 60),
      total: difference,
    };
  }, [targetDate]);

  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>(() =>
    calculateTimeRemaining()
  );

  // Use ref to store timer ID for proper cleanup
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    // Update every second - use window.setInterval for browser context
    timerRef.current = window.setInterval(() => {
      const remaining = calculateTimeRemaining();
      setTimeRemaining(remaining);

      // Call onComplete when countdown reaches zero
      if (remaining.total <= 0) {
        if (timerRef.current !== null) {
          window.clearInterval(timerRef.current);
        }
        onComplete?.();
      }
    }, 1000);

    return () => {
      if (timerRef.current !== null) {
        window.clearInterval(timerRef.current);
      }
    };
  }, [calculateTimeRemaining, onComplete]);

  // Countdown is complete
  if (timeRemaining.total <= 0) {
    return (
      <div className="text-center">
        <span className="inline-flex items-center gap-2 px-4 py-2 text-lg font-semibold text-status-success bg-status-success/10 rounded-full">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-status-success opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-status-success"></span>
          </span>
          Live Now!
        </span>
      </div>
    );
  }

  // Format number to always show 2 digits
  const formatNumber = (num: number): string => {
    return num.toString().padStart(2, '0');
  };

  return (
    <div className="flex justify-center gap-2 sm:gap-4">
      {/* Days */}
      <div className="flex flex-col items-center">
        <div className="w-14 sm:w-16 h-14 sm:h-16 flex items-center justify-center rounded-lg bg-background-secondary border border-border">
          <span className="text-xl sm:text-2xl font-bold text-text tabular-nums">
            {formatNumber(timeRemaining.days)}
          </span>
        </div>
        <span className="mt-1.5 text-xs text-text-secondary uppercase tracking-wide">
          Days
        </span>
      </div>

      {/* Separator */}
      <span className="text-xl sm:text-2xl font-bold text-text-muted self-start mt-3.5">
        :
      </span>

      {/* Hours */}
      <div className="flex flex-col items-center">
        <div className="w-14 sm:w-16 h-14 sm:h-16 flex items-center justify-center rounded-lg bg-background-secondary border border-border">
          <span className="text-xl sm:text-2xl font-bold text-text tabular-nums">
            {formatNumber(timeRemaining.hours)}
          </span>
        </div>
        <span className="mt-1.5 text-xs text-text-secondary uppercase tracking-wide">
          Hours
        </span>
      </div>

      {/* Separator */}
      <span className="text-xl sm:text-2xl font-bold text-text-muted self-start mt-3.5">
        :
      </span>

      {/* Minutes */}
      <div className="flex flex-col items-center">
        <div className="w-14 sm:w-16 h-14 sm:h-16 flex items-center justify-center rounded-lg bg-background-secondary border border-border">
          <span className="text-xl sm:text-2xl font-bold text-text tabular-nums">
            {formatNumber(timeRemaining.minutes)}
          </span>
        </div>
        <span className="mt-1.5 text-xs text-text-secondary uppercase tracking-wide">
          Mins
        </span>
      </div>

      {/* Separator */}
      <span className="text-xl sm:text-2xl font-bold text-text-muted self-start mt-3.5">
        :
      </span>

      {/* Seconds */}
      <div className="flex flex-col items-center">
        <div className="w-14 sm:w-16 h-14 sm:h-16 flex items-center justify-center rounded-lg bg-background-secondary border border-border">
          <span className="text-xl sm:text-2xl font-bold text-text tabular-nums">
            {formatNumber(timeRemaining.seconds)}
          </span>
        </div>
        <span className="mt-1.5 text-xs text-text-secondary uppercase tracking-wide">
          Secs
        </span>
      </div>
    </div>
  );
}
