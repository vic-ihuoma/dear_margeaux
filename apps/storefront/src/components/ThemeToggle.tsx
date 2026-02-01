import { useStore } from '@nanostores/react';
import { useEffect } from 'react';
import { $activeTheme, initializeTheme, toggleTheme } from '../stores/theme';

interface ThemeToggleProps {
  /** Size of the toggle button */
  size?: 'sm' | 'md' | 'lg';
  /** Show label next to the toggle */
  showLabel?: boolean;
}

export default function ThemeToggle({
  size = 'md',
  showLabel = false,
}: ThemeToggleProps) {
  const activeTheme = useStore($activeTheme);
  const isDark = activeTheme === 'dark';

  // Initialize theme on mount
  useEffect(() => {
    initializeTheme();
  }, []);

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  };

  const iconSizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`
        ${sizeClasses[size]}
        flex items-center justify-center rounded-lg
        text-text-secondary hover:text-text hover:bg-background-tertiary
        transition-colors duration-normal
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50
      `}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? (
        // Sun icon for dark mode (clicking will switch to light)
        <svg
          className={iconSizeClasses[size]}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"
          />
        </svg>
      ) : (
        // Moon icon for light mode (clicking will switch to dark)
        <svg
          className={iconSizeClasses[size]}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z"
          />
        </svg>
      )}
      {showLabel && (
        <span className="ml-2 text-sm">
          {isDark ? 'Light mode' : 'Dark mode'}
        </span>
      )}
    </button>
  );
}
