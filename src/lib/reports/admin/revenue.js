import Order from "@/models/Order";
import { DEFAULT_RESTAURANT_TIMEZONE } from "@/lib/restaurantTime";
import { paidRevenueMatch } from "@/lib/reports/financial/match";
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

const DAY_FIELDS = [
  "grossSales",
  "discounts",
  "netSales",
  "tax",
  "tips",
  "serviceCharges",
  "collected",
  "orders",
];

export async function buildAdminRevenue({ restaurantId, ...filters }) {
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
        byEmployee: [
          {
            $group: {
              _id: { $ifNull: ["$processedBy", "unknown"] },
              employeeName: { $first: "$employeeName" },
              orders: { $sum: 1 },
              grossSales: { $sum: { $ifNull: ["$subTotal", 0] } },
              netSales: { $sum: "$netSales" },
              collected: { $sum: "$tenderCollected" },
            },
          },
          {
            $project: {
              _id: 0,
              employeeId: "$_id",
              employeeName: { $ifNull: ["$employeeName", "Unknown"] },
              orders: 1,
              grossSales: { $round: ["$grossSales", 2] },
              netSales: { $round: ["$netSales", 2] },
              collected: { $round: ["$collected", 2] },
            },
          },
          { $sort: { netSales: -1, employeeName: 1 } },
        ],
        byCategory: [
          {
            $addFields: {
              itemGrossTotal: {
                $sum: {
                  $map: {
                    input: { $ifNull: ["$items", []] },
                    as: "it",
                    in: {
                      $multiply: [
                        { $ifNull: ["$$it.price", 0] },
                        { $ifNull: ["$$it.qty", 0] },
                      ],
                    },
                  },
                },
              },
            },
          },
          { $unwind: { path: "$items", preserveNullAndEmptyArrays: false } },
          {
            $addFields: {
              lineGross: {
                $multiply: [
                  { $ifNull: ["$items.price", 0] },
                  { $ifNull: ["$items.qty", 0] },
                ],
              },
            },
          },
          {
            $addFields: {
              lineDisc: {
                $cond: [
                  { $gt: ["$itemGrossTotal", 0] },
                  {
                    $multiply: [
                      { $ifNull: ["$discountTotal", 0] },
                      { $divide: ["$lineGross", "$itemGrossTotal"] },
                    ],
                  },
                  0,
                ],
              },
              categoryName: {
                $let: {
                  vars: {
                    raw: { $trim: { input: { $ifNull: ["$items.category", ""] } } },
                  },
                  in: {
                    $cond: [{ $eq: ["$$raw", ""] }, "Other", "$$raw"],
                  },
                },
              },
            },
          },
          {
            $group: {
              _id: "$categoryName",
              quantity: { $sum: { $ifNull: ["$items.qty", 0] } },
              grossSales: { $sum: "$lineGross" },
              discounts: { $sum: "$lineDisc" },
            },
          },
          {
            $project: {
              _id: 0,
              category: "$_id",
              quantity: 1,
              grossSales: { $round: ["$grossSales", 2] },
              discounts: { $round: ["$discounts", 2] },
              netSales: {
                $round: [{ $subtract: ["$grossSales", "$discounts"] }, 2],
              },
            },
          },
          { $sort: { netSales: -1, category: 1 } },
        ],
      },
    },
  ]);

  const kpis = roundKpis(facet?.kpis?.[0] || emptyKpis());
  const byDay = fillDaySeries(
    filters.dateFrom,
    filters.dateTo,
    facet?.byDay || [],
    DAY_FIELDS
  );
  const paymentBreakdown = paymentBreakdownFromKpis(kpis);

  return {
    meta: adminReportMeta(filters),
    empty: kpis.orderCount === 0,
    kpis: {
      grossSales: kpis.grossSales,
      discounts: kpis.discounts,
      netSales: kpis.netSales,
      tax: kpis.tax,
      tips: kpis.tips,
      serviceCharges: kpis.serviceCharges,
      collected: kpis.collected,
      orderCount: kpis.orderCount,
      cash: kpis.cash,
      card: kpis.card,
      giftCard: kpis.giftCard,
    },
    paymentBreakdown,
    byDay: byDay.map((d) => ({
      date: d.date,
      orders: d.orders,
      grossSales: d.grossSales,
      discounts: d.discounts,
      netSales: d.netSales,
      tax: d.tax,
      tips: d.tips,
      serviceCharges: d.serviceCharges,
      total: d.collected,
    })),
    byEmployee: facet?.byEmployee || [],
    byCategory: facet?.byCategory || [],
    charts: {
      revenueByDay: byDay.map((d) => ({ date: d.date, value: d.grossSales })),
      paymentBreakdown,
      revenueByCategory: (facet?.byCategory || []).map((row) => ({
        name: row.category,
        value: row.netSales,
      })),
      revenueByEmployee: (facet?.byEmployee || []).slice(0, 12).map((row) => ({
        name: row.employeeName,
        value: row.netSales,
      })),
    },
  };
}
