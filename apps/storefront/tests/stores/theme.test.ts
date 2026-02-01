import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  $themePreference,
  $activeTheme,
  $isDarkMode,
  initializeTheme,
  setTheme,
  toggleTheme,
  getThemePreference,
  getActiveTheme,
} from '../../src/stores/theme';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get store() {
      return store;
    },
  };
})();

// Mock matchMedia
const matchMediaMock = vi.fn((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
}));

// Set up global mocks
Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
});

Object.defineProperty(global, 'window', {
  value: {
    matchMedia: matchMediaMock,
  },
  writable: true,
});

// Mock document for theme application
const mockDocumentElement = {
  classList: {
    add: vi.fn(),
    remove: vi.fn(),
  },
  setAttribute: vi.fn(),
};

Object.defineProperty(global, 'document', {
  value: {
    documentElement: mockDocumentElement,
    querySelector: vi.fn(() => ({
      setAttribute: vi.fn(),
    })),
  },
  writable: true,
});

describe('Theme Store', () => {
  beforeEach(() => {
    // Reset theme state before each test
    $themePreference.set('system');
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('setTheme', () => {
    it('sets theme preference to light', () => {
      setTheme('light');
      expect($themePreference.get()).toBe('light');
    });

    it('sets theme preference to dark', () => {
      setTheme('dark');
      expect($themePreference.get()).toBe('dark');
    });

    it('sets theme preference to system', () => {
      setTheme('dark'); // First set to something else
      setTheme('system');
      expect($themePreference.get()).toBe('system');
    });

    it('saves theme preference to localStorage', () => {
      setTheme('dark');
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'dear-margeaux-theme',
        'dark'
      );
    });
  });

  describe('toggleTheme', () => {
    it('toggles from light to dark', () => {
      setTheme('light');
      toggleTheme();
      expect($themePreference.get()).toBe('dark');
    });

    it('toggles from dark to light', () => {
      setTheme('dark');
      toggleTheme();
      expect($themePreference.get()).toBe('light');
    });

    it('toggles from system (light) to dark', () => {
      // System preference is light (matchMedia returns matches: false)
      setTheme('system');
      toggleTheme();
      expect($themePreference.get()).toBe('dark');
    });
  });

  describe('$activeTheme (computed)', () => {
    it('returns light when preference is light', () => {
      setTheme('light');
      expect($activeTheme.get()).toBe('light');
    });

    it('returns dark when preference is dark', () => {
      setTheme('dark');
      expect($activeTheme.get()).toBe('dark');
    });

    it('returns light when system preference is light', () => {
      matchMediaMock.mockReturnValue({
        matches: false, // Light mode
        media: '(prefers-color-scheme: dark)',
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      });
      setTheme('system');
      expect($activeTheme.get()).toBe('light');
    });

    it('respects system preference when set to system', () => {
      // This test verifies the system preference logic is in place
      // The actual matchMedia behavior is tested in integration tests
      // When preference is 'system' and matchMedia returns false (light), theme should be light
      setTheme('system');
      // With our mock (matches: false), this should return light
      expect($activeTheme.get()).toBe('light');
    });
  });

  describe('$isDarkMode (computed)', () => {
    it('returns true when theme is dark', () => {
      setTheme('dark');
      expect($isDarkMode.get()).toBe(true);
    });

    it('returns false when theme is light', () => {
      setTheme('light');
      expect($isDarkMode.get()).toBe(false);
    });
  });

  describe('initializeTheme', () => {
    it('loads theme from localStorage', () => {
      localStorageMock.getItem.mockReturnValue('dark');
      initializeTheme();
      expect($themePreference.get()).toBe('dark');
    });

    it('defaults to system when no localStorage value', () => {
      localStorageMock.getItem.mockReturnValue(null);
      initializeTheme();
      expect($themePreference.get()).toBe('system');
    });

    it('handles invalid localStorage value gracefully', () => {
      localStorageMock.getItem.mockReturnValue('invalid-value');
      initializeTheme();
      // Should remain at default 'system'
      expect($themePreference.get()).toBe('system');
    });
  });

  describe('getThemePreference', () => {
    it('returns current preference', () => {
      setTheme('dark');
      expect(getThemePreference()).toBe('dark');
    });
  });

  describe('getActiveTheme', () => {
    it('returns current active theme', () => {
      setTheme('dark');
      expect(getActiveTheme()).toBe('dark');
    });
  });

  describe('localStorage persistence', () => {
    it('theme preference persists to localStorage', () => {
      setTheme('dark');
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'dear-margeaux-theme',
        'dark'
      );
    });

    it('theme loads from localStorage on init', () => {
      localStorageMock.getItem.mockReturnValue('dark');
      initializeTheme();
      expect($themePreference.get()).toBe('dark');
    });
  });

  describe('CSS class changes', () => {
    it('initializeTheme applies dark class when theme is dark', () => {
      localStorageMock.getItem.mockReturnValue('dark');
      initializeTheme();
      expect(mockDocumentElement.classList.add).toHaveBeenCalledWith('dark');
    });

    it('initializeTheme removes dark class when theme is light', () => {
      localStorageMock.getItem.mockReturnValue('light');
      initializeTheme();
      expect(mockDocumentElement.classList.remove).toHaveBeenCalledWith('dark');
    });
  });
});
