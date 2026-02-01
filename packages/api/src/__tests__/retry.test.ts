import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { withRetry, isRetryableError, calculateBackoff } from '../retry.js';
import { NetworkError, MerchantApiError } from '../merchant-client.js';

describe('retry utility', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('isRetryableError', () => {
    it('returns true for NetworkError', () => {
      const error = new NetworkError('Network timeout');
      expect(isRetryableError(error)).toBe(true);
    });

    it('returns true for 500 error', () => {
      const error = new MerchantApiError(
        'server_error',
        'Internal Server Error',
        500
      );
      expect(isRetryableError(error)).toBe(true);
    });

    it('returns true for 502 error', () => {
      const error = new MerchantApiError('bad_gateway', 'Bad Gateway', 502);
      expect(isRetryableError(error)).toBe(true);
    });

    it('returns true for 503 error', () => {
      const error = new MerchantApiError(
        'service_unavailable',
        'Service Unavailable',
        503
      );
      expect(isRetryableError(error)).toBe(true);
    });

    it('returns true for 504 error', () => {
      const error = new MerchantApiError(
        'gateway_timeout',
        'Gateway Timeout',
        504
      );
      expect(isRetryableError(error)).toBe(true);
    });

    it('returns false for 400 error', () => {
      const error = new MerchantApiError('invalid_request', 'Bad Request', 400);
      expect(isRetryableError(error)).toBe(false);
    });

    it('returns false for 401 error', () => {
      const error = new MerchantApiError('unauthorized', 'Unauthorized', 401);
      expect(isRetryableError(error)).toBe(false);
    });

    it('returns false for 403 error', () => {
      const error = new MerchantApiError('forbidden', 'Forbidden', 403);
      expect(isRetryableError(error)).toBe(false);
    });

    it('returns false for 404 error', () => {
      const error = new MerchantApiError('not_found', 'Not Found', 404);
      expect(isRetryableError(error)).toBe(false);
    });

    it('returns false for 409 error', () => {
      const error = new MerchantApiError('conflict', 'Conflict', 409);
      expect(isRetryableError(error)).toBe(false);
    });

    it('returns false for generic Error', () => {
      const error = new Error('Generic error');
      expect(isRetryableError(error)).toBe(false);
    });
  });

  describe('calculateBackoff', () => {
    it('calculates correct backoff for attempt 0 (first retry)', () => {
      const delay = calculateBackoff(0, {
        baseDelayMs: 1000,
        maxDelayMs: 30000,
      });
      // Should be around 1000ms (1s * 2^0 = 1000ms)
      expect(delay).toBeGreaterThanOrEqual(500); // 50% jitter min
      expect(delay).toBeLessThanOrEqual(1500); // 50% jitter max
    });

    it('calculates correct backoff for attempt 1 (second retry)', () => {
      const delay = calculateBackoff(1, {
        baseDelayMs: 1000,
        maxDelayMs: 30000,
      });
      // Should be around 2000ms (1s * 2^1 = 2000ms)
      expect(delay).toBeGreaterThanOrEqual(1000);
      expect(delay).toBeLessThanOrEqual(3000);
    });

    it('calculates correct backoff for attempt 2 (third retry)', () => {
      const delay = calculateBackoff(2, {
        baseDelayMs: 1000,
        maxDelayMs: 30000,
      });
      // Should be around 4000ms (1s * 2^2 = 4000ms)
      expect(delay).toBeGreaterThanOrEqual(2000);
      expect(delay).toBeLessThanOrEqual(6000);
    });

    it('respects maximum delay', () => {
      const delay = calculateBackoff(10, {
        baseDelayMs: 1000,
        maxDelayMs: 5000,
      });
      // 1000 * 2^10 = 1024000ms, but capped at 5000ms (+ jitter)
      expect(delay).toBeLessThanOrEqual(7500); // 5000 * 1.5 max with jitter
    });

    it('applies jitter to prevent thundering herd', () => {
      const delays: number[] = [];
      for (let i = 0; i < 100; i++) {
        delays.push(
          calculateBackoff(0, { baseDelayMs: 1000, maxDelayMs: 30000 })
        );
      }
      // Check that we get some variance in delays
      const uniqueDelays = new Set(delays);
      expect(uniqueDelays.size).toBeGreaterThan(50); // Should have variety
    });
  });

  describe('withRetry', () => {
    it('returns result on first successful attempt', async () => {
      const fn = vi.fn().mockResolvedValue('success');

      const result = await withRetry(fn);

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('retries on network timeout', async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new NetworkError('Network timeout'))
        .mockResolvedValue('success');

      const resultPromise = withRetry(fn);
      await vi.advanceTimersByTimeAsync(2000);
      const result = await resultPromise;

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('retries on 500 error', async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(
          new MerchantApiError('server_error', 'Internal Server Error', 500)
        )
        .mockResolvedValue('success');

      const resultPromise = withRetry(fn);
      await vi.advanceTimersByTimeAsync(2000);
      const result = await resultPromise;

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('retries on 502 error', async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(
          new MerchantApiError('bad_gateway', 'Bad Gateway', 502)
        )
        .mockResolvedValue('success');

      const resultPromise = withRetry(fn);
      await vi.advanceTimersByTimeAsync(2000);
      const result = await resultPromise;

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('retries on 503 error', async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(
          new MerchantApiError(
            'service_unavailable',
            'Service Unavailable',
            503
          )
        )
        .mockResolvedValue('success');

      const resultPromise = withRetry(fn);
      await vi.advanceTimersByTimeAsync(2000);
      const result = await resultPromise;

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('does NOT retry on 400 error', async () => {
      const fn = vi
        .fn()
        .mockRejectedValue(
          new MerchantApiError('invalid_request', 'Bad Request', 400)
        );

      await expect(withRetry(fn)).rejects.toThrow('Bad Request');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('does NOT retry on 401 error', async () => {
      const fn = vi
        .fn()
        .mockRejectedValue(
          new MerchantApiError('unauthorized', 'Unauthorized', 401)
        );

      await expect(withRetry(fn)).rejects.toThrow('Unauthorized');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('does NOT retry on 403 error', async () => {
      const fn = vi
        .fn()
        .mockRejectedValue(new MerchantApiError('forbidden', 'Forbidden', 403));

      await expect(withRetry(fn)).rejects.toThrow('Forbidden');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('does NOT retry on 404 error', async () => {
      const fn = vi
        .fn()
        .mockRejectedValue(new MerchantApiError('not_found', 'Not Found', 404));

      await expect(withRetry(fn)).rejects.toThrow('Not Found');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('applies exponential backoff between retries', async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new NetworkError('Network error'))
        .mockRejectedValueOnce(new NetworkError('Network error'))
        .mockResolvedValue('success');

      const resultPromise = withRetry(fn, { baseDelayMs: 1000 });

      // First call is immediate
      expect(fn).toHaveBeenCalledTimes(1);

      // After ~1s (first retry delay)
      await vi.advanceTimersByTimeAsync(1500);
      expect(fn).toHaveBeenCalledTimes(2);

      // After ~2s more (second retry delay with backoff)
      await vi.advanceTimersByTimeAsync(3000);
      expect(fn).toHaveBeenCalledTimes(3);

      const result = await resultPromise;
      expect(result).toBe('success');
    });

    it('respects max retry limit (default 3)', async () => {
      const fn = vi.fn().mockRejectedValue(new NetworkError('Network error'));

      let caughtError: Error | undefined;
      const resultPromise = withRetry(fn).catch((e) => {
        caughtError = e;
      });

      // Advance through all retries and await the promise
      await vi.runAllTimersAsync();
      await resultPromise;

      expect(caughtError).toBeInstanceOf(NetworkError);
      expect(caughtError?.message).toBe('Network error');
      // 1 initial + 3 retries = 4 total calls
      expect(fn).toHaveBeenCalledTimes(4);
    });

    it('respects custom max retries', async () => {
      const fn = vi.fn().mockRejectedValue(new NetworkError('Network error'));

      let caughtError: Error | undefined;
      const resultPromise = withRetry(fn, { maxRetries: 2 }).catch((e) => {
        caughtError = e;
      });

      await vi.runAllTimersAsync();
      await resultPromise;

      expect(caughtError).toBeInstanceOf(NetworkError);
      expect(caughtError?.message).toBe('Network error');
      // 1 initial + 2 retries = 3 total calls
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('can be disabled per request with maxRetries: 0', async () => {
      const fn = vi.fn().mockRejectedValue(new NetworkError('Network error'));

      await expect(withRetry(fn, { maxRetries: 0 })).rejects.toThrow(
        'Network error'
      );
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('can be disabled with retry: false option', async () => {
      const fn = vi.fn().mockRejectedValue(new NetworkError('Network error'));

      await expect(withRetry(fn, { retry: false })).rejects.toThrow(
        'Network error'
      );
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('respects custom base delay', async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new NetworkError('Network error'))
        .mockResolvedValue('success');

      const resultPromise = withRetry(fn, { baseDelayMs: 500 });

      // Should not have retried yet at 200ms
      await vi.advanceTimersByTimeAsync(200);
      expect(fn).toHaveBeenCalledTimes(1);

      // Should have retried by 1000ms (500ms base + jitter)
      await vi.advanceTimersByTimeAsync(800);
      expect(fn).toHaveBeenCalledTimes(2);

      const result = await resultPromise;
      expect(result).toBe('success');
    });

    it('retries the correct number of times before succeeding', async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(
          new MerchantApiError('server_error', 'Error 1', 500)
        )
        .mockRejectedValueOnce(
          new MerchantApiError('server_error', 'Error 2', 500)
        )
        .mockResolvedValue('success');

      const resultPromise = withRetry(fn, { maxRetries: 3 });

      // Advance through retries
      await vi.advanceTimersByTimeAsync(10000);

      const result = await resultPromise;
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('throws the last error after exhausting retries', async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new NetworkError('Error 1'))
        .mockRejectedValueOnce(new NetworkError('Error 2'))
        .mockRejectedValueOnce(new NetworkError('Error 3'))
        .mockRejectedValue(new NetworkError('Final network error'));

      let caughtError: Error | undefined;
      const resultPromise = withRetry(fn, { maxRetries: 3 }).catch((e) => {
        caughtError = e;
      });

      await vi.runAllTimersAsync();
      await resultPromise;

      expect(caughtError).toBeInstanceOf(NetworkError);
      expect(caughtError?.message).toBe('Final network error');
    });

    it('calls onRetry callback before each retry', async () => {
      const onRetry = vi.fn();
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new NetworkError('Error 1'))
        .mockRejectedValueOnce(new NetworkError('Error 2'))
        .mockResolvedValue('success');

      const resultPromise = withRetry(fn, { onRetry });

      await vi.advanceTimersByTimeAsync(10000);

      await resultPromise;

      expect(onRetry).toHaveBeenCalledTimes(2);
      expect(onRetry).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ message: 'Error 1' }),
        0
      );
      expect(onRetry).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ message: 'Error 2' }),
        1
      );
    });

    it('handles synchronous functions', async () => {
      const fn = vi
        .fn()
        .mockImplementationOnce(() => {
          throw new NetworkError('Sync error');
        })
        .mockImplementation(() => 'sync success');

      const resultPromise = withRetry(fn);
      await vi.advanceTimersByTimeAsync(2000);
      const result = await resultPromise;

      expect(result).toBe('sync success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('preserves function arguments on retry', async () => {
      const fn = vi
        .fn<(arg1: string, arg2: number) => Promise<string>>()
        .mockRejectedValueOnce(new NetworkError('Error'))
        .mockImplementation(
          async (arg1: string, arg2: number) => `${arg1}-${arg2}`
        );

      const resultPromise = withRetry(() => fn('test', 42));
      await vi.advanceTimersByTimeAsync(2000);
      const result = await resultPromise;

      expect(result).toBe('test-42');
      expect(fn).toHaveBeenNthCalledWith(1, 'test', 42);
      expect(fn).toHaveBeenNthCalledWith(2, 'test', 42);
    });
  });

  describe('default options', () => {
    it('uses default maxRetries of 3', async () => {
      const fn = vi.fn().mockRejectedValue(new NetworkError('Error'));

      let caughtError: Error | undefined;
      const resultPromise = withRetry(fn).catch((e) => {
        caughtError = e;
      });

      await vi.runAllTimersAsync();
      await resultPromise;

      expect(caughtError).toBeInstanceOf(NetworkError);
      expect(fn).toHaveBeenCalledTimes(4); // 1 + 3 retries
    });

    it('uses default baseDelayMs of 1000', async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new NetworkError('Error'))
        .mockResolvedValue('success');

      const resultPromise = withRetry(fn);

      // Should not have retried yet at 500ms
      await vi.advanceTimersByTimeAsync(500);
      expect(fn).toHaveBeenCalledTimes(1);

      // Should have retried by 2000ms (accounting for jitter)
      await vi.advanceTimersByTimeAsync(1500);
      expect(fn).toHaveBeenCalledTimes(2);

      await resultPromise;
    });
  });
});
