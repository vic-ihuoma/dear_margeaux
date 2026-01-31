import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from '@testing-library/react';
import AddressList from '../../src/components/AddressList';

// Mock nanostores/react
vi.mock('@nanostores/react', () => ({
  useStore: vi.fn(),
}));

// Mock auth store
vi.mock('../../src/stores/auth', () => ({
  authState: { get: vi.fn() },
  initializeAuth: vi.fn(),
  getSessionId: vi.fn(() => 'test-session-id'),
}));

// Mock merchant client
const mockGetMyAddresses = vi.fn();
const mockDeleteMyAddress = vi.fn();
const mockSetDefaultAddress = vi.fn();

vi.mock('../../src/lib/merchant', () => ({
  getMerchantClient: () => ({
    getMyAddresses: mockGetMyAddresses,
    deleteMyAddress: mockDeleteMyAddress,
    setDefaultAddress: mockSetDefaultAddress,
  }),
}));

// Import the mocked useStore
import { useStore } from '@nanostores/react';
const mockUseStore = useStore as unknown as ReturnType<typeof vi.fn>;

describe('AddressList', () => {
  const mockAddresses = [
    {
      id: 'addr-1',
      label: 'Home',
      name: 'John Doe',
      company: null,
      line1: '123 Main St',
      line2: 'Apt 4B',
      city: 'New York',
      state: 'NY',
      postal_code: '10001',
      country: 'US',
      phone: '555-1234',
      is_default: true,
    },
    {
      id: 'addr-2',
      label: 'Work',
      name: 'John Doe',
      company: 'Acme Corp',
      line1: '456 Office Blvd',
      line2: null,
      city: 'New York',
      state: 'NY',
      postal_code: '10002',
      country: 'US',
      phone: null,
      is_default: false,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseStore.mockImplementation(() => ({
      isLoading: false,
      session: { id: 'test-session' },
      customer: { email: 'test@example.com' },
    }));
    mockGetMyAddresses.mockResolvedValue({ items: mockAddresses });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('shows loading state initially', () => {
      mockUseStore.mockImplementation(() => ({
        isLoading: true,
        session: null,
        customer: null,
      }));

      render(<AddressList />);

      expect(screen.getByText('Saved Addresses')).toBeInTheDocument();
      // Check for skeleton loading
      expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
    });

    it('displays addresses when loaded', async () => {
      render(<AddressList />);

      await waitFor(() => {
        expect(screen.getByText('123 Main St')).toBeInTheDocument();
      });

      expect(screen.getByText('456 Office Blvd')).toBeInTheDocument();
      expect(screen.getByText('Home')).toBeInTheDocument();
      expect(screen.getByText('Work')).toBeInTheDocument();
    });

    it('shows default badge on default address', async () => {
      render(<AddressList />);

      await waitFor(() => {
        expect(screen.getByText('Default')).toBeInTheDocument();
      });
    });

    it('shows empty state when no addresses exist', async () => {
      mockGetMyAddresses.mockResolvedValue({ items: [] });

      render(<AddressList />);

      await waitFor(() => {
        expect(screen.getByText('No saved addresses')).toBeInTheDocument();
      });

      expect(
        screen.getByText('Add an address to make checkout faster.')
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Add your first address' })
      ).toBeInTheDocument();
    });

    it('shows error state when fetch fails', async () => {
      mockGetMyAddresses.mockRejectedValue(new Error('Network error'));

      render(<AddressList />);

      await waitFor(() => {
        expect(
          screen.getByText('Unable to load addresses. Please try again.')
        ).toBeInTheDocument();
      });

      expect(screen.getByText('Try again')).toBeInTheDocument();
    });
  });

  describe('address actions', () => {
    it('shows Add Address button when addresses exist', async () => {
      render(<AddressList />);

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /Add Address/i })
        ).toBeInTheDocument();
      });
    });

    it('shows Edit button for each address', async () => {
      render(<AddressList />);

      await waitFor(() => {
        expect(screen.getAllByText('Edit')).toHaveLength(2);
      });
    });

    it('shows Delete button for each address', async () => {
      render(<AddressList />);

      await waitFor(() => {
        expect(screen.getAllByText('Delete')).toHaveLength(2);
      });
    });

    it('shows Set as default button only for non-default addresses', async () => {
      render(<AddressList />);

      await waitFor(() => {
        // Only one "Set as default" button (for the non-default address)
        expect(screen.getAllByText('Set as default')).toHaveLength(1);
      });
    });
  });

  describe('delete address', () => {
    it('calls delete API when confirmed', async () => {
      // Mock window.confirm
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
      mockDeleteMyAddress.mockResolvedValue({ success: true });

      render(<AddressList />);

      await waitFor(() => {
        expect(screen.getByText('123 Main St')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByText('Delete');

      await act(async () => {
        fireEvent.click(deleteButtons[0]);
      });

      expect(confirmSpy).toHaveBeenCalledWith(
        'Are you sure you want to delete this address?'
      );
      expect(mockDeleteMyAddress).toHaveBeenCalledWith(
        'test-session-id',
        'addr-1'
      );

      confirmSpy.mockRestore();
    });

    it('does not call delete API when cancelled', async () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

      render(<AddressList />);

      await waitFor(() => {
        expect(screen.getByText('123 Main St')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByText('Delete');

      await act(async () => {
        fireEvent.click(deleteButtons[0]);
      });

      expect(mockDeleteMyAddress).not.toHaveBeenCalled();

      confirmSpy.mockRestore();
    });
  });

  describe('set default address', () => {
    it('calls setDefaultAddress API when clicking Set as default', async () => {
      mockSetDefaultAddress.mockResolvedValue({
        ...mockAddresses[1],
        is_default: true,
      });

      render(<AddressList />);

      await waitFor(() => {
        expect(screen.getByText('Set as default')).toBeInTheDocument();
      });

      await act(async () => {
        fireEvent.click(screen.getByText('Set as default'));
      });

      expect(mockSetDefaultAddress).toHaveBeenCalledWith(
        'test-session-id',
        'addr-2'
      );
    });
  });

  describe('address display', () => {
    it('displays full address details including company', async () => {
      render(<AddressList />);

      await waitFor(() => {
        expect(screen.getByText('Acme Corp')).toBeInTheDocument();
      });
    });

    it('displays phone number when present', async () => {
      render(<AddressList />);

      await waitFor(() => {
        expect(screen.getByText('555-1234')).toBeInTheDocument();
      });
    });

    it('displays city, state and postal code', async () => {
      render(<AddressList />);

      await waitFor(() => {
        expect(screen.getByText(/New York.*NY.*10001/)).toBeInTheDocument();
      });
    });
  });
});
