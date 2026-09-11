/**
 * Soft-delete visibility helpers for Order queries.
 * Active lists/reports: isActive !== false (treats missing as active).
 * Deleted/restore admin view: isActive === false only.
 */
export const ACTIVE_ORDER_FILTER = { isActive: { $ne: false } };
export const DELETED_ORDER_FILTER = { isActive: false };

export function withActiveOrderFilter(match = {}) {
  return { ...match, ...ACTIVE_ORDER_FILTER };
}
