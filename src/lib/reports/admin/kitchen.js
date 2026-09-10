import PrintJob from "@/models/PrintJob";
import { DEFAULT_RESTAURANT_TIMEZONE } from "@/lib/restaurantTime";
import {
  dateRangeBounds,
  toObjectId,
} from "@/lib/reports/financial/match";
import {
  formatRestaurantDate,
  formatRestaurantTime,
} from "@/lib/reports/financial/format";
import { adminReportMeta } from "./query";

function ticketNumber(job) {
  const orderNumber = job.metadata?.orderNumber;
  const id = String(job._id);
  const short = id.slice(-6).toUpperCase();
  return orderNumber ? `${orderNumber}-${short}` : short;
}

function ticketItems(job, printType) {
  if (printType === "BAR_RECEIPT") {
    return (
      job.metadata?.barItems ||
      job.metadata?.kotItems ||
      []
    );
  }
  return job.metadata?.kotItems || [];
}

function itemsSummary(items) {
  if (!Array.isArray(items) || items.length === 0) return "—";
  const names = items
    .map((item) => {
      const qty = item?.qty != null ? Number(item.qty) : null;
      const name = item?.name || "Item";
      return qty != null && qty > 0 ? `${qty}× ${name}` : name;
    })
    .filter(Boolean);
  if (names.length <= 2) return names.join(", ");
  return `${names.slice(0, 2).join(", ")} +${names.length - 2}`;
}

/**
 * Shared PrintJob ticket report for Kitchen (KOT) or Bar (BAR_RECEIPT).
 */
export async function buildAdminPrintTickets({
  restaurantId,
  printType,
  ...filters
}) {
  const tz = filters.timezone || DEFAULT_RESTAURANT_TIMEZONE;
  const { start, end } = dateRangeBounds(filters.dateFrom, filters.dateTo);
  const page = filters.page || 1;
  const pageSize = filters.pageSize || 25;
  const isBar = printType === "BAR_RECEIPT";
  const areaLabel = isBar ? "Bar" : "Kitchen";

  const match = {
    restaurantId: toObjectId(restaurantId),
    printType,
    createdAt: { $gte: start, $lt: end },
  };
  if (filters.employeeId) {
    match.requestedBy = toObjectId(filters.employeeId);
  }
  if (filters.kotStatus && filters.kotStatus !== "ALL") {
    match.status = filters.kotStatus;
  }

  const [facet] = await PrintJob.aggregate([
    { $match: match },
    {
      $lookup: {
        from: "orders",
        localField: "orderId",
        foreignField: "_id",
        as: "_order",
      },
    },
    {
      $addFields: {
        orderDoc: { $arrayElemAt: ["$_order", 0] },
        ticketItems: isBar
          ? {
              $ifNull: [
                "$metadata.barItems",
                { $ifNull: ["$metadata.kotItems", []] },
              ],
            }
          : { $ifNull: ["$metadata.kotItems", []] },
        isReprint: {
          $or: [
            { $ne: [{ $ifNull: ["$parentPrintJobId", null] }, null] },
            { $eq: ["$metadata.isReprint", true] },
            { $gt: [{ $ifNull: ["$attemptCount", 0] }, 1] },
          ],
        },
      },
    },
    {
      $facet: {
        statusCounts: [{ $group: { _id: "$status", count: { $sum: 1 } } }],
        total: [{ $count: "count" }],
        reprints: [
          { $match: { isReprint: true } },
          { $count: "count" },
        ],
        rows: [
          { $sort: { createdAt: -1, _id: -1 } },
          { $skip: (page - 1) * pageSize },
          { $limit: pageSize },
        ],
        topItems: [
          { $match: { status: { $ne: "CANCELLED" } } },
          {
            $unwind: {
              path: "$ticketItems",
              preserveNullAndEmptyArrays: false,
            },
          },
          {
            $group: {
              _id: {
                $ifNull: [
                  "$ticketItems.menuItemId",
                  { $ifNull: ["$ticketItems.name", "Unknown"] },
                ],
              },
              item: {
                $first: { $ifNull: ["$ticketItems.name", "Unknown"] },
              },
              quantity: { $sum: { $ifNull: ["$ticketItems.qty", 0] } },
              orders: { $addToSet: "$orderId" },
            },
          },
          {
            $project: {
              _id: 0,
              item: 1,
              quantity: 1,
              orderCount: { $size: "$orders" },
            },
          },
          { $sort: { quantity: -1, item: 1 } },
          { $limit: 20 },
        ],
      },
    },
  ]);

  const statusCounts = {
    total: facet?.total?.[0]?.count || 0,
    QUEUED: 0,
    PRINTING: 0,
    PRINTED: 0,
    FAILED: 0,
    CANCELLED: 0,
  };
  for (const row of facet?.statusCounts || []) {
    if (Object.prototype.hasOwnProperty.call(statusCounts, row._id)) {
      statusCounts[row._id] = row.count;
    }
  }

  const pending = statusCounts.QUEUED + statusCounts.PRINTING;
  const reprintCount = facet?.reprints?.[0]?.count || 0;
  const topItems = (facet?.topItems || []).map((row, index) => ({
    rank: index + 1,
    ...row,
  }));

  const rows = (facet?.rows || []).map((job) => {
    const items = ticketItems(job, printType);
    return {
      id: String(job._id),
      ticketNumber: ticketNumber(job),
      kotNumber: ticketNumber(job),
      orderNumber:
        job.metadata?.orderNumber || job.orderDoc?.orderNumber || "—",
      date: formatRestaurantDate(job.createdAt, tz),
      time: formatRestaurantTime(job.createdAt, tz),
      table: job.metadata?.tableNo || job.orderDoc?.tableNo || "—",
      employee: job.metadata?.serverName || "Name not recorded",
      status: job.status,
      type: areaLabel,
      reprint: Boolean(
        job.parentPrintJobId ||
          job.metadata?.isReprint ||
          (job.attemptCount || 0) > 1
      ),
      itemsSummary: itemsSummary(items),
    };
  });

  return {
    meta: adminReportMeta(filters),
    empty: statusCounts.total === 0,
    note: `${areaLabel} tickets are PrintJobs (${printType}). Preparing/Ready/Served statuses are not stored. Cancelled tickets are excluded from production item counts.`,
    printType,
    areaLabel,
    counts: {
      total: statusCounts.total,
      completed: statusCounts.PRINTED,
      pending,
      cancelled: statusCounts.CANCELLED,
      failed: statusCounts.FAILED,
      reprints: reprintCount,
    },
    page,
    pageSize,
    total: statusCounts.total,
    pageCount: Math.max(1, Math.ceil(statusCounts.total / pageSize)),
    rows,
    topItems,
    fastMoving: topItems,
  };
}

export async function buildAdminKitchen(filters) {
  return buildAdminPrintTickets({ ...filters, printType: "KOT" });
}
