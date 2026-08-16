import Order from "@/models/Order";
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
import { r2 } from "@/lib/eod/eodHelpers";

export async function buildFinancialOverview({ restaurantId, ...filters }) {
  const match = paidRevenueMatch({ restaurantId, ...filters });
  const pipeline = financialPipeline(match, filters.paymentMethod);
  const tz = filters.timezone || DEFAULT_RESTAURANT_TIMEZONE;

  const [facet] = await Order.aggregate([
    ...pipeline,
    {
      $facet: {
        kpis: [{ $group: KPI_GROUP }],
        byDay: [seriesByDay(tz)],
      },
    },
  ]);

  const kpis = roundKpis(facet?.kpis?.[0] || emptyKpis());
  const dayFields = [
    "grossSales",
    "discounts",
    "netSales",
    "tax",
    "orders",
    "collected",
  ];
  const byDay = fillDaySeries(
    filters.dateFrom,
    filters.dateTo,
    facet?.byDay || [],
    dayFields
  );

  const paymentTotal = kpis.collected;
  const paymentBreakdown = [
    {
      method: "Cash",
      count: kpis.cashCount,
      amount: kpis.cash,
      percent: paymentTotal > 0 ? r2((kpis.cash / paymentTotal) * 100) : 0,
    },
    {
      method: "Card",
      count: kpis.cardCount,
      amount: kpis.card,
      percent: paymentTotal > 0 ? r2((kpis.card / paymentTotal) * 100) : 0,
    },
    {
      method: "Gift Card",
      count: kpis.giftCount,
      amount: kpis.giftCard,
      percent: paymentTotal > 0 ? r2((kpis.giftCard / paymentTotal) * 100) : 0,
    },
  ];

  return {
    meta: reportMeta(filters),
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
    },
    charts: {
      salesOverTime: byDay.map((d) => ({ date: d.date, value: d.grossSales })),
      ordersOverTime: byDay.map((d) => ({ date: d.date, value: d.orders })),
      taxOverTime: byDay.map((d) => ({ date: d.date, value: d.tax })),
      discountOverTime: byDay.map((d) => ({ date: d.date, value: d.discounts })),
      paymentBreakdown,
    },
  };
}
