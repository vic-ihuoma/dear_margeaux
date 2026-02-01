/**
 * Retry utility for transient API failures
 *
 * Implements exponential backoff with jitter for network errors and 5xx responses.
 * Does NOT retry on client errors (4xx) as those indicate issues with the request.
 */

import { NetworkError, MerchantApiError } from './merchant-client.js';

// ============================================================================
// Types
// ============================================================================

/** Options for configuring retry behavior */
export interface RetryOptions {
  /**
   * Maximum number of retries (not including the initial request)
   * @default 3
   */
  maxRetries?: number;

  /**
   * Base delay between retries in milliseconds (before exponential backoff)
   * @default 1000
   */
  baseDelayMs?: number;

  /**
   * Maximum delay between retries in milliseconds
   * @default 30000
   */
  maxDelayMs?: number;

  /**
   * Set to false to disable retry entirely for this request
   * @default true
   */
  retry?: boolean;

  /**
   * Optional callback called before each retry attempt
   * Receives the error and the attempt number (0-indexed)
   */
  onRetry?: (error: Error, attempt: number) => void;
}

/** Default retry options */
const DEFAULT_OPTIONS: Required<Omit<RetryOptions, 'onRetry'>> = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  retry: true,
};

// ============================================================================
// Retry Logic
// ============================================================================

/**
 * Determines if an error should trigger a retry.
 *
 * Retryable errors:
 * - NetworkError (connection issues, timeouts)
 * - 5xx status codes (500, 502, 503, 504, etc.)
 *
 * Non-retryable errors:
 * - 4xx status codes (400, 401, 403, 404, 409, etc.)
 * - Generic errors (programming errors)
 */
export function isRetryableError(error: unknown): boolean {
  // Network errors are always retryable
  if (error instanceof NetworkError) {
    return true;
  }

  // Check for 5xx status codes
  if (error instanceof MerchantApiError) {
    return error.status >= 500 && error.status < 600;
  }

  // Don't retry unknown errors (likely programming errors)
  return false;
}

/**
 * Calculates the delay before the next retry attempt using exponential backoff with jitter.
 *
 * Formula: min(maxDelay, baseDelay * 2^attempt) * (0.5 + random * 0.5)
 *
 * The jitter helps prevent the "thundering herd" problem where many clients
 * retry at the same time.
 *
 * @param attempt - The retry attempt number (0-indexed)
 * @param options - Configuration options
 * @returns Delay in milliseconds
 */
export function calculateBackoff(
  attempt: number,
  options: Pick<RetryOptions, 'baseDelayMs' | 'maxDelayMs'>
): number {
  const baseDelayMs = options.baseDelayMs ?? DEFAULT_OPTIONS.baseDelayMs;
  const maxDelayMs = options.maxDelayMs ?? DEFAULT_OPTIONS.maxDelayMs;

  // Calculate exponential delay: baseDelay * 2^attempt
  const exponentialDelay = baseDelayMs * Math.pow(2, attempt);

  // Cap at maximum delay
  const cappedDelay = Math.min(exponentialDelay, maxDelayMs);

  // Add jitter: multiply by random value between 0.5 and 1.5
  const jitter = 0.5 + Math.random();
  return Math.floor(cappedDelay * jitter);
}

/**
 * Wraps a function with retry logic for transient failures.
 *
 * @example
 * ```typescript
 * const result = await withRetry(() => client.getProducts());
 *
 * // With custom options
 * const result = await withRetry(
 *   () => client.getProducts(),
 *   { maxRetries: 5, baseDelayMs: 500 }
 * );
 *
 * // Disable retry for a specific request
 * const result = await withRetry(() => client.checkout(cartId), { retry: false });
 * ```
 */
export async function withRetry<T>(
  fn: () => T | Promise<T>,
  options?: RetryOptions
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Short-circuit if retry is disabled
  if (!opts.retry || opts.maxRetries === 0) {
    return fn();
  }

  let lastError: Error | undefined;

  // attempt 0 is the initial request, subsequent are retries
  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      // Execute the function
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if we should retry
      if (!isRetryableError(error)) {
        throw error;
      }

      // Check if we have retries left
      if (attempt >= opts.maxRetries) {
        throw error;
      }

      // Call onRetry callback if provided
      if (opts.onRetry) {
        opts.onRetry(lastError, attempt);
      }

      // Calculate delay and wait
      const delay = calculateBackoff(attempt, opts);
      await sleep(delay);
    }
  }

  // This should never happen, but TypeScript needs it
  throw lastError ?? new Error('Retry failed');
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Promise-based sleep function
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
