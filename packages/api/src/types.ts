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
  image_alt: string | null;
  product_id: string;
  /** Low stock alert threshold (NULL = use default of 5) */
  low_stock_threshold: number | null;
  /** Reorder point threshold (NULL = no reorder alert) */
  reorder_point: number | null;
}

/** Product with variants */
export interface Product {
  id: string;
  title: string;
  description: string | null;
  featured_image_url: string | null;
  featured_image_alt: string | null;
  status: ProductStatus;
  created_at: ISODateString;
  tags: string[];
  drop_id: string | null;
  /** Position within drop for ordering (NULL for products not in drops) */
  drop_position: number | null;
  variants: Variant[];
}

/** Product list item (without variants) */
export interface ProductListItem {
  id: string;
  title: string;
  description: string | null;
  featured_image_url: string | null;
  featured_image_alt: string | null;
  status: ProductStatus;
  created_at: ISODateString;
  tags: string[];
  drop_id: string | null;
  /** Position within drop for ordering (NULL for products not in drops) */
  drop_position: number | null;
}

/** Parameters for creating a product */
export interface CreateProductParams {
  title: string;
  description?: string;
  featured_image_url?: string;
  featured_image_alt?: string;
  status?: ProductStatus;
  tags?: string[];
  drop_id?: string;
}

/** Parameters for updating a product */
export interface UpdateProductParams {
  title?: string;
  description?: string;
  featured_image_url?: string | null;
  featured_image_alt?: string | null;
  status?: ProductStatus;
  tags?: string[];
  drop_id?: string | null;
}

/** Parameters for creating a variant */
export interface CreateVariantParams {
  sku: string;
  title: string;
  price_cents: number;
  image_url?: string;
  image_alt?: string;
  /** Low stock alert threshold (NULL = use default of 5) */
  low_stock_threshold?: number | null;
  /** Reorder point threshold (NULL = no reorder alert) */
  reorder_point?: number | null;
}

/** Parameters for updating a variant */
export interface UpdateVariantParams {
  sku?: string;
  title?: string;
  price_cents?: number;
  image_url?: string | null;
  image_alt?: string | null;
  /** Low stock alert threshold (NULL = use default of 5) */
  low_stock_threshold?: number | null;
  /** Reorder point threshold (NULL = no reorder alert) */
  reorder_point?: number | null;
}

/** Deleted product response (for soft delete with undo support) */
export interface DeletedProduct extends Product {
  deleted_at: ISODateString;
}

/** Tag with count of products */
export interface TagInfo {
  tag: string;
  count: number;
}

/** Response for listing tags */
export interface TagsResponse {
  tags: TagInfo[];
}

// ============================================================================
// Inventory Types
// ============================================================================

/** Reasons for inventory adjustments */
export type InventoryAdjustmentReason =
  | 'restock'
  | 'correction'
  | 'damaged'
  | 'return';

/** Inventory record for a SKU */
export interface InventoryItem {
  sku: string;
  on_hand: number;
  reserved: number;
  available: number;
  /** Low stock alert threshold (NULL = use default of 5) */
  low_stock_threshold: number | null;
  /** Reorder point threshold (NULL = no reorder alert) */
  reorder_point: number | null;
}

/** Parameters for adjusting inventory */
export interface AdjustInventoryParams {
  delta: number;
  reason: InventoryAdjustmentReason;
  /** Admin ID who made the adjustment (for audit trail) */
  admin_id?: string;
  /** Admin name for display purposes */
  admin_name?: string;
}

/** All possible reasons for inventory changes (including system) */
export type InventoryLogReason = InventoryAdjustmentReason | 'sale' | 'release';

/** Inventory adjustment log entry (audit trail) */
export interface InventoryLog {
  id: string;
  sku: string;
  delta: number;
  reason: InventoryLogReason;
  admin_id: string | null;
  admin_name: string | null;
  created_at: ISODateString;
}

/** Parameters for listing inventory history */
export interface ListInventoryHistoryParams extends PaginationParams {
  /** ISO 8601 date string to filter logs from this date */
  start_date?: ISODateString;
  /** ISO 8601 date string to filter logs until this date */
  end_date?: ISODateString;
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

/** Applied discount info */
export interface AppliedDiscount {
  code: string;
  type: DiscountType;
  amount_cents: number;
}

/** Cart totals */
export interface CartTotals {
  subtotal_cents: number;
  discount_cents: number;
  shipping_cents: number;
  tax_cents: number;
  total_cents: number;
}

/** Shopping cart */
export interface Cart {
  id: string;
  customer_email: string | null;
  status: CartStatus;
  expires_at: ISODateString | null;
  currency: string;
  items: CartItem[];
  discount: AppliedDiscount | null;
  totals: CartTotals;
  stripe_checkout_session_id?: string | null;
}

/** Result of applying or removing a discount */
export interface ApplyDiscountResult {
  discount: AppliedDiscount | null;
  totals: CartTotals;
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
  created_at: ISODateString;
  updated_at: ISODateString;
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

/** Order note (admin comment on an order) */
export interface OrderNote {
  id: string;
  order_id: string;
  admin_id: string;
  admin_name: string;
  content: string;
  created_at: ISODateString;
  updated_at: ISODateString;
}

/** Parameters for creating an order note */
export interface CreateOrderNoteParams {
  content: string;
  admin_id: string;
  admin_name: string;
}

/** Parameters for updating an order note */
export interface UpdateOrderNoteParams {
  content: string;
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
  /** Filter products by tag (case-insensitive) */
  tag?: string;
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
  /** ISO 8601 date string to filter orders created on or after this date */
  start_date?: ISODateString;
  /** ISO 8601 date string to filter orders created on or before this date */
  end_date?: ISODateString;
}

/** Parameters for listing customers */
export interface ListCustomersParams extends PaginationParams {
  search?: string;
}

// ============================================================================
// Count Types
// ============================================================================

/** Count response */
export interface CountResponse {
  count: number;
}

/** Parameters for getting product count */
export interface ProductCountParams {
  status?: ProductStatus;
}

/** Parameters for getting order count */
export interface OrderCountParams {
  status?: OrderStatus;
  start_date?: ISODateString;
  end_date?: ISODateString;
}

/** Parameters for getting inventory count */
export interface InventoryCountParams {
  low_stock?: boolean;
}

// ============================================================================
// Drop Types
// ============================================================================

/** Drop status */
export type DropStatus = 'draft' | 'scheduled' | 'active' | 'ended';

/** Drop (limited release collection) */
export interface Drop {
  id: string;
  name: string;
  description: string | null;
  slug: string;
  cover_image: string | null;
  start_date: ISODateString | null;
  end_date: ISODateString | null;
  status: DropStatus;
  created_at: ISODateString;
  updated_at: ISODateString;
}

/** Drop with products */
export interface DropWithProducts extends Drop {
  products: Product[];
}

/** Parameters for creating a drop */
export interface CreateDropParams {
  name: string;
  slug: string;
  description?: string;
  cover_image?: string;
  start_date?: ISODateString;
  end_date?: ISODateString;
  status?: DropStatus;
}

/** Parameters for updating a drop */
export interface UpdateDropParams {
  name?: string;
  slug?: string;
  description?: string | null;
  cover_image?: string | null;
  start_date?: ISODateString | null;
  end_date?: ISODateString | null;
  status?: DropStatus;
}

/** Parameters for listing drops */
export interface ListDropsParams extends PaginationParams {
  status?: DropStatus;
}

/** Response for drop products endpoint */
export interface DropProductsResponse extends PaginatedResponse<Product> {
  drop: Drop;
}

// ============================================================================
// Waitlist Types
// ============================================================================

/** Waitlist entry for drop notifications */
export interface WaitlistEntry {
  id: string;
  email: string;
  drop_id: string;
  subscribed_at: ISODateString;
  notified_at: ISODateString | null;
  unsubscribed: boolean;
}

/** Parameters for subscribing to waitlist */
export interface SubscribeWaitlistParams {
  email: string;
  drop_id: string;
}

/** Parameters for unsubscribing by email */
export interface UnsubscribeWaitlistParams {
  email: string;
  drop_id?: string;
}

/** Parameters for listing waitlist entries */
export interface ListWaitlistParams extends PaginationParams {
  drop_id?: string;
  include_unsubscribed?: boolean;
}

/** Response for unsubscribe by email */
export interface UnsubscribeResult {
  unsubscribed: boolean;
  count?: number;
}

// ============================================================================
// Customer Auth Types
// ============================================================================

/** Customer session info */
export interface CustomerSession {
  id: string;
  expires_at: ISODateString;
}

/** Authenticated customer response */
export interface AuthenticatedCustomer {
  customer: CustomerAuth;
  session: CustomerSession;
}

/** Customer info for auth responses (subset of full Customer) */
export interface CustomerAuth {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  accepts_marketing: boolean;
  order_count: number;
  total_spent_cents: number;
  last_order_at: ISODateString | null;
  created_at: ISODateString;
}

/** Parameters for customer registration */
export interface RegisterCustomerParams {
  email: string;
  password: string;
  name?: string;
}

/** Parameters for customer login */
export interface LoginCustomerParams {
  email: string;
  password: string;
}

/** Customer order with items (for order history) */
export interface CustomerOrder {
  id: string;
  number: string;
  status: OrderStatus;
  amounts: {
    subtotal_cents: number;
    discount_cents: number;
    tax_cents: number;
    shipping_cents: number;
    total_cents: number;
    currency: string;
  };
  items: CustomerOrderItem[];
  tracking: {
    number: string;
    url: string | null;
  } | null;
  created_at: ISODateString;
}

/** Order item in customer order */
export interface CustomerOrderItem {
  sku: string;
  title: string;
  qty: number;
  unit_price_cents: number;
  image_url: string | null;
}

// ============================================================================
// Email Send Types
// ============================================================================

/** Email send status */
export type EmailSendStatus = 'sent' | 'failed' | 'queued';

/** Email types that can be sent */
export type EmailSendType =
  | 'order_confirmation'
  | 'shipping_update'
  | 'order_status_update'
  | 'drop_launch'
  | 'newsletter_verification'
  | 'newsletter';

/** Email send log record */
export interface EmailSend {
  id: string;
  email_type: EmailSendType;
  recipient: string;
  subject: string;
  status: EmailSendStatus;
  error_message: string | null;
  metadata: Record<string, unknown> | null;
  created_at: ISODateString;
}

/** Parameters for listing email sends */
export interface ListEmailSendsParams extends PaginationParams {
  /** Filter by email type */
  email_type?: EmailSendType;
  /** Filter by status */
  status?: EmailSendStatus;
  /** Filter by date range start */
  start_date?: ISODateString;
  /** Filter by date range end */
  end_date?: ISODateString;
}
