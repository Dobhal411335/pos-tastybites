import { withAuth } from "@/utils/auth";
import { sendSuccess } from "@/utils/apiResponse";
import { sendError } from "@/utils/errorHandler";
import { logger } from "@/utils/logger";
import {
  softDeleteOrder,
  softRemoveCashTender,
} from "@/lib/orders/orderLifecycle";
import {
  DELETE_MODE_CASH_TENDER,
  getDeleteMode,
} from "@/lib/orders/orderDeleteEligibility";
import { resolveOperationalActor } from "@/lib/orders/resolveOperationalActor";
import connectDB from "@/lib/db";
import Order from "@/models/Order";

async function resolveActor(request) {
  return resolveOperationalActor(request, { actorType: "Admin" });
}

export const POST = withAuth(async (request, { params }) => {
  try {
    const { id } = await params;
    let reason = null;
    let splitIndices = null;
    try {
      const body = await request.json();
      reason = body?.reason || null;
      if (Array.isArray(body?.splitIndices)) {
        splitIndices = body.splitIndices
          .map((n) => Number(n))
          .filter((n) => Number.isFinite(n) && n >= 0);
        if (!splitIndices.length) splitIndices = null;
      }
    } catch {
      // no body
    }

    const actor = await resolveActor(request);
    if (!actor.actorId) {
      return sendError(new Error("Unauthorized"), "Actor required", 401);
    }

    await connectDB();
    const order = await Order.findOne({
      _id: id,
      restaurantId: request.restaurant,
    }).lean();

    if (!order) {
      return sendError(new Error("Order not found"), "Order not found", 404);
    }

    const mode = getDeleteMode(order);

    if (mode === DELETE_MODE_CASH_TENDER) {
      const result = await softRemoveCashTender({
        restaurantId: request.restaurant,
        orderId: id,
        actor,
        reason,
        splitIndices,
      });
      return sendSuccess(result, "Cash payment removed from order");
    }

    const result = await softDeleteOrder({
      restaurantId: request.restaurant,
      orderId: id,
      actor,
      reason,
    });

    return sendSuccess(result, "Order soft-deleted successfully");
  } catch (error) {
    logger.error(`Soft-delete order failed ${params?.id}`, error);
    return sendError(
      error,
      error.message || "Failed to soft-delete order",
      error.status || 500
    );
  }
}, ["ADMIN", "MANAGER"]);
