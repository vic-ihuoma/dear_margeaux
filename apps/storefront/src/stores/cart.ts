import { atom, computed } from 'nanostores';

/**
 * Cart item stored in the client-side cart
 */
export interface CartItem {
  variantId: string;
  sku: string;
  title: string;
  variantTitle: string;
  price: number; // in cents
  quantity: number;
  imageUrl: string | null;
}

/**
 * Cart state structure
 */
export interface CartState {
  items: CartItem[];
  isOpen: boolean;
  apiCartId: string | null;
}

// Local storage key for cart persistence
const CART_STORAGE_KEY = 'dear-margeaux-cart';

/**
 * Load cart from localStorage
 */
function loadCartFromStorage(): CartItem[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(CART_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch {
    // Invalid stored data, ignore
  }
  return [];
}

/**
 * Save cart to localStorage
 */
function saveCartToStorage(items: CartItem[]): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Storage full or unavailable, ignore
  }
}

// Main cart items atom
export const $cartItems = atom<CartItem[]>([]);

// Cart open/closed state
export const $isCartOpen = atom<boolean>(false);

// API cart ID for syncing with backend
export const $apiCartId = atom<string | null>(null);

// Computed: total item count (sum of quantities)
export const $cartCount = computed($cartItems, (items) =>
  items.reduce((sum, item) => sum + item.quantity, 0)
);

// Computed: subtotal in cents
export const $cartSubtotal = computed($cartItems, (items) =>
  items.reduce((sum, item) => sum + item.price * item.quantity, 0)
);

// Computed: cart is empty
export const $isCartEmpty = computed($cartItems, (items) => items.length === 0);

/**
 * Initialize cart from localStorage (call on client load)
 */
export function initializeCart(): void {
  const items = loadCartFromStorage();
  $cartItems.set(items);
}

/**
 * Add an item to the cart
 */
export function addToCart(
  item: Omit<CartItem, 'quantity'>,
  quantity = 1
): void {
  const items = $cartItems.get();
  const existingIndex = items.findIndex((i) => i.variantId === item.variantId);

  let newItems: CartItem[];

  if (existingIndex >= 0) {
    // Update quantity of existing item
    newItems = items.map((i, idx) =>
      idx === existingIndex
        ? { ...i, quantity: Math.min(i.quantity + quantity, 10) }
        : i
    );
  } else {
    // Add new item
    newItems = [...items, { ...item, quantity }];
  }

  $cartItems.set(newItems);
  saveCartToStorage(newItems);

  // Open cart drawer to show the added item
  $isCartOpen.set(true);
}

/**
 * Update quantity of an item in the cart
 */
export function updateCartItemQuantity(
  variantId: string,
  quantity: number
): void {
  if (quantity < 1 || quantity > 10) return;

  const items = $cartItems.get();
  const newItems = items.map((item) =>
    item.variantId === variantId ? { ...item, quantity } : item
  );

  $cartItems.set(newItems);
  saveCartToStorage(newItems);
}

/**
 * Remove an item from the cart
 */
export function removeFromCart(variantId: string): void {
  const items = $cartItems.get();
  const newItems = items.filter((item) => item.variantId !== variantId);

  $cartItems.set(newItems);
  saveCartToStorage(newItems);
}

/**
 * Clear all items from the cart
 */
export function clearCart(): void {
  $cartItems.set([]);
  $apiCartId.set(null);
  saveCartToStorage([]);
}

/**
 * Open the cart drawer
 */
export function openCart(): void {
  $isCartOpen.set(true);
}

/**
 * Close the cart drawer
 */
export function closeCart(): void {
  $isCartOpen.set(false);
}

/**
 * Toggle the cart drawer
 */
export function toggleCart(): void {
  $isCartOpen.set(!$isCartOpen.get());
}

/**
 * Format price in cents to currency string
 */
export function formatPrice(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
}
