import { withAuth } from "@/utils/auth";
import { sendSuccess } from "@/utils/apiResponse";
import { sendError } from "@/utils/errorHandler";
import { logger } from "@/utils/logger";
import { softDeleteOrder } from "@/lib/orders/orderLifecycle";
import { resolveOperationalActor } from "@/lib/orders/resolveOperationalActor";

async function resolveActor(request) {
  return resolveOperationalActor(request, { actorType: "Admin" });
}

export const POST = withAuth(async (request, { params }) => {
  try {
    const { id } = await params;
    let reason = null;
    try {
      const body = await request.json();
      reason = body?.reason || null;
    } catch {
      // no body
    }

    const actor = await resolveActor(request);
    if (!actor.actorId) {
      return sendError(new Error("Unauthorized"), "Actor required", 401);
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
