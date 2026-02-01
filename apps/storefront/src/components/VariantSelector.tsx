import { useState, useEffect } from 'react';

export interface VariantOption {
  id: string;
  sku: string;
  title: string;
  price_cents: number;
  image_url: string | null;
  available: boolean;
  /** Available quantity for inventory validation (defaults to 10 if not provided) */
  availableQuantity?: number;
}

interface VariantSelectorProps {
  variants: VariantOption[];
  selectedVariantId: string | null;
  onVariantSelect: (variantId: string) => void;
}

export default function VariantSelector({
  variants,
  selectedVariantId,
  onVariantSelect,
}: VariantSelectorProps) {
  const [selected, setSelected] = useState<string | null>(selectedVariantId);

  useEffect(() => {
    setSelected(selectedVariantId);
  }, [selectedVariantId]);

  const handleSelect = (variantId: string) => {
    setSelected(variantId);
    onVariantSelect(variantId);
  };

  if (variants.length <= 1) {
    return null;
  }

  return (
    <fieldset className="space-y-3">
      <legend className="block text-sm font-medium text-text">
        Select Option
      </legend>
      <div className="flex flex-wrap gap-2" role="group">
        {variants.map((variant) => {
          const isSelected = selected === variant.id;
          const isDisabled = !variant.available;

          return (
            <button
              key={variant.id}
              type="button"
              onClick={() => !isDisabled && handleSelect(variant.id)}
              disabled={isDisabled}
              className={`
                relative px-4 py-2 text-sm font-medium rounded-lg border transition-all duration-normal
                ${
                  isSelected
                    ? 'border-primary bg-primary text-text-inverse'
                    : isDisabled
                      ? 'border-border bg-background-tertiary text-text-muted cursor-not-allowed'
                      : 'border-border bg-background-secondary text-text hover:border-primary'
                }
              `}
              aria-pressed={isSelected}
              aria-disabled={isDisabled}
            >
              {variant.title}
              {isDisabled && (
                <span className="absolute inset-0 flex items-center justify-center">
                  <span className="sr-only">Sold out</span>
                  <span
                    className="absolute inset-0 border-t border-text-muted rotate-[-20deg] origin-center"
                    style={{ top: '50%' }}
                    aria-hidden="true"
                  />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
