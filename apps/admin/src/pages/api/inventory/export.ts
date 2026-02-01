import type { APIRoute } from 'astro';
import { MerchantClient, type InventoryItem } from '@dear-margeaux/api';
import { escapeCsvField } from '../../../lib/exportToCSV';

function getApiConfig() {
  const baseUrl = import.meta.env.MERCHANT_API_URL;
  const apiKey = import.meta.env.MERCHANT_ADMIN_KEY;

  if (!baseUrl || !apiKey) {
    return null;
  }

  return { baseUrl, apiKey };
}

interface InventoryItemWithExtras extends InventoryItem {
  productTitle?: string;
  variantTitle?: string;
}

// Get stock status label
function getStockStatus(item: InventoryItem): string {
  const threshold = item.low_stock_threshold ?? 5;
  if (item.available <= 0) return 'Out of Stock';
  if (item.available <= threshold) return 'Low Stock';
  return 'In Stock';
}

// Generate CSV content from inventory items
function generateInventoryCsv(
  items: InventoryItemWithExtras[],
  skuToProduct: Map<
    string,
    {
      productTitle: string;
      variantTitle: string;
      low_stock_threshold: number | null;
      reorder_point: number | null;
    }
  >
): string {
  // CSV header
  const headers = [
    'SKU',
    'Product',
    'Variant',
    'On Hand',
    'Reserved',
    'Available',
    'Low Stock Threshold',
    'Reorder Point',
    'Status',
  ];

  const rows: string[] = [];

  // Add header row
  rows.push(headers.join(','));

  // Add data rows
  for (const item of items) {
    const productInfo = skuToProduct.get(item.sku);
    const status = getStockStatus(item);

    const row = [
      escapeCsvField(item.sku),
      escapeCsvField(productInfo?.productTitle ?? 'Unknown'),
      escapeCsvField(productInfo?.variantTitle ?? 'Unknown'),
      escapeCsvField(item.on_hand),
      escapeCsvField(item.reserved),
      escapeCsvField(item.available),
      escapeCsvField(item.low_stock_threshold),
      escapeCsvField(item.reorder_point),
      escapeCsvField(status),
    ];
    rows.push(row.join(','));
  }

  return rows.join('\n');
}

export const GET: APIRoute = async () => {
  const config = getApiConfig();

  if (!config) {
    return new Response(JSON.stringify({ error: 'API not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const client = new MerchantClient({
      baseUrl: config.baseUrl,
      apiKey: config.apiKey,
    });

    // Fetch inventory items
    const inventoryResponse = await client.getInventory({ limit: 1000 });
    const inventoryItems = inventoryResponse.items;

    // Fetch products to build SKU to product mapping
    // Paginate through all products to ensure complete data
    const skuToProduct = new Map<
      string,
      {
        productTitle: string;
        variantTitle: string;
        low_stock_threshold: number | null;
        reorder_point: number | null;
      }
    >();

    let nextCursor: string | null = null;
    do {
      const productsResponse = await client.getProducts({
        limit: 100,
        ...(nextCursor && { cursor: nextCursor }),
      });

      // Fetch full product details sequentially to avoid rate limiting
      for (const productItem of productsResponse.items) {
        const product = await client.getProduct(productItem.id);
        for (const variant of product.variants) {
          skuToProduct.set(variant.sku, {
            productTitle: product.title,
            variantTitle: variant.title,
            low_stock_threshold: variant.low_stock_threshold,
            reorder_point: variant.reorder_point,
          });
        }
      }

      nextCursor = productsResponse.pagination.next_cursor;
    } while (nextCursor);

    // Generate CSV
    const csvContent = generateInventoryCsv(inventoryItems, skuToProduct);

    // Create filename with current date
    const date = new Date().toISOString().split('T')[0];
    const filename = `inventory-${date}.csv`;

    // Add BOM for Excel compatibility
    const bom = '\uFEFF';

    return new Response(bom + csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Failed to export inventory:', error);

    const message =
      error instanceof Error ? error.message : 'Failed to export inventory';

    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
