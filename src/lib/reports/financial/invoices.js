import Order from "@/models/Order";
import { r2, normalizePaymentTypeLabel } from "@/lib/eod/eodHelpers";
import { DEFAULT_RESTAURANT_TIMEZONE } from "@/lib/restaurantTime";
import {
  formatRestaurantDate,
  formatRestaurantTime,
} from "./format.js";
import { paidRevenueMatch } from "./match.js";
import {
  emptyKpis,
  EMPLOYEE_LOOKUP,
  financialPipeline,
  KPI_GROUP,
  roundKpis,
} from "./metrics.js";
import { reportMeta } from "./query.js";

const LIST_PROJECT = {
  _id: 1,
  orderNumber: 1,
  invoiceNumber: 1,
  originalInvoiceNumber: 1,
  updatedAt: 1,
  employeeName: 1,
  partyName: 1,
  guestName: 1,
  contactNumber: 1,
  tableNo: 1,
  subTotal: 1,
  discountTotal: 1,
  taxTotal: 1,
  tipAmount: 1,
  serviceChargeTotal: 1,
  totalAmount: 1,
  paymentMethod: 1,
  paymentStatus: 1,
  status: 1,
  giftcardUsedAmount: 1,
  tenderCash: 1,
  tenderCard: 1,
  tenderGift: 1,
  tenderCollected: 1,
};

export async function buildFinancialInvoices({ restaurantId, ...filters }) {
  const match = paidRevenueMatch({ restaurantId, ...filters });
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
        kpis: [{ $group: KPI_GROUP }],
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

  const kpis = roundKpis(facet?.kpis?.[0] || emptyKpis());
  const total = facet?.total?.[0]?.count || 0;

  const rows = (facet?.rows || []).map((order) => {
    const invoiceNumber = order.invoiceNumber || null;
    const originalInvoiceNumber = order.originalInvoiceNumber || null;
    return {
      id: String(order._id),
      invoiceNumber,
      originalInvoiceNumber:
        originalInvoiceNumber &&
        originalInvoiceNumber !== invoiceNumber
          ? originalInvoiceNumber
          : null,
      orderNumber: order.orderNumber,
      date: formatRestaurantDate(order.updatedAt, tz),
      time: formatRestaurantTime(order.updatedAt, tz),
      updatedAt: order.updatedAt,
      employee: order.employeeName || "Unknown",
      guest: order.partyName || order.guestName || "—",
      table: order.tableNo || "—",
      subTotal: r2(order.subTotal),
      discount: r2(order.discountTotal),
      tax: r2(order.taxTotal),
      tips: r2(order.tipAmount),
      serviceCharge: r2(order.serviceChargeTotal),
      total: r2(order.totalAmount),
      collected: r2(order.tenderCollected),
      paymentMethod: order.paymentMethod || "—",
      paymentLabel: normalizePaymentTypeLabel(
        order.paymentMethod,
        order.giftcardUsedAmount
      ),
      paymentStatus: order.paymentStatus,
      status: order.status,
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
    summary: {
      invoiceCount: kpis.orderCount,
      grossSales: kpis.grossSales,
      discounts: kpis.discounts,
      netSales: kpis.netSales,
      tax: kpis.tax,
      tips: kpis.tips,
      serviceCharges: kpis.serviceCharges,
      collected: kpis.collected,
    },
    page,
    pageSize,
    total,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
    rows,
  };
}
