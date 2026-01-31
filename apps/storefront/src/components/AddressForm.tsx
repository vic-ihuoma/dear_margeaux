import { useState } from 'react';
import { getSessionId } from '../stores/auth';
import { getMerchantClient } from '../lib/merchant';
import type { CustomerAddress, CreateAddressParams } from '@dear-margeaux/api';

interface AddressFormProps {
  address?: CustomerAddress;
  onSuccess: (address: CustomerAddress) => void;
  onCancel: () => void;
}

const COUNTRIES = [
  { code: 'US', name: 'United States' },
  { code: 'CA', name: 'Canada' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'AU', name: 'Australia' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
];

export default function AddressForm({
  address,
  onSuccess,
  onCancel,
}: AddressFormProps) {
  const isEditing = !!address;

  const [formData, setFormData] = useState<CreateAddressParams>({
    label: address?.label || '',
    name: address?.name || '',
    company: address?.company || '',
    line1: address?.line1 || '',
    line2: address?.line2 || '',
    city: address?.city || '',
    state: address?.state || '',
    postal_code: address?.postal_code || '',
    country: address?.country || 'US',
    phone: address?.phone || '',
    is_default: address?.is_default || false,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const newValue =
      type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;

    setFormData((prev) => ({ ...prev, [name]: newValue }));

    // Clear field error when user types
    if (fieldErrors[name]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
    // Clear general error
    if (error) {
      setError(null);
    }
  };

  const validate = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name?.trim()) {
      errors.name = 'Name is required';
    }
    if (!formData.line1?.trim()) {
      errors.line1 = 'Address line 1 is required';
    }
    if (!formData.city?.trim()) {
      errors.city = 'City is required';
    }
    if (!formData.postal_code?.trim()) {
      errors.postal_code = 'Postal code is required';
    }
    if (!formData.country?.trim()) {
      errors.country = 'Country is required';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    const sessionId = getSessionId();
    if (!sessionId) {
      setError('Please log in to continue');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const client = getMerchantClient();

      // Clean up form data - remove empty strings
      const cleanData: CreateAddressParams = {
        name: formData.name!.trim(),
        line1: formData.line1!.trim(),
        city: formData.city!.trim(),
        postal_code: formData.postal_code!.trim(),
        country: formData.country!.trim(),
        is_default: formData.is_default,
      };

      if (formData.label?.trim()) cleanData.label = formData.label.trim();
      if (formData.company?.trim()) cleanData.company = formData.company.trim();
      if (formData.line2?.trim()) cleanData.line2 = formData.line2.trim();
      if (formData.state?.trim()) cleanData.state = formData.state.trim();
      if (formData.phone?.trim()) cleanData.phone = formData.phone.trim();

      let savedAddress: CustomerAddress;

      if (isEditing && address) {
        savedAddress = await client.updateMyAddress(
          sessionId,
          address.id,
          cleanData
        );
      } else {
        savedAddress = await client.addMyAddress(sessionId, cleanData);
      }

      onSuccess(savedAddress);
    } catch (err) {
      console.error('Error saving address:', err);
      setError('Unable to save address. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-background-secondary rounded-lg border border-border p-6 space-y-6"
      aria-label={isEditing ? 'Edit address form' : 'Add address form'}
    >
      {error && (
        <div className="p-4 bg-error/10 border border-error/20 rounded-lg">
          <p className="text-error text-sm" role="alert">
            {error}
          </p>
        </div>
      )}

      {/* Label (optional) */}
      <div>
        <label
          htmlFor="address-label"
          className="block text-sm font-medium text-text-primary mb-1"
        >
          Label <span className="text-text-muted">(optional)</span>
        </label>
        <input
          type="text"
          id="address-label"
          name="label"
          value={formData.label}
          onChange={handleChange}
          placeholder="e.g., Home, Work, etc."
          className="w-full px-4 py-2.5 bg-background-primary border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
          disabled={isSubmitting}
        />
      </div>

      {/* Name */}
      <div>
        <label
          htmlFor="address-name"
          className="block text-sm font-medium text-text-primary mb-1"
        >
          Full Name <span className="text-error">*</span>
        </label>
        <input
          type="text"
          id="address-name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="Recipient's full name"
          className={`w-full px-4 py-2.5 bg-background-primary border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all ${
            fieldErrors.name ? 'border-error' : 'border-border'
          }`}
          disabled={isSubmitting}
          aria-invalid={!!fieldErrors.name}
          aria-describedby={fieldErrors.name ? 'name-error' : undefined}
        />
        {fieldErrors.name && (
          <p id="name-error" className="mt-1 text-sm text-error" role="alert">
            {fieldErrors.name}
          </p>
        )}
      </div>

      {/* Company (optional) */}
      <div>
        <label
          htmlFor="address-company"
          className="block text-sm font-medium text-text-primary mb-1"
        >
          Company <span className="text-text-muted">(optional)</span>
        </label>
        <input
          type="text"
          id="address-company"
          name="company"
          value={formData.company}
          onChange={handleChange}
          placeholder="Company name"
          className="w-full px-4 py-2.5 bg-background-primary border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
          disabled={isSubmitting}
        />
      </div>

      {/* Address Line 1 */}
      <div>
        <label
          htmlFor="address-line1"
          className="block text-sm font-medium text-text-primary mb-1"
        >
          Address Line 1 <span className="text-error">*</span>
        </label>
        <input
          type="text"
          id="address-line1"
          name="line1"
          value={formData.line1}
          onChange={handleChange}
          placeholder="Street address"
          className={`w-full px-4 py-2.5 bg-background-primary border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all ${
            fieldErrors.line1 ? 'border-error' : 'border-border'
          }`}
          disabled={isSubmitting}
          aria-invalid={!!fieldErrors.line1}
          aria-describedby={fieldErrors.line1 ? 'line1-error' : undefined}
        />
        {fieldErrors.line1 && (
          <p id="line1-error" className="mt-1 text-sm text-error" role="alert">
            {fieldErrors.line1}
          </p>
        )}
      </div>

      {/* Address Line 2 (optional) */}
      <div>
        <label
          htmlFor="address-line2"
          className="block text-sm font-medium text-text-primary mb-1"
        >
          Address Line 2 <span className="text-text-muted">(optional)</span>
        </label>
        <input
          type="text"
          id="address-line2"
          name="line2"
          value={formData.line2}
          onChange={handleChange}
          placeholder="Apartment, suite, etc."
          className="w-full px-4 py-2.5 bg-background-primary border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
          disabled={isSubmitting}
        />
      </div>

      {/* City and State */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="address-city"
            className="block text-sm font-medium text-text-primary mb-1"
          >
            City <span className="text-error">*</span>
          </label>
          <input
            type="text"
            id="address-city"
            name="city"
            value={formData.city}
            onChange={handleChange}
            placeholder="City"
            className={`w-full px-4 py-2.5 bg-background-primary border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all ${
              fieldErrors.city ? 'border-error' : 'border-border'
            }`}
            disabled={isSubmitting}
            aria-invalid={!!fieldErrors.city}
            aria-describedby={fieldErrors.city ? 'city-error' : undefined}
          />
          {fieldErrors.city && (
            <p id="city-error" className="mt-1 text-sm text-error" role="alert">
              {fieldErrors.city}
            </p>
          )}
        </div>
        <div>
          <label
            htmlFor="address-state"
            className="block text-sm font-medium text-text-primary mb-1"
          >
            State / Province
          </label>
          <input
            type="text"
            id="address-state"
            name="state"
            value={formData.state}
            onChange={handleChange}
            placeholder="State"
            className="w-full px-4 py-2.5 bg-background-primary border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
            disabled={isSubmitting}
          />
        </div>
      </div>

      {/* Postal Code and Country */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="address-postal-code"
            className="block text-sm font-medium text-text-primary mb-1"
          >
            Postal Code <span className="text-error">*</span>
          </label>
          <input
            type="text"
            id="address-postal-code"
            name="postal_code"
            value={formData.postal_code}
            onChange={handleChange}
            placeholder="Postal code"
            className={`w-full px-4 py-2.5 bg-background-primary border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all ${
              fieldErrors.postal_code ? 'border-error' : 'border-border'
            }`}
            disabled={isSubmitting}
            aria-invalid={!!fieldErrors.postal_code}
            aria-describedby={
              fieldErrors.postal_code ? 'postal-code-error' : undefined
            }
          />
          {fieldErrors.postal_code && (
            <p
              id="postal-code-error"
              className="mt-1 text-sm text-error"
              role="alert"
            >
              {fieldErrors.postal_code}
            </p>
          )}
        </div>
        <div>
          <label
            htmlFor="address-country"
            className="block text-sm font-medium text-text-primary mb-1"
          >
            Country <span className="text-error">*</span>
          </label>
          <select
            id="address-country"
            name="country"
            value={formData.country}
            onChange={handleChange}
            className={`w-full px-4 py-2.5 bg-background-primary border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all ${
              fieldErrors.country ? 'border-error' : 'border-border'
            }`}
            disabled={isSubmitting}
            aria-invalid={!!fieldErrors.country}
            aria-describedby={fieldErrors.country ? 'country-error' : undefined}
          >
            {COUNTRIES.map((country) => (
              <option key={country.code} value={country.code}>
                {country.name}
              </option>
            ))}
          </select>
          {fieldErrors.country && (
            <p
              id="country-error"
              className="mt-1 text-sm text-error"
              role="alert"
            >
              {fieldErrors.country}
            </p>
          )}
        </div>
      </div>

      {/* Phone (optional) */}
      <div>
        <label
          htmlFor="address-phone"
          className="block text-sm font-medium text-text-primary mb-1"
        >
          Phone <span className="text-text-muted">(optional)</span>
        </label>
        <input
          type="tel"
          id="address-phone"
          name="phone"
          value={formData.phone}
          onChange={handleChange}
          placeholder="Phone number for delivery"
          className="w-full px-4 py-2.5 bg-background-primary border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
          disabled={isSubmitting}
        />
      </div>

      {/* Set as default checkbox */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="address-is-default"
          name="is_default"
          checked={formData.is_default}
          onChange={handleChange}
          className="w-4 h-4 text-primary bg-background-primary border-border rounded focus:ring-primary focus:ring-2"
          disabled={isSubmitting}
        />
        <label
          htmlFor="address-is-default"
          className="text-sm text-text-secondary"
        >
          Set as default address
        </label>
      </div>

      {/* Form Actions */}
      <div className="flex items-center gap-4 pt-4 border-t border-border">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 px-6 py-2.5 bg-primary text-white rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting
            ? 'Saving...'
            : isEditing
              ? 'Save Changes'
              : 'Add Address'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="px-6 py-2.5 bg-background-tertiary text-text-primary rounded-lg hover:bg-background-tertiary/80 transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
