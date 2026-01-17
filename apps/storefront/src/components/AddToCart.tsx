import { useState } from 'react';
import { addToCart } from '../stores/cart';

interface AddToCartProps {
  variantId: string | null;
  variantSku: string | null;
  variantTitle: string;
  productTitle: string;
  price: number;
  available: boolean;
  imageUrl: string | null;
}

export default function AddToCart({
  variantId,
  variantSku,
  variantTitle,
  productTitle,
  price,
  available,
  imageUrl,
}: AddToCartProps) {
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const formattedPrice = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(price / 100);

  const handleDecrement = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1);
    }
  };

  const handleIncrement = () => {
    if (quantity < 10) {
      setQuantity(quantity + 1);
    }
  };

  const handleAddToCart = async () => {
    if (!variantId || !variantSku || !available) return;

    setIsAdding(true);

    // Add item to cart store
    addToCart(
      {
        variantId,
        sku: variantSku,
        title: productTitle,
        variantTitle,
        price,
        imageUrl,
      },
      quantity
    );

    // Show success feedback
    setTimeout(() => {
      setIsAdding(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    }, 300);
  };

  const isDisabled = !variantId || !variantSku || !available || isAdding;

  return (
    <div className="space-y-4">
      {/* Price Display */}
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold text-primary">
          {formattedPrice}
        </span>
        {!available && (
          <span className="text-sm font-medium text-status-error">
            Sold Out
          </span>
        )}
      </div>

      {/* Quantity Selector */}
      {available && (
        <div className="flex items-center gap-4">
          <label
            htmlFor="quantity"
            className="text-sm font-medium text-text-secondary"
          >
            Quantity
          </label>
          <div className="flex items-center border border-border rounded-lg">
            <button
              type="button"
              onClick={handleDecrement}
              disabled={quantity <= 1}
              className="w-10 h-10 flex items-center justify-center text-text-secondary hover:text-text disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-normal"
              aria-label="Decrease quantity"
            >
              <svg
                className="w-4 h-4"
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
            <input
              type="number"
              id="quantity"
              name="quantity"
              min="1"
              max="10"
              value={quantity}
              onChange={(e) =>
                setQuantity(
                  Math.min(10, Math.max(1, parseInt(e.target.value) || 1))
                )
              }
              className="w-12 h-10 text-center text-text font-medium border-x border-border bg-transparent focus:outline-none focus:ring-0"
            />
            <button
              type="button"
              onClick={handleIncrement}
              disabled={quantity >= 10}
              className="w-10 h-10 flex items-center justify-center text-text-secondary hover:text-text disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-normal"
              aria-label="Increase quantity"
            >
              <svg
                className="w-4 h-4"
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
        </div>
      )}

      {/* Add to Cart Button */}
      <button
        type="button"
        onClick={handleAddToCart}
        disabled={isDisabled}
        className={`
          w-full py-4 px-6 text-base font-semibold rounded-lg transition-all duration-normal
          ${
            isDisabled
              ? 'bg-background-tertiary text-text-muted cursor-not-allowed'
              : showSuccess
                ? 'bg-status-success text-white'
                : 'bg-primary text-text-inverse hover:bg-primary-600 active:scale-[0.98]'
          }
        `}
      >
        {isAdding ? (
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
            Adding...
          </span>
        ) : showSuccess ? (
          <span className="flex items-center justify-center gap-2">
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
            Added to Cart
          </span>
        ) : !available ? (
          'Sold Out'
        ) : (
          'Add to Cart'
        )}
      </button>

      {/* Selected Variant Info */}
      {variantSku && available && (
        <p className="text-xs text-text-muted text-center">SKU: {variantSku}</p>
      )}
    </div>
  );
}
