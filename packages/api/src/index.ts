/**
 * Dear Margeaux API Client
 *
 * TypeScript client for the Merchant.dev commerce API
 *
 * @example
 * ```typescript
 * import { MerchantClient } from '@dear-margeaux/api';
 *
 * const client = new MerchantClient({
 *   baseUrl: process.env.PUBLIC_MERCHANT_API_URL,
 *   apiKey: process.env.PUBLIC_STRIPE_PUBLISHABLE_KEY
 * });
 *
 * // Fetch products
 * const { items: products } = await client.getProducts();
 *
 * // Create cart and add item
 * const cart = await client.createCart({ customer_email: 'customer@example.com' });
 * await client.addToCart(cart.id, { sku: 'BAG-001', qty: 1 });
 *
 * // Checkout
 * const { checkout_url } = await client.checkout(cart.id, {
 *   success_url: 'https://example.com/checkout/success',
 *   cancel_url: 'https://example.com/checkout/cancel'
 * });
 * ```
 */

// Export the client
export {
  MerchantClient,
  type MerchantClientConfig,
} from './merchant-client.js';

// Export error classes
export {
  MerchantApiError,
  AuthenticationError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ValidationError,
  NetworkError,
} from './merchant-client.js';

// Export all types
export * from './types.js';
