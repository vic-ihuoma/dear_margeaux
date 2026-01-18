import { useState, type FormEvent } from 'react';

interface NewsletterFormProps {
  apiUrl: string;
  apiKey: string;
}

type FormStatus = 'idle' | 'submitting' | 'success' | 'error';

export default function NewsletterForm({
  apiUrl,
  apiKey,
}: NewsletterFormProps) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<FormStatus>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const isValidEmail = (value: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value.trim());
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail) {
      setErrorMessage('Please enter your email address');
      return;
    }

    if (!isValidEmail(trimmedEmail)) {
      setErrorMessage('Please enter a valid email address');
      return;
    }

    setStatus('submitting');
    setErrorMessage('');

    try {
      const response = await fetch(`${apiUrl}/v1/newsletter/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          email: trimmedEmail,
        }),
      });

      if (response.ok) {
        setStatus('success');
        setEmail('');
      } else {
        const data = await response.json().catch(() => ({}));
        setStatus('error');
        setErrorMessage(
          data.error?.message || 'Something went wrong. Please try again.'
        );
      }
    } catch {
      setStatus('error');
      setErrorMessage('Unable to connect. Please try again later.');
    }
  };

  if (status === 'success') {
    return (
      <div
        className="flex items-center gap-2 py-2 px-3 bg-status-success/10 rounded-lg border border-status-success/20"
        role="status"
        aria-live="polite"
      >
        <svg
          className="w-5 h-5 text-status-success flex-shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M5 13l4 4L19 7"
          />
        </svg>
        <span className="text-sm text-status-success">
          Check your email to confirm your subscription
        </span>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex gap-2"
      aria-label="Newsletter subscription"
    >
      <div className="flex-1">
        <label htmlFor="newsletter-email" className="sr-only">
          Email address
        </label>
        <input
          type="email"
          id="newsletter-email"
          name="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (errorMessage) setErrorMessage('');
            if (status === 'error') setStatus('idle');
          }}
          placeholder="Enter your email"
          disabled={status === 'submitting'}
          aria-invalid={errorMessage ? 'true' : 'false'}
          aria-describedby={errorMessage ? 'newsletter-error' : undefined}
          className={`
            w-full px-4 py-2 text-sm bg-background border rounded-lg
            focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-shadow duration-normal
            ${errorMessage ? 'border-status-error' : 'border-border'}
          `}
        />
        {errorMessage && (
          <p
            id="newsletter-error"
            className="mt-1 text-xs text-status-error"
            role="alert"
          >
            {errorMessage}
          </p>
        )}
      </div>
      <button
        type="submit"
        disabled={status === 'submitting'}
        className="
          px-6 py-2 bg-primary text-text-inverse text-sm font-medium rounded-lg
          hover:bg-primary-600
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-colors duration-normal
          flex-shrink-0
        "
      >
        {status === 'submitting' ? (
          <span className="flex items-center gap-1.5">
            <svg
              className="w-4 h-4 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
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
            <span className="sr-only">Subscribing...</span>
          </span>
        ) : (
          'Subscribe'
        )}
      </button>
    </form>
  );
}
