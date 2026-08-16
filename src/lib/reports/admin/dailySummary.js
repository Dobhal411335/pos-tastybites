import Order from "@/models/Order";
import { DEFAULT_RESTAURANT_TIMEZONE } from "@/lib/restaurantTime";
import {
  baseOrderMatch,
  ORDER_STATUSES,
  paidRevenueMatch,
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

export async function buildAdminDailySummary({ restaurantId, ...filters }) {
  const tz = filters.timezone || DEFAULT_RESTAURANT_TIMEZONE;
  const allMatch = baseOrderMatch({ restaurantId, ...filters });
  const paidMatch = paidRevenueMatch({ restaurantId, ...filters });
  const paidPipeline = financialPipeline(paidMatch, filters.paymentMethod);

  const [[statusFacet], [paidFacet]] = await Promise.all([
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
        },
      },
    ]),
    Order.aggregate([
      ...paidPipeline,
      ...EMPLOYEE_LOOKUP,
      {
        $facet: {
          kpis: [{ $group: KPI_GROUP }],
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

  const kpis = roundKpis(paidFacet?.kpis?.[0] || emptyKpis());
  const byDay = fillDaySeries(
    filters.dateFrom,
    filters.dateTo,
    paidFacet?.byDay || [],
    ["grossSales", "netSales", "orders"]
  );
  const paymentBreakdown = paymentBreakdownFromKpis(kpis);

  return {
    meta: adminReportMeta(filters),
    empty: counts.total === 0 && kpis.orderCount === 0,
    notes: {
      completed:
        "Completed orders are paid orders. Order status COMPLETED is not written by the POS.",
      voided: "Void is not stored as a separate status.",
      refunded: "Refunds are not recorded in the POS yet.",
    },
    counts: {
      total: counts.total,
      completed: counts.PAID,
      pending: counts.PENDING,
      confirmed: counts.CONFIRMED,
      cancelled: counts.CANCELLED,
      waived: counts.WAIVED,
      voided: 0,
      refunded: 0,
    },
    kpis: {
      grossSales: kpis.grossSales,
      discounts: kpis.discounts,
      netSales: kpis.netSales,
      tax: kpis.tax,
      tips: kpis.tips,
      serviceCharges: kpis.serviceCharges,
      collected: kpis.collected,
      orderCount: kpis.orderCount,
    },
    paymentBreakdown,
    byEmployee: paidFacet?.byEmployee || [],
    topItems: paidFacet?.topItems || [],
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
