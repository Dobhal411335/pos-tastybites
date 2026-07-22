import { withAuth } from "@/utils/auth";
import EmployeeShift from "@/models/employee/EmployeeShift";
import { sendSuccess } from "@/utils/apiResponse";
import { sendError } from "@/utils/errorHandler";
import { logger } from "@/utils/logger";
import mongoose from "mongoose";

// GET - List table assignments (via shifts)
export const GET = withAuth(async (request) => {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");
    const employeeId = searchParams.get("employeeId");

    const query = { restaurant: request.restaurant };

    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setUTCHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setUTCHours(23, 59, 59, 999);
      query.date = { $gte: startOfDay, $lte: endOfDay };
    }

    if (employeeId) {
      query.employee = employeeId;
    }

    // Only return shifts that have assigned tables, or all matching shifts if needed.
    // We'll return all matching shifts to show the assignment status.
    const shifts = await EmployeeShift.find(query)
      .select("employee date startTime endTime assignedTables")
      .populate("employee", "firstName lastName")
      .populate("assignedTables", "tableNumber capacity status")
      .lean();

    return sendSuccess(shifts, "Table assignments retrieved successfully");
  } catch (error) {
    logger.error("Failed to list table assignments", error);
    return sendError(error, "Failed to retrieve table assignments", 500);
  }
}, ["ADMIN", "MANAGER"]);

// PUT - Update table assignments for a shift
export const PUT = withAuth(async (request) => {
  try {
    const data = await request.json();
    const { shiftId, assignedTables } = data;

    if (!shiftId || !Array.isArray(assignedTables)) {
      return sendError(new Error("Missing fields"), "Shift ID and assignedTables array are required", 400);
    }

    // Check if the shift exists
    const shift = await EmployeeShift.findOne({ _id: shiftId, restaurant: request.restaurant });
    if (!shift) {
      return sendError(new Error("Not Found"), "Shift not found", 404);
    }

    // Ensure no duplicate tables are assigned to another active shift at the exact same time
    // For simplicity, we just update the tables on the current shift.
    shift.assignedTables = assignedTables;
    await shift.save();

    await shift.populate("assignedTables", "tableNumber capacity status");
    await shift.populate("employee", "firstName lastName");

    logger.info(`Tables assigned to shift ${shiftId}`);
    return sendSuccess(shift, "Table assignments updated successfully");
  } catch (error) {
    logger.error("Failed to update table assignment", error);
    return sendError(error, "Failed to update table assignment", 500);
  }
}, ["ADMIN", "MANAGER"]);
