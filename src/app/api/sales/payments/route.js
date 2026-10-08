import { withAuth } from "@/utils/auth";
import Order from "@/models/Order";
import TableSession from "@/models/floor/TableSession";
import Employee from "@/models/employee/Employee";
import Restaurant from "@/models/Restaurant";
import Floor from "@/models/floor/Floor";
import OperationalAuditLog from "@/models/OperationalAuditLog";
import { resolveOperationalActor } from "@/lib/orders/resolveOperationalActor";
import { sendSuccess } from "@/utils/apiResponse";
import { sendError } from "@/utils/errorHandler";
import { logger } from "@/utils/logger";
import { createReceiptPrintJob, createSplitReceiptPrintJobs } from "@/lib/printing/printJobService";
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
import {
  formatSeatLabel,
  getSeatRemainingDue,
  getOrderRemainingDue,
  getUnsettledSeatNumbers,
  isSeatSettled,
  normalizeSeatNumber,
  seatKey,
} from "@/lib/orders/seatHelpers";

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
      discountPercent,
      guestName,
      partyName,
      guestCount,
      cashAmount,
      cardAmount,
      applyServiceCharge,
      serviceChargeTotal,
      serviceChargeName,
      paymentSplits: paymentSplitsRaw,
      seatPayment,
      seatNumber: seatNumberRaw,
    } = data;
    const isSeatPayment = seatPayment === true;

    if (!orderId) {
      return sendError(new Error("Missing ID"), "orderId is required", 400);
    }

    const order = await Order.findOne({
      _id: orderId,
      restaurantId: request.restaurant,
      isActive: { $ne: false },
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
      order.discountPercent = staffPercent > 0 ? staffPercent : null;
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
      if (discountPercent !== undefined && discountPercent !== null) {
        order.discountPercent = Number(discountPercent) || null;
      } else if (subTotal > 0 && order.discountTotal > 0) {
        order.discountPercent =
          Math.round((order.discountTotal / subTotal) * 1000) / 10;
      }
    }

    const resolvedDiscount = r2(order.discountTotal);
    let resolvedTaxTotal = taxTotal;
    if (resolvedDiscount > 0 && subTotal > 0) {
      const rawBaseTax =
        Array.isArray(order.items) && order.items.length > 0
          ? order.items.reduce(
              (s, it) => s + (Number(it.tax || 0) * Number(it.qty || 1)),
              0,
            )
          : taxTotal;
      const taxableRatio = Math.max(0, subTotal - resolvedDiscount) / subTotal;
      resolvedTaxTotal = r2(rawBaseTax * taxableRatio);
      order.taxTotal = resolvedTaxTotal;
    }

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
      Math.max(0, subTotal - resolvedDiscount + resolvedTaxTotal + workingServiceCharge),
    );

    // Client `amount` may only confirm the server-computed total — never overwrite it.
    const dueAmount = r2(order.totalAmount);

    // ── Seat-scoped partial payment ─────────────────────────────────────
    if (isSeatPayment) {
      if (Array.isArray(paymentSplitsRaw) && paymentSplitsRaw.length > 0) {
        return sendError(
          new Error("Invalid Payment"),
          "Seat payment cannot include multi-payer splits",
          400,
        );
      }

      const seatTarget =
        seatNumberRaw === "table" ||
        seatNumberRaw === "" ||
        seatNumberRaw === undefined
          ? null
          : normalizeSeatNumber(seatNumberRaw);

      if (isSeatSettled(order.paymentSplits, seatTarget, order)) {
        return sendError(
          new Error("Already Paid"),
          `${formatSeatLabel(seatTarget)} has already been paid`,
          409,
        );
      }

      const seatInfo = getSeatRemainingDue(
        {
          items: order.items,
          totalAmount: dueAmount,
          taxTotal: order.taxTotal,
          serviceChargeTotal: order.serviceChargeTotal,
          discountTotal: order.discountTotal,
          giftcardUsedAmount: order.giftcardUsedAmount,
          paymentSplits: order.paymentSplits,
        },
        seatTarget,
      );
      if (!seatInfo || !(seatInfo.due > 0.009)) {
        return sendError(
          new Error("Invalid Seat"),
          "No remaining balance for this seat",
          400,
        );
      }

      const seatDue = r2(seatInfo.due);
      if (amount !== undefined && amount !== null) {
        if (Math.abs(r2(amount) - seatDue) > 0.02) {
          return sendError(
            new Error("Amount Mismatch"),
            `Seat payment must be $${seatDue.toFixed(2)}`,
            400,
          );
        }
      }

      let tip = tipAmount != null && tipAmount !== "" ? r2(tipAmount) : 0;
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

      let giftDebit = 0;
      if (giftCardCode) {
        const requested =
          giftCardUsedAmount != null && giftCardUsedAmount !== ""
            ? r2(giftCardUsedAmount)
            : seatDue;
        giftDebit = r2(Math.min(Math.max(0, requested), seatDue));
      }
      const tenderTowardSeat = r2(Math.max(0, seatDue - giftDebit));
      let cash = cashAmount != null && cashAmount !== "" ? r2(cashAmount) : 0;
      let card = cardAmount != null && cardAmount !== "" ? r2(cardAmount) : 0;
      const methodLabel = String(method || "Card");
      if (cash <= 0 && card <= 0 && tenderTowardSeat > 0) {
        if (/cash/i.test(methodLabel) && !/card/i.test(methodLabel)) {
          cash = r2(tenderTowardSeat + tip);
        } else {
          card = r2(tenderTowardSeat + tip);
        }
      }
      const tenderSum = r2(cash + card);
      if (Math.abs(tenderSum - r2(tenderTowardSeat + tip)) > 0.02) {
        return sendError(
          new Error("Invalid Tenders"),
          `Cash+card must equal seat due plus tip ($${r2(tenderTowardSeat + tip).toFixed(2)})`,
          400,
        );
      }
      if (card > 0 && !cardType) {
        return sendError(
          new Error("Invalid Card"),
          "Card type is required for card payments",
          400,
        );
      }

      const isMixed = cash > 0 && card > 0;
      const splitMethod = isMixed
        ? "Cash + Card"
        : cash > 0
          ? "Cash"
          : "Card";
      const seatName = seatInfo.name || formatSeatLabel(seatTarget);
      const newSplit = {
        name: (partyName || guestName || seatName || "").trim() || seatName,
        amount: seatDue,
        method: splitMethod,
        cardType: card > 0 ? String(cardType).trim() : null,
        tipAmount: tip,
        tipMethod: tip > 0 ? tipMethod || (cash > 0 && card <= 0 ? "Cash" : "Card") : null,
        cashAmount: cash,
        cardAmount: card,
        paidAt: new Date(),
        seatNumber: seatTarget,
        seatNumbers: seatTarget == null ? [null] : [seatTarget],
      };

      const existingSplits = Array.isArray(order.paymentSplits)
        ? order.paymentSplits.map((s) =>
            s && typeof s.toObject === "function" ? s.toObject() : { ...s },
          )
        : [];
      order.paymentSplits = [...existingSplits, newSplit];

      if (giftDebit > 0) {
        order.giftcardCode = String(giftCardCode).trim().toUpperCase();
        order.giftcardUsedAmount = r2(
          (Number(order.giftcardUsedAmount) || 0) + giftDebit,
        );
      }

      const remaining = r2(
        Math.max(
          0,
          dueAmount -
            order.paymentSplits.reduce(
              (s, row) => s + Number(row.amount || 0),
              0,
            ),
        ),
      );

      order.cashAmount = r2(
        (Number(order.cashAmount) || 0) + cash,
      );
      order.cardAmount = r2(
        (Number(order.cardAmount) || 0) + card,
      );
      order.tipAmount = r2((Number(order.tipAmount) || 0) + tip);
      if (tip > 0) {
        order.tipMethod = newSplit.tipMethod;
      }

      const methodParts = [
        ...new Set(
          order.paymentSplits.map((s) =>
            s.method === "Card" && s.cardType
              ? `Card - ${s.cardType}`
              : s.method,
          ),
        ),
      ];
      order.paymentMethod =
        remaining > 0.01
          ? `Partial · ${methodParts.slice(0, 3).join(" + ")}`
          : methodParts.length <= 3
            ? `Split (${order.paymentSplits.length}) · ${methodParts.join(" + ")}`
            : `Split (${order.paymentSplits.length})`;

      if (partyName !== undefined || guestName !== undefined) {
        const resolvedPartyName = (partyName || guestName || "").trim() || null;
        if (resolvedPartyName) {
          order.partyName = resolvedPartyName;
          order.guestName = resolvedPartyName;
        }
      }

      if (remaining > 0.01) {
        order.paymentStatus = "PARTIAL";
        // Keep order.status as-is (PENDING/CONFIRMED) until fully paid
      } else {
        order.paymentStatus = "PAID";
        order.status = "PAID";
      }

      // Gift card redeem for this seat debit only
      if (giftDebit > 0 && order.giftcardCode) {
        const redeem = await redeemGiftCardAtomic({
          restaurantId: request.restaurant,
          code: order.giftcardCode,
          amountToUse: giftDebit,
          orderId: order._id,
          note: "Seat payment",
          sendEmail: true,
        });
        if (!redeem.ok) {
          return sendError(
            new Error(redeem.error || "Failed to redeem gift card"),
            redeem.error || "Failed to redeem gift card",
            redeem.status || 400,
          );
        }
      }

      try {
        order.taxBreakdown = await buildTaxBreakdownForOrder(
          order,
          order.restaurantId || request.restaurant,
        );
      } catch (taxErr) {
        logger.error("Failed to build taxBreakdown at seat payment", taxErr);
      }

      order.processedBy = order.processedBy || request.user.id;
      await order.save();

      let receiptGuestCount = order.guestCount ?? null;
      let session = null;
      const resolvedSessionId = sessionId
        ? typeof sessionId === "object"
          ? sessionId._id || sessionId.id
          : sessionId
        : order.tableSession && typeof order.tableSession === "object"
          ? order.tableSession._id || order.tableSession.id
          : order.tableSession;

      if (resolvedSessionId && order.paymentStatus === "PAID") {
        session = await TableSession.findOne({
          _id: resolvedSessionId,
          restaurant: request.restaurant,
        });
        if (session) {
          if (
            !session.activeOrders.some((id) => String(id) === String(order._id))
          ) {
            session.activeOrders.push(order._id);
          }
          const unpaidCount = await Order.countDocuments({
            restaurantId: request.restaurant,
            isActive: { $ne: false },
            $or: [
              { _id: { $in: session.activeOrders } },
              { tableSession: session._id },
            ],
            paymentStatus: { $ne: "PAID" },
            status: { $nin: ["CANCELLED", "WAIVED", "PAID"] },
          });
          if (unpaidCount === 0 && session.status !== "RELEASED") {
            session.status = "PAYMENT_PENDING";
          }
          await session.save();
          if (global.io) {
            global.io
              .to(`floor:${session.floor}`)
              .emit("payment:completed", {
                orderId: order._id,
                sessionId: session._id,
                partial: false,
              });
            global.io
              .to(`floor:${session.floor}`)
              .emit("table:updated", {
                sessionId: session._id,
                status: session.status,
              });
          }
        }
      } else if (global.io) {
        global.io
          .to(`restaurant:${order.restaurantId}`)
          .emit("payment:completed", {
            orderId: order._id,
            partial: order.paymentStatus === "PARTIAL",
            seat: seatKey(seatTarget),
          });
      }

      let printJobId = null;
      let printJobIds = [];
      try {
        const creditEmployeeId = order.processedBy || request.user.id;
        const [emp, restaurant, floorDoc] = await Promise.all([
          Employee.findById(creditEmployeeId)
            .select("firstName lastName name")
            .lean(),
          Restaurant.findById(order.restaurantId).select("name").lean(),
          order.floor
            ? Floor.findById(order.floor).select("name").lean()
            : Promise.resolve(null),
        ]);
        const processedByName =
          emp?.name ||
          [emp?.firstName, emp?.lastName].filter(Boolean).join(" ") ||
          null;
        const { jobs } = await createSplitReceiptPrintJobs({
          order,
          requestedBy: request.user.id,
          guestCount: receiptGuestCount,
          serverName: processedByName,
          restaurantName: restaurant?.name || null,
          floorName: order.floorName || floorDoc?.name || null,
        });
        printJobIds = (jobs || []).map((j) => j?._id).filter(Boolean);
        printJobId = printJobIds[0] || null;
      } catch (printErr) {
        logger.error(
          "Failed to create seat RECEIPT PrintJob (payment still succeeded)",
          printErr,
        );
      }

      logger.info(
        `Seat payment for Order ${order.orderNumber} seat=${seatKey(seatTarget)} status=${order.paymentStatus}`,
      );
      return sendSuccess(
        {
          ...order.toObject(),
          printJobId,
          printJobIds,
          seatPayment: true,
          seatRemaining: remaining,
        },
        order.paymentStatus === "PAID"
          ? "Payment completed"
          : "Seat payment recorded",
      );
    }

    if (order.paymentStatus === "PARTIAL") {
      const unsettledSeats = getUnsettledSeatNumbers(order);
      if (!unsettledSeats.length) {
        return sendError(
          new Error("Nothing Due"),
          "No unpaid seats with ordered items remain",
          400,
        );
      }

      const remainingDue = getOrderRemainingDue({
        totalAmount: dueAmount,
        paymentSplits: order.paymentSplits,
      });
      if (!(remainingDue > 0.009)) {
        return sendError(
          new Error("Nothing Due"),
          "No remaining balance on this order",
          400,
        );
      }

      if (amount !== undefined && amount !== null) {
        if (Math.abs(r2(amount) - remainingDue) > 0.02) {
          return sendError(
            new Error("Amount Mismatch"),
            `Remaining payment must be $${remainingDue.toFixed(2)}`,
            400,
          );
        }
      }

      const existingSplits = Array.isArray(order.paymentSplits)
        ? order.paymentSplits.map((s) =>
            s && typeof s.toObject === "function" ? s.toObject() : { ...s },
          )
        : [];

      let giftDebit = 0;
      if (giftCardCode) {
        const requested =
          giftCardUsedAmount != null && giftCardUsedAmount !== ""
            ? r2(giftCardUsedAmount)
            : remainingDue;
        giftDebit = r2(Math.min(Math.max(0, requested), remainingDue));
      }

      let tip = 0;
      let cash = 0;
      let card = 0;
      let appendedSplits = [];

      // Split remaining seats (each unpaid seat / merged group pays its share)
      if (Array.isArray(paymentSplitsRaw) && paymentSplitsRaw.length > 0) {
        // Gift is allocated per split row (giftAmount); don't pre-debit order gift here.
        giftDebit = 0;
        const unsettledKeys = new Set(unsettledSeats.map((s) => seatKey(s)));
        for (let i = 0; i < paymentSplitsRaw.length; i++) {
          const row = paymentSplitsRaw[i] || {};
          const name = String(row.name || "").trim();
          const amt = r2(row.amount);
          const methodRaw = String(row.method || "").trim();
          const hasCashWord = /cash/i.test(methodRaw);
          const hasCardWord =
            /card/i.test(methodRaw) && !/gift/i.test(methodRaw);
          let rowCash =
            row.cashAmount != null && row.cashAmount !== ""
              ? r2(row.cashAmount)
              : null;
          let rowCard =
            row.cardAmount != null && row.cardAmount !== ""
              ? r2(row.cardAmount)
              : null;
          const rowGift =
            row.giftAmount != null && row.giftAmount !== ""
              ? r2(row.giftAmount)
              : 0;
          const rowTip =
            row.tipAmount != null && row.tipAmount !== ""
              ? r2(row.tipAmount)
              : 0;
          if (rowTip < 0) {
            return sendError(
              new Error("Invalid Splits"),
              `Split #${i + 1} tip cannot be negative`,
              400,
            );
          }
          if (rowGift < 0) {
            return sendError(
              new Error("Invalid Splits"),
              `Split #${i + 1} gift amount cannot be negative`,
              400,
            );
          }
          if (rowCash == null && rowCard == null) {
            if (hasCashWord && hasCardWord) {
              return sendError(
                new Error("Invalid Splits"),
                `Split #${i + 1} Cash + Card requires cashAmount and cardAmount`,
                400,
              );
            }
            if (hasCashWord && !hasCardWord) {
              rowCash = r2(Math.max(0, amt + rowTip - rowGift));
              rowCard = 0;
            } else if (hasCardWord) {
              rowCard = r2(Math.max(0, amt + rowTip - rowGift));
              rowCash = 0;
            } else if (rowGift > 0 || /gift/i.test(methodRaw)) {
              rowCash = 0;
              rowCard = 0;
            } else {
              return sendError(
                new Error("Invalid Splits"),
                `Split #${i + 1} method must be Cash, Card, Cash + Card, or Gift Card`,
                400,
              );
            }
          } else {
            rowCash = r2(Math.max(0, rowCash || 0));
            rowCard = r2(Math.max(0, rowCard || 0));
          }
          if (!name) {
            return sendError(
              new Error("Invalid Splits"),
              `Split #${i + 1} requires a payer name`,
              400,
            );
          }
          if (!(amt > 0)) {
            return sendError(
              new Error("Invalid Splits"),
              `Split #${i + 1} amount must be greater than 0`,
              400,
            );
          }
          const tenderSum = r2(rowCash + rowCard + rowGift);
          const expectedTender = r2(amt + rowTip);
          if (Math.abs(tenderSum - expectedTender) > 0.02) {
            return sendError(
              new Error("Invalid Splits"),
              `Split #${i + 1} cash+card+gift must equal amount+tip`,
              400,
            );
          }
          const isMixed = rowCash > 0 && rowCard > 0;
          const isCashOnly = rowCash > 0 && rowCard <= 0;
          const isGiftOnly = rowGift > 0 && rowCash <= 0 && rowCard <= 0;
          const rowMethod = isGiftOnly
            ? rowCash > 0 || rowCard > 0
              ? "Gift Card"
              : "Gift Card"
            : isMixed
              ? rowGift > 0
                ? "Cash + Card + Gift Card"
                : "Cash + Card"
              : isCashOnly
                ? rowGift > 0
                  ? "Cash + Gift Card"
                  : "Cash"
                : rowCard > 0
                  ? rowGift > 0
                    ? "Card + Gift Card"
                    : "Card"
                  : rowGift > 0
                    ? "Gift Card"
                    : "Card";
          const splitCardType =
            rowCard > 0 && row.cardType ? String(row.cardType).trim() : null;
          if (rowCard > 0 && !splitCardType) {
            return sendError(
              new Error("Invalid Splits"),
              `Split #${i + 1} requires a card type when paying by card`,
              400,
            );
          }

          const seatNumbers = [];
          const seenSeats = new Set();
          const pushSeat = (raw) => {
            if (raw === undefined || raw === "") return;
            if (raw === null || raw === "table" || raw === 0) {
              if (!seenSeats.has("table")) {
                seenSeats.add("table");
                seatNumbers.push(null);
              }
              return;
            }
            const n = Number(raw);
            if (!Number.isFinite(n) || n < 1) return;
            const key = String(Math.floor(n));
            if (seenSeats.has(key)) return;
            seenSeats.add(key);
            seatNumbers.push(Math.floor(n));
          };
          if (Array.isArray(row.seatNumbers)) {
            for (const s of row.seatNumbers) pushSeat(s);
          } else {
            pushSeat(row.seatNumber);
          }
          if (!seatNumbers.length) {
            return sendError(
              new Error("Invalid Splits"),
              `Split #${i + 1} must include at least one remaining seat`,
              400,
            );
          }
          for (const sn of seatNumbers) {
            if (!unsettledKeys.has(seatKey(sn))) {
              return sendError(
                new Error("Invalid Splits"),
                `Split #${i + 1} includes a seat that is already paid or empty`,
                400,
              );
            }
          }

          let tipMethodResolved = null;
          if (rowTip > 0) {
            if (row.tipMethod) tipMethodResolved = String(row.tipMethod).trim();
            else if (isCashOnly) tipMethodResolved = "Cash";
            else if (rowCard > 0 && rowCash <= 0) tipMethodResolved = "Card";
            else tipMethodResolved = "Cash";
          }

          appendedSplits.push({
            name,
            amount: amt,
            method: rowMethod,
            cardType: splitCardType || null,
            tipAmount: rowTip,
            tipMethod: tipMethodResolved,
            cashAmount: rowCash,
            cardAmount: rowCard,
            giftAmount: rowGift,
            paidAt: new Date(),
            seatNumber: seatNumbers.find((n) => n != null) ?? seatNumbers[0],
            seatNumbers,
          });
          tip = r2(tip + rowTip);
          cash = r2(cash + rowCash);
          card = r2(card + rowCard);
          giftDebit = r2(giftDebit + rowGift);
        }

        if (tip > 0 && workingServiceCharge > 0) {
          return sendError(
            new Error("Tip Not Allowed"),
            SERVICE_CHARGE_NO_TIP_MESSAGE,
            400,
          );
        }

        const splitSum = r2(
          appendedSplits.reduce((s, row) => s + Number(row.amount || 0), 0),
        );
        // Seat share amounts must cover the remaining check; gift is tender, not extra due.
        if (Math.abs(splitSum - remainingDue) > 0.02) {
          return sendError(
            new Error("Invalid Splits"),
            `Split amounts ($${splitSum.toFixed(2)}) must equal remaining due ($${remainingDue.toFixed(2)})`,
            400,
          );
        }
        const tenderCollected = r2(cash + card + giftDebit);
        if (Math.abs(tenderCollected - remainingDue) > 0.02) {
          return sendError(
            new Error("Invalid Splits"),
            `Cash+card+gift ($${tenderCollected.toFixed(2)}) must equal remaining due ($${remainingDue.toFixed(2)})`,
            400,
          );
        }
      } else {
        tip = tipAmount != null && tipAmount !== "" ? r2(tipAmount) : 0;
        if (tip < 0) {
          return sendError(
            new Error("Invalid Tip"),
            "Tip cannot be negative",
            400,
          );
        }
        if (tip > 0 && workingServiceCharge > 0) {
          return sendError(
            new Error("Tip Not Allowed"),
            SERVICE_CHARGE_NO_TIP_MESSAGE,
            400,
          );
        }

        const tenderToward = r2(Math.max(0, remainingDue - giftDebit));
        cash = cashAmount != null && cashAmount !== "" ? r2(cashAmount) : 0;
        card = cardAmount != null && cardAmount !== "" ? r2(cardAmount) : 0;
        const methodLabel = String(method || "Card");
        if (cash <= 0 && card <= 0 && tenderToward > 0) {
          if (/cash/i.test(methodLabel) && !/card/i.test(methodLabel)) {
            cash = r2(tenderToward + tip);
          } else {
            card = r2(tenderToward + tip);
          }
        }
        const tenderSum = r2(cash + card);
        if (Math.abs(tenderSum - r2(tenderToward + tip)) > 0.02) {
          return sendError(
            new Error("Invalid Tenders"),
            `Cash+card must equal remaining due plus tip ($${r2(tenderToward + tip).toFixed(2)})`,
            400,
          );
        }
        if (card > 0 && !cardType) {
          return sendError(
            new Error("Invalid Card"),
            "Card type is required for card payments",
            400,
          );
        }

        const isMixed = cash > 0 && card > 0;
        const splitMethod = isMixed
          ? "Cash + Card"
          : cash > 0
            ? "Cash"
            : "Card";
        const remainingLabel =
          unsettledSeats.length === 1
            ? formatSeatLabel(unsettledSeats[0])
            : `Remaining (${unsettledSeats
                .map((s) => formatSeatLabel(s))
                .join(", ")})`;
        appendedSplits = [
          {
            name:
              (partyName || guestName || remainingLabel || "").trim() ||
              remainingLabel,
            amount: remainingDue,
            method: splitMethod,
            cardType: card > 0 ? String(cardType).trim() : null,
            tipAmount: tip,
            tipMethod:
              tip > 0
                ? tipMethod || (cash > 0 && card <= 0 ? "Cash" : "Card")
                : null,
            cashAmount: cash,
            cardAmount: card,
            paidAt: new Date(),
            seatNumber: unsettledSeats[0],
            seatNumbers: unsettledSeats,
          },
        ];
      }

      order.paymentSplits = [...existingSplits, ...appendedSplits];

      if (giftDebit > 0) {
        order.giftcardCode = String(giftCardCode).trim().toUpperCase();
        order.giftcardUsedAmount = r2(
          (Number(order.giftcardUsedAmount) || 0) + giftDebit,
        );
      }

      order.cashAmount = r2((Number(order.cashAmount) || 0) + cash);
      order.cardAmount = r2((Number(order.cardAmount) || 0) + card);
      order.tipAmount = r2((Number(order.tipAmount) || 0) + tip);
      if (tip > 0) {
        const tipMethods = [
          ...new Set(
            appendedSplits
              .filter((s) => Number(s.tipAmount || 0) > 0)
              .map((s) => s.tipMethod || "Cash"),
          ),
        ];
        order.tipMethod =
          tipMethods.length === 1 ? tipMethods[0] : tipMethods.join(" + ");
      }

      const methodParts = [
        ...new Set(
          order.paymentSplits.map((s) =>
            s.method === "Card" && s.cardType
              ? `Card - ${s.cardType}`
              : s.method,
          ),
        ),
      ];
      order.paymentMethod =
        methodParts.length <= 3
          ? `Split (${order.paymentSplits.length}) · ${methodParts.join(" + ")}`
          : `Split (${order.paymentSplits.length})`;

      if (partyName !== undefined || guestName !== undefined) {
        const resolvedPartyName = (partyName || guestName || "").trim() || null;
        if (resolvedPartyName) {
          order.partyName = resolvedPartyName;
          order.guestName = resolvedPartyName;
        }
      }

      order.paymentStatus = "PAID";
      order.status = "PAID";

      if (giftDebit > 0 && order.giftcardCode) {
        const redeem = await redeemGiftCardAtomic({
          restaurantId: request.restaurant,
          code: order.giftcardCode,
          amountToUse: giftDebit,
          orderId: order._id,
          note: "Remaining seats payment",
          sendEmail: true,
        });
        if (!redeem.ok) {
          return sendError(
            new Error(redeem.error || "Failed to redeem gift card"),
            redeem.error || "Failed to redeem gift card",
            redeem.status || 400,
          );
        }
      }

      try {
        order.taxBreakdown = await buildTaxBreakdownForOrder(
          order,
          order.restaurantId || request.restaurant,
        );
      } catch (taxErr) {
        logger.error(
          "Failed to build taxBreakdown at remaining payment",
          taxErr,
        );
      }

      order.processedBy = order.processedBy || request.user.id;
      await order.save();

      let session = null;
      const resolvedSessionId = sessionId
        ? typeof sessionId === "object"
          ? sessionId._id || sessionId.id
          : sessionId
        : order.tableSession && typeof order.tableSession === "object"
          ? order.tableSession._id || order.tableSession.id
          : order.tableSession;

      if (resolvedSessionId) {
        session = await TableSession.findOne({
          _id: resolvedSessionId,
          restaurant: request.restaurant,
        });
        if (session) {
          if (
            !session.activeOrders.some((id) => String(id) === String(order._id))
          ) {
            session.activeOrders.push(order._id);
          }
          const unpaidCount = await Order.countDocuments({
            restaurantId: request.restaurant,
            isActive: { $ne: false },
            $or: [
              { _id: { $in: session.activeOrders } },
              { tableSession: session._id },
            ],
            paymentStatus: { $ne: "PAID" },
            status: { $nin: ["CANCELLED", "WAIVED", "PAID"] },
          });
          if (unpaidCount === 0 && session.status !== "RELEASED") {
            session.status = "PAYMENT_PENDING";
          }
          await session.save();
          if (global.io) {
            global.io.to(`floor:${session.floor}`).emit("payment:completed", {
              orderId: order._id,
              sessionId: session._id,
              partial: false,
            });
            global.io.to(`floor:${session.floor}`).emit("table:updated", {
              sessionId: session._id,
            });
          }
        }
      }

      if (global.io) {
        global.io
          .to(`restaurant:${request.restaurant}`)
          .emit("order:updated", { orderId: order._id });
        global.io
          .to(`restaurant:${request.restaurant}`)
          .emit("payment:completed", {
            orderId: order._id,
            sessionId: resolvedSessionId || null,
          });
      }

      let printJobId = null;
      let printJobIds = [];
      try {
        const creditEmployeeId = order.processedBy || request.user.id;
        const [emp, restaurant, floorDoc] = await Promise.all([
          Employee.findById(creditEmployeeId)
            .select("firstName lastName name")
            .lean(),
          Restaurant.findById(order.restaurantId).select("name").lean(),
          order.floor
            ? Floor.findById(order.floor).select("name").lean()
            : Promise.resolve(null),
        ]);
        const processedByName =
          emp?.name ||
          [emp?.firstName, emp?.lastName].filter(Boolean).join(" ") ||
          null;
        const { jobs } = await createSplitReceiptPrintJobs({
          order,
          requestedBy: request.user.id,
          guestCount: order.guestCount ?? session?.guestCount ?? null,
          serverName: processedByName,
          restaurantName: restaurant?.name || null,
          floorName: order.floorName || floorDoc?.name || null,
        });
        printJobIds = (jobs || []).map((j) => j?._id).filter(Boolean);
        printJobId = printJobIds[0] || null;
      } catch (printErr) {
        logger.error(
          "Failed to create remaining RECEIPT PrintJob (payment still succeeded)",
          printErr,
        );
      }

      logger.info(
        `Remaining seats payment for Order ${order.orderNumber} seats=${unsettledSeats.map(seatKey).join("+")}`,
      );
      return sendSuccess(
        {
          ...order.toObject(),
          printJobId,
          printJobIds,
          remainingSeatsPayment: true,
        },
        "Payment completed",
      );
    }

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

    // Named multi-payer splits (optional). Gift card stays order-level.
    let normalizedSplits = null;
    if (Array.isArray(paymentSplitsRaw) && paymentSplitsRaw.length > 0) {
      if (paymentSplitsRaw.length < 1) {
        return sendError(
          new Error("Invalid Splits"),
          "Split bill requires at least 1 payer",
          400,
        );
      }
      normalizedSplits = [];
      for (let i = 0; i < paymentSplitsRaw.length; i++) {
        const row = paymentSplitsRaw[i] || {};
        const name = String(row.name || "").trim();
        const amt = r2(row.amount);
        const methodRaw = String(row.method || "").trim();
        const hasCashWord = /cash/i.test(methodRaw);
        const hasCardWord = /card/i.test(methodRaw) && !/gift/i.test(methodRaw);
        let rowCash =
          row.cashAmount != null && row.cashAmount !== ""
            ? r2(row.cashAmount)
            : null;
        let rowCard =
          row.cardAmount != null && row.cardAmount !== ""
            ? r2(row.cardAmount)
            : null;
        const rowGift =
          row.giftAmount != null && row.giftAmount !== ""
            ? r2(row.giftAmount)
            : 0;
        const rowTip =
          row.tipAmount != null && row.tipAmount !== ""
            ? r2(row.tipAmount)
            : 0;
        if (rowTip < 0) {
          return sendError(
            new Error("Invalid Splits"),
            `Split #${i + 1} tip cannot be negative`,
            400,
          );
        }
        if (rowGift < 0) {
          return sendError(
            new Error("Invalid Splits"),
            `Split #${i + 1} gift amount cannot be negative`,
            400,
          );
        }

        // Infer tenders from method when cash/card not sent
        if (rowCash == null && rowCard == null) {
          if (hasCashWord && hasCardWord) {
            return sendError(
              new Error("Invalid Splits"),
              `Split #${i + 1} Cash + Card requires cashAmount and cardAmount`,
              400,
            );
          }
          if (hasCashWord && !hasCardWord) {
            rowCash = r2(Math.max(0, amt + rowTip - rowGift));
            rowCard = 0;
          } else if (hasCardWord) {
            rowCard = r2(Math.max(0, amt + rowTip - rowGift));
            rowCash = 0;
          } else if (rowGift > 0 || /gift/i.test(methodRaw)) {
            rowCash = 0;
            rowCard = 0;
          } else {
            return sendError(
              new Error("Invalid Splits"),
              `Split #${i + 1} method must be Cash, Card, Cash + Card, or Gift Card`,
              400,
            );
          }
        } else {
          rowCash = r2(Math.max(0, rowCash || 0));
          rowCard = r2(Math.max(0, rowCard || 0));
        }

        if (!name) {
          return sendError(
            new Error("Invalid Splits"),
            `Split #${i + 1} requires a payer name`,
            400,
          );
        }
        if (!(amt > 0)) {
          return sendError(
            new Error("Invalid Splits"),
            `Split #${i + 1} amount must be greater than 0`,
            400,
          );
        }

        const tenderSum = r2(rowCash + rowCard + rowGift);
        const expectedTender = r2(amt + rowTip);
        if (Math.abs(tenderSum - expectedTender) > 0.02) {
          return sendError(
            new Error("Invalid Splits"),
            `Split #${i + 1} cash+card+gift ($${tenderSum.toFixed(2)}) must equal amount+tip ($${expectedTender.toFixed(2)})`,
            400,
          );
        }

        const isMixed = rowCash > 0 && rowCard > 0;
        const isCashOnly = rowCash > 0 && rowCard <= 0;
        const isGiftOnly = rowGift > 0 && rowCash <= 0 && rowCard <= 0;
        const method = isGiftOnly
          ? "Gift Card"
          : isMixed
            ? rowGift > 0
              ? "Cash + Card + Gift Card"
              : "Cash + Card"
            : isCashOnly
              ? rowGift > 0
                ? "Cash + Gift Card"
                : "Cash"
              : rowCard > 0
                ? rowGift > 0
                  ? "Card + Gift Card"
                  : "Card"
                : rowGift > 0
                  ? "Gift Card"
                  : "Card";
        const splitCardType =
          rowCard > 0 && row.cardType ? String(row.cardType).trim() : null;
        if (rowCard > 0 && !splitCardType) {
          return sendError(
            new Error("Invalid Splits"),
            `Split #${i + 1} requires a card type when paying by card`,
            400,
          );
        }

        // seatNumbers[] (preferred) + legacy seatNumber; null = Table bucket
        const seatNumbers = [];
        const seenSeats = new Set();
        const pushSeat = (raw) => {
          if (raw === undefined || raw === "") return;
          if (raw === null || raw === "table" || raw === 0) {
            if (!seenSeats.has("table")) {
              seenSeats.add("table");
              seatNumbers.push(null);
            }
            return;
          }
          const n = Number(raw);
          if (!Number.isFinite(n) || n < 1) return;
          const key = String(Math.floor(n));
          if (seenSeats.has(key)) return;
          seenSeats.add(key);
          seatNumbers.push(Math.floor(n));
        };
        if (Array.isArray(row.seatNumbers)) {
          for (const s of row.seatNumbers) pushSeat(s);
        } else {
          pushSeat(row.seatNumber);
        }
        const numberedSeats = seatNumbers.filter((n) => n != null);
        let seatNumber = numberedSeats.length > 0 ? numberedSeats[0] : null;

        let tipMethodResolved = null;
        if (rowTip > 0) {
          if (row.tipMethod) tipMethodResolved = String(row.tipMethod).trim();
          else if (isCashOnly) tipMethodResolved = "Cash";
          else if (rowCard > 0 && rowCash <= 0) tipMethodResolved = "Card";
          else tipMethodResolved = "Cash";
        }

        normalizedSplits.push({
          name,
          amount: amt,
          method,
          cardType: splitCardType || null,
          tipAmount: rowTip,
          tipMethod: tipMethodResolved,
          cashAmount: rowCash,
          cardAmount: rowCard,
          giftAmount: rowGift,
          paidAt: new Date(),
          seatNumber,
          seatNumbers: seatNumbers.length ? seatNumbers : undefined,
        });
      }
    }

    order.paymentStatus = "PAID";
    const methodLabel = String(method || "Cash");
    if (normalizedSplits) {
      const methodParts = normalizedSplits.map((s) =>
        s.method === "Card" && s.cardType
          ? `Card - ${s.cardType}`
          : s.method,
      );
      const uniqueParts = [...new Set(methodParts)];
      order.paymentMethod =
        uniqueParts.length <= 3
          ? `Split (${normalizedSplits.length}) · ${uniqueParts.join(" + ")}`
          : `Split (${normalizedSplits.length})`;
      order.paymentSplits = normalizedSplits;
    } else if (methodLabel === "Card" && cardType) {
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

    // Validate named splits cover the order after gift card (tips are extra)
    if (normalizedSplits) {
      const splitSum = r2(
        normalizedSplits.reduce((s, row) => s + Number(row.amount || 0), 0),
      );
      const splitGiftSum = r2(
        normalizedSplits.reduce((s, row) => s + Number(row.giftAmount || 0), 0),
      );
      // Prefer per-row gift totals when present; otherwise order-level gift debit.
      if (splitGiftSum > 0.009) {
        giftCardDebitAmount = r2(
          Math.max(giftCardDebitAmount, splitGiftSum),
        );
        if (Math.abs(splitSum - dueAmount) > 0.02) {
          return sendError(
            new Error("Invalid Splits"),
            `Split amounts ($${splitSum.toFixed(2)}) must equal order total ($${dueAmount.toFixed(2)})`,
            400,
          );
        }
        const tenderCollected = r2(
          normalizedSplits.reduce(
            (s, row) =>
              s +
              Number(row.cashAmount || 0) +
              Number(row.cardAmount || 0) +
              Number(row.giftAmount || 0),
            0,
          ),
        );
        // Tips are included in cash/card tenders already
        const tipSum = r2(
          normalizedSplits.reduce((s, row) => s + Number(row.tipAmount || 0), 0),
        );
        if (Math.abs(tenderCollected - r2(dueAmount + tipSum)) > 0.02) {
          return sendError(
            new Error("Invalid Splits"),
            `Cash+card+gift must cover order total plus tips`,
            400,
          );
        }
        if (giftCardCode) {
          order.giftcardCode = String(giftCardCode).trim().toUpperCase();
          order.giftcardUsedAmount = giftCardDebitAmount;
        }
      } else {
        const covered = r2(splitSum + giftCardDebitAmount);
        if (Math.abs(covered - dueAmount) > 0.02) {
          return sendError(
            new Error("Invalid Splits"),
            `Split amounts ($${splitSum.toFixed(2)}) plus gift card ($${giftCardDebitAmount.toFixed(2)}) must equal order total ($${dueAmount.toFixed(2)})`,
            400,
          );
        }
      }
      const splitTips = r2(
        normalizedSplits.reduce((s, row) => s + Number(row.tipAmount || 0), 0),
      );
      if (splitTips > 0 && workingServiceCharge > 0) {
        return sendError(
          new Error("Tip Not Allowed"),
          SERVICE_CHARGE_NO_TIP_MESSAGE,
          400,
        );
      }
      // Derive tender aggregates from named splits (include tips by tender)
      order.cashAmount = r2(
        normalizedSplits.reduce(
          (s, row) => s + Number(row.cashAmount || 0),
          0,
        ),
      );
      order.cardAmount = r2(
        normalizedSplits.reduce(
          (s, row) => s + Number(row.cardAmount || 0),
          0,
        ),
      );
      if (splitTips > 0) {
        order.tipAmount = splitTips;
        const tipMethods = [
          ...new Set(
            normalizedSplits
              .filter((s) => Number(s.tipAmount || 0) > 0)
              .map((s) => s.tipMethod || "Cash"),
          ),
        ];
        order.tipMethod =
          tipMethods.length === 1 ? tipMethods[0] : tipMethods.join(" + ");
      }
    }

    // Clean up paymentMethod if gift card was not actually debited
    if (!order.giftcardUsedAmount || order.giftcardUsedAmount <= 0) {
      order.giftcardUsedAmount = 0;
      if (!normalizedSplits) {
        order.paymentMethod = String(order.paymentMethod || "")
          .replace(/\bGift\s*Card\s*\+\s*/i, "")
          .replace(/\s*\+\s*Gift\s*Card\b/i, "")
          .trim();
        if (!order.paymentMethod || /^Gift\s*Card$/i.test(order.paymentMethod)) {
          order.paymentMethod =
            methodLabel && !/gift\s*card/i.test(methodLabel)
              ? methodLabel
              : "Card";
        }
      }
    } else if (normalizedSplits && order.giftcardUsedAmount > 0) {
      // Keep Split (N) label; gift is shown via giftcardUsedAmount on receipt/UI
      if (!/gift/i.test(String(order.paymentMethod || ""))) {
        order.paymentMethod = `${order.paymentMethod} + Gift Card`;
      }
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

    // Persist tender split amounts when provided by POS (skip when named splits already set them)
    if (!normalizedSplits) {
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

      // Ensure cardAmount does not exceed actual grand total due after cash and gift card
      if (order.cardAmount != null && order.cardAmount > 0) {
        const due = r2(order.totalAmount);
        const tip = r2(order.tipAmount);
        const gc = r2(order.giftcardUsedAmount);
        const cash = r2(order.cashAmount);
        const maxCardTender = r2(Math.max(0, due + tip - gc - cash));
        if (order.cardAmount > maxCardTender) {
          order.cardAmount = maxCardTender;
        }
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

    // If this order is linked to a session, update the session status to PAYMENT_PENDING if all active orders are paid
    const resolvedSessionId = sessionId
      ? (typeof sessionId === "object" ? sessionId._id || sessionId.id : sessionId)
      : (order.tableSession && typeof order.tableSession === "object"
          ? order.tableSession._id || order.tableSession.id
          : order.tableSession);

    if (resolvedSessionId) {
      session = await TableSession.findOne({
        _id: resolvedSessionId,
        restaurant: request.restaurant,
      });
      if (session) {
        if (order.guestCount == null && session.guestCount != null) {
          order.guestCount = session.guestCount;
          await order.save();
        }
        receiptGuestCount = order.guestCount ?? session.guestCount ?? null;

        // Ensure this order is tracked in session.activeOrders
        if (!session.activeOrders.some((id) => String(id) === String(order._id))) {
          session.activeOrders.push(order._id);
        }

        // Check if there are any remaining unpaid active orders for this session
        const unpaidCount = await Order.countDocuments({
          restaurantId: request.restaurant,
          isActive: { $ne: false },
          $or: [
            { _id: { $in: session.activeOrders } },
            { tableSession: session._id },
          ],
          paymentStatus: { $ne: "PAID" },
          status: { $nin: ["CANCELLED", "WAIVED", "PAID"] },
        });

        if (unpaidCount === 0 && session.status !== "RELEASED") {
          session.status = "PAYMENT_PENDING";
        }
        await session.save();

        if (global.io) {
          global.io.to(`floor:${session.floor}`).emit("payment:completed", { orderId: order._id, sessionId: session._id });
          global.io.to(`floor:${session.floor}`).emit("table:updated", { sessionId: session._id, status: session.status });
          global.io.to(`restaurant:${request.restaurant}`).emit("payment:completed", { orderId: order._id, sessionId: session._id });
        }

        // Audit Log
        const actor = await resolveOperationalActor(request);
        await OperationalAuditLog.create({
          restaurantId: request.restaurant,
          actorId: actor.actorId,
          actorType: actor.actorType,
          actorName: actor.actorName,
          action: "PAYMENT_COMPLETED",
          floorId: session.floor,
          tableId: session.primaryTable,
          tableSessionId: session._id,
          orderId: order._id,
          newValue: { method },
        });
      }
    } else if (global.io) {
      // If no session, broadcast to restaurant or something
      global.io.to(`restaurant:${order.restaurantId}`).emit("payment:completed", { orderId: order._id });
    }

    // Receipt PrintJob — only after successful payment (not on order create).
    // Server name is the original order taker (processedBy), not whoever collected payment.
    let printJobId = null;
    let printJobIds = [];
    let processedByName = null;
    try {
      const creditEmployeeId = order.processedBy || request.user.id;
      const [emp, restaurant, floorDoc] = await Promise.all([
        Employee.findById(creditEmployeeId).select("firstName lastName name").lean(),
        Restaurant.findById(order.restaurantId).select("name").lean(),
        order.floor
          ? Floor.findById(order.floor).select("name").lean()
          : Promise.resolve(null),
      ]);
      processedByName =
        emp?.name ||
        [emp?.firstName, emp?.lastName].filter(Boolean).join(" ") ||
        null;

      const printOpts = {
        order,
        requestedBy: request.user.id,
        guestCount: receiptGuestCount,
        serverName: processedByName,
        restaurantName: restaurant?.name || null,
        floorName: order.floorName || floorDoc?.name || null,
      };

      if (
        Array.isArray(order.paymentSplits) &&
        order.paymentSplits.length >= 1
      ) {
        const { jobs } = await createSplitReceiptPrintJobs(printOpts);
        printJobIds = (jobs || []).map((j) => j?._id).filter(Boolean);
        printJobId = printJobIds[0] || null;
        logger.info(
          `Split receipt jobs created for Order ${order.orderNumber}: ${printJobIds.length} slips`,
        );
      } else {
        const { job } = await createReceiptPrintJob(printOpts);
        printJobId = job?._id || null;
        if (printJobId) printJobIds = [printJobId];
      }
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
        }${
          Array.isArray(order.paymentSplits) && order.paymentSplits.length > 1
            ? ` · Split ${order.paymentSplits.length} ways`
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
          splitCount:
            Array.isArray(order.paymentSplits) && order.paymentSplits.length > 1
              ? order.paymentSplits.length
              : 0,
        },
      });
    } catch (notifErr) {
      logger.error("Failed to create PAYMENT_COMPLETED notification", notifErr);
    }

    logger.info(`Payment processed for Order ${order.orderNumber} via ${method}`);
    return sendSuccess(
      {
        ...order.toObject(),
        printJobId,
        printJobIds,
        processedByName,
      },
      "Payment processed successfully",
      200
    );

  } catch (error) {
    logger.error("Failed to process payment", error);
    return sendError(error, "Failed to process payment", 500);
  }
}, ["ADMIN", "MANAGER", "SERVER", "BARTENDER"]);
