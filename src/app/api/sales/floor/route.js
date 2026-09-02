import { withAuth } from "@/utils/auth";
import Floor from "@/models/floor/Floor";
import Table from "@/models/floor/Table";
import TableSession from "@/models/floor/TableSession";
import Order from "@/models/Order";
import { sendSuccess } from "@/utils/apiResponse";
import { sendError } from "@/utils/errorHandler";
import { logger } from "@/utils/logger";
import { joinTableNumbers } from "@/utils/orderDisplay";

// GET - Unified Floor Data for Sales Operations
export const GET = withAuth(async (request) => {
  try {
    const { searchParams } = new URL(request.url);
    const floorId = searchParams.get("floorId");
    const restaurantId = request.restaurant;

    // 1. Fetch all active floors (small collection)
    const floors = await Floor.find({ restaurant: restaurantId, isActive: true })
      .select("_id name width height")
      .lean();

    if (floors.length === 0) {
      return sendSuccess({ floors: [], tables: [], sessions: [] }, "No active floors found");
    }

    // 2. Determine which floor to load tables for
    const requestedId = floorId ? String(floorId) : "";
    const matchedFloor = floors.find((f) => f._id.toString() === requestedId);
    const activeFloorId = (matchedFloor || floors[0])._id.toString();

    // 3. Tables + sessions in parallel (main latency win)
    const [tables, sessions] = await Promise.all([
      Table.find({ floor: activeFloorId, restaurant: restaurantId })
        .select("_id tableNumber x y width height rotation shape seats section")
        .lean(),
      TableSession.find({
        floor: activeFloorId,
        restaurant: restaurantId,
        isSessionOpen: true,
      })
        .select(
          "_id sessionId primaryTable linkedTables assignedEmployee guestCount effectiveSeatCount status openedAt",
        )
        .populate("assignedEmployee", "firstName lastName name")
        .lean(),
    ]);

    // 4. Active orders only when there are open sessions
    let activeOrders = [];
    if (sessions.length > 0) {
      const sessionIds = sessions.map((s) => s._id);
      activeOrders = await Order.find({
        tableSession: { $in: sessionIds },
        status: {
          $in: [
            "PENDING",
            "CONFIRMED",
            "Draft",
            "Sent to Kitchen",
            "Preparing",
            "Ready",
            "Served",
          ],
        },
        paymentStatus: { $nin: ["PAID", "Paid"] },
      })
        .select("tableSession processedBy")
        .populate("processedBy", "firstName lastName name")
        .lean();
    }

    const sessionsWithOrders = new Set(
      activeOrders.map((o) => o.tableSession.toString()),
    );
    const orderTakerBySession = new Map();
    for (const order of activeOrders) {
      const sid = order.tableSession?.toString();
      if (!sid || orderTakerBySession.has(sid)) continue;
      const emp = order.processedBy;
      const name = emp
        ? emp.name || [emp.firstName, emp.lastName].filter(Boolean).join(" ").trim()
        : "";
      if (name) orderTakerBySession.set(sid, name);
    }
    const tableNumberById = new Map(
      tables.map((t) => [t._id.toString(), t.tableNumber]),
    );

    const result = {
      floors: floors.map((f) => ({
        id: f._id.toString(),
        name: f.name,
        width: f.width,
        height: f.height,
      })),
      activeFloorId,
      tables: tables.map((t) => ({
        id: t._id,
        tableNumber: t.tableNumber,
        x: t.x,
        y: t.y,
        width: t.width,
        height: t.height,
        rotation: t.rotation,
        shape: t.shape,
        seats: t.seats,
        section: t.section,
        type: t.shape,
      })),
      sessions: sessions.map((s) => {
        const linkedTableIds = (s.linkedTables || []).map((id) => id.toString());
        const tableNumbers = joinTableNumbers([
          tableNumberById.get(s.primaryTable.toString()),
          ...linkedTableIds.map((id) => tableNumberById.get(id)),
        ]);
        return {
          id: s._id,
          sessionId: s.sessionId,
          tableId: s.primaryTable.toString(),
          linkedTableIds,
          tableNumbers,
          assignedEmployeeId: s.assignedEmployee?._id?.toString(),
          assignedEmployeeName: s.assignedEmployee?.firstName
            ? `${s.assignedEmployee.firstName} ${s.assignedEmployee.lastName || ""}`.trim()
            : s.assignedEmployee?.name || "Unknown",
          guestCount: s.guestCount,
          effectiveSeatCount: s.effectiveSeatCount,
          status: s.status,
          openedAt: s.openedAt,
          hasActiveOrder: sessionsWithOrders.has(s._id.toString()),
          orderTakerName: orderTakerBySession.get(s._id.toString()) || null,
        };
      }),
    };

    return sendSuccess(result, "Floor data retrieved successfully");
  } catch (error) {
    logger.error("Failed to retrieve sales floor data", error);
    return sendError(error, "Failed to retrieve sales floor data", 500);
  }
}, ["ADMIN", "MANAGER", "SERVER", "BARTENDER"]);
