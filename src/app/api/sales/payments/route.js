import { withAuth } from "@/utils/auth";
import Order from "@/models/Order";
import TableSession from "@/models/floor/TableSession";
import OperationalAuditLog from "@/models/OperationalAuditLog";
import { sendSuccess } from "@/utils/apiResponse";
import { sendError } from "@/utils/errorHandler";
import { logger } from "@/utils/logger";

// POST - Process a payment for an order
export const POST = withAuth(async (request) => {
  try {
    const data = await request.json();
    const { orderId, amount, method, sessionId, tipAmount, cardType } = data;

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
    
    // Save tip if provided
    if (tipAmount && tipAmount > 0) {
      order.tipAmount = Math.round(Number(tipAmount) * 100) / 100;
    }

    await order.save();

    // If this order is linked to a session, optionally update the session status to PAYMENT_PENDING if not already
    // Actually, if it's paid, the session is now ready to be RELEASED.
    if (sessionId) {
      const session = await TableSession.findById(sessionId);
      if (session && session.isSessionOpen) {
        // ... Check if unpaid orders exist ...
      }
      
      if (global.io) {
        global.io.to(`floor:${session.floor}`).emit('payment:completed', { orderId: order._id, sessionId });
      }

      // Audit Log
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

    } else if (global.io) {
      // If no session, broadcast to restaurant or something
      global.io.to(`restaurant:${order.restaurantId}`).emit('payment:completed', { orderId: order._id });
    }

    logger.info(`Payment processed for Order ${order.orderNumber} via ${method}`);
    return sendSuccess(order, "Payment processed successfully", 200);

  } catch (error) {
    logger.error("Failed to process payment", error);
    return sendError(error, "Failed to process payment", 500);
  }
}, ["ADMIN", "MANAGER", "SERVER", "BARTENDER"]);
