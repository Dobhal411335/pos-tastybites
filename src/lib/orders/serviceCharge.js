const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

export const SERVICE_CHARGE_NO_TIP_MESSAGE =
  "Service charge has already been given, so no tip is allowed.";

export function isActiveServiceTax(serviceTax) {
  return Boolean(serviceTax && String(serviceTax.status || "") !== "Inactive");
}

export function isPercentServiceTax(serviceTax) {
  return String(serviceTax?.type || "")
    .toLowerCase()
    .includes("percent");
}

export function formatServiceTaxRate(serviceTax) {
  if (!serviceTax) return "";
  const value = Number(serviceTax.value) || 0;
  if (isPercentServiceTax(serviceTax)) return `${value}%`;
  return `$${value.toFixed(2)}`;
}

/**
 * Percent: rate of discounted subtotal. Amount: flat order-level value.
 */
export function computeOrderServiceCharge({
  serviceTax,
  subtotal,
  discountAmount = 0,
}) {
  if (!isActiveServiceTax(serviceTax)) return 0;
  const value = Number(serviceTax.value) || 0;
  if (isPercentServiceTax(serviceTax)) {
    const base = Math.max(
      0,
      (Number(subtotal) || 0) - (Number(discountAmount) || 0),
    );
    return r2((base * value) / 100);
  }
  return r2(value);
}
