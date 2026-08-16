/**
 * Soft reconciliation: payments should ≈ net + tax + service charges + tips − refunds ± rounding.
 */
import { r2 } from "./eodHelpers.js";

const TOLERANCE = 0.05;

export function reconcileEod(report) {
  const sales = report?.detailedSalesSummary || {};
  const payments = report?.paymentsSummary || {};
  const taxTip = report?.salesTaxAndTipSummary || {};

  const net = r2(sales.netSales);
  const tax = r2(sales.totalSalesTaxes);
  const serviceCharges = r2(
    taxTip.serviceCharges ?? sales.totalServiceCharges
  );
  const tips = r2(taxTip.totalTips ?? report?.tipsSummary?.totalTips);
  const refunds = r2(sales.totalRefundAmount);
  const expected = r2(net + tax + serviceCharges + tips - refunds);
  const actual = r2(payments.totalPayment);
  const difference = r2(actual - expected);
  const ok = Math.abs(difference) <= TOLERANCE;

  const messages = [];
  if (!ok) {
    messages.push(
      `Payment totals require attention before relying on this report. Expected ≈ ${expected.toFixed(2)} (net + tax + service charges + tips − refunds), actual payments ${actual.toFixed(2)} (difference ${difference.toFixed(2)}).`
    );
  }

  const cashRounding = r2(payments.totalCashRounding);
  if (Math.abs(cashRounding) > 0.5) {
    messages.push(
      `Cash rounding is unusually large (${cashRounding.toFixed(2)}).`
    );
  }

  return {
    ok,
    messages,
    expectedPaymentTotal: expected,
    actualPaymentTotal: actual,
    difference,
  };
}
