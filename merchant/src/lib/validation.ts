/**
 * Shared validation utilities for the Merchant API
 */

/**
 * Validates ISO 8601 date format
 * Accepts: YYYY-MM-DD or full ISO datetime strings
 */
export function isValidISODate(dateStr: string): boolean {
  // Check for basic date format YYYY-MM-DD
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  // Check for full ISO 8601 datetime format
  const datetimeRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|[+-]\d{2}:\d{2})?$/;

  if (!dateRegex.test(dateStr) && !datetimeRegex.test(dateStr)) {
    return false;
  }

  const date = new Date(dateStr);
  return !isNaN(date.getTime());
}
