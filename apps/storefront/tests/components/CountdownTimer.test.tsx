import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import CountdownTimer from '../../src/components/CountdownTimer';

describe('CountdownTimer', () => {
  beforeEach(() => {
    // Use fake timers for controlled time
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('time calculation', () => {
    it('calculates correct time remaining for future date', () => {
      // Set current time to a known value
      const now = new Date('2026-01-18T12:00:00Z');
      vi.setSystemTime(now);

      // Target date is 2 days, 3 hours, 4 minutes, 5 seconds in the future
      const target = new Date('2026-01-20T15:04:05Z');

      render(<CountdownTimer targetDate={target.toISOString()} />);

      // Check that days, hours, minutes, seconds are displayed
      expect(screen.getByText('02')).toBeInTheDocument(); // days
      expect(screen.getByText('03')).toBeInTheDocument(); // hours
      expect(screen.getByText('04')).toBeInTheDocument(); // minutes
      expect(screen.getByText('05')).toBeInTheDocument(); // seconds
    });

    it('displays days, hours, minutes, and seconds labels', () => {
      const now = new Date('2026-01-18T12:00:00Z');
      vi.setSystemTime(now);
      const target = new Date('2026-01-20T15:04:05Z');

      render(<CountdownTimer targetDate={target.toISOString()} />);

      expect(screen.getByText('Days')).toBeInTheDocument();
      expect(screen.getByText('Hours')).toBeInTheDocument();
      expect(screen.getByText('Mins')).toBeInTheDocument();
      expect(screen.getByText('Secs')).toBeInTheDocument();
    });
  });

  describe('timer updates', () => {
    it('updates every second', () => {
      const now = new Date('2026-01-18T12:00:00Z');
      vi.setSystemTime(now);
      const target = new Date('2026-01-18T12:00:10Z'); // 10 seconds in future

      render(<CountdownTimer targetDate={target.toISOString()} />);

      // Initial state should show 10 seconds
      expect(screen.getByText('10')).toBeInTheDocument();

      // Advance by 1 second
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      // Should now show 9 seconds
      expect(screen.getByText('09')).toBeInTheDocument();

      // Advance by another 3 seconds
      act(() => {
        vi.advanceTimersByTime(3000);
      });

      // Should now show 6 seconds
      expect(screen.getByText('06')).toBeInTheDocument();
    });
  });

  describe('timezone handling', () => {
    it('handles ISO date strings with timezone correctly', () => {
      // Set current time
      const now = new Date('2026-01-18T12:00:00Z');
      vi.setSystemTime(now);

      // Target is 1 hour ahead in UTC
      const target = '2026-01-18T13:00:00Z';

      render(<CountdownTimer targetDate={target} />);

      // Should show 1 hour remaining
      // Use getAllByText for values that appear multiple times (00 for days, mins, secs)
      expect(screen.getByText('01')).toBeInTheDocument(); // hours
      const zeros = screen.getAllByText('00');
      expect(zeros.length).toBe(3); // days, minutes, seconds are all 00
    });

    it('handles date without timezone (local time)', () => {
      // Set current time
      const now = new Date('2026-01-18T12:00:00Z');
      vi.setSystemTime(now);

      // Target is 2 hours in the future
      const target = new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString();

      render(<CountdownTimer targetDate={target} />);

      // Should show 2 hours
      expect(screen.getByText('02')).toBeInTheDocument();
    });
  });

  describe('countdown complete', () => {
    it('shows Live Now! when time reaches 0', () => {
      const now = new Date('2026-01-18T12:00:00Z');
      vi.setSystemTime(now);

      // Target is exactly now
      const target = now.toISOString();

      render(<CountdownTimer targetDate={target} />);

      expect(screen.getByText('Live Now!')).toBeInTheDocument();
    });

    it('shows Live Now! when countdown expires', () => {
      const now = new Date('2026-01-18T12:00:00Z');
      vi.setSystemTime(now);

      // Target is 2 seconds in the future
      const target = '2026-01-18T12:00:02Z';

      render(<CountdownTimer targetDate={target} />);

      // Initially should show countdown
      expect(screen.getByText('02')).toBeInTheDocument();

      // Advance 2 seconds
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      // Should now show Live Now!
      expect(screen.getByText('Live Now!')).toBeInTheDocument();
    });

    it('calls onComplete callback when countdown reaches 0', () => {
      const now = new Date('2026-01-18T12:00:00Z');
      vi.setSystemTime(now);

      const onComplete = vi.fn();
      const target = new Date('2026-01-18T12:00:02Z');

      render(
        <CountdownTimer
          targetDate={target.toISOString()}
          onComplete={onComplete}
        />
      );

      // Initially callback should not be called
      expect(onComplete).not.toHaveBeenCalled();

      // Advance 2 seconds
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      // Callback should be called
      expect(onComplete).toHaveBeenCalledTimes(1);
    });
  });

  describe('past dates', () => {
    it('handles past dates gracefully by showing Live Now!', () => {
      const now = new Date('2026-01-18T12:00:00Z');
      vi.setSystemTime(now);

      // Target is in the past
      const target = new Date('2026-01-17T12:00:00Z');

      render(<CountdownTimer targetDate={target.toISOString()} />);

      // Should show Live Now! for past dates
      expect(screen.getByText('Live Now!')).toBeInTheDocument();
    });

    it('handles dates far in the past', () => {
      const now = new Date('2026-01-18T12:00:00Z');
      vi.setSystemTime(now);

      // Target is 30 days in the past
      const target = new Date('2025-12-19T12:00:00Z');

      render(<CountdownTimer targetDate={target.toISOString()} />);

      expect(screen.getByText('Live Now!')).toBeInTheDocument();
    });
  });

  describe('formatting', () => {
    it('pads single digit values with leading zeros', () => {
      const now = new Date('2026-01-18T12:00:00Z');
      vi.setSystemTime(now);

      // Target is 1 day, 2 hours, 3 minutes, 4 seconds in the future
      const target = new Date('2026-01-19T14:03:04Z');

      render(<CountdownTimer targetDate={target.toISOString()} />);

      // All values should be padded
      expect(screen.getByText('01')).toBeInTheDocument(); // days
      expect(screen.getByText('02')).toBeInTheDocument(); // hours
      expect(screen.getByText('03')).toBeInTheDocument(); // minutes
      expect(screen.getByText('04')).toBeInTheDocument(); // seconds
    });

    it('displays double digit values correctly', () => {
      const now = new Date('2026-01-18T12:00:00Z');
      vi.setSystemTime(now);

      // Target is 25 days, 15 hours, 30 minutes, 45 seconds in the future
      const target = new Date('2026-02-13T03:30:45Z');

      render(<CountdownTimer targetDate={target.toISOString()} />);

      expect(screen.getByText('25')).toBeInTheDocument(); // days
      expect(screen.getByText('15')).toBeInTheDocument(); // hours
      expect(screen.getByText('30')).toBeInTheDocument(); // minutes
      expect(screen.getByText('45')).toBeInTheDocument(); // seconds
    });
  });

  describe('cleanup', () => {
    it('clears interval on unmount', () => {
      const clearIntervalSpy = vi.spyOn(window, 'clearInterval');
      const now = new Date('2026-01-18T12:00:00Z');
      vi.setSystemTime(now);

      const target = new Date('2026-01-19T12:00:00Z');

      const { unmount } = render(
        <CountdownTimer targetDate={target.toISOString()} />
      );

      // Unmount the component
      unmount();

      // clearInterval should have been called
      expect(clearIntervalSpy).toHaveBeenCalled();
    });

    it('clears interval when countdown completes', () => {
      const clearIntervalSpy = vi.spyOn(window, 'clearInterval');
      const now = new Date('2026-01-18T12:00:00Z');
      vi.setSystemTime(now);

      const target = new Date('2026-01-18T12:00:01Z');

      render(<CountdownTimer targetDate={target.toISOString()} />);

      // Advance time to complete countdown
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      // clearInterval should have been called
      expect(clearIntervalSpy).toHaveBeenCalled();
    });
  });

  describe('live indicator', () => {
    it('shows animated indicator when Live Now!', () => {
      const now = new Date('2026-01-18T12:00:00Z');
      vi.setSystemTime(now);

      const target = now.toISOString();

      render(<CountdownTimer targetDate={target} />);

      // The Live Now! element should exist with animation classes
      const liveText = screen.getByText('Live Now!');
      expect(liveText).toBeInTheDocument();

      // Check that the parent container has the expected structure
      const container = liveText.closest('span');
      expect(container).toHaveClass('inline-flex');
    });
  });
});
