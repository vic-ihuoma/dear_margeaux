import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from '@testing-library/react';
import NewsletterForm from '../../src/components/NewsletterForm';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('NewsletterForm', () => {
  const defaultProps = {
    apiUrl: 'https://api.example.com',
    apiKey: 'test-api-key',
  };

  beforeEach(() => {
    mockFetch.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders email input and submit button', () => {
      render(<NewsletterForm {...defaultProps} />);

      expect(
        screen.getByPlaceholderText('Enter your email')
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Subscribe' })
      ).toBeInTheDocument();
    });

    it('has accessible form labels', () => {
      render(<NewsletterForm {...defaultProps} />);

      const input = screen.getByLabelText('Email address');
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('type', 'email');
    });

    it('has proper form aria-label', () => {
      render(<NewsletterForm {...defaultProps} />);

      // Form elements have implicit 'form' role when they have accessible name
      expect(
        screen.getByRole('form', { name: 'Newsletter subscription' })
      ).toBeInTheDocument();
    });
  });

  describe('email validation', () => {
    it('shows error for empty email', async () => {
      render(<NewsletterForm {...defaultProps} />);

      const submitButton = screen.getByRole('button', { name: 'Subscribe' });

      await act(async () => {
        fireEvent.click(submitButton);
      });

      expect(screen.getByRole('alert')).toHaveTextContent(
        'Please enter your email address'
      );
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('shows error for invalid email format', async () => {
      render(<NewsletterForm {...defaultProps} />);

      const input = screen.getByPlaceholderText('Enter your email');
      const form = input.closest('form')!;

      // Use an email without @ to test our custom validation
      fireEvent.change(input, { target: { value: 'invalidemail' } });

      // Submit the form directly
      await act(async () => {
        fireEvent.submit(form);
      });

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(
          'Please enter a valid email address'
        );
      });
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('accepts valid email format', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      render(<NewsletterForm {...defaultProps} />);

      const input = screen.getByPlaceholderText('Enter your email');
      fireEvent.change(input, { target: { value: 'test@example.com' } });

      const submitButton = screen.getByRole('button', { name: 'Subscribe' });

      await act(async () => {
        fireEvent.click(submitButton);
      });

      expect(mockFetch).toHaveBeenCalled();
    });

    it('clears error message when user types', async () => {
      render(<NewsletterForm {...defaultProps} />);

      // Trigger an error first
      const submitButton = screen.getByRole('button', { name: 'Subscribe' });

      await act(async () => {
        fireEvent.click(submitButton);
      });

      expect(screen.getByRole('alert')).toBeInTheDocument();

      // Start typing
      const input = screen.getByPlaceholderText('Enter your email');
      fireEvent.change(input, { target: { value: 't' } });

      // Error should be cleared
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  describe('form submission', () => {
    it('sends request to correct newsletter endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      render(<NewsletterForm {...defaultProps} />);

      const input = screen.getByPlaceholderText('Enter your email');
      fireEvent.change(input, { target: { value: 'test@example.com' } });

      const submitButton = screen.getByRole('button', { name: 'Subscribe' });

      await act(async () => {
        fireEvent.click(submitButton);
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/v1/newsletter/subscribe',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-api-key',
          },
        })
      );
    });

    it('normalizes email to lowercase', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      render(<NewsletterForm {...defaultProps} />);

      const input = screen.getByPlaceholderText('Enter your email');
      fireEvent.change(input, { target: { value: 'TEST@EXAMPLE.COM' } });

      const submitButton = screen.getByRole('button', { name: 'Subscribe' });

      await act(async () => {
        fireEvent.click(submitButton);
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({ email: 'test@example.com' }),
        })
      );
    });

    it('trims whitespace from email', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      render(<NewsletterForm {...defaultProps} />);

      const input = screen.getByPlaceholderText('Enter your email');
      fireEvent.change(input, { target: { value: '  test@example.com  ' } });

      const submitButton = screen.getByRole('button', { name: 'Subscribe' });

      await act(async () => {
        fireEvent.click(submitButton);
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({ email: 'test@example.com' }),
        })
      );
    });
  });

  describe('loading state', () => {
    it('shows loading spinner during submission', async () => {
      let resolvePromise: (value: unknown) => void;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      mockFetch.mockReturnValueOnce(promise);

      render(<NewsletterForm {...defaultProps} />);

      const input = screen.getByPlaceholderText('Enter your email');
      fireEvent.change(input, { target: { value: 'test@example.com' } });

      const submitButton = screen.getByRole('button', { name: 'Subscribe' });

      act(() => {
        fireEvent.click(submitButton);
      });

      // Check for loading state
      await waitFor(() => {
        expect(screen.getByText('Subscribing...')).toBeInTheDocument();
      });
      expect(submitButton).toBeDisabled();
      expect(input).toBeDisabled();

      // Resolve the promise
      await act(async () => {
        resolvePromise!({ ok: true, json: async () => ({ success: true }) });
      });
    });

    it('disables form during submission', async () => {
      let resolvePromise: (value: unknown) => void;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      mockFetch.mockReturnValueOnce(promise);

      render(<NewsletterForm {...defaultProps} />);

      const input = screen.getByPlaceholderText('Enter your email');
      fireEvent.change(input, { target: { value: 'test@example.com' } });

      const submitButton = screen.getByRole('button', { name: 'Subscribe' });

      act(() => {
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(submitButton).toBeDisabled();
        expect(input).toBeDisabled();
      });

      // Resolve
      await act(async () => {
        resolvePromise!({ ok: true, json: async () => ({ success: true }) });
      });
    });
  });

  describe('success state', () => {
    it('shows success message on successful submission', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      render(<NewsletterForm {...defaultProps} />);

      const input = screen.getByPlaceholderText('Enter your email');
      fireEvent.change(input, { target: { value: 'test@example.com' } });

      const submitButton = screen.getByRole('button', { name: 'Subscribe' });

      await act(async () => {
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(
          screen.getByText('Check your email to confirm your subscription')
        ).toBeInTheDocument();
      });
    });

    it('success message has proper accessibility attributes', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      render(<NewsletterForm {...defaultProps} />);

      const input = screen.getByPlaceholderText('Enter your email');
      fireEvent.change(input, { target: { value: 'test@example.com' } });

      const submitButton = screen.getByRole('button', { name: 'Subscribe' });

      await act(async () => {
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        const successMessage = screen.getByRole('status');
        expect(successMessage).toHaveAttribute('aria-live', 'polite');
      });
    });
  });

  describe('error handling', () => {
    it('shows error message on API error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: { message: 'Rate limit exceeded' } }),
      });

      render(<NewsletterForm {...defaultProps} />);

      const input = screen.getByPlaceholderText('Enter your email');
      fireEvent.change(input, { target: { value: 'test@example.com' } });

      const submitButton = screen.getByRole('button', { name: 'Subscribe' });

      await act(async () => {
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(
          'Rate limit exceeded'
        );
      });
    });

    it('shows generic error message when API returns no message', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({}),
      });

      render(<NewsletterForm {...defaultProps} />);

      const input = screen.getByPlaceholderText('Enter your email');
      fireEvent.change(input, { target: { value: 'test@example.com' } });

      const submitButton = screen.getByRole('button', { name: 'Subscribe' });

      await act(async () => {
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(
          'Something went wrong. Please try again.'
        );
      });
    });

    it('shows network error message on fetch failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      render(<NewsletterForm {...defaultProps} />);

      const input = screen.getByPlaceholderText('Enter your email');
      fireEvent.change(input, { target: { value: 'test@example.com' } });

      const submitButton = screen.getByRole('button', { name: 'Subscribe' });

      await act(async () => {
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(
          'Unable to connect. Please try again later.'
        );
      });
    });

    it('sets aria-invalid on input when there is an error', async () => {
      render(<NewsletterForm {...defaultProps} />);

      const submitButton = screen.getByRole('button', { name: 'Subscribe' });

      await act(async () => {
        fireEvent.click(submitButton);
      });

      const input = screen.getByPlaceholderText('Enter your email');
      expect(input).toHaveAttribute('aria-invalid', 'true');
    });

    it('links error message to input via aria-describedby', async () => {
      render(<NewsletterForm {...defaultProps} />);

      const submitButton = screen.getByRole('button', { name: 'Subscribe' });

      await act(async () => {
        fireEvent.click(submitButton);
      });

      const input = screen.getByPlaceholderText('Enter your email');
      expect(input).toHaveAttribute('aria-describedby', 'newsletter-error');

      const errorMessage = screen.getByRole('alert');
      expect(errorMessage).toHaveAttribute('id', 'newsletter-error');
    });
  });

  describe('keyboard interaction', () => {
    it('submits form on Enter key press in input', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      render(<NewsletterForm {...defaultProps} />);

      const input = screen.getByPlaceholderText('Enter your email');
      fireEvent.change(input, { target: { value: 'test@example.com' } });

      await act(async () => {
        fireEvent.submit(input.closest('form')!);
      });

      expect(mockFetch).toHaveBeenCalled();
    });
  });
});
