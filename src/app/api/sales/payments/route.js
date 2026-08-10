import { withAuth } from "@/utils/auth";
import Order from "@/models/Order";
import TableSession from "@/models/floor/TableSession";
import Employee from "@/models/employee/Employee";
import Restaurant from "@/models/Restaurant";
import OperationalAuditLog from "@/models/OperationalAuditLog";
import { sendSuccess } from "@/utils/apiResponse";
import { sendError } from "@/utils/errorHandler";
import { logger } from "@/utils/logger";
import { createReceiptPrintJob } from "@/lib/printing/printJobService";
import { createNotification } from "@/lib/notifications/notificationService";

// POST - Process a payment for an order
export const POST = withAuth(async (request) => {
  try {
    const data = await request.json();
    const {
      orderId,
      amount,
      method,
      sessionId,
      tipAmount,
      cardType,
      giftCardCode,
      splitAmount,
      discountTotal,
      discountCode,
    } = data;

    if (!orderId) {
      return sendError(new Error("Missing ID"), "orderId is required", 400);
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return sendError(new Error("Not Found"), "Order not found", 404);
    }

    // In a real application, you would interface with a payment gateway here.
    // For now, we assume the payment succeeds and just update the DB.

    order.paymentStatus = "PAID";
    order.paymentMethod = method === 'Card' && cardType ? `Card - ${cardType}` : (method || "Cash");
    order.status = "PAID";

    // Persist checkout discount if applied at payment time
    if (discountTotal !== undefined && discountTotal !== null) {
      order.discountTotal = Math.round(Number(discountTotal) * 100) / 100;
    }
    if (discountCode !== undefined) {
      order.discountCode = discountCode || null;
    }
    if (amount !== undefined && amount !== null) {
      order.totalAmount = Math.round(Number(amount) * 100) / 100;
    }

    // Persist gift card usage on the order for receipts
    if (giftCardCode) {
      const due = Number(amount ?? order.totalAmount) || 0;
      const remaining = Number(splitAmount);
      const used =
        Number.isFinite(remaining) && remaining >= 0
          ? Math.max(0, Math.round((due - remaining) * 100) / 100)
          : due;
      order.giftcardCode = String(giftCardCode).trim().toUpperCase();
      order.giftcardUsedAmount = used;
    }

    // Save tip if provided
    if (tipAmount && tipAmount > 0) {
      order.tipAmount = Math.round(Number(tipAmount) * 100) / 100;
    }

    await order.save();

    let guestCount = null;
    let session = null;

    // If this order is linked to a session, optionally update the session status to PAYMENT_PENDING if not already
    // Actually, if it's paid, the session is now ready to be RELEASED.
    if (sessionId) {
      session = await TableSession.findById(sessionId);
      if (session) {
        guestCount = session.guestCount ?? null;
      }
      
      if (global.io && session) {
        global.io.to(`floor:${session.floor}`).emit('payment:completed', { orderId: order._id, sessionId });
      }

      // Audit Log
      if (session) {
        await OperationalAuditLog.create({
          restaurantId: request.restaurant,
          actorId: request.user.id,
          actorType: request.user.role === 'Admin' || request.user.role === 'Super Admin' || request.user.role === 'Manager' ? 'Admin' : 'Employee',
          actorName: request.user.name || request.user.firstName,
          action: 'PAYMENT_COMPLETED',
          floorId: session.floor,
          tableId: session.primaryTable,
          tableSessionId: sessionId,
          orderId: order._id,
          newValue: { method }
        });
      }

    } else if (global.io) {
      // If no session, broadcast to restaurant or something
      global.io.to(`restaurant:${order.restaurantId}`).emit('payment:completed', { orderId: order._id });
    }

    // Receipt PrintJob — only after successful payment (not on order create)
    let printJobId = null;
    try {
      const [emp, restaurant] = await Promise.all([
        Employee.findById(request.user.id).select("firstName lastName name").lean(),
        Restaurant.findById(order.restaurantId).select("name").lean(),
      ]);
      const serverName =
        emp?.name ||
        [emp?.firstName, emp?.lastName].filter(Boolean).join(" ") ||
        null;

      const { job } = await createReceiptPrintJob({
        order,
        requestedBy: request.user.id,
        guestCount,
        serverName,
        restaurantName: restaurant?.name || null,
      });
      printJobId = job?._id || null;
    } catch (printErr) {
      logger.error("Failed to create RECEIPT PrintJob (payment still succeeded)", printErr);
    }

    try {
      await createNotification({
        restaurantId: order.restaurantId,
        type: "PAYMENT_COMPLETED",
        title: "Payment Completed",
        message: `Payment received for Order #${order.orderNumber}${order.tableNo ? ` • Table ${order.tableNo}` : ""}`,
        orderId: order._id,
        tableId: order.table || null,
        tableSessionId: order.tableSession || sessionId || null,
        employeeId: request.user.id,
        floorId: session?.floor || order.floor || null,
        metadata: {
          orderNumber: order.orderNumber,
          tableNo: order.tableNo || null,
          amount: order.totalAmount,
          method: order.paymentMethod,
          tipAmount: order.tipAmount || 0,
        },
      });
    } catch (notifErr) {
      logger.error("Failed to create PAYMENT_COMPLETED notification", notifErr);
    }

    logger.info(`Payment processed for Order ${order.orderNumber} via ${method}`);
    return sendSuccess(
      { ...order.toObject(), printJobId },
      "Payment processed successfully",
      200
    );

  } catch (error) {
    logger.error("Failed to process payment", error);
    return sendError(error, "Failed to process payment", 500);
  }
}, ["ADMIN", "MANAGER", "SERVER", "BARTENDER"]);
