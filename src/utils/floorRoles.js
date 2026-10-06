/**
 * Sales / floor role helpers (mirrors Mobile/src/utils/floorRoles.ts).
 */

const PRINTER_MANAGER_ROLES = new Set([
  "ADMIN",
  "SUPER ADMIN",
  "MANAGER",
  "MASTER TERMINAL",
  "MANAGER TERMINAL",
]);

/** Roles allowed to collect payment from Create Order (table / takeaway / staff). */
const CREATE_ORDER_PAY_ROLES = new Set([
  "ADMIN",
  "SUPER ADMIN",
  "MANAGER",
  "MASTER TERMINAL",
  "MANAGER TERMINAL",
]);

/** Roles that may add / edit / delete restaurant printers. */
export function canManagePrinters(role) {
  if (!role) return false;
  return PRINTER_MANAGER_ROLES.has(String(role).trim().toUpperCase());
}

/**
 * Only Manager / Master Terminal (and admin) may Pay Now from Create Order.
 * Staff must use Today's Orders / main counter.
 */
export function canPayFromCreateOrder(role) {
  if (!role) return false;
  return CREATE_ORDER_PAY_ROLES.has(String(role).trim().toUpperCase());
}
