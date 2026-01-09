/**
 * Type definitions for the Dear Margeaux Merchant API
 * Based on the Merchant.dev commerce backend
 */

// ============================================================================
// Common Types
// ============================================================================

/** ISO 8601 date string */
export type ISODateString = string;

/** Pagination parameters for list endpoints */
export interface PaginationParams {
  /** Maximum number of items to return (default varies by endpoint, max 100-500) */
  limit?: number;
  /** Cursor for pagination (from previous response) */
  cursor?: string;
}

/** Paginated response structure */
export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    has_more: boolean;
    next_cursor: string | null;
  };
}

/** API error response structure */
export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

// ============================================================================
// Product Types
// ============================================================================

/** Product status */
export type ProductStatus = 'active' | 'draft';

/** Product variant */
export interface Variant {
  id: string;
  sku: string;
  title: string;
  price_cents: number;
  image_url: string | null;
  product_id: string;
}

/** Product with variants */
export interface Product {
  id: string;
  title: string;
  description: string | null;
  status: ProductStatus;
  created_at: ISODateString;
  variants: Variant[];
}

/** Product list item (without variants) */
export interface ProductListItem {
  id: string;
  title: string;
  description: string | null;
  status: ProductStatus;
  created_at: ISODateString;
}

/** Parameters for creating a product */
export interface CreateProductParams {
  title: string;
  description?: string;
  status?: ProductStatus;
}

/** Parameters for updating a product */
export interface UpdateProductParams {
  title?: string;
  description?: string;
  status?: ProductStatus;
}

/** Parameters for creating a variant */
export interface CreateVariantParams {
  sku: string;
  title: string;
  price_cents: number;
  image_url?: string;
}

/** Parameters for updating a variant */
export interface UpdateVariantParams {
  sku?: string;
  title?: string;
  price_cents?: number;
  image_url?: string | null;
}

// ============================================================================
// Inventory Types
// ============================================================================

/** Reasons for inventory adjustments */
export type InventoryAdjustmentReason = 'restock' | 'correction' | 'damaged' | 'return';

/** Inventory record for a SKU */
export interface InventoryItem {
  sku: string;
  on_hand: number;
  reserved: number;
  available: number;
}

/** Parameters for adjusting inventory */
export interface AdjustInventoryParams {
  delta: number;
  reason: InventoryAdjustmentReason;
}

// ============================================================================
// Cart Types
// ============================================================================

/** Cart status */
export type CartStatus = 'open' | 'checked_out';

/** Item in a cart */
export interface CartItem {
  sku: string;
  title: string;
  qty: number;
  unit_price_cents: number;
}

/** Shopping cart */
export interface Cart {
  id: string;
  customer_email: string | null;
  status: CartStatus;
  expires_at: ISODateString | null;
  currency: string;
  items: CartItem[];
  subtotal_cents: number;
  discount_cents: number;
  total_cents: number;
  discount_code: string | null;
  stripe_checkout_session_id: string | null;
}

/** Parameters for creating a cart */
export interface CreateCartParams {
  customer_email?: string;
  currency?: string;
}

/** Parameters for adding items to cart */
export interface AddToCartParams {
  sku: string;
  qty: number;
}

/** Result of checkout initiation */
export interface CheckoutResult {
  checkout_url: string;
  stripe_checkout_session_id: string;
}

/** Parameters for checkout */
export interface CheckoutParams {
  success_url: string;
  cancel_url: string;
  collect_shipping?: boolean;
}

// ============================================================================
// Discount Types
// ============================================================================

/** Discount type */
export type DiscountType = 'percentage' | 'fixed_amount';

/** Discount status */
export type DiscountStatus = 'active' | 'inactive';

/** Discount code */
export interface Discount {
  id: string;
  code: string;
  type: DiscountType;
  value: number;
  status: DiscountStatus;
  min_purchase_cents: number | null;
  max_discount_cents: number | null;
  starts_at: ISODateString | null;
  expires_at: ISODateString | null;
  usage_limit: number | null;
  usage_limit_per_customer: number | null;
  usage_count: number;
  stripe_coupon_id: string | null;
  stripe_promotion_code_id: string | null;
}

/** Parameters for creating a discount */
export interface CreateDiscountParams {
  code: string;
  type: DiscountType;
  value: number;
  min_purchase_cents?: number;
  max_discount_cents?: number;
  starts_at?: ISODateString;
  expires_at?: ISODateString;
  usage_limit?: number;
  usage_limit_per_customer?: number;
}

/** Parameters for updating a discount */
export interface UpdateDiscountParams {
  code?: string;
  type?: DiscountType;
  value?: number;
  status?: DiscountStatus;
  min_purchase_cents?: number | null;
  max_discount_cents?: number | null;
  starts_at?: ISODateString | null;
  expires_at?: ISODateString | null;
  usage_limit?: number | null;
  usage_limit_per_customer?: number | null;
}

// ============================================================================
// Order Types
// ============================================================================

/** Order status */
export type OrderStatus =
  | 'pending'
  | 'paid'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'refunded'
  | 'canceled';

/** Item in an order */
export interface OrderItem {
  sku: string;
  title: string;
  qty: number;
  unit_price_cents: number;
}

/** Order */
export interface Order {
  id: string;
  number: string;
  status: OrderStatus;
  customer_email: string;
  customer_id: string | null;
  subtotal_cents: number;
  tax_cents: number;
  shipping_cents: number;
  discount_cents: number;
  total_cents: number;
  discount_code: string | null;
  stripe_payment_intent_id: string | null;
  stripe_checkout_session_id: string | null;
  tracking_number: string | null;
  tracking_url: string | null;
  created_at: ISODateString;
  items: OrderItem[];
}

/** Order list item (without items array) */
export interface OrderListItem {
  id: string;
  number: string;
  status: OrderStatus;
  customer_email: string;
  total_cents: number;
  created_at: ISODateString;
}

/** Parameters for updating an order */
export interface UpdateOrderParams {
  status?: OrderStatus;
  tracking_number?: string;
  tracking_url?: string;
}

/** Parameters for creating a refund */
export interface RefundParams {
  amount_cents?: number;
  reason?: string;
}

// ============================================================================
// Customer Types
// ============================================================================

/** Customer address */
export interface CustomerAddress {
  id: string;
  label: string | null;
  name: string;
  company: string | null;
  line1: string;
  line2: string | null;
  city: string;
  state: string | null;
  postal_code: string;
  country: string;
  phone: string | null;
  is_default: boolean;
}

/** Customer */
export interface Customer {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  accepts_marketing: boolean;
  order_count: number;
  total_spent_cents: number;
  last_order_at: ISODateString | null;
  metadata: Record<string, unknown> | null;
  addresses?: CustomerAddress[];
}

/** Parameters for updating a customer */
export interface UpdateCustomerParams {
  name?: string;
  phone?: string;
  accepts_marketing?: boolean;
  metadata?: Record<string, unknown>;
}

/** Parameters for creating a customer address */
export interface CreateAddressParams {
  label?: string;
  name: string;
  company?: string;
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postal_code: string;
  country: string;
  phone?: string;
  is_default?: boolean;
}

// ============================================================================
// Image Types
// ============================================================================

/** Result of image upload */
export interface ImageUploadResult {
  url: string;
  key: string;
}

// ============================================================================
// Webhook Types
// ============================================================================

/** Webhook event types */
export type WebhookEventType =
  | 'order.created'
  | 'order.updated'
  | 'order.shipped'
  | 'order.refunded'
  | 'inventory.low'
  | 'order.*'
  | '*';

/** Webhook subscription */
export interface Webhook {
  id: string;
  url: string;
  events: WebhookEventType[];
  active: boolean;
  secret: string;
  created_at: ISODateString;
}

/** Recent webhook delivery */
export interface WebhookDelivery {
  id: string;
  event_type: string;
  response_status: number | null;
  delivered_at: ISODateString;
  success: boolean;
}

/** Webhook with recent deliveries */
export interface WebhookWithDeliveries extends Webhook {
  recent_deliveries: WebhookDelivery[];
}

/** Parameters for creating a webhook */
export interface CreateWebhookParams {
  url: string;
  events: WebhookEventType[];
}

/** Parameters for updating a webhook */
export interface UpdateWebhookParams {
  url?: string;
  events?: WebhookEventType[];
  active?: boolean;
}

// ============================================================================
// List Filter Types
// ============================================================================

/** Parameters for listing products */
export interface ListProductsParams extends PaginationParams {
  status?: ProductStatus;
}

/** Parameters for listing inventory */
export interface ListInventoryParams extends PaginationParams {
  low_stock?: boolean;
  sku?: string;
}

/** Parameters for listing orders */
export interface ListOrdersParams extends PaginationParams {
  status?: OrderStatus;
  email?: string;
}

/** Parameters for listing customers */
export interface ListCustomersParams extends PaginationParams {
  search?: string;
}
