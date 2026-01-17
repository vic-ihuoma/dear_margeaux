import { useStore } from '@nanostores/react';
import { useEffect } from 'react';
import {
  $cartCount,
  $isCartOpen,
  initializeCart,
  toggleCart,
} from '../stores/cart';

export default function CartIcon() {
  const count = useStore($cartCount);
  const isOpen = useStore($isCartOpen);

  // Initialize cart from localStorage on mount
  useEffect(() => {
    initializeCart();
  }, []);

  return (
    <button
      type="button"
      onClick={toggleCart}
      aria-label={`Open cart${count > 0 ? `, ${count} items` : ''}`}
      aria-expanded={isOpen}
      className="relative p-2 text-text-secondary hover:text-text transition-colors duration-normal"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth="1.5"
        stroke="currentColor"
        className="w-6 h-6"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
        />
      </svg>
      {/* Cart count badge */}
      {count > 0 && (
        <span className="absolute -top-1 -right-1 w-5 h-5 bg-accent text-text-inverse text-xs font-medium rounded-full flex items-center justify-center">
          {count > 9 ? '9+' : count}
        </span>
      )}
    </button>
  );
}
