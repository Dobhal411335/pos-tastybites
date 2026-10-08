import mongoose from "mongoose";
import { withAuth } from "@/utils/auth";
import PrintJob from "@/models/PrintJob";
import Order from "@/models/Order";
import { sendError } from "@/utils/errorHandler";
import { logger } from "@/utils/logger";
import {
  SALES_PRINT_ROLES,
  assertPrintAdminRole,
  expireStaleQueuedPrintJobs,
} from "@/lib/printing/printJobService";
import {
  DEFAULT_RESTAURANT_TIMEZONE,
  todayRestaurantISO,
} from "@/lib/restaurantTime";
import { businessDateBounds, isValidBusinessDate } from "@/lib/eod/eodHelpers";

/**
 * GET /api/sales/print-jobs
 * Sales/admin print queue for the restaurant.
 * Query params:
 *   - status: ALL | QUEUED | PRINTING | PRINTED | FAILED | CANCELLED
 *   - printType: ALL | RECEIPT | KOT | BAR_RECEIPT
 *   - printerTarget: ALL | RECEIPT | KITCHEN | COUNTER
 *   - printerId: string (id of specific PrinterConfig)
 *   - orderId: Mongo ObjectId — jobs for one order (defaults date to "all")
 *   - search / orderNumber: string (matches orderNumber)
 *   - date: YYYY-MM-DD (restaurant-local calendar day) | "all"
 *   - startDate, endDate: ISO / YYYY-MM-DD (used when date is omitted)
 *   - page: number (default 1)
 *   - limit: number (default 50, max 100)
 *
 * Default: restaurant-local today when no date / startDate / endDate / orderId is sent.
 */
export const GET = withAuth(async (request) => {
  try {
    const denied = assertPrintAdminRole(request.role);
    if (denied) return denied;

    // Drop overnight leftovers so agents never pick up yesterday's queue.
    await expireStaleQueuedPrintJobs(request.restaurant);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const printType = searchParams.get("printType");
    const printerTarget = searchParams.get("printerTarget");
    const printerId = searchParams.get("printerId");
    const orderIdParam = searchParams.get("orderId");
    const search = searchParams.get("search") || searchParams.get("orderNumber");
    const isReprint = searchParams.get("reprint");
    const dateParam = searchParams.get("date");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit = Math.min(Math.max(1, Number(searchParams.get("limit")) || 50), 100);
    const skip = (page - 1) * limit;

    const query = {
      restaurantId: request.restaurant,
      isActive: { $ne: false },
    };
    if (status && status !== "ALL") query.status = status;
    if (printType && printType !== "ALL") query.printType = printType;
    if (printerTarget && printerTarget !== "ALL") query.printerTarget = printerTarget;
    if (printerId && printerId !== "ALL") query.printerId = printerId;

    let orderIdFilter = null;
    if (orderIdParam && mongoose.Types.ObjectId.isValid(String(orderIdParam))) {
      orderIdFilter = new mongoose.Types.ObjectId(String(orderIdParam));
      query.orderId = orderIdFilter;
    }

    let resolvedDate = null;
    const tz = DEFAULT_RESTAURANT_TIMEZONE;
    const hasExplicitDate =
      Boolean(dateParam) || Boolean(startDate) || Boolean(endDate);

    if (dateParam && String(dateParam).toLowerCase() === "all") {
      // No createdAt filter — all days
      resolvedDate = "all";
    } else if (dateParam && isValidBusinessDate(dateParam)) {
      const { start, end } = businessDateBounds(dateParam, tz);
      query.createdAt = { $gte: start, $lt: end };
      resolvedDate = dateParam;
    } else if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        if (isValidBusinessDate(startDate)) {
          query.createdAt.$gte = businessDateBounds(startDate, tz).start;
        } else {
          const start = new Date(startDate);
          if (!isNaN(start.getTime())) query.createdAt.$gte = start;
        }
      }
      if (endDate) {
        if (isValidBusinessDate(endDate)) {
          query.createdAt.$lt = businessDateBounds(endDate, tz).end;
        } else {
          const end = new Date(endDate);
          if (!isNaN(end.getTime())) {
            if (endDate.length === 10) {
              end.setHours(23, 59, 59, 999);
            }
            query.createdAt.$lte = end;
          }
        }
      }
      if (!Object.keys(query.createdAt).length) delete query.createdAt;
      resolvedDate = startDate || endDate || null;
    } else if (orderIdFilter && !hasExplicitDate) {
      // Order history: all days for that order
      resolvedDate = "all";
    } else {
      // Default: restaurant-local today
      const today = todayRestaurantISO(tz);
      const { start, end } = businessDateBounds(today, tz);
      query.createdAt = { $gte: start, $lt: end };
      resolvedDate = today;
    }

    if (search && search.trim()) {
      const sanitized = search.trim();
      const matchingOrders = await Order.find({
        restaurantId: request.restaurant,
        isActive: { $ne: false },
        orderNumber: { $regex: sanitized, $options: "i" },
      })
        .select("_id")
        .lean();
      const orderIds = matchingOrders.map((o) => o._id);

      query.$or = [
        { "metadata.orderNumber": { $regex: sanitized, $options: "i" } },
        { orderId: { $in: orderIds } },
      ];
    }

    if (isReprint === "true") {
      const reprintCondition = [
        { parentPrintJobId: { $ne: null } },
        { "metadata.isReprint": true },
        { attemptCount: { $gt: 1 } },
      ];
      if (query.$or) {
        query.$and = [{ $or: query.$or }, { $or: reprintCondition }];
        delete query.$or;
      } else {
        query.$or = reprintCondition;
      }
    }

    const restObjectId = mongoose.Types.ObjectId.isValid(request.restaurant)
      ? new mongoose.Types.ObjectId(String(request.restaurant))
      : request.restaurant;

    const statsBaseMatch = {
      restaurantId: restObjectId,
      isActive: { $ne: false },
    };
    if (query.createdAt) statsBaseMatch.createdAt = query.createdAt;
    const includeStats = searchParams.get("stats") !== "0";

    const [jobs, total, statsAgg] = await Promise.all([
      PrintJob.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate(
          "orderId",
          "orderNumber invoiceNumber tableNo guestName partyName status paymentStatus totalAmount paymentMethod cashAmount cardAmount giftcardUsedAmount tipAmount tipMethod discountTotal discountPercent subTotal taxTotal items taxBreakdown paymentSplits"
        )
        .populate("requestedBy", "firstName lastName name")
        .populate("parentPrintJobId", "status printType createdAt")
        .lean(),
      PrintJob.countDocuments(query),
      includeStats
        ? PrintJob.aggregate([
            { $match: statsBaseMatch },
            {
              $group: {
                _id: null,
                total: { $sum: 1 },
                receiptCount: {
                  $sum: { $cond: [{ $eq: ["$printType", "RECEIPT"] }, 1, 0] },
                },
                kotCount: {
                  $sum: { $cond: [{ $eq: ["$printType", "KOT"] }, 1, 0] },
                },
                barCount: {
                  $sum: { $cond: [{ $eq: ["$printType", "BAR_RECEIPT"] }, 1, 0] },
                },
                reprintCount: {
                  $sum: {
                    $cond: [
                      {
                        $or: [
                          { $ne: ["$parentPrintJobId", null] },
                          { $eq: ["$metadata.isReprint", true] },
                          { $gt: ["$attemptCount", 1] },
                        ],
                      },
                      1,
                      0,
                    ],
                  },
                },
                printedCount: {
                  $sum: { $cond: [{ $eq: ["$status", "PRINTED"] }, 1, 0] },
                },
                failedCount: {
                  $sum: { $cond: [{ $eq: ["$status", "FAILED"] }, 1, 0] },
                },
                queuedCount: {
                  $sum: { $cond: [{ $eq: ["$status", "QUEUED"] }, 1, 0] },
                },
              },
            },
          ])
        : Promise.resolve([]),
    ]);

    const stats = statsAgg?.[0] || {
      total,
      receiptCount: 0,
      kotCount: 0,
      barCount: 0,
      reprintCount: 0,
      printedCount: 0,
      failedCount: 0,
      queuedCount: 0,
    };

    const totalPages = Math.ceil(total / limit) || 1;

    return Response.json(
      {
        success: true,
        message: "Print jobs retrieved",
        data: jobs,
        stats,
        filters: {
          date: resolvedDate,
          timezone: tz,
        },
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasMore: page < totalPages,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error("Failed to list print jobs", error);
    return sendError(error, "Failed to list print jobs", 500);
  }
}, SALES_PRINT_ROLES);

/**
 * DELETE /api/sales/print-jobs
 * Soft-delete all print jobs for the restaurant (admin only).
 * Body: { confirm: true }
 */
export const DELETE = withAuth(async (request) => {
  try {
    const denied = assertPrintAdminRole(request.role);
    if (denied) return denied;

    let body = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    if (!body?.confirm) {
      return Response.json(
        {
          success: false,
          message: "Confirmation required. Pass { confirm: true } to clear print jobs.",
        },
        { status: 400 }
      );
    }

    const result = await PrintJob.updateMany(
      {
        restaurantId: request.restaurant,
        isActive: { $ne: false },
      },
      {
        $set: {
          isActive: false,
          status: "CANCELLED",
          cancelledAt: new Date(),
          cancelReason: "Cleared by admin",
        },
      }
    );

    logger.info("Print jobs cleared by admin", {
      restaurantId: String(request.restaurant),
      cleared: result.modifiedCount,
      userId: request.userId,
    });

    return Response.json(
      {
        success: true,
        message: `Cleared ${result.modifiedCount} print job(s)`,
        data: { cleared: result.modifiedCount },
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error("Failed to clear print jobs", error);
    return sendError(error, "Failed to clear print jobs", 500);
  }
}, ["admin", "superadmin"]);
