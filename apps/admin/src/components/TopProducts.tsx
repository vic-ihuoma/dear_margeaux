export interface TopProductData {
  /** Product ID */
  id: string;
  /** Product title */
  title: string;
  /** Product thumbnail URL */
  image?: string;
  /** Total units sold */
  unitsSold: number;
  /** Total revenue in cents */
  revenue: number;
}

export interface TopProductsProps {
  /** Array of top products data */
  products: TopProductData[];
  /** Whether data is still loading */
  loading?: boolean;
  /** Maximum number of products to show */
  limit?: number;
}

/**
 * Format cents to a currency string
 */
function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

/**
 * TopProducts component displays a table of best-selling products
 */
export function TopProducts({
  products,
  loading = false,
  limit = 5,
}: TopProductsProps) {
  const displayProducts = products.slice(0, limit);

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: limit }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 animate-pulse">
            <div className="w-12 h-12 bg-background-tertiary rounded-lg" />
            <div className="flex-1">
              <div className="h-4 bg-background-tertiary rounded w-3/4 mb-2" />
              <div className="h-3 bg-background-tertiary rounded w-1/2" />
            </div>
            <div className="h-4 bg-background-tertiary rounded w-16" />
          </div>
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="h-48 flex flex-col items-center justify-center text-text-muted">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="1.5"
          stroke="currentColor"
          className="w-12 h-12 mb-3 opacity-50"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m21 7.5-9-5.25L3 7.5m18 0-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9"
          />
        </svg>
        <p className="text-sm">No product sales data yet</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-3 px-2 text-xs font-medium text-text-secondary uppercase tracking-wider">
              Product
            </th>
            <th className="text-right py-3 px-2 text-xs font-medium text-text-secondary uppercase tracking-wider">
              Units
            </th>
            <th className="text-right py-3 px-2 text-xs font-medium text-text-secondary uppercase tracking-wider">
              Revenue
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {displayProducts.map((product, index) => (
            <tr
              key={product.id}
              className="hover:bg-background-tertiary transition-colors"
            >
              <td className="py-3 px-2">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-text-muted w-5">
                    {index + 1}
                  </span>
                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-background-tertiary flex-shrink-0">
                    {product.image ? (
                      <img
                        src={product.image}
                        alt={product.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-text-muted">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth="1.5"
                          stroke="currentColor"
                          className="w-5 h-5"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
                          />
                        </svg>
                      </div>
                    )}
                  </div>
                  <a
                    href={`/products/${product.id}`}
                    className="text-sm font-medium text-text-primary hover:text-primary-600 transition-colors truncate max-w-[200px]"
                    title={product.title}
                  >
                    {product.title}
                  </a>
                </div>
              </td>
              <td className="py-3 px-2 text-right">
                <span className="text-sm text-text-secondary">
                  {product.unitsSold}
                </span>
              </td>
              <td className="py-3 px-2 text-right">
                <span className="text-sm font-medium text-text-primary">
                  {formatCurrency(product.revenue)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
