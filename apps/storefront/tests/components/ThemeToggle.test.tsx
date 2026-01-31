import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { atom } from 'nanostores';

// Mock the theme store module - must be before any imports that use it
vi.mock('../../src/stores/theme', async () => {
  const nanostores = await import('nanostores');
  const activeTheme = nanostores.atom('light');
  const themePreference = nanostores.atom('system');

  return {
    $activeTheme: activeTheme,
    $themePreference: themePreference,
    initializeTheme: vi.fn(),
    toggleTheme: vi.fn(),
  };
});

// Import after mocking
import ThemeToggle from '../../src/components/ThemeToggle';
import { $activeTheme, toggleTheme } from '../../src/stores/theme';

// Helper to set theme in tests (casting to bypass ReadableAtom type)
function setActiveTheme(theme: 'light' | 'dark') {
  ($activeTheme as ReturnType<typeof atom<'light' | 'dark'>>).set(theme);
}

describe('ThemeToggle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setActiveTheme('light');
  });

  describe('rendering', () => {
    it('renders a button', () => {
      render(<ThemeToggle />);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('has correct aria-label for light mode', () => {
      setActiveTheme('light');
      render(<ThemeToggle />);
      expect(screen.getByLabelText('Switch to dark mode')).toBeInTheDocument();
    });

    it('has correct aria-label for dark mode', () => {
      setActiveTheme('dark');
      render(<ThemeToggle />);
      expect(screen.getByLabelText('Switch to light mode')).toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    it('calls toggleTheme when clicked', () => {
      render(<ThemeToggle />);
      const button = screen.getByRole('button');
      fireEvent.click(button);
      expect(toggleTheme).toHaveBeenCalled();
    });
  });

  describe('sizes', () => {
    it('applies small size classes', () => {
      render(<ThemeToggle size="sm" />);
      const button = screen.getByRole('button');
      expect(button.className).toContain('w-8');
      expect(button.className).toContain('h-8');
    });

    it('applies medium size classes', () => {
      render(<ThemeToggle size="md" />);
      const button = screen.getByRole('button');
      expect(button.className).toContain('w-10');
      expect(button.className).toContain('h-10');
    });

    it('applies large size classes', () => {
      render(<ThemeToggle size="lg" />);
      const button = screen.getByRole('button');
      expect(button.className).toContain('w-12');
      expect(button.className).toContain('h-12');
    });
  });

  describe('label display', () => {
    it('does not show label by default', () => {
      setActiveTheme('light');
      render(<ThemeToggle />);
      expect(screen.queryByText('Dark mode')).not.toBeInTheDocument();
    });

    it('shows label when showLabel is true', () => {
      setActiveTheme('light');
      render(<ThemeToggle showLabel />);
      expect(screen.getByText('Dark mode')).toBeInTheDocument();
    });

    it('shows "Light mode" label when in dark mode', () => {
      setActiveTheme('dark');
      render(<ThemeToggle showLabel />);
      expect(screen.getByText('Light mode')).toBeInTheDocument();
    });
  });

  describe('icon display', () => {
    it('shows moon icon when in light mode', () => {
      setActiveTheme('light');
      render(<ThemeToggle />);
      const button = screen.getByRole('button');
      const svg = button.querySelector('svg');
      expect(svg).toBeInTheDocument();
      const path = svg?.querySelector('path');
      expect(path?.getAttribute('d')).toContain('21.752');
    });

    it('shows sun icon when in dark mode', () => {
      setActiveTheme('dark');
      render(<ThemeToggle />);
      const button = screen.getByRole('button');
      const svg = button.querySelector('svg');
      expect(svg).toBeInTheDocument();
      const path = svg?.querySelector('path');
      expect(path?.getAttribute('d')).toContain('12 3v2.25');
    });
  });
});
