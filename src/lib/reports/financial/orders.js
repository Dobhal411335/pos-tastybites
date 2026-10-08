import Order from "@/models/Order";
import { r2, normalizePaymentTypeLabel } from "@/lib/eod/eodHelpers";
import { DEFAULT_RESTAURANT_TIMEZONE } from "@/lib/restaurantTime";
import {
  formatRestaurantDate,
  formatRestaurantTime,
} from "./format.js";
import { baseOrderMatch, ORDER_STATUSES } from "./match.js";
import { EMPLOYEE_LOOKUP, financialPipeline } from "./metrics.js";
import { shapeFinancialListMeta } from "./orderDetail.js";
import { reportMeta } from "./query.js";

const LIST_PROJECT = {
  _id: 1,
  orderNumber: 1,
  invoiceNumber: 1,
  originalInvoiceNumber: 1,
  createdAt: 1,
  updatedAt: 1,
  processedBy: 1,
  employeeName: 1,
  tableNo: 1,
  partyName: 1,
  guestName: 1,
  contactNumber: 1,
  guestCount: 1,
  source: 1,
  subTotal: 1,
  discountTotal: 1,
  discountCode: 1,
  discountPercent: 1,
  taxTotal: 1,
  tipAmount: 1,
  tipMethod: 1,
  serviceChargeTotal: 1,
  serviceChargeName: 1,
  totalAmount: 1,
  paymentMethod: 1,
  paymentStatus: 1,
  status: 1,
  cashAmount: 1,
  cardAmount: 1,
  giftcardCode: 1,
  giftcardUsedAmount: 1,
  paymentSplits: 1,
  items: 1,
  tenderCash: 1,
  tenderCard: 1,
  tenderGift: 1,
};

export async function buildFinancialOrders({ restaurantId, ...filters }) {
  const match = baseOrderMatch({ restaurantId, ...filters });
  const pipeline = financialPipeline(match, filters.paymentMethod);
  const tz = filters.timezone || DEFAULT_RESTAURANT_TIMEZONE;
  const page = filters.page || 1;
  const pageSize = filters.pageSize || 25;
  const sortBy = filters.sortBy || "updatedAt";
  const sortDir = filters.sortDir === 1 ? 1 : -1;

  const [facet] = await Order.aggregate([
    ...pipeline,
    ...EMPLOYEE_LOOKUP,
    {
      $facet: {
        statusCounts: [{ $group: { _id: "$status", count: { $sum: 1 } } }],
        total: [{ $count: "count" }],
        rows: [
          { $sort: { [sortBy]: sortDir, _id: sortDir } },
          { $skip: (page - 1) * pageSize },
          { $limit: pageSize },
          { $project: LIST_PROJECT },
        ],
      },
    },
  ]);

  const statusCounts = {
    total: 0,
    PENDING: 0,
    CONFIRMED: 0,
    COMPLETED: 0,
    PAID: 0,
    CANCELLED: 0,
    WAIVED: 0,
  };
  for (const row of facet?.statusCounts || []) {
    if (ORDER_STATUSES.includes(row._id)) {
      statusCounts[row._id] = row.count;
    }
    statusCounts.total += row.count;
  }

  const total = facet?.total?.[0]?.count || 0;
  const rows = (facet?.rows || []).map((order) => {
    const meta = shapeFinancialListMeta(order);
    return {
      id: String(order._id),
      orderNumber: order.orderNumber,
      invoiceNumber: order.invoiceNumber || null,
      originalInvoiceNumber: order.originalInvoiceNumber || null,
      date: formatRestaurantDate(order.updatedAt, tz),
      time: formatRestaurantTime(order.updatedAt, tz),
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      employee: order.employeeName || "Unknown",
      table: order.tableNo || "—",
      guest: order.partyName || order.guestName || "—",
      guestCount: meta.guestCount,
      source: meta.source,
      sourceLabel: meta.sourceLabel,
      orderTypeLabel: meta.orderTypeLabel,
      subTotal: r2(order.subTotal),
      discount: r2(order.discountTotal),
      discountCode: meta.discountCode,
      tax: r2(order.taxTotal),
      tips: r2(order.tipAmount),
      tipMethod: meta.tipMethod,
      serviceCharge: r2(order.serviceChargeTotal),
      serviceChargeName: meta.serviceChargeName,
      total: r2(order.totalAmount),
      paymentMethod: order.paymentMethod || "—",
      paymentLabel: normalizePaymentTypeLabel(
        order.paymentMethod,
        order.giftcardUsedAmount
      ),
      paymentStatus: order.paymentStatus,
      status: order.status,
      splitCount: meta.splitCount,
      hasSplits: meta.hasSplits,
      hasSeatItems: meta.hasSeatItems,
      seatBasedPayments: meta.seatBasedPayments,
      paidAmount: meta.paidAmount,
      remainingDue: meta.remainingDue,
      tenders: {
        cash: r2(order.tenderCash),
        card: r2(order.tenderCard),
        giftCard: r2(order.tenderGift),
      },
    };
  });

  return {
    meta: reportMeta(filters),
    empty: total === 0,
    statusCounts,
    page,
    pageSize,
    total,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
    rows,
  };
}
