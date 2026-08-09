import { withAuth } from "@/utils/auth";
import { sendSuccess } from "@/utils/apiResponse";
import { sendError } from "@/utils/errorHandler";
import { logger } from "@/utils/logger";
import {
  listNotifications,
  countUnread,
  markAllNotificationsRead,
} from "@/lib/notifications/notificationService";

const ROLES = ["ADMIN", "MANAGER", "SERVER", "BARTENDER", "EMPLOYEE"];

/**
 * GET /api/sales/notifications
 * Query: filter=ALL|UNREAD|Orders|Payments|Tables|Employees|System
 *        page, limit, unreadOnly=true (returns { unreadCount } only)
 */
export const GET = withAuth(async (request) => {
  try {
    const userId = request.user.id;
    const restaurantId = request.restaurant;
    const { searchParams } = new URL(request.url);

    if (searchParams.get("unreadOnly") === "true") {
      const unreadCount = await countUnread({ restaurantId, userId });
      return sendSuccess({ unreadCount }, "Unread count");
    }

    const filter = searchParams.get("filter") || "ALL";
    const page = Number(searchParams.get("page")) || 1;
    const limit = Math.min(Number(searchParams.get("limit")) || 30, 100);

    const data = await listNotifications({
      restaurantId,
      userId,
      filter,
      page,
      limit,
    });

    const unreadCount = await countUnread({ restaurantId, userId });

    return sendSuccess({ ...data, unreadCount }, "Notifications retrieved");
  } catch (error) {
    logger.error("Failed to list notifications", error);
    return sendError(error, "Failed to list notifications", 500);
  }
}, ROLES);

/**
 * PATCH /api/sales/notifications
 * Body: { action: "read_all" }
 */
export const PATCH = withAuth(async (request) => {
  try {
    const body = await request.json();
    if (body?.action !== "read_all") {
      return sendError(new Error("Bad Request"), "Unknown action", 400);
    }

    const result = await markAllNotificationsRead({
      restaurantId: request.restaurant,
      userId: request.user.id,
    });

    return sendSuccess(result, "All notifications marked as read");
  } catch (error) {
    logger.error("Failed to mark all notifications read", error);
    return sendError(error, "Failed to mark all as read", 500);
  }
}, ROLES);
