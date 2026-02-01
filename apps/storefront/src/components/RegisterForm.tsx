import { useState } from 'react';
import { setAuth } from '../stores/auth';
import { getMerchantClient } from '../lib/merchant';

interface RegisterFormProps {
  redirectTo?: string;
}

export default function RegisterForm({
  redirectTo = '/account/orders',
}: RegisterFormProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    // Validate password length
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setIsLoading(true);

    try {
      const client = getMerchantClient();
      const result = await client.registerCustomer({
        email,
        password,
        name: name || undefined,
      });

      // Store auth state
      setAuth(result.customer, result.session);

      // Redirect to desired page
      window.location.href = redirectTo;
    } catch (err) {
      console.error('Registration error:', err);
      if (err instanceof Error) {
        if (err.message.includes('already exists')) {
          setError(
            'An account with this email already exists. Please sign in instead.'
          );
        } else if (err.message.includes('Invalid email')) {
          setError('Please enter a valid email address.');
        } else {
          setError('An error occurred. Please try again.');
        }
      } else {
        setError('An error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-3 bg-error/10 border border-error/20 rounded-lg">
          <p className="text-sm text-error">{error}</p>
        </div>
      )}

      <div>
        <label
          htmlFor="name"
          className="block text-sm font-medium text-text-primary mb-1.5"
        >
          Name <span className="text-text-muted">(optional)</span>
        </label>
        <input
          type="text"
          id="name"
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
          className="w-full px-4 py-2.5 rounded-lg border border-border bg-background-primary text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
          placeholder="Your name"
        />
      </div>

      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-text-primary mb-1.5"
        >
          Email address
        </label>
        <input
          type="email"
          id="email"
          name="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          className="w-full px-4 py-2.5 rounded-lg border border-border bg-background-primary text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
          placeholder="your@email.com"
        />
      </div>

      <div>
        <label
          htmlFor="password"
          className="block text-sm font-medium text-text-primary mb-1.5"
        >
          Password
        </label>
        <input
          type="password"
          id="password"
          name="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          autoComplete="new-password"
          className="w-full px-4 py-2.5 rounded-lg border border-border bg-background-primary text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
          placeholder="At least 8 characters"
        />
      </div>

      <div>
        <label
          htmlFor="confirmPassword"
          className="block text-sm font-medium text-text-primary mb-1.5"
        >
          Confirm password
        </label>
        <input
          type="password"
          id="confirmPassword"
          name="confirmPassword"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          minLength={8}
          autoComplete="new-password"
          className="w-full px-4 py-2.5 rounded-lg border border-border bg-background-primary text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
          placeholder="Confirm your password"
        />
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full py-2.5 px-4 bg-primary text-white font-medium rounded-lg hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <svg
              className="animate-spin h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span>Creating account...</span>
          </>
        ) : (
          <span>Create account</span>
        )}
      </button>

      <p className="text-xs text-text-muted text-center">
        By creating an account, you agree to our{' '}
        <a href="/terms" className="text-primary hover:underline">
          Terms of Service
        </a>{' '}
        and{' '}
        <a href="/privacy" className="text-primary hover:underline">
          Privacy Policy
        </a>
        .
      </p>
    </form>
  );
}
