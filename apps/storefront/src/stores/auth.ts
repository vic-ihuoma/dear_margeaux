/**
 * Customer authentication state management with nanostores
 */

import { atom, computed } from 'nanostores';
import type { CustomerAuth, CustomerSession } from '@dear-margeaux/api';

// ============================================================
// Types
// ============================================================

interface AuthState {
  customer: CustomerAuth | null;
  session: CustomerSession | null;
  isLoading: boolean;
}

// ============================================================
// Constants
// ============================================================

const AUTH_STORAGE_KEY = 'dear_margeaux_customer_auth';

// ============================================================
// Stores
// ============================================================

export const authState = atom<AuthState>({
  customer: null,
  session: null,
  isLoading: true,
});

// Computed: is the user logged in?
export const isLoggedIn = computed(authState, (state) => !!state.session);

// Computed: get the current customer
export const currentCustomer = computed(authState, (state) => state.customer);

// ============================================================
// Actions
// ============================================================

/**
 * Initialize auth state from localStorage
 */
export function initializeAuth(): void {
  if (typeof window === 'undefined') {
    authState.set({ customer: null, session: null, isLoading: false });
    return;
  }

  try {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    if (stored) {
      const data = JSON.parse(stored) as AuthState;
      // Check if session is expired
      if (data.session && new Date(data.session.expires_at) > new Date()) {
        authState.set({ ...data, isLoading: false });
      } else {
        // Session expired, clear auth
        localStorage.removeItem(AUTH_STORAGE_KEY);
        authState.set({ customer: null, session: null, isLoading: false });
      }
    } else {
      authState.set({ customer: null, session: null, isLoading: false });
    }
  } catch {
    authState.set({ customer: null, session: null, isLoading: false });
  }
}

/**
 * Set auth state after login/register
 */
export function setAuth(
  customer: CustomerAuth,
  session: CustomerSession
): void {
  const newState: AuthState = { customer, session, isLoading: false };
  authState.set(newState);

  // Persist to localStorage
  if (typeof window !== 'undefined') {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(newState));
  }
}

/**
 * Clear auth state on logout
 */
export function clearAuth(): void {
  authState.set({ customer: null, session: null, isLoading: false });

  if (typeof window !== 'undefined') {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  }
}

/**
 * Get the session ID for API calls
 */
export function getSessionId(): string | null {
  return authState.get().session?.id || null;
}

/**
 * Update customer data (e.g., after profile update)
 */
export function updateCustomer(customer: CustomerAuth): void {
  const current = authState.get();
  if (current.session) {
    setAuth(customer, current.session);
  }
}
