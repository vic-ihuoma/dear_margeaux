import { useEffect, useState } from 'react';
import { useStore } from '@nanostores/react';
import { authState, initializeAuth, getSessionId } from '../stores/auth';
import { getMerchantClient } from '../lib/merchant';
import type { CustomerAddress } from '@dear-margeaux/api';
import AddressForm from './AddressForm';

export default function AddressList() {
  const $authState = useStore(authState);
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState<CustomerAddress | null>(
    null
  );
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [settingDefaultId, setSettingDefaultId] = useState<string | null>(null);

  useEffect(() => {
    initializeAuth();
  }, []);

  useEffect(() => {
    async function fetchAddresses() {
      const sessionId = getSessionId();
      if (!sessionId) {
        setIsLoading(false);
        return;
      }

      try {
        const client = getMerchantClient();
        const result = await client.getMyAddresses(sessionId);
        setAddresses(result.items);
      } catch (err) {
        console.error('Error fetching addresses:', err);
        setError('Unable to load addresses. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }

    if (!$authState.isLoading && $authState.session) {
      fetchAddresses();
    }
  }, [$authState.isLoading, $authState.session]);

  const handleDelete = async (addressId: string) => {
    if (!confirm('Are you sure you want to delete this address?')) {
      return;
    }

    const sessionId = getSessionId();
    if (!sessionId) return;

    setDeletingId(addressId);
    try {
      const client = getMerchantClient();
      await client.deleteMyAddress(sessionId, addressId);
      setAddresses((prev) => prev.filter((a) => a.id !== addressId));
    } catch (err) {
      console.error('Error deleting address:', err);
      setError('Unable to delete address. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleSetDefault = async (addressId: string) => {
    const sessionId = getSessionId();
    if (!sessionId) return;

    setSettingDefaultId(addressId);
    try {
      const client = getMerchantClient();
      await client.setDefaultAddress(sessionId, addressId);
      // Update local state to reflect new default
      setAddresses((prev) =>
        prev.map((a) => ({
          ...a,
          is_default: a.id === addressId,
        }))
      );
    } catch (err) {
      console.error('Error setting default address:', err);
      setError('Unable to set default address. Please try again.');
    } finally {
      setSettingDefaultId(null);
    }
  };

  const handleFormSuccess = (address: CustomerAddress, isEdit: boolean) => {
    if (isEdit) {
      setAddresses((prev) =>
        prev.map((a) => {
          if (a.id === address.id) {
            return address;
          }
          // If the updated address is now default, unset others
          if (address.is_default && a.is_default) {
            return { ...a, is_default: false };
          }
          return a;
        })
      );
    } else {
      // If new address is default, unset existing defaults
      if (address.is_default) {
        setAddresses((prev) => [
          address,
          ...prev.map((a) => ({ ...a, is_default: false })),
        ]);
      } else {
        setAddresses((prev) => [address, ...prev]);
      }
    }
    setShowForm(false);
    setEditingAddress(null);
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingAddress(null);
  };

  if (isLoading || $authState.isLoading) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-text-primary">
          Saved Addresses
        </h2>
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-background-secondary rounded-lg border border-border p-6">
                <div className="h-4 bg-background-tertiary rounded w-1/4 mb-4" />
                <div className="h-3 bg-background-tertiary rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error && addresses.length === 0) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-text-primary">
          Saved Addresses
        </h2>
        <div className="p-6 bg-error/10 border border-error/20 rounded-lg">
          <p className="text-error">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 text-sm font-medium text-primary hover:underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  // Show form if adding or editing
  if (showForm || editingAddress) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-text-primary">
          {editingAddress ? 'Edit Address' : 'Add New Address'}
        </h2>
        <AddressForm
          address={editingAddress || undefined}
          onSuccess={(address) => handleFormSuccess(address, !!editingAddress)}
          onCancel={handleCancelForm}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-text-primary">
          Saved Addresses
        </h2>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-600 transition-colors"
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
              d="M12 4v16m8-8H4"
            />
          </svg>
          Add Address
        </button>
      </div>

      {error && (
        <div className="p-4 bg-error/10 border border-error/20 rounded-lg">
          <p className="text-error text-sm">{error}</p>
        </div>
      )}

      {addresses.length === 0 ? (
        <div className="text-center py-12 bg-background-secondary rounded-lg border border-border">
          <svg
            className="w-12 h-12 mx-auto text-text-muted mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          <h3 className="text-lg font-medium text-text-primary mb-2">
            No saved addresses
          </h3>
          <p className="text-text-secondary mb-6">
            Add an address to make checkout faster.
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center px-6 py-2.5 bg-primary text-white rounded-lg hover:bg-primary-600 transition-colors"
          >
            Add your first address
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {addresses.map((address) => (
            <AddressCard
              key={address.id}
              address={address}
              onEdit={() => setEditingAddress(address)}
              onDelete={() => handleDelete(address.id)}
              onSetDefault={() => handleSetDefault(address.id)}
              isDeleting={deletingId === address.id}
              isSettingDefault={settingDefaultId === address.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface AddressCardProps {
  address: CustomerAddress;
  onEdit: () => void;
  onDelete: () => void;
  onSetDefault: () => void;
  isDeleting: boolean;
  isSettingDefault: boolean;
}

function AddressCard({
  address,
  onEdit,
  onDelete,
  onSetDefault,
  isDeleting,
  isSettingDefault,
}: AddressCardProps) {
  return (
    <div
      className={`bg-background-secondary rounded-lg border p-6 ${
        address.is_default ? 'border-primary' : 'border-border'
      }`}
    >
      {/* Header with label and default badge */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          {address.label && (
            <span className="font-medium text-text-primary">
              {address.label}
            </span>
          )}
          {address.is_default && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
              Default
            </span>
          )}
        </div>
      </div>

      {/* Address details */}
      <div className="text-sm text-text-secondary space-y-1">
        <p className="font-medium text-text-primary">{address.name}</p>
        {address.company && <p>{address.company}</p>}
        <p>{address.line1}</p>
        {address.line2 && <p>{address.line2}</p>}
        <p>
          {address.city}
          {address.state && `, ${address.state}`} {address.postal_code}
        </p>
        <p>{address.country}</p>
        {address.phone && <p className="pt-1">{address.phone}</p>}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border">
        <button
          onClick={onEdit}
          className="text-sm font-medium text-primary hover:text-primary-600 transition-colors"
        >
          Edit
        </button>
        {!address.is_default && (
          <button
            onClick={onSetDefault}
            disabled={isSettingDefault}
            className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50"
          >
            {isSettingDefault ? 'Setting...' : 'Set as default'}
          </button>
        )}
        <button
          onClick={onDelete}
          disabled={isDeleting}
          className="text-sm font-medium text-error hover:text-error/80 transition-colors disabled:opacity-50"
        >
          {isDeleting ? 'Deleting...' : 'Delete'}
        </button>
      </div>
    </div>
  );
}
