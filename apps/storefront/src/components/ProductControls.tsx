import { useState, useEffect } from 'react';
import VariantSelector, { type VariantOption } from './VariantSelector';
import AddToCart from './AddToCart';
import { initializeCart } from '../stores/cart';

interface ProductControlsProps {
  productTitle: string;
  variants: VariantOption[];
  defaultVariantId: string | null;
}

export default function ProductControls({
  productTitle,
  variants,
  defaultVariantId,
}: ProductControlsProps) {
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
    defaultVariantId
  );

  // Initialize cart store on mount
  useEffect(() => {
    initializeCart();
  }, []);

  const selectedVariant = variants.find((v) => v.id === selectedVariantId);
  const hasMultipleVariants = variants.length > 1;

  const handleVariantSelect = (variantId: string) => {
    setSelectedVariantId(variantId);
  };

  return (
    <div className="space-y-6">
      {/* Variant Selector */}
      {hasMultipleVariants && (
        <VariantSelector
          variants={variants}
          selectedVariantId={selectedVariantId}
          onVariantSelect={handleVariantSelect}
        />
      )}

      {/* Add to Cart */}
      <AddToCart
        variantId={selectedVariant?.id ?? null}
        variantSku={selectedVariant?.sku ?? null}
        variantTitle={selectedVariant?.title ?? ''}
        productTitle={productTitle}
        price={selectedVariant?.price_cents ?? 0}
        available={selectedVariant?.available ?? false}
        imageUrl={selectedVariant?.image_url ?? null}
      />
    </div>
  );
}
