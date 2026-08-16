import Order from "@/models/Order";
import { r2 } from "@/lib/eod/eodHelpers";
import { DEFAULT_RESTAURANT_TIMEZONE } from "@/lib/restaurantTime";
import { paidRevenueMatch } from "./match.js";
import {
  emptyKpis,
  EMPLOYEE_LOOKUP,
  fillDaySeries,
  financialPipeline,
  KPI_GROUP,
  roundKpis,
  seriesByDay,
} from "./metrics.js";
import { reportMeta } from "./query.js";

export async function buildFinancialDiscounts({ restaurantId, ...filters }) {
  const match = paidRevenueMatch({ restaurantId, ...filters });
  const pipeline = financialPipeline(match, filters.paymentMethod);
  const tz = filters.timezone || DEFAULT_RESTAURANT_TIMEZONE;

  const [facet] = await Order.aggregate([
    ...pipeline,
    ...EMPLOYEE_LOOKUP,
    {
      $facet: {
        kpis: [{ $group: KPI_GROUP }],
        byDay: [seriesByDay(tz)],
        byCode: [
          { $match: { discountTotal: { $gt: 0 } } },
          {
            $group: {
              _id: {
                $ifNull: [
                  {
                    $cond: [
                      { $eq: [{ $ifNull: ["$discountCode", ""] }, ""] },
                      "No code",
                      "$discountCode",
                    ],
                  },
                  "No code",
                ],
              },
              orders: { $sum: 1 },
              amount: { $sum: { $ifNull: ["$discountTotal", 0] } },
            },
          },
          {
            $project: {
              _id: 0,
              discountName: "$_id",
              orders: 1,
              amount: { $round: ["$amount", 2] },
            },
          },
          { $sort: { amount: -1, discountName: 1 } },
        ],
        byEmployee: [
          { $match: { discountTotal: { $gt: 0 } } },
          {
            $group: {
              _id: { $ifNull: ["$processedBy", "unknown"] },
              employeeName: { $first: "$employeeName" },
              orders: { $sum: 1 },
              amount: { $sum: { $ifNull: ["$discountTotal", 0] } },
            },
          },
          {
            $project: {
              _id: 0,
              employeeName: { $ifNull: ["$employeeName", "Unknown"] },
              orders: 1,
              amount: { $round: ["$amount", 2] },
            },
          },
          { $sort: { amount: -1, employeeName: 1 } },
        ],
      },
    },
  ]);

  const kpis = roundKpis(facet?.kpis?.[0] || emptyKpis());
  const byDay = fillDaySeries(
    filters.dateFrom,
    filters.dateTo,
    facet?.byDay || [],
    ["discounts", "orders"]
  );

  return {
    meta: reportMeta(filters),
    empty: kpis.orderCount === 0,
    summary: {
      grossSales: kpis.grossSales,
      discounts: kpis.discounts,
      netSales: kpis.netSales,
      orders: kpis.orderCount,
    },
    byCode: facet?.byCode || [],
    byEmployee: facet?.byEmployee || [],
    byDate: byDay.map((d) => ({
      date: d.date,
      orders: d.orders,
      amount: d.discounts,
    })),
    charts: {
      discountOverTime: byDay.map((d) => ({ date: d.date, value: d.discounts })),
    },
  };
}
