import { withAuth } from "@/utils/auth";
import Employee from "@/models/employee/Employee";
import { sendSuccess } from "@/utils/apiResponse";
import { sendError } from "@/utils/errorHandler";
import { logger } from "@/utils/logger";
import { permanentlyDeleteOrder } from "@/lib/orders/orderLifecycle";

async function resolveActor(request) {
  const actorId = request.user?.id || request.employeeId;
  let actorName = request.user?.name || request.user?.firstName || null;
  if (!actorName && actorId) {
    const emp = await Employee.findById(actorId)
      .select("firstName lastName name")
      .lean();
    if (emp) {
      actorName =
        emp.name ||
        [emp.firstName, emp.lastName].filter(Boolean).join(" ") ||
        null;
    }
  }
  return {
    actorId,
    actorType: "Admin",
    actorName,
  };
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
