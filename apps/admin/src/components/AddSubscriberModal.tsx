import { useState, useEffect, useCallback } from 'react';
import { AddSubscriberForm } from './AddSubscriberForm';

export function AddSubscriberModal() {
  const [isOpen, setIsOpen] = useState(false);

  // Handle escape key to close modal
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleSuccess = useCallback(() => {
    // Reload page to show the new subscriber
    window.location.reload();
  }, []);

  const handleCancel = useCallback(() => {
    setIsOpen(false);
  }, []);

  return (
    <>
      {/* Add Subscriber Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="w-4 h-4"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 4.5v15m7.5-7.5h-15"
          />
        </svg>
        Add Subscriber
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50"
            onClick={handleCancel}
            onKeyDown={(e) => e.key === 'Enter' && handleCancel()}
            role="button"
            tabIndex={0}
            aria-label="Close modal"
          />

          {/* Modal Content */}
          <div className="relative w-full max-w-md bg-white rounded-xl shadow-xl my-8 mx-4">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Add Subscriber
              </h3>
              <button
                onClick={handleCancel}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-5 h-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18 18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Form */}
            <div className="px-6 py-5">
              <AddSubscriberForm
                onSuccess={handleSuccess}
                onCancel={handleCancel}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
