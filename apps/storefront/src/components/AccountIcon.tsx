import { useEffect } from 'react';
import { useStore } from '@nanostores/react';
import { authState, isLoggedIn, initializeAuth } from '../stores/auth';

export default function AccountIcon() {
  const $authState = useStore(authState);
  const $isLoggedIn = useStore(isLoggedIn);

  useEffect(() => {
    initializeAuth();
  }, []);

  // Show loading placeholder during hydration
  if ($authState.isLoading) {
    return (
      <div className="p-2 text-text-secondary">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="w-6 h-6 opacity-50"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
          />
        </svg>
      </div>
    );
  }

  if ($isLoggedIn) {
    return (
      <a
        href="/account/orders"
        className="p-2 text-text-secondary hover:text-text transition-colors relative"
        aria-label="My Account"
        title="My Account"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="w-6 h-6"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
          />
        </svg>
        {/* Green dot indicator for logged in */}
        <span className="absolute top-1 right-1 w-2 h-2 bg-success rounded-full border border-background" />
      </a>
    );
  }

  return (
    <a
      href="/account/login"
      className="p-2 text-text-secondary hover:text-text transition-colors"
      aria-label="Sign in"
      title="Sign in"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className="w-6 h-6"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
        />
      </svg>
    </a>
  );
}
