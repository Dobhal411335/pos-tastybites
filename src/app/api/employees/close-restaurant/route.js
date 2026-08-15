import { NextResponse } from "next/server";
import { withAuth } from "@/utils/auth";
import { expireAllRestaurantSessions } from "@/lib/employeeSession";
import { createNotification } from "@/lib/notifications/notificationService";
import { clearEmployeeAuthCookies } from "@/lib/employeeAuthCookies";
import Order from "@/models/Order";
import TableSession from "@/models/floor/TableSession";
import { joinTableNumbers } from "@/utils/orderDisplay";

function personName(person) {
  if (!person) return "Unassigned";
  return (
    person.name ||
    [person.firstName, person.lastName].filter(Boolean).join(" ").trim() ||
    "Unassigned"
  );
}

const UNSETTLED_ORDER_FILTER = {
  status: { $nin: ["PAID", "CANCELLED", "WAIVED"] },
  paymentStatus: { $ne: "PAID" },
};

async function getCloseBlockers(restaurantId) {
  const orderQuery = { restaurantId, ...UNSETTLED_ORDER_FILTER };

  const [pendingOrders, pendingOrderCount, openSessions] = await Promise.all([
    Order.find(orderQuery)
      .select("orderNumber status paymentStatus tableNo source partyName")
      .sort({ createdAt: -1 })
      .limit(20)
      .lean(),
    Order.countDocuments(orderQuery),
    TableSession.find({
      restaurant: restaurantId,
      isSessionOpen: true,
    })
      .populate("primaryTable", "tableNumber")
      .populate("linkedTables", "tableNumber")
      .populate("assignedEmployee", "firstName lastName name")
      .lean(),
  ]);

  const bookedTables = openSessions.map((session) => {
    const tableNumber = joinTableNumbers([
      session.primaryTable?.tableNumber,
      ...(session.linkedTables || []).map((table) => table.tableNumber),
    ]);

    return {
      sessionId: String(session._id),
      tableNumber: tableNumber || "Unknown",
      employeeName: personName(session.assignedEmployee),
      status: session.status,
      guestCount: session.guestCount || 0,
    };
  });

  return {
    pendingOrders: pendingOrders.map((order) => ({
      id: String(order._id),
      orderNumber: order.orderNumber,
      status: order.status,
      tableNo: order.tableNo || null,
      source: order.source || null,
      partyName: order.partyName || null,
    })),
    bookedTables,
    pendingOrderCount,
    bookedTableCount: bookedTables.length,
    canClose: pendingOrderCount === 0 && bookedTables.length === 0,
  };
}

function closeBlockedResponse(blockers) {
  const parts = [];
  if (blockers.pendingOrderCount > 0) {
    parts.push(
      `${blockers.pendingOrderCount} pending order${blockers.pendingOrderCount === 1 ? "" : "s"}`,
    );
  }
  if (blockers.bookedTableCount > 0) {
    parts.push(
      `${blockers.bookedTableCount} booked table${blockers.bookedTableCount === 1 ? "" : "s"}`,
    );
  }

  return NextResponse.json(
    {
      success: false,
      code: "CLOSE_BLOCKED",
      message: `Cannot close restaurant. Settle ${parts.join(" and ")} first.`,
      data: blockers,
    },
    { status: 409 },
  );
}

const checkCloseRestaurantHandler = async (request) => {
  try {
    const restaurantId = request.restaurant;
    if (!restaurantId) {
      return NextResponse.json(
        { success: false, message: "Restaurant context missing" },
        { status: 400 },
      );
    }

    const blockers = await getCloseBlockers(restaurantId);
    return NextResponse.json({
      success: true,
      message: blockers.canClose
        ? "Restaurant can be closed"
        : "Cannot close restaurant until pending orders and booked tables are cleared",
      data: blockers,
    });
  } catch (error) {
    console.error("Close Restaurant Check Error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to check restaurant close status" },
      { status: 500 },
    );
  }
};

const closeRestaurantHandler = async (request) => {
  try {
    const restaurantId = request.restaurant;
    if (!restaurantId) {
      return NextResponse.json(
        { success: false, message: "Restaurant context missing" },
        { status: 400 },
      );
    }

    const blockers = await getCloseBlockers(restaurantId);
    if (!blockers.canClose) {
      return closeBlockedResponse(blockers);
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

export const GET = withAuth(checkCloseRestaurantHandler);
export const POST = withAuth(closeRestaurantHandler);
