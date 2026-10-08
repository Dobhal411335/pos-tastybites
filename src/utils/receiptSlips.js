/**
 * Build PrintPreviewModal `slips` from order.paymentSplits
 * (shared by thank-you + today-sales).
 */

import {
  filterItemsBySeat,
  filterItemsBySeats,
  formatMergedSeatLabel,
  formatSeatLabel,
  proportionalOrderTotalsForItems,
} from "@/lib/orders/seatHelpers";

export function seatsFromSplit(split) {
  if (Array.isArray(split?.seatNumbers) && split.seatNumbers.length) {
    return split.seatNumbers;
  }
  if (split?.seatNumber !== undefined && split?.seatNumber !== null) {
    return [split.seatNumber];
  }
  return [];
}

export function splitDisplayName(split, index = 0) {
  const name = String(split?.name || "").trim();
  if (name) return name;
  const seats = seatsFromSplit(split);
  if (seats.length > 1) return formatMergedSeatLabel(seats);
  if (seats.length === 1) return formatSeatLabel(seats[0]);
  return `Payer ${index + 1}`;
}

/**
 * @param {object|null|undefined} order
 * @returns {Array<{
 *   id: string,
 *   label: string,
 *   order: object,
 *   jobMetadata: object,
 * }>|null}
 */
export function buildPaymentSplitReceiptSlips(order) {
  if (!order) return null;
  const paymentSplits = Array.isArray(order.paymentSplits)
    ? order.paymentSplits
    : [];
  if (!paymentSplits.length) return null;

  return paymentSplits.map((split, index) => {
    const seats = seatsFromSplit(split);
    const label =
      seats.length > 1
        ? formatMergedSeatLabel(seats)
        : seats.length === 1
          ? formatSeatLabel(seats[0])
          : splitDisplayName(split, index);
    const tipAmt = Number(split.tipAmount) || 0;
    const cashAmt = Number(split.cashAmount) || 0;
    const cardAmt = Number(split.cardAmount) || 0;
    const giftAmt =
      Number(split.giftAmount) ||
      Number(split.giftcardUsedAmount) ||
      Number(split.giftUseAmount) ||
      0;
    const amount = Number(split.amount) || 0;
    const method =
      String(split.method || split.paymentMethod || "").trim() || "Card";
    const partyName = splitDisplayName(split, index);

    const items =
      seats.length > 1
        ? filterItemsBySeats(order.items || [], seats)
        : seats.length === 1
          ? filterItemsBySeat(order.items || [], seats[0])
          : order.items || [];

    const totals = seats.length
      ? proportionalOrderTotalsForItems(order, items)
      : {
          subTotal: order.subTotal,
          taxTotal: order.taxTotal,
          discountTotal: order.discountTotal,
          serviceChargeTotal: order.serviceChargeTotal,
          totalAmount: amount || order.totalAmount,
          taxBreakdown: order.taxBreakdown,
        };

    const previewOrder = {
      ...order,
      items: order.items || [],
      subTotal: Number(totals.subTotal || 0),
      taxTotal: Number(totals.taxTotal || 0),
      discountTotal: Number(totals.discountTotal || 0),
      serviceChargeTotal: Number(totals.serviceChargeTotal || 0),
      totalAmount: amount > 0 ? amount : Number(totals.totalAmount || 0),
      tipAmount: tipAmt,
      tipMethod: tipAmt > 0 ? split.tipMethod || null : null,
      giftcardUsedAmount: giftAmt,
      cashAmount: cashAmt,
      cardAmount: cardAmt,
      paymentMethod: method,
      guestName: partyName,
      partyName,
      taxBreakdown: totals.taxBreakdown || order.taxBreakdown,
    };

    const jobMetadata = {
      isSplitReceipt: true,
      filterReceiptBySeat: seats.length > 0,
      splitIndex: index + 1,
      splitTotal: paymentSplits.length,
      splitSeatNumber: seats.length === 1 ? seats[0] : null,
      splitSeatNumbers: seats,
      splitName: partyName,
      splitAmount: amount,
      splitMethod: method,
      paymentMethod: method,
      cashAmount: cashAmt,
      cardAmount: cardAmt,
      tipAmount: tipAmt,
      giftcardUsedAmount: giftAmt,
      guestName: partyName,
      partyName,
    };

    return {
      id: String(split._id || split.id || `slip-${index}`),
      label,
      order: previewOrder,
      jobMetadata,
    };
  });
}

/**
 * Map historical KOT / bar PrintJob rows into PrintPreviewModal slips.
 * @param {Array<object>} jobs
 * @param {"kot"|"bar"} kind
 * @returns {Array<{id:string,label:string,jobId:string,kotItems:any[]}>}
 */
export function buildTicketHistorySlips(jobs, kind = "kot") {
  const list = Array.isArray(jobs) ? jobs : [];
  const originals = list.filter(
    (job) =>
      !job?.parentPrintJobId &&
      !job?.metadata?.isReprint,
  );
  const ordered = [...originals].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  const prefix = kind === "bar" ? "Bar" : "KOT";

  return ordered.map((job, index) => {
    const meta = job.metadata || {};
    const items =
      (Array.isArray(meta.kotItems) && meta.kotItems.length
        ? meta.kotItems
        : null) ||
      (Array.isArray(meta.barItems) && meta.barItems.length
        ? meta.barItems
        : null) ||
      [];

    let timeLabel = "";
    try {
      const d = new Date(job.createdAt);
      if (!Number.isNaN(d.getTime())) {
        timeLabel = d.toLocaleTimeString([], {
          hour: "numeric",
          minute: "2-digit",
        });
      }
    } catch {
      /* ignore */
    }

    return {
      id: String(job._id),
      jobId: String(job._id),
      label: timeLabel
        ? `${prefix} ${index + 1} · ${timeLabel}`
        : `${prefix} ${index + 1}`,
      kotItems: items,
    };
  });
}
