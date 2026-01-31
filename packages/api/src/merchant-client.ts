/**
 * Typed fetch wrapper for the Merchant.dev API
 */

import type {
  // Pagination
  PaginatedResponse,
  PaginationParams,
  // Products
  Product,
  ProductListItem,
  CreateProductParams,
  UpdateProductParams,
  CreateVariantParams,
  UpdateVariantParams,
  ListProductsParams,
  Variant,
  TagsResponse,
  DeletedProduct,
  // Inventory
  InventoryItem,
  InventoryLog,
  AdjustInventoryParams,
  ListInventoryParams,
  ListInventoryHistoryParams,
  // Cart
  Cart,
  CreateCartParams,
  AddToCartParams,
  CheckoutParams,
  CheckoutResult,
  ApplyDiscountResult,
  // Discount
  Discount,
  CreateDiscountParams,
  UpdateDiscountParams,
  // Orders
  Order,
  OrderListItem,
  UpdateOrderParams,
  RefundParams,
  ListOrdersParams,
  OrderNote,
  CreateOrderNoteParams,
  UpdateOrderNoteParams,
  // Customers
  Customer,
  UpdateCustomerParams,
  CreateAddressParams,
  CustomerAddress,
  ListCustomersParams,
  // Images
  ImageUploadResult,
  // Webhooks
  Webhook,
  WebhookWithDeliveries,
  CreateWebhookParams,
  UpdateWebhookParams,
  // Drops
  Drop,
  CreateDropParams,
  UpdateDropParams,
  ListDropsParams,
  DropProductsResponse,
  // Waitlist
  WaitlistEntry,
  SubscribeWaitlistParams,
  UnsubscribeWaitlistParams,
  ListWaitlistParams,
  UnsubscribeResult,
  // Customer Auth
  AuthenticatedCustomer,
  RegisterCustomerParams,
  LoginCustomerParams,
  CustomerOrder,
  // Counts
  CountResponse,
  ProductCountParams,
  OrderCountParams,
  InventoryCountParams,
} from './types.js';

// ============================================================================
// Error Classes
// ============================================================================

/** Base error for API failures */
export class MerchantApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'MerchantApiError';
  }
}

/** Error for authentication failures */
export class AuthenticationError extends MerchantApiError {
  constructor(message: string) {
    super('unauthorized', message, 401);
    this.name = 'AuthenticationError';
  }
}

/** Error for permission issues */
export class ForbiddenError extends MerchantApiError {
  constructor(message: string) {
    super('forbidden', message, 403);
    this.name = 'ForbiddenError';
  }
}

/** Error for not found resources */
export class NotFoundError extends MerchantApiError {
  constructor(message: string) {
    super('not_found', message, 404);
    this.name = 'NotFoundError';
  }
}

/** Error for conflicts (duplicate, already processed, etc.) */
export class ConflictError extends MerchantApiError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('conflict', message, 409, details);
    this.name = 'ConflictError';
  }
}

/** Error for validation failures */
export class ValidationError extends MerchantApiError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('invalid_request', message, 400, details);
    this.name = 'ValidationError';
  }
}

/** Error for network/connection issues */
export class NetworkError extends Error {
  constructor(
    message: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'NetworkError';
  }
}

// ============================================================================
// Client Configuration
// ============================================================================

/** Configuration for the MerchantClient */
export interface MerchantClientConfig {
  /** Base URL for the API (e.g., 'https://api.example.com') */
  baseUrl: string;
  /** API key for authentication (pk_ for public, sk_ for admin) */
  apiKey: string;
  /** Optional custom fetch implementation */
  fetch?: typeof fetch;
}

// ============================================================================
// MerchantClient
// ============================================================================

/**
 * TypeScript client for the Merchant.dev API
 *
 * @example
 * ```typescript
 * const client = new MerchantClient({
 *   baseUrl: 'https://api.dear-margeaux.com',
 *   apiKey: 'pk_live_xxxxx'
 * });
 *
 * const products = await client.getProducts();
 * const cart = await client.createCart({ customer_email: 'user@example.com' });
 * await client.addToCart(cart.id, { sku: 'BAG-001', qty: 1 });
 * const checkout = await client.checkout(cart.id, {
 *   success_url: 'https://example.com/success',
 *   cancel_url: 'https://example.com/cancel'
 * });
 * ```
 */
export class MerchantClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly fetchFn: typeof fetch;

  constructor(config: MerchantClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.apiKey = config.apiKey;
    this.fetchFn = config.fetch ?? fetch;
  }

  // ==========================================================================
  // Core Request Method
  // ==========================================================================

  private async request<T>(
    method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
    path: string,
    options?: {
      body?: unknown;
      params?: Record<string, unknown>;
    }
  ): Promise<T> {
    const url = new URL(`${this.baseUrl}/v1${path}`);

    if (options?.params) {
      for (const [key, value] of Object.entries(options.params)) {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, String(value));
        }
      }
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
    };

    if (options?.body) {
      headers['Content-Type'] = 'application/json';
    }

    let response: Response;
    try {
      response = await this.fetchFn(url.toString(), {
        method,
        headers,
        body: options?.body ? JSON.stringify(options.body) : undefined,
      });
    } catch (error) {
      throw new NetworkError(
        'Failed to connect to the Merchant API',
        error instanceof Error ? error : undefined
      );
    }

    if (!response.ok) {
      await this.handleErrorResponse(response);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    const data = await response.json();
    return data as T;
  }

  private async handleErrorResponse(response: Response): Promise<never> {
    let errorData: {
      error?: {
        code?: string;
        message?: string;
        details?: Record<string, unknown>;
      };
    };

    try {
      errorData = await response.json();
    } catch {
      throw new MerchantApiError(
        'unknown_error',
        `Request failed with status ${response.status}`,
        response.status
      );
    }

    const code = errorData.error?.code ?? 'unknown_error';
    const message =
      errorData.error?.message ??
      `Request failed with status ${response.status}`;
    const details = errorData.error?.details;

    switch (response.status) {
      case 400:
        throw new ValidationError(message, details);
      case 401:
        throw new AuthenticationError(message);
      case 403:
        throw new ForbiddenError(message);
      case 404:
        throw new NotFoundError(message);
      case 409:
        throw new ConflictError(message, details);
      default:
        throw new MerchantApiError(code, message, response.status, details);
    }
  }

  // ==========================================================================
  // Products
  // ==========================================================================

  /**
   * List all products with optional filtering
   */
  async getProducts(
    params?: ListProductsParams
  ): Promise<PaginatedResponse<ProductListItem>> {
    return this.request<PaginatedResponse<ProductListItem>>(
      'GET',
      '/products',
      { params: params ? { ...params } : undefined }
    );
  }

  /**
   * Get all unique tags with product counts
   */
  async getTags(): Promise<TagsResponse> {
    return this.request<TagsResponse>('GET', '/products/tags');
  }

  /**
   * Get a single product by ID with its variants
   */
  async getProduct(id: string): Promise<Product> {
    return this.request<Product>('GET', `/products/${id}`);
  }

  /**
   * Create a new product (admin only)
   */
  async createProduct(data: CreateProductParams): Promise<Product> {
    return this.request<Product>('POST', '/products', { body: data });
  }

  /**
   * Update a product (admin only)
   */
  async updateProduct(id: string, data: UpdateProductParams): Promise<Product> {
    return this.request<Product>('PATCH', `/products/${id}`, { body: data });
  }

  /**
   * Delete a product (admin only) - Soft delete with undo support
   * Returns the deleted product data for undo functionality
   */
  async deleteProduct(id: string): Promise<DeletedProduct> {
    return this.request<DeletedProduct>('DELETE', `/products/${id}`);
  }

  /**
   * Restore a soft-deleted product (admin only)
   * Only works within 30 seconds of deletion
   */
  async restoreProduct(id: string): Promise<Product> {
    return this.request<Product>('POST', `/products/${id}/restore`);
  }

  /**
   * Create a variant for a product (admin only)
   */
  async createVariant(
    productId: string,
    data: CreateVariantParams
  ): Promise<Variant> {
    return this.request<Variant>('POST', `/products/${productId}/variants`, {
      body: data,
    });
  }

  /**
   * Update a variant (admin only)
   */
  async updateVariant(
    productId: string,
    variantId: string,
    data: UpdateVariantParams
  ): Promise<Variant> {
    return this.request<Variant>(
      'PATCH',
      `/products/${productId}/variants/${variantId}`,
      { body: data }
    );
  }

  /**
   * Delete a variant (admin only)
   */
  async deleteVariant(productId: string, variantId: string): Promise<void> {
    return this.request<void>(
      'DELETE',
      `/products/${productId}/variants/${variantId}`
    );
  }

  // ==========================================================================
  // Inventory
  // ==========================================================================

  /**
   * List inventory levels (admin only)
   */
  async getInventory(
    params?: ListInventoryParams
  ): Promise<PaginatedResponse<InventoryItem>> {
    return this.request<PaginatedResponse<InventoryItem>>('GET', '/inventory', {
      params: params ? { ...params } : undefined,
    });
  }

  /**
   * Adjust inventory for a SKU (admin only)
   */
  async adjustInventory(
    sku: string,
    data: AdjustInventoryParams
  ): Promise<InventoryItem> {
    return this.request<InventoryItem>('POST', `/inventory/${sku}/adjust`, {
      body: data,
    });
  }

  /**
   * Get inventory history/audit log for a SKU (admin only)
   */
  async getInventoryHistory(
    sku: string,
    params?: ListInventoryHistoryParams
  ): Promise<PaginatedResponse<InventoryLog>> {
    return this.request<PaginatedResponse<InventoryLog>>(
      'GET',
      `/inventory/${sku}/history`,
      {
        params: params ? { ...params } : undefined,
      }
    );
  }

  /**
   * Get count of items needing reorder (admin only)
   */
  async getReorderCount(): Promise<CountResponse> {
    return this.request<CountResponse>('GET', '/inventory/reorder-count');
  }

  // ==========================================================================
  // Cart
  // ==========================================================================

  /**
   * Get a cart by ID
   */
  async getCart(cartId: string): Promise<Cart> {
    return this.request<Cart>('GET', `/carts/${cartId}`);
  }

  /**
   * Create a new cart
   */
  async createCart(data?: CreateCartParams): Promise<Cart> {
    return this.request<Cart>('POST', '/carts', { body: data ?? {} });
  }

  /**
   * Add items to a cart
   */
  async addToCart(cartId: string, data: AddToCartParams): Promise<Cart> {
    return this.request<Cart>('POST', `/carts/${cartId}/items`, { body: data });
  }

  /**
   * Apply a discount code to a cart
   */
  async applyDiscount(
    cartId: string,
    code: string
  ): Promise<ApplyDiscountResult> {
    return this.request<ApplyDiscountResult>(
      'POST',
      `/carts/${cartId}/apply-discount`,
      {
        body: { code },
      }
    );
  }

  /**
   * Remove discount from a cart
   */
  async removeDiscount(cartId: string): Promise<ApplyDiscountResult> {
    return this.request<ApplyDiscountResult>(
      'DELETE',
      `/carts/${cartId}/discount`
    );
  }

  /**
   * Initiate checkout and get Stripe session URL
   */
  async checkout(
    cartId: string,
    params: CheckoutParams
  ): Promise<CheckoutResult> {
    return this.request<CheckoutResult>('POST', `/carts/${cartId}/checkout`, {
      body: params,
    });
  }

  // ==========================================================================
  // Discounts
  // ==========================================================================

  /**
   * List all discounts (admin only)
   */
  async getDiscounts(): Promise<Discount[]> {
    return this.request<Discount[]>('GET', '/discounts');
  }

  /**
   * Get a discount by ID (admin only)
   */
  async getDiscount(id: string): Promise<Discount> {
    return this.request<Discount>('GET', `/discounts/${id}`);
  }

  /**
   * Create a discount (admin only)
   */
  async createDiscount(data: CreateDiscountParams): Promise<Discount> {
    return this.request<Discount>('POST', '/discounts', { body: data });
  }

  /**
   * Update a discount (admin only)
   */
  async updateDiscount(
    id: string,
    data: UpdateDiscountParams
  ): Promise<Discount> {
    return this.request<Discount>('PATCH', `/discounts/${id}`, { body: data });
  }

  /**
   * Deactivate a discount (admin only)
   */
  async deleteDiscount(id: string): Promise<void> {
    return this.request<void>('DELETE', `/discounts/${id}`);
  }

  // ==========================================================================
  // Orders
  // ==========================================================================

  /**
   * List orders with optional filtering (admin only)
   */
  async getOrders(
    params?: ListOrdersParams
  ): Promise<PaginatedResponse<OrderListItem>> {
    return this.request<PaginatedResponse<OrderListItem>>('GET', '/orders', {
      params: params ? { ...params } : undefined,
    });
  }

  /**
   * Get an order by ID (admin only)
   */
  async getOrder(id: string): Promise<Order> {
    return this.request<Order>('GET', `/orders/${id}`);
  }

  /**
   * Update an order (admin only)
   */
  async updateOrder(id: string, data: UpdateOrderParams): Promise<Order> {
    return this.request<Order>('PATCH', `/orders/${id}`, { body: data });
  }

  /**
   * Create a refund for an order (admin only)
   */
  async refundOrder(id: string, data?: RefundParams): Promise<Order> {
    return this.request<Order>('POST', `/orders/${id}/refund`, {
      body: data ?? {},
    });
  }

  /**
   * Get notes for an order (admin only)
   */
  async getOrderNotes(orderId: string): Promise<{ items: OrderNote[] }> {
    return this.request<{ items: OrderNote[] }>(
      'GET',
      `/orders/${orderId}/notes`
    );
  }

  /**
   * Create a note on an order (admin only)
   */
  async createOrderNote(
    orderId: string,
    data: CreateOrderNoteParams
  ): Promise<OrderNote> {
    return this.request<OrderNote>('POST', `/orders/${orderId}/notes`, {
      body: data,
    });
  }

  /**
   * Update a note on an order (admin only)
   * Can only edit own notes
   */
  async updateOrderNote(
    orderId: string,
    noteId: string,
    data: UpdateOrderNoteParams & { admin_id: string }
  ): Promise<OrderNote> {
    return this.request<OrderNote>(
      'PATCH',
      `/orders/${orderId}/notes/${noteId}`,
      {
        body: data,
      }
    );
  }

  /**
   * Delete a note on an order (admin only)
   * Can only delete own notes
   */
  async deleteOrderNote(
    orderId: string,
    noteId: string,
    adminId: string
  ): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(
      'DELETE',
      `/orders/${orderId}/notes/${noteId}`,
      { params: { admin_id: adminId } }
    );
  }

  // ==========================================================================
  // Customers
  // ==========================================================================

  /**
   * List customers (admin only)
   */
  async getCustomers(
    params?: ListCustomersParams
  ): Promise<PaginatedResponse<Customer>> {
    return this.request<PaginatedResponse<Customer>>('GET', '/customers', {
      params: params ? { ...params } : undefined,
    });
  }

  /**
   * Get a customer by ID (admin only)
   */
  async getCustomer(id: string): Promise<Customer> {
    return this.request<Customer>('GET', `/customers/${id}`);
  }

  /**
   * Get a customer's order history (admin only)
   */
  async getCustomerOrders(
    id: string,
    params?: PaginationParams
  ): Promise<PaginatedResponse<OrderListItem>> {
    return this.request<PaginatedResponse<OrderListItem>>(
      'GET',
      `/customers/${id}/orders`,
      { params: params ? { ...params } : undefined }
    );
  }

  /**
   * Update a customer (admin only)
   */
  async updateCustomer(
    id: string,
    data: UpdateCustomerParams
  ): Promise<Customer> {
    return this.request<Customer>('PATCH', `/customers/${id}`, { body: data });
  }

  /**
   * Add an address to a customer (admin only)
   */
  async createCustomerAddress(
    customerId: string,
    data: CreateAddressParams
  ): Promise<CustomerAddress> {
    return this.request<CustomerAddress>(
      'POST',
      `/customers/${customerId}/addresses`,
      { body: data }
    );
  }

  /**
   * Delete a customer address (admin only)
   */
  async deleteCustomerAddress(
    customerId: string,
    addressId: string
  ): Promise<void> {
    return this.request<void>(
      'DELETE',
      `/customers/${customerId}/addresses/${addressId}`
    );
  }

  // ==========================================================================
  // Images
  // ==========================================================================

  /**
   * Upload an image (admin only)
   * Note: This method handles file uploads differently from JSON requests
   */
  async uploadImage(file: Blob, filename: string): Promise<ImageUploadResult> {
    const url = new URL(`${this.baseUrl}/v1/images`);
    const formData = new FormData();
    formData.append('file', file, filename);

    let response: Response;
    try {
      response = await this.fetchFn(url.toString(), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: formData,
      });
    } catch (error) {
      throw new NetworkError(
        'Failed to upload image',
        error instanceof Error ? error : undefined
      );
    }

    if (!response.ok) {
      await this.handleErrorResponse(response);
    }

    return response.json();
  }

  /**
   * Get image URL for a given key
   */
  getImageUrl(key: string): string {
    return `${this.baseUrl}/v1/images/${key}`;
  }

  /**
   * Delete an image (admin only)
   */
  async deleteImage(key: string): Promise<void> {
    return this.request<void>('DELETE', `/images/${key}`);
  }

  // ==========================================================================
  // Webhooks
  // ==========================================================================

  /**
   * List registered webhooks (admin only)
   */
  async getWebhooks(): Promise<Webhook[]> {
    return this.request<Webhook[]>('GET', '/webhooks');
  }

  /**
   * Get a webhook with recent deliveries (admin only)
   */
  async getWebhook(id: string): Promise<WebhookWithDeliveries> {
    return this.request<WebhookWithDeliveries>('GET', `/webhooks/${id}`);
  }

  /**
   * Register a webhook (admin only)
   */
  async createWebhook(data: CreateWebhookParams): Promise<Webhook> {
    return this.request<Webhook>('POST', '/webhooks', { body: data });
  }

  /**
   * Update a webhook (admin only)
   */
  async updateWebhook(id: string, data: UpdateWebhookParams): Promise<Webhook> {
    return this.request<Webhook>('PATCH', `/webhooks/${id}`, { body: data });
  }

  /**
   * Delete a webhook (admin only)
   */
  async deleteWebhook(id: string): Promise<void> {
    return this.request<void>('DELETE', `/webhooks/${id}`);
  }

  // ==========================================================================
  // Drops
  // ==========================================================================

  /**
   * List all drops with optional filtering
   */
  async getDrops(params?: ListDropsParams): Promise<PaginatedResponse<Drop>> {
    return this.request<PaginatedResponse<Drop>>('GET', '/drops', {
      params: params ? { ...params } : undefined,
    });
  }

  /**
   * Get a single drop by ID
   */
  async getDrop(id: string): Promise<Drop> {
    return this.request<Drop>('GET', `/drops/${id}`);
  }

  /**
   * Get products in a drop by slug
   */
  async getDropProducts(
    slug: string,
    params?: PaginationParams
  ): Promise<DropProductsResponse> {
    return this.request<DropProductsResponse>(
      'GET',
      `/drops/${slug}/products`,
      { params: params ? { ...params } : undefined }
    );
  }

  /**
   * Create a new drop (admin only)
   */
  async createDrop(data: CreateDropParams): Promise<Drop> {
    return this.request<Drop>('POST', '/drops', { body: data });
  }

  /**
   * Update a drop (admin only)
   */
  async updateDrop(id: string, data: UpdateDropParams): Promise<Drop> {
    return this.request<Drop>('PATCH', `/drops/${id}`, { body: data });
  }

  /**
   * Delete a drop (admin only)
   */
  async deleteDrop(id: string): Promise<void> {
    return this.request<void>('DELETE', `/drops/${id}`);
  }

  /**
   * Assign products to a drop (admin only)
   * This replaces all existing product assignments for the drop
   */
  async assignDropProducts(
    dropId: string,
    productIds: string[]
  ): Promise<{ success: boolean; assigned_count: number }> {
    return this.request<{ success: boolean; assigned_count: number }>(
      'PUT',
      `/drops/${dropId}/products`,
      { body: { productIds } }
    );
  }

  // ==========================================================================
  // Waitlist
  // ==========================================================================

  /**
   * Subscribe an email to a drop's waitlist
   */
  async subscribeToWaitlist(
    data: SubscribeWaitlistParams
  ): Promise<WaitlistEntry> {
    return this.request<WaitlistEntry>('POST', '/waitlist', { body: data });
  }

  /**
   * Unsubscribe from waitlist by entry ID
   */
  async unsubscribeFromWaitlist(
    id: string
  ): Promise<{ unsubscribed: boolean }> {
    return this.request<{ unsubscribed: boolean }>('DELETE', `/waitlist/${id}`);
  }

  /**
   * Unsubscribe from waitlist by email (for public unsubscribe links)
   */
  async unsubscribeByEmail(
    data: UnsubscribeWaitlistParams
  ): Promise<UnsubscribeResult> {
    return this.request<UnsubscribeResult>('POST', '/waitlist/unsubscribe', {
      body: data,
    });
  }

  /**
   * List waitlist entries (admin only)
   */
  async getWaitlistEntries(
    params?: ListWaitlistParams
  ): Promise<PaginatedResponse<WaitlistEntry>> {
    return this.request<PaginatedResponse<WaitlistEntry>>('GET', '/waitlist', {
      params: params ? { ...params } : undefined,
    });
  }

  /**
   * Get a waitlist entry by ID (admin only)
   */
  async getWaitlistEntry(id: string): Promise<WaitlistEntry> {
    return this.request<WaitlistEntry>('GET', `/waitlist/${id}`);
  }

  // ==========================================================================
  // Customer Auth
  // ==========================================================================

  /**
   * Register a new customer account
   */
  async registerCustomer(
    data: RegisterCustomerParams
  ): Promise<AuthenticatedCustomer> {
    return this.request<AuthenticatedCustomer>(
      'POST',
      '/customers/auth/register',
      {
        body: data,
      }
    );
  }

  /**
   * Login to a customer account
   */
  async loginCustomer(
    data: LoginCustomerParams
  ): Promise<AuthenticatedCustomer> {
    return this.request<AuthenticatedCustomer>(
      'POST',
      '/customers/auth/login',
      {
        body: data,
      }
    );
  }

  /**
   * Logout (invalidate session)
   * Note: This method requires a session token via X-Customer-Session header
   */
  async logoutCustomer(sessionId: string): Promise<{ success: boolean }> {
    const url = new URL(`${this.baseUrl}/v1/customers/auth/logout`);
    const response = await this.fetchFn(url.toString(), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'X-Customer-Session': sessionId,
      },
    });

    if (!response.ok) {
      await this.handleErrorResponse(response);
    }

    return response.json();
  }

  /**
   * Get current customer from session
   * Note: This method requires a session token via X-Customer-Session header
   */
  async getCurrentCustomer(sessionId: string): Promise<AuthenticatedCustomer> {
    const url = new URL(`${this.baseUrl}/v1/customers/auth/me`);
    const response = await this.fetchFn(url.toString(), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'X-Customer-Session': sessionId,
      },
    });

    if (!response.ok) {
      await this.handleErrorResponse(response);
    }

    return response.json();
  }

  /**
   * Get orders for the current authenticated customer (self-service)
   * Note: This method requires a session token via X-Customer-Session header
   */
  async getMyOrders(
    sessionId: string,
    params?: PaginationParams
  ): Promise<PaginatedResponse<CustomerOrder>> {
    const url = new URL(`${this.baseUrl}/v1/customers/auth/orders`);

    if (params?.limit) {
      url.searchParams.set('limit', String(params.limit));
    }
    if (params?.cursor) {
      url.searchParams.set('cursor', params.cursor);
    }

    const response = await this.fetchFn(url.toString(), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'X-Customer-Session': sessionId,
      },
    });

    if (!response.ok) {
      await this.handleErrorResponse(response);
    }

    return response.json();
  }

  /**
   * Get addresses for the current authenticated customer (self-service)
   * Note: This method requires a session token via X-Customer-Session header
   */
  async getMyAddresses(
    sessionId: string
  ): Promise<{ items: CustomerAddress[] }> {
    const url = new URL(`${this.baseUrl}/v1/customers/auth/addresses`);

    const response = await this.fetchFn(url.toString(), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'X-Customer-Session': sessionId,
      },
    });

    if (!response.ok) {
      await this.handleErrorResponse(response);
    }

    return response.json();
  }

  /**
   * Add a new address for the current authenticated customer (self-service)
   * Note: This method requires a session token via X-Customer-Session header
   */
  async addMyAddress(
    sessionId: string,
    data: CreateAddressParams
  ): Promise<CustomerAddress> {
    const url = new URL(`${this.baseUrl}/v1/customers/auth/addresses`);

    const response = await this.fetchFn(url.toString(), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'X-Customer-Session': sessionId,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      await this.handleErrorResponse(response);
    }

    return response.json();
  }

  /**
   * Update an address for the current authenticated customer (self-service)
   * Note: This method requires a session token via X-Customer-Session header
   */
  async updateMyAddress(
    sessionId: string,
    addressId: string,
    data: Partial<CreateAddressParams>
  ): Promise<CustomerAddress> {
    const url = new URL(
      `${this.baseUrl}/v1/customers/auth/addresses/${addressId}`
    );

    const response = await this.fetchFn(url.toString(), {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'X-Customer-Session': sessionId,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      await this.handleErrorResponse(response);
    }

    return response.json();
  }

  /**
   * Delete an address for the current authenticated customer (self-service)
   * Note: This method requires a session token via X-Customer-Session header
   */
  async deleteMyAddress(
    sessionId: string,
    addressId: string
  ): Promise<{ success: boolean }> {
    const url = new URL(
      `${this.baseUrl}/v1/customers/auth/addresses/${addressId}`
    );

    const response = await this.fetchFn(url.toString(), {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'X-Customer-Session': sessionId,
      },
    });

    if (!response.ok) {
      await this.handleErrorResponse(response);
    }

    return response.json();
  }

  /**
   * Set an address as the default for the current authenticated customer (self-service)
   * Note: This method requires a session token via X-Customer-Session header
   */
  async setDefaultAddress(
    sessionId: string,
    addressId: string
  ): Promise<CustomerAddress> {
    const url = new URL(
      `${this.baseUrl}/v1/customers/auth/addresses/${addressId}/default`
    );

    const response = await this.fetchFn(url.toString(), {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'X-Customer-Session': sessionId,
      },
    });

    if (!response.ok) {
      await this.handleErrorResponse(response);
    }

    return response.json();
  }

  // ==========================================================================
  // Counts
  // ==========================================================================

  /**
   * Get total product count with optional status filter (admin only)
   */
  async getProductsCount(params?: ProductCountParams): Promise<CountResponse> {
    return this.request<CountResponse>('GET', '/counts/products', {
      params: params ? { ...params } : undefined,
    });
  }

  /**
   * Get total order count with optional status and date filters (admin only)
   */
  async getOrdersCount(params?: OrderCountParams): Promise<CountResponse> {
    return this.request<CountResponse>('GET', '/counts/orders', {
      params: params ? { ...params } : undefined,
    });
  }

  /**
   * Get total customer count (admin only)
   */
  async getCustomersCount(): Promise<CountResponse> {
    return this.request<CountResponse>('GET', '/counts/customers');
  }

  /**
   * Get total inventory count with optional low stock filter (admin only)
   */
  async getInventoryCount(
    params?: InventoryCountParams
  ): Promise<CountResponse> {
    return this.request<CountResponse>('GET', '/counts/inventory', {
      params: params ? { ...params } : undefined,
    });
  }
}
