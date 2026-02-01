import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AddToCart from '../../src/components/AddToCart';

// Mock the cart store
vi.mock('../../src/stores/cart', () => ({
  addToCart: vi.fn(),
}));

import { addToCart } from '../../src/stores/cart';
const mockAddToCart = vi.mocked(addToCart);

describe('AddToCart', () => {
  const defaultProps = {
    variantId: 'variant-1',
    variantSku: 'SKU-001',
    variantTitle: 'Size M',
    productTitle: 'Test Product',
    price: 5000, // $50.00
    available: true,
    availableQuantity: 10,
    imageUrl: 'https://example.com/image.jpg',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('inventory quantity validation', () => {
    it('limits quantity to available inventory', () => {
      render(<AddToCart {...defaultProps} availableQuantity={3} />);

      const incrementButton = screen.getByLabelText('Increase quantity');
      const input = screen.getByRole('spinbutton');

      // Should start at 1
      expect(input).toHaveValue(1);

      // Click increment to 2
      fireEvent.click(incrementButton);
      expect(input).toHaveValue(2);

      // Click increment to 3
      fireEvent.click(incrementButton);
      expect(input).toHaveValue(3);

      // Should be disabled now (at max)
      expect(incrementButton).toBeDisabled();
    });

    it('disables Add to Cart button when inventory is 0', () => {
      render(
        <AddToCart {...defaultProps} available={false} availableQuantity={0} />
      );

      const addButton = screen.getByRole('button', { name: 'Sold Out' });
      expect(addButton).toBeDisabled();
    });

    it('shows low stock warning when inventory is low (< 5)', () => {
      render(<AddToCart {...defaultProps} availableQuantity={3} />);

      expect(screen.getByText('Only 3 left')).toBeInTheDocument();
    });

    it('does not show low stock warning when inventory is sufficient', () => {
      render(<AddToCart {...defaultProps} availableQuantity={10} />);

      expect(screen.queryByText(/Only \d+ left/)).not.toBeInTheDocument();
    });

    it('does not show low stock warning when sold out', () => {
      render(
        <AddToCart {...defaultProps} available={false} availableQuantity={0} />
      );

      expect(screen.queryByText(/Only \d+ left/)).not.toBeInTheDocument();
    });

    it('caps manual input to available inventory', () => {
      render(<AddToCart {...defaultProps} availableQuantity={5} />);

      const input = screen.getByRole('spinbutton');
      fireEvent.change(input, { target: { value: '10' } });

      // Should be capped at 5
      expect(input).toHaveValue(5);
    });

    it('passes availableQuantity to cart store', () => {
      render(<AddToCart {...defaultProps} availableQuantity={7} />);

      const addButton = screen.getByRole('button', { name: 'Add to Cart' });
      fireEvent.click(addButton);

      expect(mockAddToCart).toHaveBeenCalledWith(
        expect.objectContaining({
          availableQuantity: 7,
        }),
        1
      );
    });
  });

  describe('quantity selector with inventory', () => {
    it('increment button respects inventory limit', () => {
      render(<AddToCart {...defaultProps} availableQuantity={2} />);

      const incrementButton = screen.getByLabelText('Increase quantity');

      // Start at 1, increment to 2
      fireEvent.click(incrementButton);
      expect(screen.getByRole('spinbutton')).toHaveValue(2);

      // Should be disabled at max inventory
      expect(incrementButton).toBeDisabled();
    });

    it('shows correct max attribute on input', () => {
      render(<AddToCart {...defaultProps} availableQuantity={4} />);

      const input = screen.getByRole('spinbutton');
      expect(input).toHaveAttribute('max', '4');
    });

    it('uses 10 as max when inventory exceeds 10', () => {
      render(<AddToCart {...defaultProps} availableQuantity={25} />);

      const input = screen.getByRole('spinbutton');
      expect(input).toHaveAttribute('max', '10');
    });
  });

  describe('basic functionality', () => {
    it('renders price correctly', () => {
      render(<AddToCart {...defaultProps} price={4999} />);

      expect(screen.getByText('$49.99')).toBeInTheDocument();
    });

    it('shows Sold Out when not available', () => {
      render(<AddToCart {...defaultProps} available={false} />);

      // Both the badge and button show "Sold Out"
      const soldOutElements = screen.getAllByText('Sold Out');
      expect(soldOutElements.length).toBeGreaterThanOrEqual(1);
    });

    it('hides quantity selector when sold out', () => {
      render(<AddToCart {...defaultProps} available={false} />);

      expect(
        screen.queryByLabelText('Increase quantity')
      ).not.toBeInTheDocument();
      expect(
        screen.queryByLabelText('Decrease quantity')
      ).not.toBeInTheDocument();
    });

    it('decrement button is disabled at quantity 1', () => {
      render(<AddToCart {...defaultProps} />);

      const decrementButton = screen.getByLabelText('Decrease quantity');
      expect(decrementButton).toBeDisabled();
    });

    it('shows SKU when available', () => {
      render(<AddToCart {...defaultProps} />);

      expect(screen.getByText('SKU: SKU-001')).toBeInTheDocument();
    });
  });
});
