import Order from "@/models/Order";
import Employee from "@/models/employee/Employee";
import {
  formatEmployeeName,
  normalizePaymentTypeLabel,
  r2,
  resolveSplitTenders,
  resolveTenders,
} from "@/lib/eod/eodHelpers";
import {
  formatMergedSeatLabel,
  getOrderPaidAmount,
  groupItemsBySeat,
  isSeatBasedPaymentSplits,
  normalizeSeatNumbersList,
} from "@/lib/orders/seatHelpers";
import { getItemLineTotal } from "@/utils/productChoices";
import {
  getOrderSourceLabel,
  getOrderTypeLabel,
} from "@/utils/orderDisplay";
import { toObjectId } from "./match.js";

function shapeCustomExtras(list) {
  return (Array.isArray(list) ? list : []).map((extra) => {
    const rawQty = Number(extra?.qty);
    const qty = Number.isFinite(rawQty)
      ? Math.min(99, Math.max(1, Math.floor(rawQty)))
      : 1;
    return {
      name: extra?.name || "",
      price: r2(extra?.price),
      qty,
    };
  });
}

export function shapeFinancialOrderItems(items) {
  return (Array.isArray(items) ? items : []).map((item) => {
    const customExtras = shapeCustomExtras(item?.customExtras);
    return {
      cartId: item?.cartId || null,
      name: item?.name || "Item",
      productCode: item?.productCode || "",
      category: item?.category || null,
      size: item?.size || "Standard",
      qty: Number(item?.qty) || 0,
      price: r2(item?.price),
      tax: r2(item?.tax),
      serviceCharge: r2(item?.serviceCharge),
      customExtras,
      lineTotal: r2(getItemLineTotal(item)),
      choices: Array.isArray(item?.choices) ? item.choices : [],
      choiceSelections: Array.isArray(item?.choiceSelections)
        ? item.choiceSelections
        : [],
      customDataSelections: Array.isArray(item?.customDataSelections)
        ? item.customDataSelections
        : [],
      addonChoiceSelections: Array.isArray(item?.addonChoiceSelections)
        ? item.addonChoiceSelections
        : [],
      inclusions: Array.isArray(item?.inclusions) ? item.inclusions : [],
      options: Array.isArray(item?.options) ? item.options : [],
      drinks: Array.isArray(item?.drinks) ? item.drinks : [],
      notes: item?.notes || "",
      productType: item?.productType || null,
      isOffer: Boolean(item?.isOffer),
      seatNumber: item?.seatNumber ?? null,
      preparationStyle: item?.preparationStyle || null,
    };
  });
}

export function shapeFinancialPaymentSplits(splits) {
  return (Array.isArray(splits) ? splits : []).map((split) => {
    const tenders = resolveSplitTenders(split);
    const seatNumbers = normalizeSeatNumbersList(split);
    const methodLabel =
      split?.cardType && /card/i.test(String(split?.method || ""))
        ? `Card - ${split.cardType}`
        : split?.method || null;
    return {
      name: split?.name || "Payer",
      amount: r2(split?.amount),
      method: split?.method || null,
      methodLabel,
      cardType: split?.cardType || null,
      tipAmount: r2(split?.tipAmount),
      tipMethod: split?.tipMethod || null,
      cashAmount: split?.cashAmount != null ? r2(split.cashAmount) : tenders.cash || null,
      cardAmount: split?.cardAmount != null ? r2(split.cardAmount) : tenders.card || null,
      giftAmount: tenders.giftCard > 0 ? tenders.giftCard : null,
      seatNumber: split?.seatNumber ?? null,
      seatNumbers: seatNumbers.length ? seatNumbers : null,
      seatLabel: seatNumbers.length
        ? formatMergedSeatLabel(seatNumbers)
        : split?.seatNumber != null
          ? formatMergedSeatLabel([split.seatNumber])
          : null,
      paidAt: split?.paidAt || null,
      tenders: {
        cash: tenders.cash,
        card: tenders.card,
        giftCard: tenders.giftCard,
        tip: tenders.tip,
      },
    };
  });
}

/**
 * Lightweight list-row metadata for financial tables (orders / invoices / payments).
 */
export function shapeFinancialListMeta(order) {
  const source = String(order?.source || "POS").toUpperCase();
  const items = Array.isArray(order?.items) ? order.items : [];
  const splits = Array.isArray(order?.paymentSplits) ? order.paymentSplits : [];
  const seatGroups = groupItemsBySeat(items);
  const hasSeatItems = items.some(
    (item) => item?.seatNumber != null && item?.seatNumber !== ""
  );
  const paidAmount = getOrderPaidAmount(splits);
  const due = r2(order?.totalAmount);
  const paymentStatus = order?.paymentStatus || null;

  return {
    source,
    sourceLabel: getOrderSourceLabel(source),
    orderTypeLabel: getOrderTypeLabel(order),
    splitCount: splits.length,
    hasSplits: splits.length > 0,
    hasSeatItems,
    seatBasedPayments: isSeatBasedPaymentSplits(splits, items),
    seatGroupCount: seatGroups.length,
    guestCount: order?.guestCount ?? null,
    tipMethod: order?.tipMethod || null,
    serviceChargeName: order?.serviceChargeName || null,
    discountCode: order?.discountCode || null,
    discountPercent: order?.discountPercent ?? null,
    giftcardCode: order?.giftcardCode || null,
    paymentStatus,
    paidAmount: r2(paidAmount),
    remainingDue:
      paymentStatus === "PARTIAL" || paymentStatus === "UNPAID"
        ? r2(Math.max(0, due - paidAmount))
        : 0,
  };
}

/**
 * Full order detail payload for financial report sheets.
 * Compatible with OrderDetailBody (raw order fields + enriched labels).
 */
export function shapeFinancialOrderDetail(order, { processedByName, waivedByName } = {}) {
  const source = String(order?.source || "POS").toUpperCase();
  const items = shapeFinancialOrderItems(order?.items);
  const paymentSplits = shapeFinancialPaymentSplits(order?.paymentSplits);
  const seatGroups = groupItemsBySeat(items).map((group) => ({
    seatNumber: group.seatNumber,
    label: group.label,
    items: group.items,
    subtotal: r2(
      group.items.reduce((sum, item) => sum + (Number(item.lineTotal) || 0), 0)
    ),
  }));
  const meta = shapeFinancialListMeta({
    ...order,
    items: order?.items,
    paymentSplits: order?.paymentSplits,
  });
  const tenders =
    order?.paymentStatus === "PAID" || Number(order?.cashAmount) > 0 || Number(order?.cardAmount) > 0
      ? resolveTenders(order)
      : { cash: 0, card: 0, giftCard: r2(order?.giftcardUsedAmount), tip: r2(order?.tipAmount) };

  return {
    ...order,
    id: String(order._id),
    source,
    sourceLabel: getOrderSourceLabel(source),
    orderTypeLabel: getOrderTypeLabel(order),
    processedByName: processedByName || null,
    waivedByName: waivedByName || null,
    items,
    seatGroups,
    paymentSplits,
    paymentLabel: normalizePaymentTypeLabel(
      order?.paymentMethod,
      order?.giftcardUsedAmount
    ),
    cash: tenders.cash,
    card: tenders.card,
    giftCard: tenders.giftCard,
    tip: tenders.tip,
    cashAmount: order?.cashAmount != null ? r2(order.cashAmount) : null,
    cardAmount: order?.cardAmount != null ? r2(order.cardAmount) : null,
    giftcardUsedAmount: r2(order?.giftcardUsedAmount),
    giftcardCode: order?.giftcardCode || null,
    tipMethod: order?.tipMethod || null,
    serviceChargeName: order?.serviceChargeName || null,
    discountCode: order?.discountCode || null,
    discountPercent: order?.discountPercent ?? null,
    subTotal: r2(order?.subTotal),
    discountTotal: r2(order?.discountTotal),
    taxTotal: r2(order?.taxTotal),
    serviceChargeTotal: r2(order?.serviceChargeTotal),
    tipAmount: r2(order?.tipAmount),
    totalAmount: r2(order?.totalAmount),
    paidAmount: meta.paidAmount,
    remainingDue: meta.remainingDue,
    hasSeatItems: meta.hasSeatItems,
    seatBasedPayments: meta.seatBasedPayments,
    splitCount: meta.splitCount,
  };
}

export async function fetchFinancialOrderDetail({ restaurantId, orderId }) {
  const rid = toObjectId(restaurantId);
  const oid = toObjectId(orderId);
  if (!rid || !oid) {
    const err = new Error("Invalid order id");
    err.status = 400;
    throw err;
  }

  const order = await Order.findOne({ _id: oid, restaurantId: rid }).lean();
  if (!order) {
    const err = new Error("Order not found");
    err.status = 404;
    throw err;
  }

  const peopleIds = [order.processedBy, order.waivedBy].filter(Boolean);
  let processedByName = null;
  let waivedByName = null;
  if (peopleIds.length) {
    const people = await Employee.find({ _id: { $in: peopleIds } })
      .select("firstName lastName name")
      .lean();
    const byId = new Map(
      people.map((emp) => [String(emp._id), formatEmployeeName(emp)])
    );
    processedByName = order.processedBy
      ? byId.get(String(order.processedBy)) || null
      : null;
    waivedByName = order.waivedBy
      ? byId.get(String(order.waivedBy)) || null
      : null;
  }

  return shapeFinancialOrderDetail(order, { processedByName, waivedByName });
}
