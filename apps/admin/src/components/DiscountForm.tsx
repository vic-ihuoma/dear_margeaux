import { useState, useCallback, useEffect } from 'react';

export interface DiscountFormData {
  code: string;
  type: 'percentage' | 'fixed_amount';
  value: number;
  status: 'active' | 'inactive';
  min_purchase_cents: number;
  max_discount_cents: number | null;
  starts_at: string | null;
  expires_at: string | null;
  usage_limit: number | null;
  usage_limit_per_customer: number | null;
}

export interface DiscountFormProps {
  discount?: DiscountFormData;
  onSubmit: (data: DiscountFormData) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
  error?: string | null;
}

function formatDateForInput(dateString: string | null | undefined): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm
}

function formatDateForApi(dateString: string): string | null {
  if (!dateString) return null;
  return new Date(dateString).toISOString();
}

export function DiscountForm({
  discount,
  onSubmit,
  onCancel,
  isSubmitting = false,
  error,
}: DiscountFormProps) {
  const [code, setCode] = useState(discount?.code || '');
  const [type, setType] = useState<'percentage' | 'fixed_amount'>(
    discount?.type || 'percentage'
  );
  const [value, setValue] = useState(discount?.value?.toString() || '');
  const [status, setStatus] = useState<'active' | 'inactive'>(
    discount?.status || 'active'
  );
  const [minPurchase, setMinPurchase] = useState(
    discount?.min_purchase_cents
      ? (discount.min_purchase_cents / 100).toFixed(2)
      : ''
  );
  const [maxDiscount, setMaxDiscount] = useState(
    discount?.max_discount_cents
      ? (discount.max_discount_cents / 100).toFixed(2)
      : ''
  );
  const [startsAt, setStartsAt] = useState(
    formatDateForInput(discount?.starts_at)
  );
  const [expiresAt, setExpiresAt] = useState(
    formatDateForInput(discount?.expires_at)
  );
  const [usageLimit, setUsageLimit] = useState(
    discount?.usage_limit?.toString() || ''
  );
  const [usageLimitPerCustomer, setUsageLimitPerCustomer] = useState(
    discount?.usage_limit_per_customer?.toString() || ''
  );
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});

  // Update form when discount prop changes
  useEffect(() => {
    if (discount) {
      setCode(discount.code);
      setType(discount.type);
      setValue(discount.value.toString());
      setStatus(discount.status);
      setMinPurchase(
        discount.min_purchase_cents
          ? (discount.min_purchase_cents / 100).toFixed(2)
          : ''
      );
      setMaxDiscount(
        discount.max_discount_cents
          ? (discount.max_discount_cents / 100).toFixed(2)
          : ''
      );
      setStartsAt(formatDateForInput(discount.starts_at));
      setExpiresAt(formatDateForInput(discount.expires_at));
      setUsageLimit(discount.usage_limit?.toString() || '');
      setUsageLimitPerCustomer(
        discount.usage_limit_per_customer?.toString() || ''
      );
    }
  }, [discount]);

  const validate = useCallback((): boolean => {
    const errors: Record<string, string> = {};

    if (!code.trim()) {
      errors.code = 'Code is required';
    } else if (!/^[A-Z0-9_-]+$/i.test(code.trim())) {
      errors.code =
        'Code can only contain letters, numbers, hyphens and underscores';
    }

    const numValue = parseFloat(value);
    if (!value || isNaN(numValue) || numValue <= 0) {
      errors.value = 'Value must be a positive number';
    } else if (type === 'percentage' && numValue > 100) {
      errors.value = 'Percentage cannot exceed 100%';
    }

    if (minPurchase) {
      const numMinPurchase = parseFloat(minPurchase);
      if (isNaN(numMinPurchase) || numMinPurchase < 0) {
        errors.minPurchase = 'Invalid minimum purchase amount';
      }
    }

    if (maxDiscount) {
      const numMaxDiscount = parseFloat(maxDiscount);
      if (isNaN(numMaxDiscount) || numMaxDiscount <= 0) {
        errors.maxDiscount = 'Invalid maximum discount amount';
      }
    }

    if (usageLimit) {
      const numLimit = parseInt(usageLimit, 10);
      if (isNaN(numLimit) || numLimit <= 0) {
        errors.usageLimit = 'Usage limit must be a positive number';
      }
    }

    if (usageLimitPerCustomer) {
      const numLimit = parseInt(usageLimitPerCustomer, 10);
      if (isNaN(numLimit) || numLimit <= 0) {
        errors.usageLimitPerCustomer = 'Limit must be a positive number';
      }
    }

    if (startsAt && expiresAt) {
      if (new Date(startsAt) >= new Date(expiresAt)) {
        errors.expiresAt = 'End date must be after start date';
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }, [
    code,
    type,
    value,
    minPurchase,
    maxDiscount,
    usageLimit,
    usageLimitPerCustomer,
    startsAt,
    expiresAt,
  ]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!validate()) return;

      const numValue = parseFloat(value);
      const data: DiscountFormData = {
        code: code.toUpperCase().trim(),
        type,
        value: type === 'percentage' ? numValue : Math.round(numValue * 100), // Convert dollars to cents for fixed
        status,
        min_purchase_cents: minPurchase
          ? Math.round(parseFloat(minPurchase) * 100)
          : 0,
        max_discount_cents: maxDiscount
          ? Math.round(parseFloat(maxDiscount) * 100)
          : null,
        starts_at: formatDateForApi(startsAt),
        expires_at: formatDateForApi(expiresAt),
        usage_limit: usageLimit ? parseInt(usageLimit, 10) : null,
        usage_limit_per_customer: usageLimitPerCustomer
          ? parseInt(usageLimitPerCustomer, 10)
          : null,
      };

      await onSubmit(data);
    },
    [
      validate,
      code,
      type,
      value,
      status,
      minPurchase,
      maxDiscount,
      startsAt,
      expiresAt,
      usageLimit,
      usageLimitPerCustomer,
      onSubmit,
    ]
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-4 bg-status-error/10 border border-status-error/20 rounded-lg">
          <p className="text-sm text-status-error">{error}</p>
        </div>
      )}

      {/* Code and Type */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="code"
            className="block text-sm font-medium text-text-secondary mb-1"
          >
            Discount Code *
          </label>
          <input
            type="text"
            id="code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="SUMMER20"
            disabled={!!discount} // Code cannot be changed after creation
            className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 bg-background-primary text-text-primary ${
              validationErrors.code ? 'border-status-error' : 'border-border'
            } ${discount ? 'opacity-60 cursor-not-allowed' : ''}`}
          />
          {validationErrors.code && (
            <p className="mt-1 text-xs text-status-error">
              {validationErrors.code}
            </p>
          )}
          {discount && (
            <p className="mt-1 text-xs text-text-muted">
              Code cannot be changed after creation
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="type"
            className="block text-sm font-medium text-text-secondary mb-1"
          >
            Discount Type *
          </label>
          <select
            id="type"
            value={type}
            onChange={(e) =>
              setType(e.target.value as 'percentage' | 'fixed_amount')
            }
            disabled={!!discount} // Type cannot be changed after creation
            className={`w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 bg-background-primary text-text-primary ${
              discount ? 'opacity-60 cursor-not-allowed' : ''
            }`}
          >
            <option value="percentage">Percentage Off</option>
            <option value="fixed_amount">Fixed Amount Off</option>
          </select>
          {discount && (
            <p className="mt-1 text-xs text-text-muted">
              Type cannot be changed after creation
            </p>
          )}
        </div>
      </div>

      {/* Value and Status */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="value"
            className="block text-sm font-medium text-text-secondary mb-1"
          >
            {type === 'percentage' ? 'Percentage *' : 'Amount *'}
          </label>
          <div className="relative">
            {type === 'fixed_amount' && (
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">
                $
              </span>
            )}
            <input
              type="number"
              id="value"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={type === 'percentage' ? '20' : '10.00'}
              min="0"
              max={type === 'percentage' ? '100' : undefined}
              step={type === 'percentage' ? '1' : '0.01'}
              className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 bg-background-primary text-text-primary ${
                type === 'fixed_amount' ? 'pl-7' : ''
              } ${validationErrors.value ? 'border-status-error' : 'border-border'}`}
            />
            {type === 'percentage' && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted">
                %
              </span>
            )}
          </div>
          {validationErrors.value && (
            <p className="mt-1 text-xs text-status-error">
              {validationErrors.value}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="status"
            className="block text-sm font-medium text-text-secondary mb-1"
          >
            Status
          </label>
          <select
            id="status"
            value={status}
            onChange={(e) => setStatus(e.target.value as 'active' | 'inactive')}
            className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 bg-background-primary text-text-primary"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Min Purchase and Max Discount */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="minPurchase"
            className="block text-sm font-medium text-text-secondary mb-1"
          >
            Minimum Purchase
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">
              $
            </span>
            <input
              type="number"
              id="minPurchase"
              value={minPurchase}
              onChange={(e) => setMinPurchase(e.target.value)}
              placeholder="0.00"
              min="0"
              step="0.01"
              className={`w-full pl-7 pr-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 bg-background-primary text-text-primary ${
                validationErrors.minPurchase
                  ? 'border-status-error'
                  : 'border-border'
              }`}
            />
          </div>
          {validationErrors.minPurchase && (
            <p className="mt-1 text-xs text-status-error">
              {validationErrors.minPurchase}
            </p>
          )}
          <p className="mt-1 text-xs text-text-muted">
            Leave empty for no minimum
          </p>
        </div>

        <div>
          <label
            htmlFor="maxDiscount"
            className="block text-sm font-medium text-text-secondary mb-1"
          >
            Maximum Discount
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">
              $
            </span>
            <input
              type="number"
              id="maxDiscount"
              value={maxDiscount}
              onChange={(e) => setMaxDiscount(e.target.value)}
              placeholder="50.00"
              min="0"
              step="0.01"
              className={`w-full pl-7 pr-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 bg-background-primary text-text-primary ${
                validationErrors.maxDiscount
                  ? 'border-status-error'
                  : 'border-border'
              }`}
            />
          </div>
          {validationErrors.maxDiscount && (
            <p className="mt-1 text-xs text-status-error">
              {validationErrors.maxDiscount}
            </p>
          )}
          <p className="mt-1 text-xs text-text-muted">
            Cap the discount amount (useful for percentage discounts)
          </p>
        </div>
      </div>

      {/* Date Range */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="startsAt"
            className="block text-sm font-medium text-text-secondary mb-1"
          >
            Start Date
          </label>
          <input
            type="datetime-local"
            id="startsAt"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 bg-background-primary text-text-primary"
          />
          <p className="mt-1 text-xs text-text-muted">
            Leave empty for immediate availability
          </p>
        </div>

        <div>
          <label
            htmlFor="expiresAt"
            className="block text-sm font-medium text-text-secondary mb-1"
          >
            End Date
          </label>
          <input
            type="datetime-local"
            id="expiresAt"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 bg-background-primary text-text-primary ${
              validationErrors.expiresAt
                ? 'border-status-error'
                : 'border-border'
            }`}
          />
          {validationErrors.expiresAt && (
            <p className="mt-1 text-xs text-status-error">
              {validationErrors.expiresAt}
            </p>
          )}
          <p className="mt-1 text-xs text-text-muted">
            Leave empty for no expiration
          </p>
        </div>
      </div>

      {/* Usage Limits */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="usageLimit"
            className="block text-sm font-medium text-text-secondary mb-1"
          >
            Total Usage Limit
          </label>
          <input
            type="number"
            id="usageLimit"
            value={usageLimit}
            onChange={(e) => setUsageLimit(e.target.value)}
            placeholder="100"
            min="1"
            step="1"
            className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 bg-background-primary text-text-primary ${
              validationErrors.usageLimit
                ? 'border-status-error'
                : 'border-border'
            }`}
          />
          {validationErrors.usageLimit && (
            <p className="mt-1 text-xs text-status-error">
              {validationErrors.usageLimit}
            </p>
          )}
          <p className="mt-1 text-xs text-text-muted">
            Leave empty for unlimited uses
          </p>
        </div>

        <div>
          <label
            htmlFor="usageLimitPerCustomer"
            className="block text-sm font-medium text-text-secondary mb-1"
          >
            Uses Per Customer
          </label>
          <input
            type="number"
            id="usageLimitPerCustomer"
            value={usageLimitPerCustomer}
            onChange={(e) => setUsageLimitPerCustomer(e.target.value)}
            placeholder="1"
            min="1"
            step="1"
            className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 bg-background-primary text-text-primary ${
              validationErrors.usageLimitPerCustomer
                ? 'border-status-error'
                : 'border-border'
            }`}
          />
          {validationErrors.usageLimitPerCustomer && (
            <p className="mt-1 text-xs text-status-error">
              {validationErrors.usageLimitPerCustomer}
            </p>
          )}
          <p className="mt-1 text-xs text-text-muted">
            Leave empty for unlimited per customer
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary-600 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {isSubmitting && (
            <svg
              className="animate-spin h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
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
          )}
          {discount ? 'Update Discount' : 'Create Discount'}
        </button>
      </div>
    </form>
  );
}
