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

function kotNumber(job) {
  const orderNumber = job.metadata?.orderNumber;
  const id = String(job._id);
  const short = id.slice(-6).toUpperCase();
  return orderNumber ? `${orderNumber}-${short}` : short;
}

export async function buildAdminKitchen({ restaurantId, ...filters }) {
  const tz = filters.timezone || DEFAULT_RESTAURANT_TIMEZONE;
  const { start, end } = dateRangeBounds(filters.dateFrom, filters.dateTo);
  const page = filters.page || 1;
  const pageSize = filters.pageSize || 25;

  const match = {
    restaurantId: toObjectId(restaurantId),
    printType: { $in: ["KOT", "BAR_RECEIPT"] },
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
        kotItems: {
          $ifNull: [
            "$metadata.kotItems",
            { $ifNull: ["$metadata.barItems", []] },
          ],
        },
      },
    },
    {
      $facet: {
        statusCounts: [{ $group: { _id: "$status", count: { $sum: 1 } } }],
        total: [{ $count: "count" }],
        rows: [
          { $sort: { createdAt: -1, _id: -1 } },
          { $skip: (page - 1) * pageSize },
          { $limit: pageSize },
        ],
        topItems: [
          { $match: { status: { $ne: "CANCELLED" } } },
          { $unwind: { path: "$kotItems", preserveNullAndEmptyArrays: false } },
          {
            $group: {
              _id: {
                $ifNull: [
                  "$kotItems.menuItemId",
                  { $ifNull: ["$kotItems.name", "Unknown"] },
                ],
              },
              item: { $first: { $ifNull: ["$kotItems.name", "Unknown"] } },
              quantity: { $sum: { $ifNull: ["$kotItems.qty", 0] } },
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
  const topItems = (facet?.topItems || []).map((row, index) => ({
    rank: index + 1,
    ...row,
  }));

  const rows = (facet?.rows || []).map((job) => ({
    id: String(job._id),
    kotNumber: kotNumber(job),
    orderNumber:
      job.metadata?.orderNumber || job.orderDoc?.orderNumber || "—",
    date: formatRestaurantDate(job.createdAt, tz),
    time: formatRestaurantTime(job.createdAt, tz),
    table: job.metadata?.tableNo || job.orderDoc?.tableNo || "—",
    employee:
      job.metadata?.serverName || "Name not recorded",
    status: job.status,
    type: job.printType === "BAR_RECEIPT" ? "Bar" : "Kitchen",
  }));

  return {
    meta: adminReportMeta(filters),
    empty: statusCounts.total === 0,
    note: "Kitchen tickets are PrintJobs (KOT and bar). Preparing/Ready/Served statuses are not stored. Cancelled tickets are excluded from production item counts.",
    counts: {
      total: statusCounts.total,
      completed: statusCounts.PRINTED,
      pending,
      cancelled: statusCounts.CANCELLED,
      failed: statusCounts.FAILED,
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
