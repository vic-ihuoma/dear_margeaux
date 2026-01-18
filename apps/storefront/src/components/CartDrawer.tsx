import { useStore } from '@nanostores/react';
import { useEffect, useRef, useState } from 'react';
import {
  $cartItems,
  $cartSubtotal,
  $currency,
  $isCartEmpty,
  $isCartOpen,
  closeCart,
  formatPrice,
  removeFromCart,
  updateCartItemQuantity,
} from '../stores/cart';

interface AppliedDiscount {
  code: string;
  type: 'percentage' | 'fixed_amount';
  amount_cents: number;
}

export default function CartDrawer() {
  const items = useStore($cartItems);
  const subtotal = useStore($cartSubtotal);
  const isEmpty = useStore($isCartEmpty);
  const isOpen = useStore($isCartOpen);
  const currency = useStore($currency);
  const drawerRef = useRef<HTMLDivElement>(null);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [discountCode, setDiscountCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] =
    useState<AppliedDiscount | null>(null);
  const [discountError, setDiscountError] = useState<string | null>(null);
  const [isApplyingDiscount, setIsApplyingDiscount] = useState(false);

  // Handle escape key to close drawer
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) {
        closeCart();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Focus trap inside drawer
  useEffect(() => {
    if (isOpen && drawerRef.current) {
      const firstFocusable = drawerRef.current.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      firstFocusable?.focus();
    }
  }, [isOpen]);

  const handleCheckout = async () => {
    setIsCheckingOut(true);

    try {
      // Get environment variables
      const apiUrl = import.meta.env.PUBLIC_MERCHANT_API_URL;
      const apiKey = import.meta.env.PUBLIC_MERCHANT_API_KEY;

      if (!apiUrl || !apiKey) {
        // For development/demo, show an alert
        alert('Checkout is not configured. Add API credentials to enable.');
        setIsCheckingOut(false);
        return;
      }

      // Import the MerchantClient dynamically
      const { MerchantClient } = await import('@dear-margeaux/api');
      const client = new MerchantClient({ baseUrl: apiUrl, apiKey });

      // Create a cart in the API with the user's currency
      const cart = await client.createCart({ currency });

      // Add all items to the cart
      for (const item of items) {
        await client.addToCart(cart.id, {
          sku: item.sku,
          qty: item.quantity,
        });
      }

      // Apply discount if one was entered and validated
      if (appliedDiscount) {
        try {
          await client.applyDiscount(cart.id, appliedDiscount.code);
        } catch (error) {
          console.error('Failed to apply discount at checkout:', error);
          // Continue with checkout without discount
        }
      }

      // Initiate checkout
      const result = await client.checkout(cart.id, {
        success_url: `${window.location.origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${window.location.origin}/checkout/cancel`,
        collect_shipping: true,
      });

      // Redirect to Stripe Checkout
      window.location.href = result.checkout_url;
    } catch (error) {
      console.error('Checkout failed:', error);
      alert('Checkout failed. Please try again.');
      setIsCheckingOut(false);
    }
  };

  const handleApplyDiscount = async () => {
    if (!discountCode.trim()) return;

    setIsApplyingDiscount(true);
    setDiscountError(null);

    try {
      const apiUrl = import.meta.env.PUBLIC_MERCHANT_API_URL;
      const apiKey = import.meta.env.PUBLIC_MERCHANT_API_KEY;

      if (!apiUrl || !apiKey) {
        setDiscountError('Discounts not available');
        setIsApplyingDiscount(false);
        return;
      }

      const { MerchantClient } = await import('@dear-margeaux/api');
      const client = new MerchantClient({ baseUrl: apiUrl, apiKey });

      // Create a temporary cart to validate the discount
      const cart = await client.createCart({ currency });

      // Add items to get the correct subtotal
      for (const item of items) {
        await client.addToCart(cart.id, {
          sku: item.sku,
          qty: item.quantity,
        });
      }

      // Apply the discount code
      const result = await client.applyDiscount(cart.id, discountCode.trim());

      if (result.discount) {
        setAppliedDiscount({
          code: result.discount.code,
          type: result.discount.type,
          amount_cents: result.discount.amount_cents,
        });
        setDiscountCode('');
      }
    } catch (error: any) {
      const message = error?.message || 'Invalid discount code';
      setDiscountError(message);
    } finally {
      setIsApplyingDiscount(false);
    }
  };

  const handleRemoveDiscount = () => {
    setAppliedDiscount(null);
    setDiscountError(null);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`
          fixed inset-0 bg-background-inverse/50 z-40 transition-opacity duration-300
          ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}
        `}
        onClick={closeCart}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Shopping cart"
        className={`
          fixed right-0 top-0 h-full w-full max-w-md bg-background z-50 shadow-xl
          transform transition-transform duration-300 ease-out
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <h2 className="text-lg font-semibold text-text">Your Cart</h2>
            <button
              type="button"
              onClick={closeCart}
              className="p-2 -mr-2 text-text-secondary hover:text-text transition-colors duration-normal"
              aria-label="Close cart"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {isEmpty ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <svg
                  className="w-16 h-16 text-text-muted mb-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
                  />
                </svg>
                <p className="text-text-secondary mb-4">Your cart is empty</p>
                <a
                  href="/shop"
                  onClick={closeCart}
                  className="inline-flex items-center px-6 py-3 bg-primary text-text-inverse font-medium rounded-lg hover:bg-primary-600 transition-colors duration-normal"
                >
                  Continue Shopping
                </a>
              </div>
            ) : (
              <ul className="space-y-4">
                {items.map((item) => (
                  <li
                    key={item.variantId}
                    className="flex gap-4 py-4 border-b border-border last:border-0"
                  >
                    {/* Product Image */}
                    <div className="w-20 h-20 shrink-0 rounded-lg overflow-hidden bg-secondary">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <svg
                            className="w-8 h-8 text-text-muted"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={1}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
                            />
                          </svg>
                        </div>
                      )}
                    </div>

                    {/* Product Details */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-text truncate">
                        {item.title}
                      </h3>
                      {item.variantTitle && (
                        <p className="text-sm text-text-secondary">
                          {item.variantTitle}
                        </p>
                      )}
                      <p className="text-sm font-medium text-primary mt-1">
                        {formatPrice(item.price)}
                      </p>

                      {/* Low stock warning */}
                      {item.availableQuantity !== undefined &&
                        item.availableQuantity > 0 &&
                        item.availableQuantity <= 5 && (
                          <p className="text-xs text-status-warning mt-1">
                            Only {item.availableQuantity} left in stock
                          </p>
                        )}

                      {/* Quantity Controls */}
                      <div className="flex items-center gap-3 mt-2">
                        <div className="flex items-center border border-border rounded">
                          <button
                            type="button"
                            onClick={() =>
                              updateCartItemQuantity(
                                item.variantId,
                                item.quantity - 1
                              )
                            }
                            disabled={item.quantity <= 1}
                            className="w-8 h-8 flex items-center justify-center text-text-secondary hover:text-text disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-normal"
                            aria-label="Decrease quantity"
                          >
                            <svg
                              className="w-3 h-3"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M20 12H4"
                              />
                            </svg>
                          </button>
                          <span className="w-8 text-center text-sm font-medium text-text">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              updateCartItemQuantity(
                                item.variantId,
                                item.quantity + 1
                              )
                            }
                            disabled={
                              item.quantity >=
                              Math.min(item.availableQuantity ?? 10, 10)
                            }
                            className="w-8 h-8 flex items-center justify-center text-text-secondary hover:text-text disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-normal"
                            aria-label="Increase quantity"
                          >
                            <svg
                              className="w-3 h-3"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M12 4v16m8-8H4"
                              />
                            </svg>
                          </button>
                        </div>

                        {/* Remove Button */}
                        <button
                          type="button"
                          onClick={() => removeFromCart(item.variantId)}
                          className="text-sm text-text-secondary hover:text-status-error transition-colors duration-normal"
                          aria-label={`Remove ${item.title} from cart`}
                        >
                          Remove
                        </button>
                      </div>
                    </div>

                    {/* Line Total */}
                    <div className="text-right">
                      <p className="text-sm font-medium text-text">
                        {formatPrice(item.price * item.quantity)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Footer with Totals and Checkout */}
          {!isEmpty && (
            <div className="border-t border-border px-6 py-4 space-y-4">
              {/* Discount Code Section */}
              {!appliedDiscount ? (
                <div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={discountCode}
                      onChange={(e) =>
                        setDiscountCode(e.target.value.toUpperCase())
                      }
                      placeholder="Discount code"
                      className="flex-1 px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 bg-background text-text"
                      disabled={isApplyingDiscount}
                    />
                    <button
                      type="button"
                      onClick={handleApplyDiscount}
                      disabled={isApplyingDiscount || !discountCode.trim()}
                      className="px-4 py-2 text-sm font-medium border border-border rounded-lg hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-normal"
                    >
                      {isApplyingDiscount ? '...' : 'Apply'}
                    </button>
                  </div>
                  {discountError && (
                    <p className="mt-1 text-xs text-status-error">
                      {discountError}
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-between p-3 bg-status-success/10 rounded-lg">
                  <div className="flex items-center gap-2">
                    <svg
                      className="w-4 h-4 text-status-success"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span className="text-sm font-medium text-status-success">
                      {appliedDiscount.code}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveDiscount}
                    className="text-xs text-text-secondary hover:text-status-error transition-colors"
                  >
                    Remove
                  </button>
                </div>
              )}

              {/* Subtotal */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-secondary">Subtotal</span>
                <span className="text-sm text-text">
                  {formatPrice(subtotal)}
                </span>
              </div>

              {/* Discount Amount */}
              {appliedDiscount && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-status-success">Discount</span>
                  <span className="text-sm text-status-success">
                    -{formatPrice(appliedDiscount.amount_cents)}
                  </span>
                </div>
              )}

              {/* Total */}
              <div className="flex items-center justify-between pt-2 border-t border-border">
                <span className="text-sm font-medium text-text">Total</span>
                <span className="text-lg font-semibold text-text">
                  {formatPrice(subtotal - (appliedDiscount?.amount_cents || 0))}
                </span>
              </div>

              <p className="text-xs text-text-muted">
                Shipping and taxes calculated at checkout.
              </p>

              {/* Checkout Button */}
              <button
                type="button"
                onClick={handleCheckout}
                disabled={isCheckingOut}
                className={`
                  w-full py-4 px-6 text-base font-semibold rounded-lg transition-all duration-normal
                  ${
                    isCheckingOut
                      ? 'bg-primary-300 text-text-inverse cursor-wait'
                      : 'bg-primary text-text-inverse hover:bg-primary-600 active:scale-[0.98]'
                  }
                `}
              >
                {isCheckingOut ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg
                      className="w-5 h-5 animate-spin"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Processing...
                  </span>
                ) : (
                  'Checkout'
                )}
              </button>

              {/* Continue Shopping Link */}
              <button
                type="button"
                onClick={closeCart}
                className="w-full text-center text-sm text-text-secondary hover:text-primary transition-colors duration-normal"
              >
                Continue Shopping
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
