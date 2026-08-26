import Order from "@/models/Order";
import PrintJob from "@/models/PrintJob";
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
  fillDaySeries,
  financialPipeline,
  KPI_GROUP,
  roundKpis,
  seriesByDay,
} from "@/lib/reports/financial/metrics";
import { adminReportMeta } from "./query";
import { paymentBreakdownFromKpis } from "./kpis";

const ORDERS_LIMIT = 75;

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

async function kitchenSnapshot({ restaurantId, dateFrom, dateTo, employeeId }) {
  const { start, end } = dateRangeBounds(dateFrom, dateTo);
  const match = {
    restaurantId: toObjectId(restaurantId),
    printType: { $in: ["KOT", "BAR_RECEIPT"] },
    createdAt: { $gte: start, $lt: end },
  };
  const emp = toObjectId(employeeId);
  if (emp) match.requestedBy = emp;

  const [facet] = await PrintJob.aggregate([
    { $match: match },
    {
      $facet: {
        total: [{ $count: "count" }],
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

  const avg = facet?.printTime?.[0]?.avgMinutes;
  return {
    total: facet?.total?.[0]?.count || 0,
    avgPrintMinutes: avg == null ? null : Math.round(avg),
  };
}

export async function buildAdminDailySummary({ restaurantId, ...filters }) {
  const tz = filters.timezone || DEFAULT_RESTAURANT_TIMEZONE;
  const allMatch = baseOrderMatch({ restaurantId, ...filters });
  const paidMatch = paidRevenueMatch({ restaurantId, ...filters });
  const paidPipeline = financialPipeline(paidMatch, filters.paymentMethod);

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

  const [[statusFacet], [paidFacet], [priorKpiRow], kitchen] =
    await Promise.all([
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
              { $limit: ORDERS_LIMIT },
              ...EMPLOYEE_LOOKUP,
              { $project: ORDER_LIST_PROJECT },
            ],
          },
        },
      ]),
      Order.aggregate([
        ...paidPipeline,
        ...EMPLOYEE_LOOKUP,
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
            byDay: [seriesByDay(tz)],
            byEmployee: [
              {
                $group: {
                  _id: { $ifNull: ["$processedBy", "unknown"] },
                  employeeName: { $first: "$employeeName" },
                  orders: { $sum: 1 },
                  sales: { $sum: "$netSales" },
                  tips: { $sum: { $ifNull: ["$tipAmount", 0] } },
                },
              },
              {
                $project: {
                  _id: 0,
                  employeeId: "$_id",
                  employeeName: { $ifNull: ["$employeeName", "Unknown"] },
                  orders: 1,
                  sales: { $round: ["$sales", 2] },
                  tips: { $round: ["$tips", 2] },
                },
              },
              { $sort: { sales: -1, employeeName: 1 } },
            ],
            topItems: [
              { $unwind: { path: "$items", preserveNullAndEmptyArrays: false } },
              {
                $group: {
                  _id: {
                    $ifNull: [
                      "$items.menuItemId",
                      { $ifNull: ["$items.name", "Unknown"] },
                    ],
                  },
                  item: { $first: { $ifNull: ["$items.name", "Unknown"] } },
                  quantity: { $sum: { $ifNull: ["$items.qty", 0] } },
                  revenue: {
                    $sum: {
                      $multiply: [
                        { $ifNull: ["$items.price", 0] },
                        { $ifNull: ["$items.qty", 0] },
                      ],
                    },
                  },
                  orders: { $addToSet: "$_id" },
                },
              },
              {
                $project: {
                  _id: 0,
                  item: 1,
                  quantity: 1,
                  revenue: { $round: ["$revenue", 2] },
                  orderCount: { $size: "$orders" },
                },
              },
              { $sort: { quantity: -1, revenue: -1 } },
              { $limit: 20 },
            ],
          },
        },
      ]),
      Order.aggregate([...priorPipeline, { $group: KPI_GROUP }]),
      kitchenSnapshot({
        restaurantId,
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
        employeeId: filters.employeeId,
      }),
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

  const openCount =
    counts.PENDING + counts.CONFIRMED + counts.COMPLETED;
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
  const byDay = fillDaySeries(
    filters.dateFrom,
    filters.dateTo,
    paidFacet?.byDay || [],
    ["grossSales", "netSales", "orders"]
  );
  const paymentBreakdown = paymentBreakdownFromKpis(kpis);
  const comparisonLabel =
    filters.preset === "TODAY" ? "vs yesterday" : "vs prior period";

  return {
    meta: adminReportMeta(filters),
    empty: counts.total === 0 && kpis.orderCount === 0,
    notes: {
      completed:
        "Completed orders are paid orders. Order status COMPLETED is not written by the POS.",
      voided: "Void is not stored as a separate status.",
      refunded: "Refunds are not recorded in the POS yet.",
      kitchen:
        "Avg print time is createdAt to printedAt on printed KOTs. Prep/ready/served is not stored.",
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
      voided: 0,
      refunded: 0,
    },
    statusStrip: [
      { key: "paid", label: "Paid", value: counts.PAID },
      { key: "open", label: "Open", value: openCount },
      { key: "cancelled", label: "Cancelled", value: counts.CANCELLED },
      { key: "waived", label: "Waived", value: counts.WAIVED },
      { key: "staff", label: "Staff", value: staffMeals },
    ],
    kpis: {
      grossSales: kpis.grossSales,
      discounts: kpis.discounts,
      netSales: kpis.netSales,
      tax: kpis.tax,
      tips: kpis.tips,
      serviceCharges: kpis.serviceCharges,
      collected: kpis.collected,
      orderCount: kpis.orderCount,
      avgTicket,
      expectedDeposit: kpis.collected,
      guests,
      refunds: 0,
      voids: 0,
    },
    comparison: {
      label: comparisonLabel,
      grossSales: pctDelta(kpis.grossSales, priorKpis.grossSales),
      orderCount: pctDelta(kpis.orderCount, priorKpis.orderCount),
      avgTicket: pctDelta(avgTicket, priorAvgTicket),
      refundsVoids: 0,
    },
    kitchen,
    paymentBreakdown,
    byEmployee: paidFacet?.byEmployee || [],
    topItems: paidFacet?.topItems || [],
    orders,
    ordersTruncated: counts.total > ORDERS_LIMIT,
    charts: {
      salesOverTime: byDay.map((d) => ({ date: d.date, value: d.netSales })),
      ordersByStatus: [
        { name: "Paid", value: counts.PAID },
        { name: "Pending", value: counts.PENDING },
        { name: "Confirmed", value: counts.CONFIRMED },
        { name: "Cancelled", value: counts.CANCELLED },
        { name: "Waived", value: counts.WAIVED },
      ].filter((row) => row.value > 0),
    },
  };
}
