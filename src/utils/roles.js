const SALES_ADMIN_ROLES = new Set(["ADMIN", "SUPER ADMIN"]);

export function isSalesAdminRole(role) {
  if (!role) return false;
  return SALES_ADMIN_ROLES.has(String(role).trim().toUpperCase());
}
