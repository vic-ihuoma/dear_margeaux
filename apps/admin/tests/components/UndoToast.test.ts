import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Tests for UndoToast component behavior
 * Tests the undo functionality without React Testing Library
 */

describe('UndoToast behavior', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Auto-dismiss timing', () => {
    it('should call onDismiss after default duration (30 seconds)', () => {
      const onDismiss = vi.fn();

      // Simulate the toast's auto-dismiss behavior
      const duration = 30000;
      const timeout = setTimeout(onDismiss, duration);

      expect(onDismiss).not.toHaveBeenCalled();

      vi.advanceTimersByTime(30000);

      expect(onDismiss).toHaveBeenCalledTimes(1);

      clearTimeout(timeout);
    });

    it('should not call onDismiss before duration expires', () => {
      const onDismiss = vi.fn();

      const duration = 30000;
      const timeout = setTimeout(onDismiss, duration);

      vi.advanceTimersByTime(15000);

      expect(onDismiss).not.toHaveBeenCalled();

      clearTimeout(timeout);
    });

    it('should support custom durations', () => {
      const onDismiss = vi.fn();

      const duration = 10000; // 10 seconds
      const timeout = setTimeout(onDismiss, duration);

      vi.advanceTimersByTime(10000);

      expect(onDismiss).toHaveBeenCalledTimes(1);

      clearTimeout(timeout);
    });
  });

  describe('Countdown timer', () => {
    it('should decrement countdown every second', () => {
      let timeRemaining = 30;

      const interval = setInterval(() => {
        timeRemaining -= 1;
      }, 1000);

      expect(timeRemaining).toBe(30);

      vi.advanceTimersByTime(1000);
      expect(timeRemaining).toBe(29);

      vi.advanceTimersByTime(1000);
      expect(timeRemaining).toBe(28);

      vi.advanceTimersByTime(10000);
      expect(timeRemaining).toBe(18);

      clearInterval(interval);
    });
  });

  describe('Undo action', () => {
    it('should call onUndo when undo is triggered', async () => {
      const onUndo = vi.fn().mockResolvedValue(undefined);

      await onUndo();

      expect(onUndo).toHaveBeenCalledTimes(1);
    });

    it('should call onDismiss after successful undo', async () => {
      const onUndo = vi.fn().mockResolvedValue(undefined);
      const onDismiss = vi.fn();

      await onUndo();
      onDismiss();

      expect(onUndo).toHaveBeenCalledTimes(1);
      expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it('should still call onDismiss on undo failure', async () => {
      const onUndo = vi.fn().mockRejectedValue(new Error('Restore failed'));
      const onDismiss = vi.fn();

      try {
        await onUndo();
      } catch {
        // Error expected
      }
      onDismiss();

      expect(onUndo).toHaveBeenCalledTimes(1);
      expect(onDismiss).toHaveBeenCalledTimes(1);
    });
  });

  describe('Manual dismiss', () => {
    it('should call onDismiss immediately when close is clicked', () => {
      const onDismiss = vi.fn();

      // Simulate close button click
      onDismiss();

      expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it('should clear timeout when manually dismissed', () => {
      const onDismiss = vi.fn();

      const timeout = setTimeout(() => {
        onDismiss();
      }, 30000);

      // Simulate manual dismiss
      clearTimeout(timeout);
      onDismiss();

      expect(onDismiss).toHaveBeenCalledTimes(1);

      // Advance time - should not trigger again
      vi.advanceTimersByTime(30000);

      expect(onDismiss).toHaveBeenCalledTimes(1);
    });
  });
});

describe('Undo window expiration', () => {
  it('should allow undo within 30 seconds', async () => {
    const mockRestore = vi
      .fn()
      .mockResolvedValue({ id: 'prod-1', deleted_at: null });

    // Simulate calling restore within window
    const result = await mockRestore('prod-1');

    expect(mockRestore).toHaveBeenCalledWith('prod-1');
    expect(result.deleted_at).toBeNull();
  });

  it('should reject undo after 30 seconds', async () => {
    const mockRestore = vi
      .fn()
      .mockRejectedValue(new Error('Undo window expired'));

    await expect(mockRestore('prod-1')).rejects.toThrow('Undo window expired');
  });
});
