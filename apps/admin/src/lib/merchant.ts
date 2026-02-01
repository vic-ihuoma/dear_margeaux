/**
 * Merchant API client initialization for the admin dashboard
 * Uses admin API key for full access to all endpoints
 */

import { MerchantClient } from '@dear-margeaux/api';

/**
 * Create a MerchantClient instance configured for admin use
 * Uses admin environment variables for full API access
 */
export function createAdminMerchantClient(): MerchantClient | null {
  const baseUrl = import.meta.env.MERCHANT_API_URL;
  const apiKey = import.meta.env.MERCHANT_ADMIN_KEY;

  if (!baseUrl || !apiKey) {
    // Return null instead of throwing during build/dev without env vars
    return null;
  }

  return new MerchantClient({
    baseUrl,
    apiKey,
  });
}

/**
 * Singleton instance of the MerchantClient for admin server-side usage
 * Lazily initialized - returns null if env vars not configured
 */
let _client: MerchantClient | null = null;
let _initialized = false;

export function getAdminMerchantClient(): MerchantClient | null {
  if (!_initialized) {
    _client = createAdminMerchantClient();
    _initialized = true;
  }
  return _client;
}

/**
 * Format cents to a currency string (e.g., 1999 -> "$19.99")
 */
export function formatPrice(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
}
