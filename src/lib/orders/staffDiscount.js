export const STAFF_DISCOUNT_CODE = "STAFF";

export function normalizeStaffDiscountPercent(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(100, n);
}

export function calcStaffDiscountAmount(subTotal, percent) {
  const pct = normalizeStaffDiscountPercent(percent);
  if (pct <= 0) return 0;
  return Math.round(((Number(subTotal) || 0) * pct) / 100 * 100) / 100;
}

export function buildStaffDiscountState(percent, employeeName) {
  const value = normalizeStaffDiscountPercent(percent);
  if (value <= 0) return null;
  return {
    code: STAFF_DISCOUNT_CODE,
    value,
    type: "%",
    label: employeeName
      ? `${employeeName} · ${value}% staff`
      : `Staff ${value}%`,
  };
}
