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
  currency: string;
}

// Local storage keys for cart persistence
const CART_STORAGE_KEY = 'dear-margeaux-cart';
const CURRENCY_STORAGE_KEY = 'dear-margeaux-currency';

// Supported currencies for multi-currency checkout
const SUPPORTED_CURRENCIES = [
  'USD',
  'EUR',
  'GBP',
  'CAD',
  'AUD',
  'JPY',
  'CHF',
  'SEK',
  'NOK',
  'DKK',
  'NZD',
  'SGD',
  'HKD',
  'MXN',
  'BRL',
  'PLN',
  'CZK',
  'HUF',
  'RON',
  'BGN',
] as const;

export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

// Currency to locale mapping for formatting
const CURRENCY_LOCALES: Record<string, string> = {
  USD: 'en-US',
  EUR: 'de-DE',
  GBP: 'en-GB',
  CAD: 'en-CA',
  AUD: 'en-AU',
  JPY: 'ja-JP',
  CHF: 'de-CH',
  SEK: 'sv-SE',
  NOK: 'nb-NO',
  DKK: 'da-DK',
  NZD: 'en-NZ',
  SGD: 'en-SG',
  HKD: 'zh-HK',
  MXN: 'es-MX',
  BRL: 'pt-BR',
  PLN: 'pl-PL',
  CZK: 'cs-CZ',
  HUF: 'hu-HU',
  RON: 'ro-RO',
  BGN: 'bg-BG',
};

/**
 * Detect user's preferred currency based on locale/timezone
 */
export function detectCurrency(): SupportedCurrency {
  if (typeof window === 'undefined') return 'USD';

  // Check if user has a saved preference
  try {
    const saved = localStorage.getItem(CURRENCY_STORAGE_KEY);
    if (saved && SUPPORTED_CURRENCIES.includes(saved as SupportedCurrency)) {
      return saved as SupportedCurrency;
    }
  } catch {
    // localStorage not available
  }

  // Try to detect from browser locale
  try {
    const locale = navigator.language || 'en-US';
    const region = locale.split('-')[1]?.toUpperCase();

    // Map common regions to currencies
    const regionCurrencyMap: Record<string, SupportedCurrency> = {
      US: 'USD',
      GB: 'GBP',
      UK: 'GBP',
      DE: 'EUR',
      FR: 'EUR',
      IT: 'EUR',
      ES: 'EUR',
      NL: 'EUR',
      BE: 'EUR',
      AT: 'EUR',
      IE: 'EUR',
      PT: 'EUR',
      FI: 'EUR',
      CA: 'CAD',
      AU: 'AUD',
      JP: 'JPY',
      CH: 'CHF',
      SE: 'SEK',
      NO: 'NOK',
      DK: 'DKK',
      NZ: 'NZD',
      SG: 'SGD',
      HK: 'HKD',
      MX: 'MXN',
      BR: 'BRL',
      PL: 'PLN',
      CZ: 'CZK',
      HU: 'HUF',
      RO: 'RON',
      BG: 'BGN',
    };

    if (region && regionCurrencyMap[region]) {
      return regionCurrencyMap[region];
    }
  } catch {
    // Navigator not available
  }

  return 'USD';
}

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

// Current currency
export const $currency = atom<SupportedCurrency>('USD');

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

  // Detect and set currency
  const currency = detectCurrency();
  $currency.set(currency);
}

/**
 * Set the current currency
 */
export function setCurrency(currency: SupportedCurrency): void {
  $currency.set(currency);

  // Save to localStorage
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(CURRENCY_STORAGE_KEY, currency);
    } catch {
      // Storage not available
    }
  }

  // Clear API cart ID since currency changed (new cart needed)
  $apiCartId.set(null);
}

/**
 * Get list of supported currencies
 */
export function getSupportedCurrencies(): readonly SupportedCurrency[] {
  return SUPPORTED_CURRENCIES;
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
 * Uses the current currency from the store
 */
export function formatPrice(cents: number, currencyOverride?: string): string {
  const currency = currencyOverride || $currency.get();
  const locale = CURRENCY_LOCALES[currency] || 'en-US';

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(cents / 100);
}

/**
 * Get currency symbol for a given currency code
 */
export function getCurrencySymbol(currency?: string): string {
  const curr = currency || $currency.get();
  const locale = CURRENCY_LOCALES[curr] || 'en-US';

  // Use Intl.NumberFormat to get just the symbol
  const parts = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: curr,
  }).formatToParts(0);

  return parts.find((part) => part.type === 'currency')?.value || curr;
}
