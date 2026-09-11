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
  isCashOnlyDeletable,
  paymentDisplayLabel,
} from "@/lib/orders/orderDeleteEligibility";

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

  if (view === "deleted") {
    match.isActive = false;
  } else {
    match.isActive = { $ne: false };
  }

  if (search) {
    const s = escapeRegex(search);
    match.$or = [
      { orderNumber: { $regex: s, $options: "i" } },
      { originalOrderNumber: { $regex: s, $options: "i" } },
      { invoiceNumber: { $regex: s, $options: "i" } },
      { originalInvoiceNumber: { $regex: s, $options: "i" } },
      { tableNo: { $regex: s, $options: "i" } },
      { partyName: { $regex: s, $options: "i" } },
      { guestName: { $regex: s, $options: "i" } },
      { paymentMethod: { $regex: s, $options: "i" } },
      { giftcardCode: { $regex: s, $options: "i" } },
    ];
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
  const itemCount = Array.isArray(order.items)
    ? order.items.reduce((sum, item) => sum + (Number(item.qty) || 0), 0)
    : 0;

  const originalOrderNumber =
    order.originalOrderNumber && !isPlaceholderNumber(order.originalOrderNumber)
      ? order.originalOrderNumber
      : null;
  const originalInvoiceNumber =
    order.originalInvoiceNumber &&
    !isPlaceholderNumber(order.originalInvoiceNumber)
      ? order.originalInvoiceNumber
      : null;

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

  return {
    id: String(order._id),
    orderNumber: orderNumberDisplay,
    originalOrderNumber: originalOrderNumber || orderNumberDisplay,
    invoiceNumber: invoiceNumberDisplay,
    originalInvoiceNumber: originalInvoiceNumber || invoiceNumberDisplay,
    date: formatRestaurantDateWithDay(order.createdAt, tz),
    time: formatRestaurantTime(order.createdAt, tz),
    createdAt: order.createdAt,
    table: order.tableNo || "—",
    server: order.employeeName || "Unknown",
    source: order.source || "POS",
    itemCount,
    total: r2(order.totalAmount),
    tip: r2(order.tipAmount),
    paymentMethod: order.paymentMethod || null,
    paymentLabel,
    tenders: {
      cash: tenders.cash,
      card: tenders.card,
      giftCard: tenders.giftCard,
    },
    paymentStatus: order.paymentStatus,
    status: order.status,
    guest: order.partyName || order.guestName || null,
    canDelete: view !== "deleted" && isCashOnlyDeletable(order),
    deletedAt: order.deletedAt || null,
    deletedByName: order.deletedByName || null,
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
