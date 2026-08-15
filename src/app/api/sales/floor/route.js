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

    // 1. Fetch all active floors
    const floors = await Floor.find({ restaurant: request.restaurant, isActive: true })
      .select("_id name width height")
      .lean();

    if (floors.length === 0) {
      return sendSuccess({ floors: [], tables: [], sessions: [] }, "No active floors found");
    }

    // 2. Determine which floor to load tables for
    const requestedId = floorId ? String(floorId) : "";
    const matchedFloor = floors.find((f) => f._id.toString() === requestedId);
    const activeFloorId = (matchedFloor || floors[0])._id.toString();

    const tables = await Table.find({ floor: activeFloorId, restaurant: request.restaurant }).lean();

    // 4. Fetch active TableSessions for the active floor
    const sessions = await TableSession.find({
      floor: activeFloorId,
      restaurant: request.restaurant,
      isSessionOpen: true
    })
      .populate("assignedEmployee", "firstName lastName name")
      .lean();

    // 5. Check active orders for these sessions
    const sessionIds = sessions.map(s => s._id);
    const activeOrders = await Order.find({
      tableSession: { $in: sessionIds },
      status: { $in: ["PENDING", "CONFIRMED", "Draft", "Sent to Kitchen", "Preparing", "Ready", "Served"] },
      paymentStatus: { $nin: ["PAID", "Paid"] }
    }).select("tableSession").lean();
    
    const sessionsWithOrders = new Set(activeOrders.map(o => o.tableSession.toString()));
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
        };
      }),
    };

    return sendSuccess(result, "Floor data retrieved successfully");
  } catch (error) {
    logger.error("Failed to retrieve sales floor data", error);
    return sendError(error, "Failed to retrieve sales floor data", 500);
  }
}, ["ADMIN", "MANAGER", "SERVER", "BARTENDER"]);
