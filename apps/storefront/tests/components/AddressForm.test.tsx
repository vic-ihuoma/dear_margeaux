import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from '@testing-library/react';
import AddressForm from '../../src/components/AddressForm';

// Mock auth store
vi.mock('../../src/stores/auth', () => ({
  getSessionId: vi.fn(() => 'test-session-id'),
}));

// Mock merchant client
const mockAddMyAddress = vi.fn();
const mockUpdateMyAddress = vi.fn();

vi.mock('../../src/lib/merchant', () => ({
  getMerchantClient: () => ({
    addMyAddress: mockAddMyAddress,
    updateMyAddress: mockUpdateMyAddress,
  }),
}));

describe('AddressForm', () => {
  const mockOnSuccess = vi.fn();
  const mockOnCancel = vi.fn();

  const defaultProps = {
    onSuccess: mockOnSuccess,
    onCancel: mockOnCancel,
  };

  const existingAddress = {
    id: 'addr-1',
    label: 'Home',
    name: 'John Doe',
    company: 'Acme Corp',
    line1: '123 Main St',
    line2: 'Apt 4B',
    city: 'New York',
    state: 'NY',
    postal_code: '10001',
    country: 'US',
    phone: '555-1234',
    is_default: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders all required form fields', () => {
      render(<AddressForm {...defaultProps} />);

      expect(screen.getByLabelText(/Full Name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Address Line 1/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/City/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Postal Code/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Country/i)).toBeInTheDocument();
    });

    it('renders optional form fields', () => {
      render(<AddressForm {...defaultProps} />);

      expect(screen.getByLabelText(/Label/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Company/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Address Line 2/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/State/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Phone/i)).toBeInTheDocument();
    });

    it('renders set as default checkbox', () => {
      render(<AddressForm {...defaultProps} />);

      expect(
        screen.getByLabelText(/Set as default address/i)
      ).toBeInTheDocument();
    });

    it('renders Add Address button in create mode', () => {
      render(<AddressForm {...defaultProps} />);

      expect(
        screen.getByRole('button', { name: 'Add Address' })
      ).toBeInTheDocument();
    });

    it('renders Save Changes button in edit mode', () => {
      render(<AddressForm {...defaultProps} address={existingAddress} />);

      expect(
        screen.getByRole('button', { name: 'Save Changes' })
      ).toBeInTheDocument();
    });

    it('renders Cancel button', () => {
      render(<AddressForm {...defaultProps} />);

      expect(
        screen.getByRole('button', { name: 'Cancel' })
      ).toBeInTheDocument();
    });

    it('pre-fills form when editing existing address', () => {
      render(<AddressForm {...defaultProps} address={existingAddress} />);

      expect(screen.getByLabelText(/Full Name/i)).toHaveValue('John Doe');
      expect(screen.getByLabelText(/Address Line 1/i)).toHaveValue(
        '123 Main St'
      );
      expect(screen.getByLabelText(/City/i)).toHaveValue('New York');
      expect(screen.getByLabelText(/Postal Code/i)).toHaveValue('10001');
      expect(screen.getByLabelText(/Label/i)).toHaveValue('Home');
      expect(screen.getByLabelText(/Company/i)).toHaveValue('Acme Corp');
    });
  });

  describe('form validation', () => {
    it('shows error for empty name field', async () => {
      render(<AddressForm {...defaultProps} />);

      const submitButton = screen.getByRole('button', { name: 'Add Address' });

      await act(async () => {
        fireEvent.click(submitButton);
      });

      expect(screen.getByText('Name is required')).toBeInTheDocument();
      expect(mockAddMyAddress).not.toHaveBeenCalled();
    });

    it('shows error for empty line1 field', async () => {
      render(<AddressForm {...defaultProps} />);

      fireEvent.change(screen.getByLabelText(/Full Name/i), {
        target: { value: 'John Doe' },
      });

      const submitButton = screen.getByRole('button', { name: 'Add Address' });

      await act(async () => {
        fireEvent.click(submitButton);
      });

      expect(
        screen.getByText('Address line 1 is required')
      ).toBeInTheDocument();
    });

    it('shows error for empty city field', async () => {
      render(<AddressForm {...defaultProps} />);

      fireEvent.change(screen.getByLabelText(/Full Name/i), {
        target: { value: 'John Doe' },
      });
      fireEvent.change(screen.getByLabelText(/Address Line 1/i), {
        target: { value: '123 Main St' },
      });

      const submitButton = screen.getByRole('button', { name: 'Add Address' });

      await act(async () => {
        fireEvent.click(submitButton);
      });

      expect(screen.getByText('City is required')).toBeInTheDocument();
    });

    it('shows error for empty postal_code field', async () => {
      render(<AddressForm {...defaultProps} />);

      fireEvent.change(screen.getByLabelText(/Full Name/i), {
        target: { value: 'John Doe' },
      });
      fireEvent.change(screen.getByLabelText(/Address Line 1/i), {
        target: { value: '123 Main St' },
      });
      fireEvent.change(screen.getByLabelText(/City/i), {
        target: { value: 'New York' },
      });

      const submitButton = screen.getByRole('button', { name: 'Add Address' });

      await act(async () => {
        fireEvent.click(submitButton);
      });

      expect(screen.getByText('Postal code is required')).toBeInTheDocument();
    });

    it('clears error when user types in field', async () => {
      render(<AddressForm {...defaultProps} />);

      const submitButton = screen.getByRole('button', { name: 'Add Address' });

      await act(async () => {
        fireEvent.click(submitButton);
      });

      expect(screen.getByText('Name is required')).toBeInTheDocument();

      fireEvent.change(screen.getByLabelText(/Full Name/i), {
        target: { value: 'J' },
      });

      expect(screen.queryByText('Name is required')).not.toBeInTheDocument();
    });

    it('sets aria-invalid on fields with errors', async () => {
      render(<AddressForm {...defaultProps} />);

      const submitButton = screen.getByRole('button', { name: 'Add Address' });

      await act(async () => {
        fireEvent.click(submitButton);
      });

      expect(screen.getByLabelText(/Full Name/i)).toHaveAttribute(
        'aria-invalid',
        'true'
      );
    });
  });

  describe('form submission', () => {
    const validFormData = {
      name: 'John Doe',
      line1: '123 Main St',
      city: 'New York',
      state: 'NY',
      postal_code: '10001',
      country: 'US',
    };

    const fillForm = () => {
      fireEvent.change(screen.getByLabelText(/Full Name/i), {
        target: { value: validFormData.name },
      });
      fireEvent.change(screen.getByLabelText(/Address Line 1/i), {
        target: { value: validFormData.line1 },
      });
      fireEvent.change(screen.getByLabelText(/City/i), {
        target: { value: validFormData.city },
      });
      fireEvent.change(screen.getByLabelText(/State/i), {
        target: { value: validFormData.state },
      });
      fireEvent.change(screen.getByLabelText(/Postal Code/i), {
        target: { value: validFormData.postal_code },
      });
    };

    it('calls addMyAddress when creating new address', async () => {
      const newAddress = {
        id: 'new-addr',
        ...validFormData,
        is_default: false,
      };
      mockAddMyAddress.mockResolvedValue(newAddress);

      render(<AddressForm {...defaultProps} />);

      fillForm();

      const submitButton = screen.getByRole('button', { name: 'Add Address' });

      await act(async () => {
        fireEvent.click(submitButton);
      });

      expect(mockAddMyAddress).toHaveBeenCalledWith('test-session-id', {
        name: 'John Doe',
        line1: '123 Main St',
        city: 'New York',
        state: 'NY',
        postal_code: '10001',
        country: 'US',
        is_default: false,
      });
    });

    it('calls updateMyAddress when editing existing address', async () => {
      mockUpdateMyAddress.mockResolvedValue(existingAddress);

      render(<AddressForm {...defaultProps} address={existingAddress} />);

      // Change a field
      fireEvent.change(screen.getByLabelText(/Full Name/i), {
        target: { value: 'Jane Doe' },
      });

      const submitButton = screen.getByRole('button', {
        name: 'Save Changes',
      });

      await act(async () => {
        fireEvent.click(submitButton);
      });

      expect(mockUpdateMyAddress).toHaveBeenCalledWith(
        'test-session-id',
        'addr-1',
        expect.objectContaining({
          name: 'Jane Doe',
        })
      );
    });

    it('calls onSuccess with new address after creation', async () => {
      const newAddress = {
        id: 'new-addr',
        ...validFormData,
        is_default: false,
        label: null,
        company: null,
        line2: null,
        phone: null,
      };
      mockAddMyAddress.mockResolvedValue(newAddress);

      render(<AddressForm {...defaultProps} />);

      fillForm();

      const submitButton = screen.getByRole('button', { name: 'Add Address' });

      await act(async () => {
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalledWith(newAddress);
      });
    });

    it('includes is_default when checkbox is checked', async () => {
      const newAddress = { id: 'new-addr', ...validFormData, is_default: true };
      mockAddMyAddress.mockResolvedValue(newAddress);

      render(<AddressForm {...defaultProps} />);

      fillForm();

      fireEvent.click(screen.getByLabelText(/Set as default address/i));

      const submitButton = screen.getByRole('button', { name: 'Add Address' });

      await act(async () => {
        fireEvent.click(submitButton);
      });

      expect(mockAddMyAddress).toHaveBeenCalledWith(
        'test-session-id',
        expect.objectContaining({
          is_default: true,
        })
      );
    });

    it('shows loading state during submission', async () => {
      let resolvePromise: (value: unknown) => void;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      mockAddMyAddress.mockReturnValueOnce(promise);

      render(<AddressForm {...defaultProps} />);

      // Fill required fields
      fireEvent.change(screen.getByLabelText(/Full Name/i), {
        target: { value: 'John Doe' },
      });
      fireEvent.change(screen.getByLabelText(/Address Line 1/i), {
        target: { value: '123 Main St' },
      });
      fireEvent.change(screen.getByLabelText(/City/i), {
        target: { value: 'New York' },
      });
      fireEvent.change(screen.getByLabelText(/Postal Code/i), {
        target: { value: '10001' },
      });

      const submitButton = screen.getByRole('button', { name: 'Add Address' });

      act(() => {
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Saving...')).toBeInTheDocument();
      });

      expect(submitButton).toBeDisabled();

      await act(async () => {
        resolvePromise!({ id: 'new-addr' });
      });
    });

    it('shows error message on API failure', async () => {
      mockAddMyAddress.mockRejectedValue(new Error('Network error'));

      render(<AddressForm {...defaultProps} />);

      // Fill required fields
      fireEvent.change(screen.getByLabelText(/Full Name/i), {
        target: { value: 'John Doe' },
      });
      fireEvent.change(screen.getByLabelText(/Address Line 1/i), {
        target: { value: '123 Main St' },
      });
      fireEvent.change(screen.getByLabelText(/City/i), {
        target: { value: 'New York' },
      });
      fireEvent.change(screen.getByLabelText(/Postal Code/i), {
        target: { value: '10001' },
      });

      const submitButton = screen.getByRole('button', { name: 'Add Address' });

      await act(async () => {
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(
          screen.getByText('Unable to save address. Please try again.')
        ).toBeInTheDocument();
      });
    });
  });

  describe('cancel button', () => {
    it('calls onCancel when clicked', async () => {
      render(<AddressForm {...defaultProps} />);

      const cancelButton = screen.getByRole('button', { name: 'Cancel' });

      await act(async () => {
        fireEvent.click(cancelButton);
      });

      expect(mockOnCancel).toHaveBeenCalled();
    });
  });

  describe('accessibility', () => {
    it('has proper form aria-label in create mode', () => {
      render(<AddressForm {...defaultProps} />);

      expect(
        screen.getByRole('form', { name: 'Add address form' })
      ).toBeInTheDocument();
    });

    it('has proper form aria-label in edit mode', () => {
      render(<AddressForm {...defaultProps} address={existingAddress} />);

      expect(
        screen.getByRole('form', { name: 'Edit address form' })
      ).toBeInTheDocument();
    });

    it('has proper aria-describedby for error messages', async () => {
      render(<AddressForm {...defaultProps} />);

      const submitButton = screen.getByRole('button', { name: 'Add Address' });

      await act(async () => {
        fireEvent.click(submitButton);
      });

      const nameInput = screen.getByLabelText(/Full Name/i);
      expect(nameInput).toHaveAttribute('aria-describedby', 'name-error');
    });
  });
});
