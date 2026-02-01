import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from '@testing-library/react';
import ShareButtons from '../../src/components/ShareButtons';

// Mock clipboard API
const mockWriteText = vi.fn();
Object.assign(navigator, {
  clipboard: {
    writeText: mockWriteText,
  },
});

describe('ShareButtons', () => {
  const defaultProps = {
    url: 'https://dearmargeaux.com/product/test-product',
    title: 'Vintage Leather Tote',
    description: 'A beautiful handcrafted leather tote',
  };

  beforeEach(() => {
    mockWriteText.mockClear();
    mockWriteText.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('URL generation', () => {
    it('generates correct Twitter share URL', () => {
      render(<ShareButtons {...defaultProps} />);

      const twitterLink = screen.getByRole('link', {
        name: /share on twitter/i,
      });
      const href = twitterLink.getAttribute('href');

      expect(href).toContain('https://twitter.com/intent/tweet');
      expect(href).toContain(encodeURIComponent(defaultProps.url));
      expect(href).toContain(encodeURIComponent(defaultProps.title));
    });

    it('generates correct Facebook share URL', () => {
      render(<ShareButtons {...defaultProps} />);

      const facebookLink = screen.getByRole('link', {
        name: /share on facebook/i,
      });
      const href = facebookLink.getAttribute('href');

      expect(href).toContain('https://www.facebook.com/sharer/sharer.php');
      expect(href).toContain(encodeURIComponent(defaultProps.url));
    });

    it('generates correct Pinterest pin URL with image', () => {
      const propsWithImage = {
        ...defaultProps,
        imageUrl: 'https://dearmargeaux.com/images/tote.jpg',
      };

      render(<ShareButtons {...propsWithImage} />);

      const pinterestLink = screen.getByRole('link', {
        name: /pin on pinterest/i,
      });
      const href = pinterestLink.getAttribute('href');

      expect(href).toContain('https://pinterest.com/pin/create/button/');
      expect(href).toContain(encodeURIComponent(propsWithImage.url));
      expect(href).toContain(encodeURIComponent(propsWithImage.imageUrl));
      expect(href).toContain(encodeURIComponent(propsWithImage.description));
    });

    it('excludes Pinterest button when no image is provided', () => {
      render(<ShareButtons {...defaultProps} />);

      const pinterestLink = screen.queryByRole('link', {
        name: /pin on pinterest/i,
      });
      expect(pinterestLink).not.toBeInTheDocument();
    });
  });

  describe('copy link functionality', () => {
    it('copies URL to clipboard when copy link is clicked', async () => {
      render(<ShareButtons {...defaultProps} />);

      const copyButton = screen.getByRole('button', { name: /copy link/i });

      await act(async () => {
        fireEvent.click(copyButton);
      });

      expect(mockWriteText).toHaveBeenCalledWith(defaultProps.url);
    });

    it('shows success feedback after copying', async () => {
      render(<ShareButtons {...defaultProps} />);

      const copyButton = screen.getByRole('button', { name: /copy link/i });

      await act(async () => {
        fireEvent.click(copyButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/copied/i)).toBeInTheDocument();
      });
    });

    it('resets success message after timeout', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });

      render(<ShareButtons {...defaultProps} />);

      const copyButton = screen.getByRole('button', { name: /copy link/i });

      // Click to copy
      await act(async () => {
        fireEvent.click(copyButton);
        await Promise.resolve(); // Flush promises
      });

      // Check success message appears
      expect(screen.getByText(/copied/i)).toBeInTheDocument();

      // Advance timer past the 2 second timeout
      await act(async () => {
        vi.advanceTimersByTime(2100);
      });

      // Success message should be gone
      expect(screen.queryByText(/copied/i)).not.toBeInTheDocument();

      vi.useRealTimers();
    });

    it('shows error message when clipboard fails', async () => {
      mockWriteText.mockRejectedValueOnce(new Error('Clipboard error'));

      render(<ShareButtons {...defaultProps} />);

      const copyButton = screen.getByRole('button', { name: /copy link/i });

      await act(async () => {
        fireEvent.click(copyButton);
        // Wait for the rejected promise to resolve
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(screen.getByText(/failed to copy/i)).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('all share links open in new tab', () => {
      const propsWithImage = {
        ...defaultProps,
        imageUrl: 'https://dearmargeaux.com/images/tote.jpg',
      };

      render(<ShareButtons {...propsWithImage} />);

      const links = screen.getAllByRole('link');
      links.forEach((link) => {
        expect(link).toHaveAttribute('target', '_blank');
        expect(link).toHaveAttribute('rel', 'noopener noreferrer');
      });
    });

    it('has accessible button labels', () => {
      const propsWithImage = {
        ...defaultProps,
        imageUrl: 'https://dearmargeaux.com/images/tote.jpg',
      };

      render(<ShareButtons {...propsWithImage} />);

      expect(
        screen.getByRole('link', { name: /share on twitter/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('link', { name: /share on facebook/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('link', { name: /pin on pinterest/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /copy link/i })
      ).toBeInTheDocument();
    });
  });

  describe('rendering variants', () => {
    it('renders in horizontal layout by default', () => {
      render(<ShareButtons {...defaultProps} />);

      const container = screen.getByRole('group');
      expect(container).toHaveClass('flex-row');
    });

    it('renders in vertical layout when specified', () => {
      render(<ShareButtons {...defaultProps} layout="vertical" />);

      const container = screen.getByRole('group');
      expect(container).toHaveClass('flex-col');
    });
  });
});
