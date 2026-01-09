/**
 * Merchant API client initialization for the storefront
 */

import { MerchantClient } from '@dear-margeaux/api';

/**
 * Create a MerchantClient instance configured for the storefront
 * Uses environment variables for configuration
 */
export function createMerchantClient(): MerchantClient {
  const baseUrl = import.meta.env.PUBLIC_MERCHANT_API_URL;
  const apiKey = import.meta.env.PUBLIC_MERCHANT_API_KEY;

  if (!baseUrl) {
    throw new Error('PUBLIC_MERCHANT_API_URL environment variable is not set');
  }

  if (!apiKey) {
    throw new Error('PUBLIC_MERCHANT_API_KEY environment variable is not set');
  }

  return new MerchantClient({
    baseUrl,
    apiKey,
  });
}

/**
 * Singleton instance of the MerchantClient for server-side usage
 * Lazily initialized to avoid errors during build when env vars might not be set
 */
let _client: MerchantClient | null = null;

export function getMerchantClient(): MerchantClient {
  if (!_client) {
    _client = createMerchantClient();
  }
  return _client;
}
