import { withAuth } from "@/utils/auth";
import { sendSuccess } from "@/utils/apiResponse";
import { sendError } from "@/utils/errorHandler";
import { logger } from "@/utils/logger";
import { permanentlyDeleteOrder } from "@/lib/orders/orderLifecycle";
import { resolveOperationalActor } from "@/lib/orders/resolveOperationalActor";

async function resolveActor(request) {
  return resolveOperationalActor(request, { actorType: "Admin" });
}

export const DELETE = withAuth(async (request, { params }) => {
  try {
    const { id } = await params;
    const actor = await resolveActor(request);
    if (!actor.actorId) {
      return sendError(new Error("Unauthorized"), "Actor required", 401);
    }

    const result = await permanentlyDeleteOrder({
      restaurantId: request.restaurant,
      orderId: id,
      actor,
    });

    return sendSuccess(result, "Order permanently deleted");
  } catch (error) {
    logger.error(`Permanent delete order failed ${params?.id}`, error);
    return sendError(
      error,
      error.message || "Failed to permanently delete order",
      error.status || 500
    );
  }
}, ["ADMIN"]);
