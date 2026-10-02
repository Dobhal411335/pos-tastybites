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

/** Roles that may add / edit / delete restaurant printers. */
export function canManagePrinters(role) {
  if (!role) return false;
  return PRINTER_MANAGER_ROLES.has(String(role).trim().toUpperCase());
}
