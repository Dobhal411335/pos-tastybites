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
import { buildTaxBreakdownForOrder } from "@/lib/eod/buildTaxBreakdown";

const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

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
      guestName,
      partyName,
      guestCount,
      cashAmount,
      cardAmount,
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
    const methodLabel = String(method || "Cash");
    if (methodLabel === "Card" && cardType) {
      order.paymentMethod = `Card - ${cardType}`;
    } else if (methodLabel.includes("Card") && methodLabel.includes("Cash")) {
      order.paymentMethod = cardType ? `Card - ${cardType} + Cash` : "Card + Cash";
    } else {
      order.paymentMethod = methodLabel;
    }
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

    // Persist party / customer name for the bill
    if (partyName !== undefined || guestName !== undefined) {
      const resolvedPartyName = (partyName || guestName || "").trim() || null;
      order.partyName = resolvedPartyName;
      order.guestName = resolvedPartyName;
    }

    // Persist guest count on the order
    if (guestCount !== undefined && guestCount !== null && guestCount !== "") {
      const n = Number(guestCount);
      if (Number.isFinite(n)) order.guestCount = n;
    }

    // Save tip if provided
    if (tipAmount && tipAmount > 0) {
      order.tipAmount = Math.round(Number(tipAmount) * 100) / 100;
    }

    // Persist tender split amounts when provided by POS
    if (cashAmount !== undefined && cashAmount !== null && cashAmount !== "") {
      const n = Number(cashAmount);
      if (Number.isFinite(n)) order.cashAmount = r2(n);
    }
    if (cardAmount !== undefined && cardAmount !== null && cardAmount !== "") {
      const n = Number(cardAmount);
      if (Number.isFinite(n)) order.cardAmount = r2(n);
    }

    // Infer tenders from method when UI did not send split amounts
    if (
      (order.cashAmount == null || order.cashAmount === undefined) &&
      (order.cardAmount == null || order.cardAmount === undefined)
    ) {
      const due = r2(order.totalAmount);
      const tip = r2(order.tipAmount);
      const gc = r2(order.giftcardUsedAmount);
      const methodStr = String(order.paymentMethod || methodLabel || "");
      const isCashOnly = /^cash$/i.test(methodStr.trim());
      const isGiftOnly = /gift\s*card/i.test(methodStr) && !/card\s*-/i.test(methodStr);
      if (isCashOnly) {
        order.cashAmount = r2(due + tip - gc);
        order.cardAmount = 0;
      } else if (isGiftOnly || gc >= due) {
        order.cashAmount = 0;
        order.cardAmount = 0;
      } else if (/cash/i.test(methodStr) && /card/i.test(methodStr)) {
        // Split without amounts: leave nulls so EOD can fall back to method string
      } else if (/card/i.test(methodStr) || /visa|master|debit|credit/i.test(methodStr)) {
        order.cardAmount = r2(due + tip - gc);
        order.cashAmount = 0;
      }
    }

    try {
      order.taxBreakdown = await buildTaxBreakdownForOrder(
        order,
        order.restaurantId || request.restaurant
      );
    } catch (taxErr) {
      logger.error("Failed to build taxBreakdown at payment", taxErr);
    }

    await order.save();

    let receiptGuestCount = order.guestCount ?? null;
    let session = null;

    // If this order is linked to a session, optionally update the session status to PAYMENT_PENDING if not already
    // Actually, if it's paid, the session is now ready to be RELEASED.
    if (sessionId) {
      session = await TableSession.findById(sessionId);
      if (session) {
        if (order.guestCount == null && session.guestCount != null) {
          order.guestCount = session.guestCount;
          await order.save();
        }
        receiptGuestCount = order.guestCount ?? session.guestCount ?? null;
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
        guestCount: receiptGuestCount,
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
