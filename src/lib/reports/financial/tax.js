import Order from "@/models/Order";
import { r2 } from "@/lib/eod/eodHelpers";
import { DEFAULT_RESTAURANT_TIMEZONE } from "@/lib/restaurantTime";
import { paidRevenueMatch } from "./match.js";
import {
  emptyKpis,
  fillDaySeries,
  financialPipeline,
  KPI_GROUP,
  roundKpis,
  seriesByDay,
} from "./metrics.js";
import { reportMeta } from "./query.js";

export async function buildFinancialTax({ restaurantId, ...filters }) {
  const match = paidRevenueMatch({ restaurantId, ...filters });
  const pipeline = financialPipeline(match, filters.paymentMethod);
  const tz = filters.timezone || DEFAULT_RESTAURANT_TIMEZONE;

  const [facet] = await Order.aggregate([
    ...pipeline,
    {
      $facet: {
        kpis: [{ $group: KPI_GROUP }],
        byDay: [seriesByDay(tz)],
        zeroTax: [
          { $match: { taxTotal: { $lte: 0 } } },
          {
            $group: {
              _id: null,
              orders: { $sum: 1 },
              grossSales: { $sum: { $ifNull: ["$subTotal", 0] } },
            },
          },
        ],
        breakdown: [
          {
            $addFields: {
              _taxes: {
                $cond: [
                  {
                    $gt: [
                      { $size: { $ifNull: ["$taxBreakdown", []] } },
                      0,
                    ],
                  },
                  "$taxBreakdown",
                  {
                    $cond: [
                      { $gt: [{ $ifNull: ["$taxTotal", 0] }, 0] },
                      {
                        $map: {
                          input: { $literal: [1] },
                          as: "_",
                          in: {
                            name: "Sales Tax",
                            rate: 0,
                            amount: { $ifNull: ["$taxTotal", 0] },
                          },
                        },
                      },
                      [],
                    ],
                  },
                ],
              },
            },
          },
          { $unwind: "$_taxes" },
          {
            $group: {
              _id: {
                name: { $ifNull: ["$_taxes.name", "Tax"] },
                rate: { $ifNull: ["$_taxes.rate", 0] },
              },
              taxCollected: { $sum: { $ifNull: ["$_taxes.amount", 0] } },
              taxableAmount: { $sum: "$netSales" },
              orders: { $addToSet: "$_id" },
            },
          },
          {
            $project: {
              _id: 0,
              name: "$_id.name",
              rate: "$_id.rate",
              taxCollected: { $round: ["$taxCollected", 2] },
              taxableAmount: { $round: ["$taxableAmount", 2] },
              orderCount: { $size: "$orders" },
            },
          },
          { $sort: { name: 1, rate: 1 } },
        ],
      },
    },
  ]);

  const kpis = roundKpis(facet?.kpis?.[0] || emptyKpis());
  const zero = facet?.zeroTax?.[0] || { orders: 0, grossSales: 0 };

  return {
    meta: reportMeta(filters),
    empty: kpis.orderCount === 0,
    summary: {
      grossSales: kpis.grossSales,
      netSales: kpis.netSales,
      taxCollected: kpis.tax,
      ordersWithNoTaxCollected: {
        orders: Number(zero.orders) || 0,
        grossSales: r2(zero.grossSales),
        note: "Orders with $0 tax collected. The POS has no tax-exempt flag.",
      },
    },
    breakdown: facet?.breakdown || [],
    charts: {
      taxOverTime: fillDaySeries(
        filters.dateFrom,
        filters.dateTo,
        facet?.byDay || [],
        ["tax"]
      ).map((d) => ({ date: d.date, value: d.tax })),
    },
  };
}
