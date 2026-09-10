import Order from "@/models/Order";
import PrintJob from "@/models/PrintJob";
import EodReport from "@/models/EodReport";
import OperationalAuditLog from "@/models/OperationalAuditLog";
import EmployeeSession from "@/models/employee/EmployeeSession";
import { r2 } from "@/lib/eod/eodHelpers";
import { DEFAULT_RESTAURANT_TIMEZONE } from "@/lib/restaurantTime";
import {
  addDaysYmd,
  eachBusinessDate,
} from "@/lib/reports/financial/datePresets";
import {
  formatRestaurantDate,
  formatRestaurantTime,
} from "@/lib/reports/financial/format";
import {
  baseOrderMatch,
  dateRangeBounds,
  ORDER_STATUSES,
  paidRevenueMatch,
  toObjectId,
} from "@/lib/reports/financial/match";
import {
  emptyKpis,
  EMPLOYEE_LOOKUP,
  financialPipeline,
  KPI_GROUP,
  roundKpis,
} from "@/lib/reports/financial/metrics";
import { adminReportMeta } from "./query";
import { paymentBreakdownFromKpis } from "./kpis";

const ORDERS_PREVIEW = 8;
const ACTIVITY_PREVIEW = 8;

const ORDER_LIST_PROJECT = {
  _id: 1,
  orderNumber: 1,
  createdAt: 1,
  updatedAt: 1,
  status: 1,
  paymentStatus: 1,
  paymentMethod: 1,
  source: 1,
  tableNo: 1,
  partyName: 1,
  guestName: 1,
  guestCount: 1,
  totalAmount: 1,
  tipAmount: 1,
  employeeName: 1,
};

function priorPeriodBounds(dateFrom, dateTo) {
  const days = Math.max(1, eachBusinessDate(dateFrom, dateTo).length);
  const prevTo = addDaysYmd(dateFrom, -1);
  const prevFrom = addDaysYmd(prevTo, -(days - 1));
  return { dateFrom: prevFrom, dateTo: prevTo };
}

function ticketAverage(grossSales, orderCount) {
  return orderCount > 0 ? r2(grossSales / orderCount) : 0;
}

function pctDelta(current, previous) {
  if (!previous) return current === 0 ? 0 : 100;
  return r2(((current - previous) / Math.abs(previous)) * 100);
}

function mapOrderRow(order, tz) {
  return {
    id: String(order._id),
    orderNumber: order.orderNumber,
    date: formatRestaurantDate(order.updatedAt || order.createdAt, tz),
    time: formatRestaurantTime(order.updatedAt || order.createdAt, tz),
    status: order.status,
    paymentStatus: order.paymentStatus,
    paymentMethod: order.paymentMethod || "—",
    source: order.source || "POS",
    table: order.tableNo || "—",
    guest: order.partyName || order.guestName || "—",
    guestCount: order.guestCount == null ? null : Number(order.guestCount),
    total: r2(order.totalAmount),
    tips: r2(order.tipAmount),
    employee: order.employeeName || "Unknown",
  };
}

async function printAreaSnapshot({
  restaurantId,
  dateFrom,
  dateTo,
  employeeId,
  printType,
}) {
  const { start, end } = dateRangeBounds(dateFrom, dateTo);
  const match = {
    restaurantId: toObjectId(restaurantId),
    printType,
    createdAt: { $gte: start, $lt: end },
  };
  const emp = toObjectId(employeeId);
  if (emp) match.requestedBy = emp;

  const [facet] = await PrintJob.aggregate([
    { $match: match },
    {
      $facet: {
        statusCounts: [{ $group: { _id: "$status", count: { $sum: 1 } } }],
        total: [{ $count: "count" }],
        reprints: [
          {
            $match: {
              $or: [
                { parentPrintJobId: { $ne: null } },
                { "metadata.isReprint": true },
                { attemptCount: { $gt: 1 } },
              ],
            },
          },
          { $count: "count" },
        ],
        printTime: [
          {
            $match: {
              status: "PRINTED",
              printedAt: { $ne: null },
            },
          },
          {
            $project: {
              minutes: {
                $divide: [{ $subtract: ["$printedAt", "$createdAt"] }, 60000],
              },
            },
          },
          { $match: { minutes: { $gte: 0 } } },
          {
            $group: {
              _id: null,
              avgMinutes: { $avg: "$minutes" },
            },
          },
        ],
      },
    },
  ]);

  const byStatus = {
    QUEUED: 0,
    PRINTING: 0,
    PRINTED: 0,
    FAILED: 0,
    CANCELLED: 0,
  };
  for (const row of facet?.statusCounts || []) {
    if (Object.prototype.hasOwnProperty.call(byStatus, row._id)) {
      byStatus[row._id] = row.count;
    }
  }
  const total = facet?.total?.[0]?.count || 0;
  const pending = byStatus.QUEUED + byStatus.PRINTING;
  const avg = facet?.printTime?.[0]?.avgMinutes;

  return {
    total,
    pending,
    completed: byStatus.PRINTED,
    failed: byStatus.FAILED,
    cancelled: byStatus.CANCELLED,
    reprints: facet?.reprints?.[0]?.count || 0,
    avgPrintMinutes: avg == null ? null : Math.round(avg),
  };
}

export async function buildAdminDailySummary({ restaurantId, ...filters }) {
  const tz = filters.timezone || DEFAULT_RESTAURANT_TIMEZONE;
  const rid = toObjectId(restaurantId);
  const allMatch = baseOrderMatch({ restaurantId, ...filters });
  const paidMatch = paidRevenueMatch({ restaurantId, ...filters });
  const paidPipeline = financialPipeline(paidMatch, filters.paymentMethod);
  const { start, end } = dateRangeBounds(filters.dateFrom, filters.dateTo);

  const prior = priorPeriodBounds(filters.dateFrom, filters.dateTo);
  const priorPaidMatch = paidRevenueMatch({
    restaurantId,
    ...filters,
    dateFrom: prior.dateFrom,
    dateTo: prior.dateTo,
  });
  const priorPipeline = financialPipeline(
    priorPaidMatch,
    filters.paymentMethod
  );

  const isSingleDay = filters.dateFrom === filters.dateTo;
  const isToday = filters.preset === "TODAY";

  const [
    [statusFacet],
    [paidFacet],
    [priorKpiRow],
    kitchen,
    bar,
    activeEmployees,
    eodSaved,
    recentActivity,
  ] = await Promise.all([
    Order.aggregate([
      { $match: allMatch },
      {
        $facet: {
          statusCounts: [
            {
              $group: {
                _id: "$status",
                count: { $sum: 1 },
              },
            },
          ],
          staffMeals: [
            {
              $match: {
                $or: [{ source: "STAFF" }, { status: "WAIVED" }],
              },
            },
            { $count: "count" },
          ],
          orders: [
            { $sort: { updatedAt: -1, _id: -1 } },
            { $limit: ORDERS_PREVIEW },
            ...EMPLOYEE_LOOKUP,
            { $project: ORDER_LIST_PROJECT },
          ],
        },
      },
    ]),
    Order.aggregate([
      ...paidPipeline,
      {
        $facet: {
          kpis: [{ $group: KPI_GROUP }],
          guests: [
            {
              $group: {
                _id: null,
                guests: { $sum: { $ifNull: ["$guestCount", 0] } },
              },
            },
          ],
        },
      },
    ]),
    Order.aggregate([...priorPipeline, { $group: KPI_GROUP }]),
    printAreaSnapshot({
      restaurantId,
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
      employeeId: filters.employeeId,
      printType: "KOT",
    }),
    printAreaSnapshot({
      restaurantId,
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
      employeeId: filters.employeeId,
      printType: "BAR_RECEIPT",
    }),
    EmployeeSession.countDocuments({
      restaurant: rid,
      status: "Active",
    }),
    isSingleDay
      ? EodReport.exists({
          restaurant: rid,
          businessDate: filters.dateFrom,
        })
      : Promise.resolve(null),
    OperationalAuditLog.find({
      restaurantId: rid,
      timestamp: { $gte: start, $lt: end },
    })
      .sort({ timestamp: -1 })
      .limit(ACTIVITY_PREVIEW)
      .select("actorName action timestamp orderId tableId reason newValue")
      .lean(),
  ]);

  const counts = {
    total: 0,
    PENDING: 0,
    CONFIRMED: 0,
    COMPLETED: 0,
    PAID: 0,
    CANCELLED: 0,
    WAIVED: 0,
  };
  for (const row of statusFacet?.statusCounts || []) {
    if (ORDER_STATUSES.includes(row._id)) counts[row._id] = row.count;
    counts.total += row.count;
  }

  const openCount = counts.PENDING + counts.CONFIRMED + counts.COMPLETED;
  const staffMeals = statusFacet?.staffMeals?.[0]?.count || 0;
  const guests = paidFacet?.guests?.[0]?.guests || 0;
  const orders = (statusFacet?.orders || []).map((row) =>
    mapOrderRow(row, tz)
  );

  const kpis = roundKpis(paidFacet?.kpis?.[0] || emptyKpis());
  const priorKpis = roundKpis(priorKpiRow || emptyKpis());
  const avgTicket = ticketAverage(kpis.grossSales, kpis.orderCount);
  const priorAvgTicket = ticketAverage(
    priorKpis.grossSales,
    priorKpis.orderCount
  );
  const paymentBreakdown = paymentBreakdownFromKpis(kpis);
  const comparisonLabel =
    filters.preset === "TODAY" ? "vs yesterday" : "vs prior period";

  const printing = {
    failed: kitchen.failed + bar.failed,
    reprints: kitchen.reprints + bar.reprints,
    pending: kitchen.pending + bar.pending,
    completed: kitchen.completed + bar.completed,
  };

  const eod = {
    businessDate: isSingleDay ? filters.dateFrom : null,
    saved: Boolean(eodSaved),
    status: !isSingleDay
      ? "Range"
      : eodSaved
        ? "Closed"
        : isToday
          ? "Open"
          : "Open",
  };

  const attention = [];
  if (printing.failed > 0) {
    attention.push({
      key: "failed-prints",
      label: "Failed print jobs",
      count: printing.failed,
      href: "/admin/reports/admin/kitchen",
    });
  }
  if (openCount > 0) {
    attention.push({
      key: "open-orders",
      label: "Open orders",
      count: openCount,
      href: "/admin/reports/admin/today-order",
    });
  }
  if (kitchen.pending > 0) {
    attention.push({
      key: "pending-kots",
      label: "Pending kitchen tickets",
      count: kitchen.pending,
      href: "/admin/reports/admin/kitchen",
    });
  }
  if (bar.pending > 0) {
    attention.push({
      key: "pending-bar",
      label: "Pending bar tickets",
      count: bar.pending,
      href: "/admin/reports/admin/bar",
    });
  }
  if (isToday && isSingleDay && !eodSaved) {
    attention.push({
      key: "eod-open",
      label: "End of day not saved",
      count: 1,
      href: "/admin/reports/admin/eod",
    });
  }

  const activityPeek = (recentActivity || []).map((doc) => ({
    id: String(doc._id),
    time: formatRestaurantTime(doc.timestamp, tz),
    date: formatRestaurantDate(doc.timestamp, tz),
    actor: doc.actorName || "Unknown",
    action: doc.action,
    reason: doc.reason || null,
  }));

  return {
    meta: adminReportMeta(filters),
    empty: counts.total === 0 && kpis.orderCount === 0,
    notes: {
      refunds: "Refunds are not recorded in the POS yet.",
      voids: "Voids are not stored as a separate status.",
      kitchen:
        "Prep/ready/served is not stored. Ticket status is print-queue status only.",
      activity:
        "Activity peek shows floor/POS events only. Back-office admin actions are not logged.",
      guests: "Guests are summed from guestCount on paid orders only.",
      staffMeals: "Staff meals include source STAFF and waived orders.",
    },
    counts: {
      total: counts.total,
      completed: counts.PAID,
      pending: counts.PENDING,
      confirmed: counts.CONFIRMED,
      cancelled: counts.CANCELLED,
      waived: counts.WAIVED,
      open: openCount,
      staffMeals,
    },
    statusStrip: [
      { key: "paid", label: "Paid", value: counts.PAID },
      { key: "open", label: "Open", value: openCount },
      { key: "cancelled", label: "Cancelled", value: counts.CANCELLED },
      { key: "waived", label: "Waived", value: counts.WAIVED },
      { key: "staff", label: "Staff meals", value: staffMeals },
    ],
    kpis: {
      grossSales: kpis.grossSales,
      discounts: kpis.discounts,
      netSales: kpis.netSales,
      tax: kpis.tax,
      tips: kpis.tips,
      serviceCharges: kpis.serviceCharges,
      collected: kpis.collected,
      giftCard: kpis.giftCard,
      orderCount: kpis.orderCount,
      avgTicket,
      guests,
      activeEmployees,
    },
    comparison: {
      label: comparisonLabel,
      grossSales: pctDelta(kpis.grossSales, priorKpis.grossSales),
      orderCount: pctDelta(kpis.orderCount, priorKpis.orderCount),
      avgTicket: pctDelta(avgTicket, priorAvgTicket),
    },
    kitchen,
    bar,
    printing,
    eod,
    attention,
    activityPeek,
    paymentBreakdown,
    orders,
    ordersTruncated: counts.total > ORDERS_PREVIEW,
  };
}
