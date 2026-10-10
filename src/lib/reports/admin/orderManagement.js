import Order from "@/models/Order";
import { r2, resolveTenders } from "@/lib/eod/eodHelpers";
import { DEFAULT_RESTAURANT_TIMEZONE } from "@/lib/restaurantTime";
import { resolveDatePreset } from "@/lib/reports/financial/datePresets";
import {
  formatRestaurantDateWithDay,
  formatRestaurantTime,
} from "@/lib/reports/financial/format";
import {
  dateRangeBounds,
  escapeRegex,
  paymentTenderMatch,
  toObjectId,
} from "@/lib/reports/financial/match";
import {
  EMPLOYEE_LOOKUP,
  emptyKpis,
  KPI_GROUP,
  roundKpis,
  TENDER_STAGES,
} from "@/lib/reports/financial/metrics";
import {
  canDeleteOrder,
  getDeleteMode,
  hasRemovedCashTender,
  paymentDisplayLabel,
} from "@/lib/orders/orderDeleteEligibility";
import { getOrderPaidAmount } from "@/lib/orders/seatHelpers";
import {
  getOrderSourceLabel,
  getOrderTypeLabel,
} from "@/utils/orderDisplay";

function buildListMatch({
  restaurantId,
  dateFrom,
  dateTo,
  search,
  view,
}) {
  const rid = toObjectId(restaurantId);
  const { start, end } = dateRangeBounds(dateFrom, dateTo);
  const match = {
    restaurantId: rid,
    createdAt: { $gte: start, $lt: end },
  };

  const and = [];

  if (view === "deleted") {
    // Full soft-deletes OR soft-removed cash on still-active mixed orders.
    and.push({
      $or: [
        { isActive: false },
        { cashTenderRemovedAt: { $exists: true, $ne: null } },
      ],
    });
  } else {
    match.isActive = { $ne: false };
  }

  if (search) {
    const s = escapeRegex(search);
    and.push({
      $or: [
        { orderNumber: { $regex: s, $options: "i" } },
        { originalOrderNumber: { $regex: s, $options: "i" } },
        { invoiceNumber: { $regex: s, $options: "i" } },
        { originalInvoiceNumber: { $regex: s, $options: "i" } },
        { tableNo: { $regex: s, $options: "i" } },
        { partyName: { $regex: s, $options: "i" } },
        { guestName: { $regex: s, $options: "i" } },
        { paymentMethod: { $regex: s, $options: "i" } },
        { giftcardCode: { $regex: s, $options: "i" } },
      ],
    });
  }

  if (and.length === 1) {
    Object.assign(match, and[0]);
  } else if (and.length > 1) {
    match.$and = and;
  }

  return match;
}

function isPlaceholderNumber(value) {
  return /^(DEL-|RST-|DEL-INV-|RST-INV-)/i.test(String(value || "").trim());
}

/** Prefer human-readable refs; never expose DEL-/RST- placeholders in the UI. */
function displayRefNumber(primary, original, fallback = null) {
  if (original && !isPlaceholderNumber(original)) return original;
  if (primary && !isPlaceholderNumber(primary)) return primary;
  if (fallback && !isPlaceholderNumber(fallback)) return fallback;
  return null;
}

function mapRow(order, tz, view) {
  const tenders = resolveTenders(order);
  const paymentLabel = paymentDisplayLabel(order);
  const items = Array.isArray(order.items) ? order.items : [];
  const itemCount = items.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
  const splits = Array.isArray(order.paymentSplits) ? order.paymentSplits : [];
  const source = String(order.source || "POS").toUpperCase();
  const paidAmount = getOrderPaidAmount(splits);
  const due = r2(order.totalAmount);
  const paymentStatus = order.paymentStatus || null;

  const originalOrderNumber =
    order.originalOrderNumber && !isPlaceholderNumber(order.originalOrderNumber)
      ? order.originalOrderNumber
      : null;
  const originalInvoiceNumber =
    order.originalInvoiceNumber &&
    !isPlaceholderNumber(order.originalInvoiceNumber)
      ? order.originalInvoiceNumber
      : null;

  const isCashTenderRemoval =
    Boolean(order.cashTenderRemovedAt) && order.isActive !== false;
  const deletionKind =
    view === "deleted"
      ? isCashTenderRemoval
        ? "cash_tender"
        : "full"
      : null;

  // Deleted view: always prefer first-assigned (original) numbers so a cash-removed
  // split that was renumbered (e.g. 0033→0032) does not collide with a soft-deleted
  // peer that still displays original 0032.
  const orderNumberDisplay =
    view === "deleted"
      ? displayRefNumber(order.orderNumber, originalOrderNumber)
      : order.orderNumber;
  const invoiceNumberDisplay =
    view === "deleted"
      ? displayRefNumber(
          order.invoiceNumber,
          originalInvoiceNumber,
          originalOrderNumber || orderNumberDisplay
        )
      : order.invoiceNumber || null;

  // For deleted-view cash strips, show snapshot cash label context when useful.
  const paymentLabelForRow =
    view === "deleted" && isCashTenderRemoval
      ? "Cash removed"
      : paymentLabel;

  const liveOrderNumber =
    order.orderNumber && !isPlaceholderNumber(order.orderNumber)
      ? order.orderNumber
      : null;

  return {
    id: String(order._id),
    orderNumber: orderNumberDisplay,
    liveOrderNumber,
    originalOrderNumber: originalOrderNumber || orderNumberDisplay,
    invoiceNumber: invoiceNumberDisplay,
    originalInvoiceNumber: originalInvoiceNumber || invoiceNumberDisplay,
    date: formatRestaurantDateWithDay(order.createdAt, tz),
    time: formatRestaurantTime(order.createdAt, tz),
    createdAt: order.createdAt,
    table: order.tableNo || "—",
    server: order.employeeName || "Unknown",
    source,
    sourceLabel: getOrderSourceLabel(source),
    orderTypeLabel: getOrderTypeLabel(order),
    itemCount,
    hasCustomExtras: items.some(
      (item) =>
        Array.isArray(item?.customExtras) && item.customExtras.length > 0
    ),
    hasSeatItems: items.some(
      (item) => item?.seatNumber != null && item?.seatNumber !== ""
    ),
    splitCount: splits.length,
    hasSplits: splits.length > 0,
    total: due,
    tip: r2(order.tipAmount),
    tipMethod: order.tipMethod || null,
    paymentMethod: order.paymentMethod || null,
    paymentLabel: paymentLabelForRow,
    tenders: {
      cash: tenders.cash,
      card: tenders.card,
      giftCard: tenders.giftCard,
    },
    cashAmount: order.cashAmount != null ? r2(order.cashAmount) : null,
    cardAmount: order.cardAmount != null ? r2(order.cardAmount) : null,
    giftcardUsedAmount: r2(order.giftcardUsedAmount),
    paymentStatus,
    paidAmount: r2(paidAmount),
    remainingDue:
      paymentStatus === "PARTIAL" || paymentStatus === "UNPAID"
        ? r2(Math.max(0, due - paidAmount))
        : 0,
    status: order.status,
    guest: order.partyName || order.guestName || null,
    guestCount: order.guestCount == null ? null : Number(order.guestCount),
    canDelete:
      view !== "deleted" &&
      !hasRemovedCashTender(order) &&
      canDeleteOrder(order),
    deleteMode:
      view !== "deleted" && !hasRemovedCashTender(order)
        ? getDeleteMode(order)
        : null,
    hasRemovedCash: hasRemovedCashTender(order),
    canRestoreCash: hasRemovedCashTender(order),
    deletionKind,
    cashTenderRemovedAt: order.cashTenderRemovedAt || null,
    isActive: order.isActive !== false,
    deletedAt:
      order.deletedAt || order.cashTenderRemovedAt || null,
    deletedByName:
      order.deletedByName || order.cashTenderRemovedByName || null,
    deletionReason:
      order.deletionReason || order.cashTenderRemovalReason || null,
    restoredAt: order.restoredAt || null,
  };
}

const DELETED_BY_LOOKUP = [
  {
    $lookup: {
      from: "employees",
      localField: "deletedBy",
      foreignField: "_id",
      as: "_deletedBy",
    },
  },
  {
    $lookup: {
      from: "employees",
      localField: "cashTenderRemovedBy",
      foreignField: "_id",
      as: "_cashTenderRemovedBy",
    },
  },
  {
    $addFields: {
      deletedByName: {
        $let: {
          vars: { e: { $arrayElemAt: ["$_deletedBy", 0] } },
          in: {
            $cond: [
              { $ifNull: ["$$e", false] },
              {
                $trim: {
                  input: {
                    $concat: [
                      { $ifNull: ["$$e.firstName", ""] },
                      " ",
                      { $ifNull: ["$$e.lastName", ""] },
                    ],
                  },
                },
              },
              null,
            ],
          },
        },
      },
      cashTenderRemovedByName: {
        $let: {
          vars: { e: { $arrayElemAt: ["$_cashTenderRemovedBy", 0] } },
          in: {
            $cond: [
              { $ifNull: ["$$e", false] },
              {
                $trim: {
                  input: {
                    $concat: [
                      { $ifNull: ["$$e.firstName", ""] },
                      " ",
                      { $ifNull: ["$$e.lastName", ""] },
                    ],
                  },
                },
              },
              null,
            ],
          },
        },
      },
    },
  },
];

export async function buildOrderManagement({
  restaurantId,
  preset = "TODAY",
  dateFrom: rawFrom,
  dateTo: rawTo,
  paymentMethod = "ALL",
  search = "",
  view = "active",
  page = 1,
  pageSize = 25,
  timezone,
}) {
  const tz = timezone || DEFAULT_RESTAURANT_TIMEZONE;
  const resolved = resolveDatePreset(preset, rawFrom, rawTo);
  const { dateFrom, dateTo } = resolved;
  const activeView = view === "deleted" ? "deleted" : "active";
  const match = buildListMatch({
    restaurantId,
    dateFrom,
    dateTo,
    search: String(search || "").trim().slice(0, 80),
    view: activeView,
  });

  const pipeline = [{ $match: match }, ...TENDER_STAGES];
  const tenderMatch = paymentTenderMatch(paymentMethod);
  if (tenderMatch) pipeline.push({ $match: tenderMatch });

  const pageNum = Math.max(1, Number(page) || 1);
  const size = Math.min(100, Math.max(1, Number(pageSize) || 25));

  const deletedMatch = buildListMatch({
    restaurantId,
    dateFrom,
    dateTo,
    search: "",
    view: "deleted",
  });

  const [facet, deletedCount] = await Promise.all([
    Order.aggregate([
      ...pipeline,
      ...EMPLOYEE_LOOKUP,
      ...(activeView === "deleted" ? DELETED_BY_LOOKUP : []),
      {
        $facet: {
          kpis: [{ $group: KPI_GROUP }],
          total: [{ $count: "count" }],
          rows: [
            { $sort: { createdAt: -1, _id: -1 } },
            { $skip: (pageNum - 1) * size },
            { $limit: size },
          ],
        },
      },
    ]).then((rows) => rows[0]),
    Order.countDocuments(deletedMatch),
  ]);

  const kpis = roundKpis(facet?.kpis?.[0] || emptyKpis());
  const total = facet?.total?.[0]?.count || 0;
  const rows = (facet?.rows || []).map((row) =>
    mapRow(row, tz, activeView)
  );

  return {
    meta: {
      view: activeView,
      preset: resolved.preset,
      dateFrom,
      dateTo,
      paymentMethod: paymentMethod || "ALL",
      search: String(search || "").trim().slice(0, 80),
      page: pageNum,
      pageSize: size,
      total,
      totalPages: Math.max(1, Math.ceil(total / size)),
    },
    page: pageNum,
    pageSize: size,
    total,
    pageCount: Math.max(1, Math.ceil(total / size)),
    deletedCount: Number(deletedCount) || 0,
    kpis: {
      orderCount: kpis.orderCount,
      cash: kpis.cash,
      card: kpis.card,
      giftCard: kpis.giftCard,
      totalRevenue:
        kpis.collected ||
        r2(kpis.netSales + kpis.tax + kpis.tips + kpis.serviceCharges),
      collected: kpis.collected,
    },
    rows,
    empty: total === 0,
  };
}
