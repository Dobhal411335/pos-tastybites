import { NextResponse } from "next/server";
import { withAuth } from "@/utils/auth";
import { expireAllRestaurantSessions } from "@/lib/employeeSession";
import { createNotification } from "@/lib/notifications/notificationService";
import { clearEmployeeAuthCookies } from "@/lib/employeeAuthCookies";

const closeRestaurantHandler = async (request) => {
  try {
    const restaurantId = request.restaurant;
    if (!restaurantId) {
      return NextResponse.json(
        { success: false, message: "Restaurant context missing" },
        { status: 400 },
      );
    }

    const { count } = await expireAllRestaurantSessions(restaurantId);
    const restaurantKey = String(restaurantId);

    if (global.io) {
      global.io.to(`restaurant:${restaurantKey}`).emit("auth:force-logout", {
        reason: "RESTAURANT_CLOSED",
        restaurantId: restaurantKey,
      });
    }

    try {
      await createNotification({
        restaurantId,
        type: "SYSTEM_ALERT",
        title: "Restaurant Closed",
        message: `Restaurant closed — ${count} employee${count === 1 ? "" : "s"} logged out`,
        employeeId: request.employeeId || request.user?.id || null,
        priority: "high",
        metadata: {
          reason: "RESTAURANT_CLOSED",
          expiredSessionCount: count,
          closedBy: request.user?.id || null,
        },
      });
    } catch (notifyError) {
      console.error("Close Restaurant notification failed:", notifyError);
    }

    const response = NextResponse.json({
      success: true,
      message: "Restaurant closed. All employees logged out.",
      data: { expiredSessionCount: count },
    });

    clearEmployeeAuthCookies(response);
    return response;
  } catch (error) {
    console.error("Close Restaurant Error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to close restaurant" },
      { status: 500 },
    );
  }
};

export const POST = withAuth(closeRestaurantHandler);
