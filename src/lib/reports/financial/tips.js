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

export async function buildFinancialTips({ restaurantId, ...filters }) {
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
              tips: { $sum: { $ifNull: ["$tipAmount", 0] } },
              serviceCharges: { $sum: { $ifNull: ["$serviceChargeTotal", 0] } },
            },
          },
          {
            $project: {
              _id: 0,
              employeeId: "$_id",
              employeeName: { $ifNull: ["$employeeName", "Unknown"] },
              orders: 1,
              tips: { $round: ["$tips", 2] },
              serviceCharges: { $round: ["$serviceCharges", 2] },
              total: { $round: [{ $add: ["$tips", "$serviceCharges"] }, 2] },
            },
          },
          { $sort: { total: -1, employeeName: 1 } },
        ],
      },
    },
  ]);

  const kpis = roundKpis(facet?.kpis?.[0] || emptyKpis());
  const byDay = fillDaySeries(
    filters.dateFrom,
    filters.dateTo,
    facet?.byDay || [],
    ["tips", "serviceCharges"]
  );

  return {
    meta: reportMeta(filters),
    empty: kpis.tips === 0 && kpis.serviceCharges === 0,
    summary: {
      tips: kpis.tips,
      serviceCharges: kpis.serviceCharges,
      combined: r2(kpis.tips + kpis.serviceCharges),
      orders: kpis.orderCount,
    },
    byEmployee: facet?.byEmployee || [],
    byDate: byDay.map((d) => ({
      date: d.date,
      tips: d.tips,
      serviceCharges: d.serviceCharges,
      total: r2(d.tips + d.serviceCharges),
    })),
    charts: {
      tipsOverTime: byDay.map((d) => ({ date: d.date, value: d.tips })),
      serviceChargesOverTime: byDay.map((d) => ({
        date: d.date,
        value: d.serviceCharges,
      })),
      tipsByEmployee: (facet?.byEmployee || []).map((row) => ({
        name: row.employeeName,
        value: row.tips,
      })),
    },
  };
}
