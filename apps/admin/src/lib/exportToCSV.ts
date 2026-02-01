/**
 * CSV Export Utility
 * Provides functions for generating and downloading CSV files.
 */

interface GenerateCSVOptions {
  headers?: string[];
}

interface InventoryExportRow {
  sku: string;
  product_title: string;
  variant_title: string;
  on_hand: number;
  reserved: number;
  available: number;
  low_stock_threshold: number | null;
  reorder_point: number | null;
  status: string;
}

/**
 * Escape a CSV field to handle special characters
 */
export function escapeCsvField(
  field: string | number | null | undefined
): string {
  if (field === null || field === undefined) {
    return '';
  }
  const str = String(field);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Format a column name from snake_case to Title Case
 * Special handling for abbreviations like SKU
 */
export function formatColumnHeader(column: string): string {
  // Special cases for abbreviations
  if (column.toLowerCase() === 'sku') {
    return 'SKU';
  }

  // Convert snake_case to Title Case
  return column
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Generate CSV content from an array of data objects
 */
export function generateCSV<T extends object>(
  data: T[],
  columns: (keyof T)[],
  options?: GenerateCSVOptions
): string {
  const rows: string[] = [];

  // Generate headers
  const headers = options?.headers
    ? options.headers
    : columns.map((col) => formatColumnHeader(String(col)));

  rows.push(headers.join(','));

  // Generate data rows
  for (const item of data) {
    const row = columns.map((col) =>
      escapeCsvField(item[col] as string | number | null | undefined)
    );
    rows.push(row.join(','));
  }

  return rows.join('\n');
}

/**
 * Generate CSV specifically for inventory data
 */
export function generateInventoryCSV(data: InventoryExportRow[]): string {
  const columns: (keyof InventoryExportRow)[] = [
    'sku',
    'product_title',
    'variant_title',
    'on_hand',
    'reserved',
    'available',
    'low_stock_threshold',
    'reorder_point',
    'status',
  ];

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

  return generateCSV(data, columns, { headers });
}

/**
 * Trigger a CSV download in the browser
 */
export function downloadCSV(csvContent: string, filename?: string): void {
  // Generate filename with current date if not provided
  const date = new Date().toISOString().split('T')[0];
  const finalFilename = filename || `inventory-${date}.csv`;

  // Create blob with BOM for Excel compatibility
  const bom = '\uFEFF';
  const blob = new Blob([bom + csvContent], {
    type: 'text/csv;charset=utf-8;',
  });

  // Create download link
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = finalFilename;

  // Trigger download
  document.body.appendChild(link);
  link.click();

  // Cleanup
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
