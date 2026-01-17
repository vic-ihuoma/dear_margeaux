import { useEffect, useState } from 'react';
import { useStore } from '@nanostores/react';
import {
  authState,
  isLoggedIn,
  clearAuth,
  initializeAuth,
  getSessionId,
} from '../stores/auth';
import { getMerchantClient } from '../lib/merchant';

interface AccountNavProps {
  currentPage: 'orders' | 'profile' | 'addresses';
}

export default function AccountNav({ currentPage }: AccountNavProps) {
  const $authState = useStore(authState);
  const $isLoggedIn = useStore(isLoggedIn);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    initializeAuth();
  }, []);

  // If not logged in and not loading, redirect to login
  useEffect(() => {
    if (!$authState.isLoading && !$isLoggedIn) {
      window.location.href = `/account/login?redirect=${encodeURIComponent(window.location.pathname)}`;
    }
  }, [$authState.isLoading, $isLoggedIn]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      const sessionId = getSessionId();
      if (sessionId) {
        const client = getMerchantClient();
        await client.logoutCustomer(sessionId);
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      clearAuth();
      window.location.href = '/';
    }
  };

  if ($authState.isLoading) {
    return (
      <nav className="space-y-2">
        <div className="animate-pulse space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 bg-background-tertiary rounded-lg" />
          ))}
        </div>
      </nav>
    );
  }

  const navItems = [
    {
      id: 'orders',
      label: 'Order History',
      href: '/account/orders',
      icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
    },
  ];

  return (
    <div className="space-y-6">
      {/* User info */}
      {$authState.customer && (
        <div className="p-4 bg-background-secondary rounded-lg border border-border">
          <p className="font-medium text-text-primary">
            {$authState.customer.name || 'Customer'}
          </p>
          <p className="text-sm text-text-muted truncate">
            {$authState.customer.email}
          </p>
        </div>
      )}

      {/* Navigation */}
      <nav className="space-y-1">
        {navItems.map((item) => (
          <a
            key={item.id}
            href={item.href}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
              currentPage === item.id
                ? 'bg-primary/10 text-primary'
                : 'text-text-secondary hover:bg-background-tertiary hover:text-text-primary'
            }`}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d={item.icon}
              />
            </svg>
            <span className="font-medium">{item.label}</span>
          </a>
        ))}

        {/* Logout button */}
        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-text-secondary hover:bg-background-tertiary hover:text-text-primary transition-colors disabled:opacity-50"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
          </svg>
          <span className="font-medium">
            {isLoggingOut ? 'Signing out...' : 'Sign out'}
          </span>
        </button>
      </nav>
    </div>
  );
}
