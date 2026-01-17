import { useState, type FormEvent } from 'react';

interface WaitlistFormProps {
  dropId: string;
  dropName: string;
  apiUrl: string;
  apiKey: string;
}

type FormStatus = 'idle' | 'submitting' | 'success' | 'error';

export default function WaitlistForm({
  dropId,
  dropName,
  apiUrl,
  apiKey,
}: WaitlistFormProps) {
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
      const response = await fetch(`${apiUrl}/v1/waitlist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          email: trimmedEmail,
          drop_id: dropId,
        }),
      });

      if (response.ok) {
        setStatus('success');
        setEmail('');
      } else if (response.status === 409) {
        // Already subscribed
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
      <div className="text-center py-8 px-6 bg-status-success/10 rounded-xl border border-status-success/20">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-status-success/20 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-status-success"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-text mb-2">
          You&apos;re on the list!
        </h3>
        <p className="text-text-secondary">
          We&apos;ll notify you when {dropName} launches.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="waitlist-email" className="sr-only">
          Email address
        </label>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="email"
            id="waitlist-email"
            name="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (errorMessage) setErrorMessage('');
            }}
            placeholder="Enter your email address"
            disabled={status === 'submitting'}
            className={`
              flex-1 px-4 py-3 text-base rounded-lg border bg-background
              placeholder:text-text-muted
              focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors duration-normal
              ${errorMessage ? 'border-status-error' : 'border-border'}
            `}
          />
          <button
            type="submit"
            disabled={status === 'submitting'}
            className="
              px-6 py-3 text-base font-semibold rounded-lg
              bg-primary text-text-inverse
              hover:bg-primary-600 active:scale-[0.98]
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-all duration-normal
              sm:w-auto w-full
            "
          >
            {status === 'submitting' ? (
              <span className="flex items-center justify-center gap-2">
                <svg
                  className="w-5 h-5 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
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
                Joining...
              </span>
            ) : (
              'Notify Me'
            )}
          </button>
        </div>
        {errorMessage && (
          <p className="mt-2 text-sm text-status-error">{errorMessage}</p>
        )}
      </div>
      <p className="text-xs text-text-muted text-center sm:text-left">
        We&apos;ll only email you when this drop launches. No spam, ever.
      </p>
    </form>
  );
}
