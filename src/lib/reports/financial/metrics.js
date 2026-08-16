import { r2 } from "@/lib/eod/eodHelpers";
import { DEFAULT_RESTAURANT_TIMEZONE } from "@/lib/restaurantTime";
import { eachBusinessDate } from "./datePresets.js";
import { dayKeyExpr, paymentTenderMatch } from "./match.js";

/**
 * Mirror of resolveTenders() as aggregation stages.
 * cashAmount/cardAmount include tip when that tender took the overpay.
 */
export const TENDER_STAGES = [
  {
    $addFields: {
      _tip: { $round: [{ $ifNull: ["$tipAmount", 0] }, 2] },
      _total: { $round: [{ $ifNull: ["$totalAmount", 0] }, 2] },
      _gc: { $round: [{ $ifNull: ["$giftcardUsedAmount", 0] }, 2] },
      _method: { $toLower: { $ifNull: ["$paymentMethod", ""] } },
    },
  },
  {
    $addFields: {
      _duePlusTip: { $round: [{ $add: ["$_total", "$_tip"] }, 2] },
      _isGiftMethod: {
        $and: [
          { $regexMatch: { input: "$_method", regex: "gift\\s*card" } },
          { $not: { $regexMatch: { input: "$_method", regex: "card\\s*-" } } },
        ],
      },
      _isCashMethod: {
        $and: [
          { $not: { $regexMatch: { input: "$_method", regex: "gift\\s*card" } } },
          {
            $or: [
              { $eq: ["$_method", "cash"] },
              {
                $and: [
                  { $regexMatch: { input: "$_method", regex: "cash" } },
                  { $not: { $regexMatch: { input: "$_method", regex: "card" } } },
                ],
              },
            ],
          },
        ],
      },
    },
  },
  {
    $addFields: {
      tenderCash: {
        $round: [
          {
            $cond: [
              {
                $and: [
                  { $eq: [{ $ifNull: ["$cashAmount", null] }, null] },
                  { $eq: [{ $ifNull: ["$cardAmount", null] }, null] },
                ],
              },
              {
                $cond: [
                  "$_isCashMethod",
                  { $max: [0, { $subtract: ["$_duePlusTip", "$_gc"] }] },
                  0,
                ],
              },
              { $ifNull: ["$cashAmount", 0] },
            ],
          },
          2,
        ],
      },
      tenderCard: {
        $round: [
          {
            $cond: [
              {
                $and: [
                  { $eq: [{ $ifNull: ["$cashAmount", null] }, null] },
                  { $eq: [{ $ifNull: ["$cardAmount", null] }, null] },
                ],
              },
              {
                $cond: [
                  "$_isCashMethod",
                  0,
                  {
                    $cond: [
                      { $and: ["$_isGiftMethod", { $gt: ["$_gc", 0] }] },
                      0,
                      { $max: [0, { $subtract: ["$_duePlusTip", "$_gc"] }] },
                    ],
                  },
                ],
              },
              { $ifNull: ["$cardAmount", 0] },
            ],
          },
          2,
        ],
      },
      tenderGift: "$_gc",
    },
  },
  {
    $addFields: {
      tenderCollected: {
        $round: [{ $add: ["$tenderCash", "$tenderCard", "$tenderGift"] }, 2],
      },
      netSales: {
        $round: [
          {
            $subtract: [
              { $ifNull: ["$subTotal", 0] },
              { $ifNull: ["$discountTotal", 0] },
            ],
          },
          2,
        ],
      },
    },
  },
];

export const KPI_GROUP = {
  _id: null,
  orderCount: { $sum: 1 },
  grossSales: { $sum: { $ifNull: ["$subTotal", 0] } },
  discounts: { $sum: { $ifNull: ["$discountTotal", 0] } },
  netSales: { $sum: "$netSales" },
  tax: { $sum: { $ifNull: ["$taxTotal", 0] } },
  tips: { $sum: { $ifNull: ["$tipAmount", 0] } },
  serviceCharges: { $sum: { $ifNull: ["$serviceChargeTotal", 0] } },
  cash: { $sum: "$tenderCash" },
  card: { $sum: "$tenderCard" },
  giftCard: { $sum: "$tenderGift" },
  collected: { $sum: "$tenderCollected" },
  cashCount: { $sum: { $cond: [{ $gt: ["$tenderCash", 0] }, 1, 0] } },
  cardCount: { $sum: { $cond: [{ $gt: ["$tenderCard", 0] }, 1, 0] } },
  giftCount: { $sum: { $cond: [{ $gt: ["$tenderGift", 0] }, 1, 0] } },
};

export function emptyKpis() {
  return {
    orderCount: 0,
    grossSales: 0,
    discounts: 0,
    netSales: 0,
    tax: 0,
    tips: 0,
    serviceCharges: 0,
    cash: 0,
    card: 0,
    giftCard: 0,
    collected: 0,
    cashCount: 0,
    cardCount: 0,
    giftCount: 0,
  };
}

export function roundKpis(row) {
  const src = row || {};
  return {
    orderCount: Number(src.orderCount) || 0,
    grossSales: r2(src.grossSales),
    discounts: r2(src.discounts),
    netSales: r2(src.netSales),
    tax: r2(src.tax),
    tips: r2(src.tips),
    serviceCharges: r2(src.serviceCharges),
    cash: r2(src.cash),
    card: r2(src.card),
    giftCard: r2(src.giftCard),
    collected: r2(src.collected),
    cashCount: Number(src.cashCount) || 0,
    cardCount: Number(src.cardCount) || 0,
    giftCount: Number(src.giftCount) || 0,
  };
}

export function financialPipeline(match, paymentMethod) {
  const stages = [{ $match: match }, ...TENDER_STAGES];
  const tenderMatch = paymentTenderMatch(paymentMethod);
  if (tenderMatch) stages.push({ $match: tenderMatch });
  return stages;
}

export function seriesByDay(timeZone = DEFAULT_RESTAURANT_TIMEZONE) {
  return {
    $group: {
      _id: dayKeyExpr(timeZone),
      grossSales: { $sum: { $ifNull: ["$subTotal", 0] } },
      discounts: { $sum: { $ifNull: ["$discountTotal", 0] } },
      netSales: { $sum: "$netSales" },
      tax: { $sum: { $ifNull: ["$taxTotal", 0] } },
      tips: { $sum: { $ifNull: ["$tipAmount", 0] } },
      serviceCharges: { $sum: { $ifNull: ["$serviceChargeTotal", 0] } },
      collected: { $sum: "$tenderCollected" },
      orders: { $sum: 1 },
    },
  };
}

export function fillDaySeries(dateFrom, dateTo, rows, fields) {
  const byDay = new Map(
    (rows || []).map((row) => [row._id || row.date, row])
  );
  return eachBusinessDate(dateFrom, dateTo).map((date) => {
    const row = byDay.get(date) || {};
    const out = { date };
    for (const field of fields) {
      out[field] =
        field === "orders"
          ? Number(row[field] || row.orderCount) || 0
          : r2(row[field]);
    }
    return out;
  });
}

export const EMPLOYEE_LOOKUP = [
  {
    $lookup: {
      from: "employees",
      localField: "processedBy",
      foreignField: "_id",
      as: "_emp",
    },
  },
  {
    $addFields: {
      _empDoc: { $arrayElemAt: ["$_emp", 0] },
    },
  },
  {
    $addFields: {
      employeeName: {
        $let: {
          vars: { e: "$_empDoc" },
          in: {
            $cond: [
              { $ifNull: ["$$e", false] },
              {
                $ifNull: [
                  "$$e.name",
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
                ],
              },
              "Unknown",
            ],
          },
        },
      },
    },
  },
];
