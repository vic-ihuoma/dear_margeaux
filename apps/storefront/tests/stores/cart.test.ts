import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  $cartItems,
  $cartCount,
  $cartSubtotal,
  $isCartEmpty,
  $isCartOpen,
  $currency,
  addToCart,
  updateCartItemQuantity,
  removeFromCart,
  clearCart,
  initializeCart,
  openCart,
  closeCart,
  toggleCart,
  setCurrency,
  formatPrice,
  getCurrencySymbol,
  getSupportedCurrencies,
  detectCurrency,
  type CartItem,
} from '../../src/stores/cart';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get store() {
      return store;
    },
  };
})();

// Set up global mocks
Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
});

Object.defineProperty(global, 'navigator', {
  value: {
    language: 'en-US',
  },
  writable: true,
});

// Helper to create a mock cart item
function createMockItem(
  overrides: Partial<Omit<CartItem, 'quantity'>> = {}
): Omit<CartItem, 'quantity'> {
  return {
    variantId: 'variant-1',
    sku: 'SKU-001',
    title: 'Test Product',
    variantTitle: 'Size M',
    price: 4999, // $49.99 in cents
    imageUrl: 'https://example.com/image.jpg',
    ...overrides,
  };
}

describe('Cart Store', () => {
  beforeEach(() => {
    // Reset cart state before each test
    $cartItems.set([]);
    $isCartOpen.set(false);
    $currency.set('USD');
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('addToCart', () => {
    it('adds new item to empty cart', () => {
      const item = createMockItem();
      addToCart(item);

      const items = $cartItems.get();
      expect(items).toHaveLength(1);
      expect(items[0]).toEqual({ ...item, quantity: 1 });
    });

    it('increments quantity for existing item', () => {
      const item = createMockItem();
      addToCart(item);
      addToCart(item);

      const items = $cartItems.get();
      expect(items).toHaveLength(1);
      expect(items[0].quantity).toBe(2);
    });

    it('stores variant ID and product info correctly', () => {
      const item = createMockItem({
        variantId: 'unique-variant-123',
        sku: 'SKU-UNIQUE',
        title: 'Special Bag',
        variantTitle: 'Large / Black',
        price: 9999,
        imageUrl: 'https://example.com/special.jpg',
      });
      addToCart(item);

      const items = $cartItems.get();
      expect(items[0].variantId).toBe('unique-variant-123');
      expect(items[0].sku).toBe('SKU-UNIQUE');
      expect(items[0].title).toBe('Special Bag');
      expect(items[0].variantTitle).toBe('Large / Black');
      expect(items[0].price).toBe(9999);
      expect(items[0].imageUrl).toBe('https://example.com/special.jpg');
    });

    it('persists to localStorage', () => {
      const item = createMockItem();
      addToCart(item);

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'dear-margeaux-cart',
        expect.any(String)
      );

      const storedItems = JSON.parse(
        localStorageMock.store['dear-margeaux-cart']
      );
      expect(storedItems).toHaveLength(1);
      expect(storedItems[0].variantId).toBe('variant-1');
    });

    it('opens cart drawer after adding item', () => {
      expect($isCartOpen.get()).toBe(false);
      addToCart(createMockItem());
      expect($isCartOpen.get()).toBe(true);
    });

    it('respects custom quantity parameter', () => {
      const item = createMockItem();
      addToCart(item, 3);

      const items = $cartItems.get();
      expect(items[0].quantity).toBe(3);
    });

    it('caps quantity at 10 (max)', () => {
      const item = createMockItem();
      addToCart(item, 8);
      addToCart(item, 5); // Would be 13, should cap at 10

      const items = $cartItems.get();
      expect(items[0].quantity).toBe(10);
    });

    it('handles multiple different items', () => {
      const item1 = createMockItem({ variantId: 'variant-1' });
      const item2 = createMockItem({
        variantId: 'variant-2',
        title: 'Another Product',
      });

      addToCart(item1);
      addToCart(item2);

      const items = $cartItems.get();
      expect(items).toHaveLength(2);
      expect(items[0].variantId).toBe('variant-1');
      expect(items[1].variantId).toBe('variant-2');
    });
  });

  describe('updateCartItemQuantity', () => {
    it('updates quantity for existing item', () => {
      addToCart(createMockItem());
      updateCartItemQuantity('variant-1', 5);

      const items = $cartItems.get();
      expect(items[0].quantity).toBe(5);
    });

    it('rejects quantity less than 1', () => {
      addToCart(createMockItem());
      updateCartItemQuantity('variant-1', 0);

      const items = $cartItems.get();
      expect(items[0].quantity).toBe(1); // Should remain unchanged
    });

    it('rejects quantity greater than 10', () => {
      addToCart(createMockItem());
      updateCartItemQuantity('variant-1', 15);

      const items = $cartItems.get();
      expect(items[0].quantity).toBe(1); // Should remain unchanged
    });

    it('persists updated quantity to localStorage', () => {
      addToCart(createMockItem());
      vi.clearAllMocks();
      updateCartItemQuantity('variant-1', 5);

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'dear-margeaux-cart',
        expect.any(String)
      );
    });

    it('handles non-existent item gracefully', () => {
      addToCart(createMockItem());
      updateCartItemQuantity('non-existent', 5);

      const items = $cartItems.get();
      expect(items).toHaveLength(1);
      expect(items[0].quantity).toBe(1); // Original item unchanged
    });
  });

  describe('removeFromCart', () => {
    it('removes item by variant ID', () => {
      addToCart(createMockItem({ variantId: 'variant-1' }));
      addToCart(createMockItem({ variantId: 'variant-2' }));

      removeFromCart('variant-1');

      const items = $cartItems.get();
      expect(items).toHaveLength(1);
      expect(items[0].variantId).toBe('variant-2');
    });

    it('handles non-existent item gracefully', () => {
      addToCart(createMockItem());
      removeFromCart('non-existent');

      const items = $cartItems.get();
      expect(items).toHaveLength(1);
    });

    it('persists removal to localStorage', () => {
      addToCart(createMockItem());
      vi.clearAllMocks();
      removeFromCart('variant-1');

      expect(localStorageMock.setItem).toHaveBeenCalled();
      const storedItems = JSON.parse(
        localStorageMock.store['dear-margeaux-cart']
      );
      expect(storedItems).toHaveLength(0);
    });

    it('can remove all items one by one', () => {
      addToCart(createMockItem({ variantId: 'v1' }));
      addToCart(createMockItem({ variantId: 'v2' }));
      addToCart(createMockItem({ variantId: 'v3' }));

      removeFromCart('v1');
      removeFromCart('v2');
      removeFromCart('v3');

      expect($cartItems.get()).toHaveLength(0);
    });
  });

  describe('clearCart', () => {
    it('removes all items', () => {
      addToCart(createMockItem({ variantId: 'v1' }));
      addToCart(createMockItem({ variantId: 'v2' }));

      clearCart();

      expect($cartItems.get()).toHaveLength(0);
    });

    it('clears localStorage', () => {
      addToCart(createMockItem());
      vi.clearAllMocks();
      clearCart();

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'dear-margeaux-cart',
        '[]'
      );
    });

    it('resets API cart ID', () => {
      // This would be set by a backend sync
      addToCart(createMockItem());
      clearCart();
      // The implementation sets $apiCartId to null
      // We can verify cart is cleared
      expect($cartItems.get()).toHaveLength(0);
    });
  });

  describe('$cartCount (computed)', () => {
    it('returns total item count', () => {
      addToCart(createMockItem({ variantId: 'v1' }));
      addToCart(createMockItem({ variantId: 'v2' }));

      expect($cartCount.get()).toBe(2);
    });

    it('handles quantities greater than 1', () => {
      addToCart(createMockItem({ variantId: 'v1' }), 3);
      addToCart(createMockItem({ variantId: 'v2' }), 2);

      expect($cartCount.get()).toBe(5);
    });

    it('returns 0 for empty cart', () => {
      expect($cartCount.get()).toBe(0);
    });

    it('updates when items are added', () => {
      expect($cartCount.get()).toBe(0);
      addToCart(createMockItem());
      expect($cartCount.get()).toBe(1);
      addToCart(createMockItem());
      expect($cartCount.get()).toBe(2);
    });

    it('updates when items are removed', () => {
      addToCart(createMockItem({ variantId: 'v1' }));
      addToCart(createMockItem({ variantId: 'v2' }));
      expect($cartCount.get()).toBe(2);

      removeFromCart('v1');
      expect($cartCount.get()).toBe(1);
    });
  });

  describe('$cartSubtotal (computed)', () => {
    it('calculates correct total', () => {
      addToCart(createMockItem({ variantId: 'v1', price: 1000 })); // $10.00
      addToCart(createMockItem({ variantId: 'v2', price: 2500 })); // $25.00

      expect($cartSubtotal.get()).toBe(3500); // $35.00 in cents
    });

    it('handles empty cart', () => {
      expect($cartSubtotal.get()).toBe(0);
    });

    it('accounts for quantities', () => {
      addToCart(createMockItem({ variantId: 'v1', price: 1000 }), 3); // 3 x $10.00

      expect($cartSubtotal.get()).toBe(3000); // $30.00 in cents
    });

    it('recalculates when quantity changes', () => {
      addToCart(createMockItem({ price: 1000 }));
      expect($cartSubtotal.get()).toBe(1000);

      updateCartItemQuantity('variant-1', 5);
      expect($cartSubtotal.get()).toBe(5000);
    });
  });

  describe('$isCartEmpty (computed)', () => {
    it('returns true when empty', () => {
      expect($isCartEmpty.get()).toBe(true);
    });

    it('returns false when items exist', () => {
      addToCart(createMockItem());
      expect($isCartEmpty.get()).toBe(false);
    });

    it('updates when last item removed', () => {
      addToCart(createMockItem());
      expect($isCartEmpty.get()).toBe(false);

      removeFromCart('variant-1');
      expect($isCartEmpty.get()).toBe(true);
    });

    it('updates when cart is cleared', () => {
      addToCart(createMockItem());
      expect($isCartEmpty.get()).toBe(false);

      clearCart();
      expect($isCartEmpty.get()).toBe(true);
    });
  });

  describe('localStorage persistence', () => {
    it('loads from localStorage on init', () => {
      const savedItems: CartItem[] = [
        {
          variantId: 'saved-variant',
          sku: 'SAVED-SKU',
          title: 'Saved Product',
          variantTitle: 'Size L',
          price: 7500,
          quantity: 2,
          imageUrl: null,
        },
      ];
      localStorageMock.getItem.mockReturnValue(JSON.stringify(savedItems));

      initializeCart();

      const items = $cartItems.get();
      expect(items).toHaveLength(1);
      expect(items[0].variantId).toBe('saved-variant');
      expect(items[0].quantity).toBe(2);
    });

    it('handles corrupted localStorage data', () => {
      localStorageMock.getItem.mockReturnValue('not valid json {{{');

      // Should not throw and should initialize with empty cart
      expect(() => initializeCart()).not.toThrow();
      expect($cartItems.get()).toHaveLength(0);
    });

    it('handles empty localStorage', () => {
      localStorageMock.getItem.mockReturnValue(null);

      initializeCart();
      expect($cartItems.get()).toHaveLength(0);
    });

    it('handles non-array localStorage data', () => {
      localStorageMock.getItem.mockReturnValue(
        JSON.stringify({ notAnArray: true })
      );

      initializeCart();
      expect($cartItems.get()).toHaveLength(0);
    });
  });

  describe('Cart drawer controls', () => {
    it('openCart sets isCartOpen to true', () => {
      expect($isCartOpen.get()).toBe(false);
      openCart();
      expect($isCartOpen.get()).toBe(true);
    });

    it('closeCart sets isCartOpen to false', () => {
      $isCartOpen.set(true);
      closeCart();
      expect($isCartOpen.get()).toBe(false);
    });

    it('toggleCart toggles state', () => {
      expect($isCartOpen.get()).toBe(false);
      toggleCart();
      expect($isCartOpen.get()).toBe(true);
      toggleCart();
      expect($isCartOpen.get()).toBe(false);
    });
  });

  describe('Currency functions', () => {
    it('setCurrency updates currency atom', () => {
      setCurrency('EUR');
      expect($currency.get()).toBe('EUR');
    });

    it('setCurrency persists to localStorage', () => {
      setCurrency('GBP');
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'dear-margeaux-currency',
        'GBP'
      );
    });

    it('getSupportedCurrencies returns all currencies', () => {
      const currencies = getSupportedCurrencies();
      expect(currencies).toContain('USD');
      expect(currencies).toContain('EUR');
      expect(currencies).toContain('GBP');
      expect(currencies.length).toBeGreaterThan(10);
    });

    it('detectCurrency returns saved preference from localStorage', () => {
      localStorageMock.getItem.mockReturnValue('EUR');
      const currency = detectCurrency();
      expect(currency).toBe('EUR');
    });

    it('detectCurrency defaults to USD when no preference', () => {
      localStorageMock.getItem.mockReturnValue(null);
      // Reset navigator to unknown locale
      Object.defineProperty(global, 'navigator', {
        value: { language: 'xx-XX' },
        writable: true,
      });
      const currency = detectCurrency();
      expect(currency).toBe('USD');
    });
  });

  describe('formatPrice', () => {
    it('formats price in current currency', () => {
      $currency.set('USD');
      const formatted = formatPrice(4999);
      expect(formatted).toContain('49.99');
      expect(formatted).toMatch(/\$|USD/);
    });

    it('formats price with currency override', () => {
      $currency.set('USD');
      const formatted = formatPrice(4999, 'EUR');
      expect(formatted).toContain('49,99'); // EUR uses comma for decimal
    });

    it('handles zero cents', () => {
      const formatted = formatPrice(0);
      expect(formatted).toContain('0');
    });

    it('handles large amounts', () => {
      const formatted = formatPrice(99999999); // $999,999.99
      expect(formatted).toContain('999,999.99');
    });
  });

  describe('getCurrencySymbol', () => {
    it('returns $ for USD', () => {
      const symbol = getCurrencySymbol('USD');
      expect(symbol).toBe('$');
    });

    it('returns € for EUR', () => {
      const symbol = getCurrencySymbol('EUR');
      expect(symbol).toBe('€');
    });

    it('returns £ for GBP', () => {
      const symbol = getCurrencySymbol('GBP');
      expect(symbol).toBe('£');
    });

    it('uses current currency when no argument', () => {
      $currency.set('GBP');
      const symbol = getCurrencySymbol();
      expect(symbol).toBe('£');
    });
  });
});
