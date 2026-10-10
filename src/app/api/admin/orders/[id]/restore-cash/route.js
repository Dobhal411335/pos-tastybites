import { withAuth } from "@/utils/auth";
import { sendSuccess } from "@/utils/apiResponse";
import { sendError } from "@/utils/errorHandler";
import { logger } from "@/utils/logger";
import { restoreCashTender } from "@/lib/orders/orderLifecycle";
import { resolveOperationalActor } from "@/lib/orders/resolveOperationalActor";

async function resolveActor(request) {
  return resolveOperationalActor(request, { actorType: "Admin" });
}

export const POST = withAuth(async (request, { params }) => {
  try {
    const { id } = await params;
    const actor = await resolveActor(request);
    if (!actor.actorId) {
      return sendError(new Error("Unauthorized"), "Actor required", 401);
    }

    let entryIds = null;
    try {
      const body = await request.json();
      if (Array.isArray(body?.entryIds)) {
        entryIds = body.entryIds.map(String).filter(Boolean);
        if (!entryIds.length) entryIds = null;
      } else if (body?.entryId) {
        entryIds = [String(body.entryId)];
      }
    } catch {
      // no body — restore all
    }

    const result = await restoreCashTender({
      restaurantId: request.restaurant,
      orderId: id,
      actor,
      entryIds,
    });

    return sendSuccess(result, "Cash payment restored on order");
  } catch (error) {
    logger.error(`Restore cash tender failed ${params?.id}`, error);
    return sendError(
      error,
      error.message || "Failed to restore cash tender",
      error.status || 500
    );
  }
}, ["ADMIN", "MANAGER"]);
