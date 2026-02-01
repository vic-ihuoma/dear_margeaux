import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from '@testing-library/react';
import CartDrawer from '../../src/components/CartDrawer';
import * as cartStore from '../../src/stores/cart';

// Mock nanostores
vi.mock('@nanostores/react', () => ({
  useStore: vi.fn(),
}));

// Get the mocked useStore
import { useStore } from '@nanostores/react';
const mockUseStore = vi.mocked(useStore);

// Mock MerchantClient and store the mocks
const mockCreateCart = vi.fn();
const mockAddToCart = vi.fn();
const mockApplyDiscount = vi.fn();
const mockCheckout = vi.fn();

vi.mock('@dear-margeaux/api', () => ({
  MerchantClient: vi.fn().mockImplementation(() => ({
    createCart: mockCreateCart,
    addToCart: mockAddToCart,
    applyDiscount: mockApplyDiscount,
    checkout: mockCheckout,
  })),
}));

describe('CartDrawer', () => {
  const mockCartItem = {
    variantId: 'variant_1',
    sku: 'SKU001',
    title: 'Test Product',
    variantTitle: 'Size M',
    price: 5000, // $50.00 in cents
    quantity: 2,
    imageUrl: 'https://example.com/image.jpg',
  };

  const mockCartItems = [mockCartItem];

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock import.meta.env
    vi.stubEnv('PUBLIC_MERCHANT_API_URL', 'https://api.example.com');
    vi.stubEnv('PUBLIC_MERCHANT_API_KEY', 'test-api-key');

    // Default store values for cart with items and drawer open
    mockUseStore.mockImplementation((atom) => {
      if (atom === cartStore.$cartItems) return mockCartItems;
      if (atom === cartStore.$cartSubtotal) return 10000; // $100.00
      if (atom === cartStore.$isCartEmpty) return false;
      if (atom === cartStore.$isCartOpen) return true;
      if (atom === cartStore.$currency) return 'USD';
      return null;
    });

    // Default mock responses
    mockCreateCart.mockResolvedValue({ id: 'cart_123' });
    mockAddToCart.mockResolvedValue({ id: 'cart_123' });
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  describe('discount code input', () => {
    it('renders discount code input field when cart has items', () => {
      render(<CartDrawer />);

      expect(screen.getByPlaceholderText('Discount code')).toBeInTheDocument();
    });

    it('renders Apply button', () => {
      render(<CartDrawer />);

      expect(screen.getByRole('button', { name: 'Apply' })).toBeInTheDocument();
    });

    it('converts input to uppercase automatically', () => {
      render(<CartDrawer />);

      const input = screen.getByPlaceholderText('Discount code');
      fireEvent.change(input, { target: { value: 'save10' } });

      expect(input).toHaveValue('SAVE10');
    });

    it('disables Apply button when input is empty', () => {
      render(<CartDrawer />);

      const applyButton = screen.getByRole('button', { name: 'Apply' });
      expect(applyButton).toBeDisabled();
    });

    it('enables Apply button when input has value', () => {
      render(<CartDrawer />);

      const input = screen.getByPlaceholderText('Discount code');
      fireEvent.change(input, { target: { value: 'SAVE10' } });

      const applyButton = screen.getByRole('button', { name: 'Apply' });
      expect(applyButton).not.toBeDisabled();
    });
  });

  describe('applying discount code via API', () => {
    it('calls API to validate discount code', async () => {
      mockApplyDiscount.mockResolvedValueOnce({
        discount: {
          code: 'SAVE10',
          type: 'percentage',
          amount_cents: 1000,
        },
        totals: {
          subtotal_cents: 10000,
          discount_cents: 1000,
          shipping_cents: 0,
          tax_cents: 0,
          total_cents: 9000,
        },
      });

      render(<CartDrawer />);

      const input = screen.getByPlaceholderText('Discount code');
      fireEvent.change(input, { target: { value: 'SAVE10' } });

      const applyButton = screen.getByRole('button', { name: 'Apply' });
      await act(async () => {
        fireEvent.click(applyButton);
      });

      await waitFor(() => {
        expect(mockApplyDiscount).toHaveBeenCalledWith('cart_123', 'SAVE10');
      });
    });

    it('stores applied discount in state', async () => {
      mockApplyDiscount.mockResolvedValueOnce({
        discount: {
          code: 'SAVE10',
          type: 'percentage',
          amount_cents: 1000,
        },
        totals: {
          subtotal_cents: 10000,
          discount_cents: 1000,
          shipping_cents: 0,
          tax_cents: 0,
          total_cents: 9000,
        },
      });

      render(<CartDrawer />);

      const input = screen.getByPlaceholderText('Discount code');
      fireEvent.change(input, { target: { value: 'SAVE10' } });

      const applyButton = screen.getByRole('button', { name: 'Apply' });
      await act(async () => {
        fireEvent.click(applyButton);
      });

      // After successful apply, the code should be displayed in the applied state
      await waitFor(() => {
        expect(screen.getByText('SAVE10')).toBeInTheDocument();
      });
    });

    it('clears input after successful apply', async () => {
      mockApplyDiscount.mockResolvedValueOnce({
        discount: {
          code: 'SAVE10',
          type: 'percentage',
          amount_cents: 1000,
        },
        totals: {
          subtotal_cents: 10000,
          discount_cents: 1000,
          shipping_cents: 0,
          tax_cents: 0,
          total_cents: 9000,
        },
      });

      render(<CartDrawer />);

      const input = screen.getByPlaceholderText('Discount code');
      fireEvent.change(input, { target: { value: 'SAVE10' } });

      const applyButton = screen.getByRole('button', { name: 'Apply' });
      await act(async () => {
        fireEvent.click(applyButton);
      });

      await waitFor(() => {
        // Input should be gone (replaced by applied discount view)
        expect(
          screen.queryByPlaceholderText('Discount code')
        ).not.toBeInTheDocument();
      });
    });
  });

  describe('discount calculation', () => {
    it('displays discount amount in cart totals', async () => {
      mockApplyDiscount.mockResolvedValueOnce({
        discount: {
          code: 'SAVE10',
          type: 'percentage',
          amount_cents: 1000,
        },
        totals: {
          subtotal_cents: 10000,
          discount_cents: 1000,
          shipping_cents: 0,
          tax_cents: 0,
          total_cents: 9000,
        },
      });

      render(<CartDrawer />);

      const input = screen.getByPlaceholderText('Discount code');
      fireEvent.change(input, { target: { value: 'SAVE10' } });

      const applyButton = screen.getByRole('button', { name: 'Apply' });
      await act(async () => {
        fireEvent.click(applyButton);
      });

      await waitFor(() => {
        // Check for discount row in totals
        expect(screen.getByText('Discount')).toBeInTheDocument();
      });
    });

    it('calculates total correctly with discount applied', async () => {
      mockApplyDiscount.mockResolvedValueOnce({
        discount: {
          code: 'SAVE10',
          type: 'percentage',
          amount_cents: 1000,
        },
        totals: {
          subtotal_cents: 10000,
          discount_cents: 1000,
          shipping_cents: 0,
          tax_cents: 0,
          total_cents: 9000,
        },
      });

      render(<CartDrawer />);

      const input = screen.getByPlaceholderText('Discount code');
      fireEvent.change(input, { target: { value: 'SAVE10' } });

      const applyButton = screen.getByRole('button', { name: 'Apply' });
      await act(async () => {
        fireEvent.click(applyButton);
      });

      await waitFor(() => {
        // Total should be subtotal - discount = $100 - $10 = $90
        // The total uses font-semibold styling and is in the totals section
        const totalRow = screen.getByText('Total').parentElement;
        expect(totalRow).toHaveTextContent('$90.00');
      });
    });
  });

  describe('removing discount', () => {
    it('shows Remove button when discount is applied', async () => {
      mockApplyDiscount.mockResolvedValueOnce({
        discount: {
          code: 'SAVE10',
          type: 'percentage',
          amount_cents: 1000,
        },
        totals: {
          subtotal_cents: 10000,
          discount_cents: 1000,
          shipping_cents: 0,
          tax_cents: 0,
          total_cents: 9000,
        },
      });

      render(<CartDrawer />);

      const input = screen.getByPlaceholderText('Discount code');
      fireEvent.change(input, { target: { value: 'SAVE10' } });

      const applyButton = screen.getByRole('button', { name: 'Apply' });
      await act(async () => {
        fireEvent.click(applyButton);
      });

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: 'Remove' })
        ).toBeInTheDocument();
      });
    });

    it('clears discount when Remove is clicked', async () => {
      mockApplyDiscount.mockResolvedValueOnce({
        discount: {
          code: 'SAVE10',
          type: 'percentage',
          amount_cents: 1000,
        },
        totals: {
          subtotal_cents: 10000,
          discount_cents: 1000,
          shipping_cents: 0,
          tax_cents: 0,
          total_cents: 9000,
        },
      });

      render(<CartDrawer />);

      const input = screen.getByPlaceholderText('Discount code');
      fireEvent.change(input, { target: { value: 'SAVE10' } });

      const applyButton = screen.getByRole('button', { name: 'Apply' });
      await act(async () => {
        fireEvent.click(applyButton);
      });

      // Wait for discount to be applied
      await waitFor(() => {
        expect(screen.getByText('SAVE10')).toBeInTheDocument();
      });

      // Click remove
      const removeButton = screen.getByRole('button', { name: 'Remove' });
      await act(async () => {
        fireEvent.click(removeButton);
      });

      // Discount code input should reappear
      await waitFor(() => {
        expect(
          screen.getByPlaceholderText('Discount code')
        ).toBeInTheDocument();
      });

      // Discount line should be gone
      expect(screen.queryByText('Discount')).not.toBeInTheDocument();
    });
  });

  describe('error handling', () => {
    it('shows error message for invalid discount code', async () => {
      mockApplyDiscount.mockRejectedValueOnce(
        new Error('Invalid discount code')
      );

      render(<CartDrawer />);

      const input = screen.getByPlaceholderText('Discount code');
      fireEvent.change(input, { target: { value: 'INVALID' } });

      const applyButton = screen.getByRole('button', { name: 'Apply' });
      await act(async () => {
        fireEvent.click(applyButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Invalid discount code')).toBeInTheDocument();
      });
    });

    it('shows error message for expired discount code', async () => {
      mockApplyDiscount.mockRejectedValueOnce(
        new Error('Discount code has expired')
      );

      render(<CartDrawer />);

      const input = screen.getByPlaceholderText('Discount code');
      fireEvent.change(input, { target: { value: 'EXPIRED' } });

      const applyButton = screen.getByRole('button', { name: 'Apply' });
      await act(async () => {
        fireEvent.click(applyButton);
      });

      await waitFor(() => {
        expect(
          screen.getByText('Discount code has expired')
        ).toBeInTheDocument();
      });
    });

    it('shows generic error message when API returns no message', async () => {
      mockApplyDiscount.mockRejectedValueOnce(new Error());

      render(<CartDrawer />);

      const input = screen.getByPlaceholderText('Discount code');
      fireEvent.change(input, { target: { value: 'BROKEN' } });

      const applyButton = screen.getByRole('button', { name: 'Apply' });
      await act(async () => {
        fireEvent.click(applyButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Invalid discount code')).toBeInTheDocument();
      });
    });

    it('shows discounts not available when API is not configured', async () => {
      // Override import.meta.env to have no API config
      vi.stubEnv('PUBLIC_MERCHANT_API_URL', '');
      vi.stubEnv('PUBLIC_MERCHANT_API_KEY', '');

      render(<CartDrawer />);

      const input = screen.getByPlaceholderText('Discount code');
      fireEvent.change(input, { target: { value: 'SAVE10' } });

      const applyButton = screen.getByRole('button', { name: 'Apply' });
      await act(async () => {
        fireEvent.click(applyButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Discounts not available')).toBeInTheDocument();
      });
    });
  });

  describe('loading state', () => {
    it('shows loading state during discount application', async () => {
      let resolvePromise: (value: unknown) => void;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      mockApplyDiscount.mockReturnValueOnce(promise);

      render(<CartDrawer />);

      const input = screen.getByPlaceholderText('Discount code');
      fireEvent.change(input, { target: { value: 'SAVE10' } });

      const applyButton = screen.getByRole('button', { name: 'Apply' });
      act(() => {
        fireEvent.click(applyButton);
      });

      // Button should show loading state
      await waitFor(() => {
        expect(screen.getByRole('button', { name: '...' })).toBeInTheDocument();
      });

      // Input should be disabled
      expect(input).toBeDisabled();

      // Resolve the promise
      await act(async () => {
        resolvePromise!({
          discount: {
            code: 'SAVE10',
            type: 'percentage',
            amount_cents: 1000,
          },
          totals: {
            subtotal_cents: 10000,
            discount_cents: 1000,
            shipping_cents: 0,
            tax_cents: 0,
            total_cents: 9000,
          },
        });
      });
    });

    it('disables input during discount application', async () => {
      let resolvePromise: (value: unknown) => void;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      mockApplyDiscount.mockReturnValueOnce(promise);

      render(<CartDrawer />);

      const input = screen.getByPlaceholderText('Discount code');
      fireEvent.change(input, { target: { value: 'SAVE10' } });

      const applyButton = screen.getByRole('button', { name: 'Apply' });
      act(() => {
        fireEvent.click(applyButton);
      });

      await waitFor(() => {
        expect(input).toBeDisabled();
      });

      // Resolve
      await act(async () => {
        resolvePromise!({
          discount: {
            code: 'SAVE10',
            type: 'percentage',
            amount_cents: 1000,
          },
          totals: {
            subtotal_cents: 10000,
            discount_cents: 1000,
            shipping_cents: 0,
            tax_cents: 0,
            total_cents: 9000,
          },
        });
      });
    });
  });

  describe('empty cart', () => {
    it('does not render discount code input when cart is empty', () => {
      mockUseStore.mockImplementation((atom) => {
        if (atom === cartStore.$cartItems) return [];
        if (atom === cartStore.$cartSubtotal) return 0;
        if (atom === cartStore.$isCartEmpty) return true;
        if (atom === cartStore.$isCartOpen) return true;
        if (atom === cartStore.$currency) return 'USD';
        return null;
      });

      render(<CartDrawer />);

      expect(
        screen.queryByPlaceholderText('Discount code')
      ).not.toBeInTheDocument();
    });
  });

  describe('cart drawer closed', () => {
    it('is not visible when cart is closed', () => {
      mockUseStore.mockImplementation((atom) => {
        if (atom === cartStore.$cartItems) return mockCartItems;
        if (atom === cartStore.$cartSubtotal) return 10000;
        if (atom === cartStore.$isCartEmpty) return false;
        if (atom === cartStore.$isCartOpen) return false;
        if (atom === cartStore.$currency) return 'USD';
        return null;
      });

      render(<CartDrawer />);

      // The drawer should have translate-x-full class when closed
      const drawer = screen.getByRole('dialog', { hidden: true });
      expect(drawer).toHaveClass('translate-x-full');
    });
  });
});
