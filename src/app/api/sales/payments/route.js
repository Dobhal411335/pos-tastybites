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
import { redeemGiftCardAtomic } from "@/lib/giftcards/redeemGiftCardAtomic";
import {
  STAFF_DISCOUNT_CODE,
  calcStaffDiscountAmount,
  normalizeStaffDiscountPercent,
} from "@/lib/orders/staffDiscount";
import ServiceTax from "@/models/tax/ServiceTax";
import {
  computeOrderServiceCharge,
  SERVICE_CHARGE_NO_TIP_MESSAGE,
} from "@/lib/orders/serviceCharge";

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
      tipMethod,
      cardType,
      giftCardCode,
      giftCardUsedAmount,
      splitAmount,
      discountTotal,
      discountCode,
      guestName,
      partyName,
      guestCount,
      cashAmount,
      cardAmount,
      applyServiceCharge,
      serviceChargeTotal,
      serviceChargeName,
    } = data;

    if (!orderId) {
      return sendError(new Error("Missing ID"), "orderId is required", 400);
    }

    const order = await Order.findOne({
      _id: orderId,
      restaurantId: request.restaurant,
    });
    if (!order) {
      return sendError(new Error("Not Found"), "Order not found", 404);
    }

    if (order.paymentStatus === "PAID" || order.status === "PAID") {
      return sendError(
        new Error("Already Paid"),
        "This order has already been paid",
        409,
      );
    }

    if (["CANCELLED", "WAIVED"].includes(String(order.status || ""))) {
      return sendError(
        new Error("Invalid Status"),
        "Cannot take payment for a cancelled or waived order",
        400,
      );
    }

    // In a real application, you would interface with a payment gateway here.
    // For now, we assume the payment succeeds and just update the DB.

    // Never trust client totals for the payable amount — recompute from persisted order lines.
    const subTotal = r2(order.subTotal);
    const taxTotal = r2(order.taxTotal);
    const discountCeiling = r2(subTotal + taxTotal);

    if (order.source === "STAFF" && order.staffFor) {
      const staff = await Employee.findOne({
        _id: order.staffFor,
        restaurant: request.restaurant,
      }).select("staffDiscount");
      const staffPercent = normalizeStaffDiscountPercent(staff?.staffDiscount);
      const staffDiscountTotal = calcStaffDiscountAmount(
        order.subTotal,
        staffPercent,
      );
      order.discountTotal = staffDiscountTotal;
      order.discountCode = staffDiscountTotal > 0 ? STAFF_DISCOUNT_CODE : null;
    } else {
      if (discountTotal !== undefined && discountTotal !== null) {
        const incomingDiscount = r2(discountTotal);
        if (incomingDiscount < 0 || incomingDiscount > discountCeiling + 0.01) {
          return sendError(
            new Error("Invalid Discount"),
            "Discount amount is invalid for this order",
            400,
          );
        }
        order.discountTotal = incomingDiscount;
      }
      if (discountCode !== undefined) {
        order.discountCode = discountCode
          ? String(discountCode).trim().toUpperCase()
          : null;
      }
    }

    const resolvedDiscount = r2(order.discountTotal);
    const wantsServiceCharge =
      applyServiceCharge === true ||
      (applyServiceCharge !== false &&
        serviceChargeTotal != null &&
        r2(serviceChargeTotal) > 0);

    let workingServiceCharge = 0;
    if (wantsServiceCharge) {
      const serviceTax = await ServiceTax.findOne({
        restaurant: request.restaurant,
        status: "Active",
      }).lean();
      if (!serviceTax) {
        return sendError(
          new Error("Invalid Charge"),
          "No active service charge is configured",
          400,
        );
      }
      workingServiceCharge = computeOrderServiceCharge({
        serviceTax,
        subtotal: subTotal,
        discountAmount: resolvedDiscount,
      });
      if (serviceChargeTotal != null && serviceChargeTotal !== "") {
        const clientSc = r2(serviceChargeTotal);
        if (clientSc < 0) {
          return sendError(
            new Error("Invalid Charge"),
            "Service charge cannot be negative",
            400,
          );
        }
        if (Math.abs(clientSc - workingServiceCharge) > 0.02) {
          return sendError(
            new Error("Invalid Charge"),
            "Service charge does not match the order",
            400,
          );
        }
      }
      order.serviceChargeName =
        serviceTax.name || serviceChargeName || "Server Charge";
    } else {
      order.serviceChargeName = null;
    }
    order.serviceChargeTotal = workingServiceCharge;

    order.totalAmount = r2(
      Math.max(0, subTotal - resolvedDiscount + taxTotal + workingServiceCharge),
    );

    // Client `amount` may only confirm the server-computed total — never overwrite it.
    const dueAmount = r2(order.totalAmount);
    if (amount !== undefined && amount !== null) {
      const clientAmount = r2(amount);
      if (Math.abs(clientAmount - dueAmount) > 0.02) {
        return sendError(
          new Error("Amount Mismatch"),
          `Payment amount does not match order total ($${dueAmount.toFixed(2)})`,
          400,
        );
      }
    }

    order.paymentStatus = "PAID";
    const methodLabel = String(method || "Cash");
    if (methodLabel === "Card" && cardType) {
      order.paymentMethod = `Card - ${cardType}`;
    } else if (
      /card/i.test(methodLabel) &&
      /cash/i.test(methodLabel) &&
      cardType &&
      !/card\s*-/i.test(methodLabel)
    ) {
      // Prefer explicit card type when UI sent a generic "Card + Cash"
      order.paymentMethod = `Card - ${cardType} + Cash`;
    } else if (methodLabel.includes("Card") && methodLabel.includes("Cash")) {
      order.paymentMethod = methodLabel.includes("Card -")
        ? methodLabel
        : cardType
          ? `Card - ${cardType} + Cash`
          : "Card + Cash";
    } else if (
      /gift\s*card/i.test(methodLabel) &&
      /card/i.test(methodLabel) &&
      cardType &&
      !/card\s*-/i.test(methodLabel)
    ) {
      order.paymentMethod = methodLabel.replace(
        /\bCard\b/,
        `Card - ${cardType}`,
      );
    } else {
      order.paymentMethod = methodLabel;
    }
    order.status = "PAID";

    // Persist gift card usage on the order for receipts (amount capped to order total).
    // Prefer explicit giftCardUsedAmount from POS — deriving from splitAmount alone can
    // over-debit when cash/card locks are involved (due - remainingAfterGift ≠ gift used).
    let giftCardDebitAmount = 0;
    if (giftCardCode) {
      const due = r2(order.totalAmount);
      const tip = r2(tipAmount);
      const cash = cashAmount != null && cashAmount !== "" ? r2(cashAmount) : 0;
      const card = cardAmount != null && cardAmount !== "" ? r2(cardAmount) : 0;
      const nonGcTowardOrder = r2(Math.max(0, cash + card - tip));
      const impliedFromTenders = r2(Math.max(0, due - nonGcTowardOrder));

      let requested = null;
      if (giftCardUsedAmount != null && giftCardUsedAmount !== "") {
        requested = r2(giftCardUsedAmount);
      } else if (splitAmount != null && splitAmount !== "") {
        const remaining = Number(splitAmount);
        requested =
          Number.isFinite(remaining) && remaining >= 0
            ? r2(Math.max(0, due - remaining))
            : due;
      } else {
        requested = due;
      }

      // Never charge more than due; when cash/card were sent, also cap to what tenders imply
      // so a small client/server total drift cannot request more than the card balance path allows.
      giftCardDebitAmount = r2(Math.min(Math.max(0, requested), due));
      if (
        (cashAmount != null && cashAmount !== "") ||
        (cardAmount != null && cardAmount !== "")
      ) {
        giftCardDebitAmount = r2(
          Math.min(giftCardDebitAmount, impliedFromTenders),
        );
      }

      order.giftcardCode = String(giftCardCode).trim().toUpperCase();
      order.giftcardUsedAmount = giftCardDebitAmount;
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
    if (tipAmount !== undefined && tipAmount !== null && tipAmount !== "") {
      const tip = r2(tipAmount);
      if (tip < 0) {
        return sendError(new Error("Invalid Tip"), "Tip cannot be negative", 400);
      }
      if (tip > 0 && workingServiceCharge > 0) {
        return sendError(
          new Error("Tip Not Allowed"),
          SERVICE_CHARGE_NO_TIP_MESSAGE,
          400,
        );
      }
      if (tip > 0) {
        order.tipAmount = tip;
        if (tipMethod) {
          order.tipMethod = String(tipMethod).trim();
        } else {
          // Infer tip tender from payment method when UI did not send tipMethod
          const methodStr = String(order.paymentMethod || method || "");
          if (/gift\s*card/i.test(methodStr) && !/cash|card\s*-/i.test(methodStr)) {
            order.tipMethod = "Gift Card";
          } else if (/cash/i.test(methodStr) && !/card/i.test(methodStr)) {
            order.tipMethod = "Cash";
          } else if (/card/i.test(methodStr) && !/cash/i.test(methodStr)) {
            order.tipMethod = "Card";
          } else if (/cash/i.test(methodStr)) {
            order.tipMethod = "Cash";
          } else if (/card/i.test(methodStr)) {
            order.tipMethod = "Card";
          }
        }
      }
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

    // Debit gift card BEFORE marking paid — fail closed if redeem fails
    if (giftCardDebitAmount > 0 && order.giftcardCode) {
      const redeem = await redeemGiftCardAtomic({
        restaurantId: request.restaurant,
        code: order.giftcardCode,
        amountToUse: giftCardDebitAmount,
        orderId: order._id,
        note: "POS payment",
        sendEmail: true,
      });
      if (!redeem.ok) {
        logger.error(
          `Gift card redeem failed code=${order.giftcardCode} amount=${giftCardDebitAmount}: ${redeem.error}`,
        );
        return sendError(
          new Error(redeem.error || "Failed to redeem gift card"),
          redeem.error || "Failed to redeem gift card",
          redeem.status || 400,
        );
      }
    }

    await order.save();

    let receiptGuestCount = order.guestCount ?? null;
    let session = null;

    // If this order is linked to a session, optionally update the session status to PAYMENT_PENDING if not already
    // Actually, if it's paid, the session is now ready to be RELEASED.
    if (sessionId) {
      session = await TableSession.findOne({
        _id: sessionId,
        restaurant: request.restaurant,
      });
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
        message: `Payment received for Order #${order.orderNumber}${
          order.tableNo
            ? ` • ${/^tables?\b/i.test(String(order.tableNo).trim()) ? order.tableNo : `Table ${order.tableNo}`}`
            : ""
        }`,
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
