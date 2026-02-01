import { useState, useCallback } from 'react';

interface AddSubscriberFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function AddSubscriberForm({
  onSuccess,
  onCancel,
}: AddSubscriberFormProps) {
  const [email, setEmail] = useState('');
  const [skipVerification, setSkipVerification] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSubmitting(true);
      setError(null);
      setSuccessMessage(null);

      try {
        const response = await fetch('/api/newsletter/subscribers/add', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email,
            skip_verification: skipVerification,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result.error || result.message || 'Failed to add subscriber'
          );
        }

        setSuccessMessage(result.message);
        setEmail('');
        setSkipVerification(false);

        // Reload the page after a short delay to show the new subscriber
        setTimeout(() => {
          if (onSuccess) {
            onSuccess();
          } else {
            window.location.reload();
          }
        }, 1500);
      } catch (err) {
        console.error('Add subscriber error:', err);
        setError(
          err instanceof Error ? err.message : 'Failed to add subscriber'
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [email, skipVerification, onSuccess]
  );

  const handleCancel = useCallback(() => {
    if (onCancel) {
      onCancel();
    }
  }, [onCancel]);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Error Message */}
      {error && (
        <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm">
          {error}
        </div>
      )}

      {/* Success Message */}
      {successMessage && (
        <div className="p-3 rounded-lg bg-green-50 text-green-600 text-sm">
          {successMessage}
        </div>
      )}

      {/* Email Input */}
      <div>
        <label
          htmlFor="subscriber-email"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Email Address
        </label>
        <input
          type="email"
          id="subscriber-email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="subscriber@example.com"
          required
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
        />
      </div>

      {/* Skip Verification Checkbox */}
      <div className="flex items-start gap-2">
        <input
          type="checkbox"
          id="skip-verification"
          checked={skipVerification}
          onChange={(e) => setSkipVerification(e.target.checked)}
          className="mt-1 h-4 w-4 text-amber-600 focus:ring-amber-500 border-gray-300 rounded"
        />
        <div>
          <label
            htmlFor="skip-verification"
            className="text-sm font-medium text-gray-700"
          >
            Skip email verification
          </label>
          <p className="text-xs text-gray-500 mt-0.5">
            Mark subscriber as verified immediately without sending a
            confirmation email.
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 pt-2">
        {onCancel && (
          <button
            type="button"
            onClick={handleCancel}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={isSubmitting || !email}
          className="px-4 py-2 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Adding...' : 'Add Subscriber'}
        </button>
      </div>
    </form>
  );
}
