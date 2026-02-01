import { atom, computed } from 'nanostores';

/**
 * Theme type - light or dark
 */
export type Theme = 'light' | 'dark';

/**
 * Theme preference - includes system option
 */
export type ThemePreference = 'light' | 'dark' | 'system';

// Storage key for theme preference
const THEME_STORAGE_KEY = 'dear-margeaux-theme';

/**
 * Theme preference store - what the user has selected (light, dark, or system)
 */
export const $themePreference = atom<ThemePreference>('system');

/**
 * Computed active theme based on preference and system setting
 */
export const $activeTheme = computed($themePreference, (preference) => {
  if (preference !== 'system') {
    return preference;
  }

  // Check system preference
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  }

  return 'light';
});

/**
 * Check if dark mode is active
 */
export const $isDarkMode = computed($activeTheme, (theme) => theme === 'dark');

/**
 * Initialize theme from localStorage and apply to document
 */
export function initializeTheme(): void {
  if (typeof window === 'undefined') return;

  // Load preference from localStorage
  const savedPreference = localStorage.getItem(THEME_STORAGE_KEY);
  if (
    savedPreference === 'light' ||
    savedPreference === 'dark' ||
    savedPreference === 'system'
  ) {
    $themePreference.set(savedPreference);
  }

  // Apply theme to document
  applyTheme();

  // Listen for system preference changes
  if (window.matchMedia) {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', () => {
      // Re-apply theme when system preference changes
      if ($themePreference.get() === 'system') {
        applyTheme();
      }
    });
  }

  // Subscribe to preference changes
  $themePreference.listen(() => {
    applyTheme();
  });
}

/**
 * Apply the current theme to the document
 */
function applyTheme(): void {
  if (typeof document === 'undefined') return;

  const theme = $activeTheme.get();
  const html = document.documentElement;

  if (theme === 'dark') {
    html.classList.add('dark');
    html.setAttribute('data-theme', 'dark');
  } else {
    html.classList.remove('dark');
    html.setAttribute('data-theme', 'light');
  }

  // Update theme-color meta tag
  const themeColorMeta = document.querySelector('meta[name="theme-color"]');
  if (themeColorMeta) {
    themeColorMeta.setAttribute(
      'content',
      theme === 'dark' ? '#1a1a1a' : '#8B4513'
    );
  }
}

/**
 * Set theme preference and save to localStorage
 */
export function setTheme(preference: ThemePreference): void {
  $themePreference.set(preference);

  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(THEME_STORAGE_KEY, preference);
  }
}

/**
 * Toggle between light and dark (ignores system preference)
 */
export function toggleTheme(): void {
  const currentTheme = $activeTheme.get();
  setTheme(currentTheme === 'dark' ? 'light' : 'dark');
}

/**
 * Get the current theme preference
 */
export function getThemePreference(): ThemePreference {
  return $themePreference.get();
}

/**
 * Get the currently active theme
 */
export function getActiveTheme(): Theme {
  return $activeTheme.get();
}
