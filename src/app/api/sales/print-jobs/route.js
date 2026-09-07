import mongoose from "mongoose";
import { withAuth } from "@/utils/auth";
import PrintJob from "@/models/PrintJob";
import Order from "@/models/Order";
import { sendError } from "@/utils/errorHandler";
import { logger } from "@/utils/logger";
import {
  SALES_PRINT_ROLES,
  assertPrintAdminRole,
} from "@/lib/printing/printJobService";

/**
 * GET /api/sales/print-jobs
 * Sales/admin print queue for the restaurant.
 * Query params:
 *   - status: ALL | QUEUED | PRINTING | PRINTED | FAILED | CANCELLED
 *   - printType: ALL | RECEIPT | KOT | BAR_RECEIPT
 *   - printerTarget: ALL | RECEIPT | KITCHEN | COUNTER
 *   - printerId: string (id of specific PrinterConfig)
 *   - search / orderNumber: string (matches orderNumber)
 *   - startDate, endDate: ISO date strings
 *   - page: number (default 1)
 *   - limit: number (default 50, max 100)
 */
export const GET = withAuth(async (request) => {
  try {
    const denied = assertPrintAdminRole(request.role);
    if (denied) return denied;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const printType = searchParams.get("printType");
    const printerTarget = searchParams.get("printerTarget");
    const printerId = searchParams.get("printerId");
    const search = searchParams.get("search") || searchParams.get("orderNumber");
    const isReprint = searchParams.get("reprint");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit = Math.min(Math.max(1, Number(searchParams.get("limit")) || 50), 100);
    const skip = (page - 1) * limit;

    const query = { restaurantId: request.restaurant };
    if (status && status !== "ALL") query.status = status;
    if (printType && printType !== "ALL") query.printType = printType;
    if (printerTarget && printerTarget !== "ALL") query.printerTarget = printerTarget;
    if (printerId && printerId !== "ALL") query.printerId = printerId;

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        const start = new Date(startDate);
        if (!isNaN(start.getTime())) {
          query.createdAt.$gte = start;
        }
      }
      if (endDate) {
        const end = new Date(endDate);
        if (!isNaN(end.getTime())) {
          if (endDate.length === 10) {
            end.setHours(23, 59, 59, 999);
          }
          query.createdAt.$lte = end;
        }
      }
    }

    if (search && search.trim()) {
      const sanitized = search.trim();
      const matchingOrders = await Order.find({
        restaurantId: request.restaurant,
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

    const statsBaseMatch = { restaurantId: restObjectId };
    if (query.createdAt) statsBaseMatch.createdAt = query.createdAt;

    const [jobs, total, statsAgg] = await Promise.all([
      PrintJob.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate(
          "orderId",
          "orderNumber invoiceNumber tableNo guestName partyName status paymentStatus totalAmount paymentMethod cashAmount cardAmount giftcardUsedAmount tipAmount tipMethod discountTotal discountPercent subTotal taxTotal items taxBreakdown"
        )
        .populate("requestedBy", "firstName lastName name")
        .populate("parentPrintJobId", "status printType createdAt")
        .lean(),
      PrintJob.countDocuments(query),
      PrintJob.aggregate([
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
      ]),
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
