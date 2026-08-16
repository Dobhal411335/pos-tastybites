import Order from "@/models/Order";
import Giftcard from "@/models/menu/Giftcard";
import { r2, normalizePaymentTypeLabel } from "@/lib/eod/eodHelpers";
import { DEFAULT_RESTAURANT_TIMEZONE } from "@/lib/restaurantTime";
import {
  formatRestaurantDate,
  formatRestaurantTime,
} from "./format.js";
import { dateRangeBounds, paidRevenueMatch, toObjectId } from "./match.js";
import {
  emptyKpis,
  EMPLOYEE_LOOKUP,
  financialPipeline,
  KPI_GROUP,
  roundKpis,
} from "./metrics.js";
import { reportMeta } from "./query.js";

async function giftCardsIssued({ restaurantId, dateFrom, dateTo }) {
  const rid = toObjectId(restaurantId);
  const { start, end } = dateRangeBounds(dateFrom, dateTo);
  const cards = await Giftcard.find({
    restaurant: rid,
    isIssued: true,
    $or: [
      { issueDate: { $gte: start, $lt: end } },
      {
        $and: [
          { $or: [{ issueDate: null }, { issueDate: { $exists: false } }] },
          { createdAt: { $gte: start, $lt: end } },
        ],
      },
    ],
  })
    .select("code name value issueDate createdAt recipientName")
    .lean();

  const amount = r2(cards.reduce((sum, card) => sum + (Number(card.value) || 0), 0));
  return {
    count: cards.length,
    amount,
    note: "Admin-issued stored value. This is not POS item revenue and is not a redemption.",
  };
}

export async function buildFinancialPayments({ restaurantId, ...filters }) {
  const match = paidRevenueMatch({ restaurantId, ...filters });
  const pipeline = financialPipeline(match, filters.paymentMethod);
  const tz = filters.timezone || DEFAULT_RESTAURANT_TIMEZONE;
  const page = filters.page || 1;
  const pageSize = filters.pageSize || 25;
  const sortBy = filters.sortBy || "updatedAt";
  const sortDir = filters.sortDir === 1 ? 1 : -1;

  const [facet, issued] = await Promise.all([
    Order.aggregate([
      ...pipeline,
      ...EMPLOYEE_LOOKUP,
      {
        $facet: {
          kpis: [{ $group: KPI_GROUP }],
          total: [{ $count: "count" }],
          rows: [
            { $sort: { [sortBy]: sortDir, _id: sortDir } },
            { $skip: (page - 1) * pageSize },
            { $limit: pageSize },
            {
              $project: {
                _id: 1,
                orderNumber: 1,
                updatedAt: 1,
                employeeName: 1,
                paymentMethod: 1,
                paymentStatus: 1,
                status: 1,
                totalAmount: 1,
                tipAmount: 1,
                giftcardUsedAmount: 1,
                tenderCash: 1,
                tenderCard: 1,
                tenderGift: 1,
                tenderCollected: 1,
              },
            },
          ],
        },
      },
    ]).then((rows) => rows[0]),
    giftCardsIssued({
      restaurantId,
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
    }),
  ]);

  const kpis = roundKpis(facet?.kpis?.[0] || emptyKpis());
  const total = facet?.total?.[0]?.count || 0;
  const collected = kpis.collected;

  const methods = [
    { method: "Cash", count: kpis.cashCount, amount: kpis.cash },
    { method: "Card", count: kpis.cardCount, amount: kpis.card },
    { method: "Gift Card", count: kpis.giftCount, amount: kpis.giftCard },
  ].map((row) => ({
    ...row,
    percent: collected > 0 ? r2((row.amount / collected) * 100) : 0,
  }));

  const rows = (facet?.rows || []).map((order) => ({
    id: String(order._id),
    orderNumber: order.orderNumber,
    date: formatRestaurantDate(order.updatedAt, tz),
    time: formatRestaurantTime(order.updatedAt, tz),
    updatedAt: order.updatedAt,
    employee: order.employeeName || "Unknown",
    paymentMethod: order.paymentMethod || "—",
    paymentLabel: normalizePaymentTypeLabel(
      order.paymentMethod,
      order.giftcardUsedAmount
    ),
    amount: r2(order.tenderCollected),
    cash: r2(order.tenderCash),
    card: r2(order.tenderCard),
    giftCard: r2(order.tenderGift),
    status: order.paymentStatus || order.status,
  }));

  return {
    meta: reportMeta(filters),
    empty: total === 0 && issued.count === 0,
    summary: {
      collected,
      methods,
    },
    giftCards: {
      redeemed: {
        count: kpis.giftCount,
        amount: kpis.giftCard,
        note: "Stored-value tenders on paid orders. Not new gift-card revenue.",
      },
      issued,
    },
    page,
    pageSize,
    total,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
    rows,
  };
}
