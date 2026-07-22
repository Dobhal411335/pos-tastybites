import { withAuth } from "@/utils/auth";
import EmployeeShift from "@/models/EmployeeShift";
import RegisteredDevice from "@/models/RegisteredDevice";
import { sendSuccess } from "@/utils/apiResponse";
import { sendError } from "@/utils/errorHandler";
import { logger } from "@/utils/logger";
import mongoose from "mongoose";

// GET - List device assignments (via shifts)
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

    const shifts = await EmployeeShift.find(query)
      .select("employee date startTime endTime assignedDevice")
      .populate("employee", "firstName lastName")
      .populate("assignedDevice", "deviceName deviceType status")
      .lean();

    return sendSuccess(shifts, "Device assignments retrieved successfully");
  } catch (error) {
    logger.error("Failed to list device assignments", error);
    return sendError(error, "Failed to retrieve device assignments", 500);
  }
}, ["ADMIN", "MANAGER"]);

// PUT - Update device assignment for a shift
export const PUT = withAuth(async (request) => {
  try {
    const data = await request.json();
    const { shiftId, assignedDevice } = data; // assignedDevice can be null to unassign

    if (!shiftId || assignedDevice === undefined) {
      return sendError(new Error("Missing fields"), "Shift ID and assignedDevice are required", 400);
    }

    const shift = await EmployeeShift.findOne({ _id: shiftId, restaurant: request.restaurant });
    if (!shift) {
      return sendError(new Error("Not Found"), "Shift not found", 404);
    }

    if (assignedDevice) {
      const device = await RegisteredDevice.findOne({ _id: assignedDevice, restaurant: request.restaurant });
      if (!device) {
        return sendError(new Error("Not Found"), "Device not found or does not belong to this restaurant", 404);
      }
      
      // Optionally verify if device is already assigned to another ACTIVE shift right now
      // This could be complex, skipping strict temporal collision for now.
    }

    shift.assignedDevice = assignedDevice;
    await shift.save();

    await shift.populate("assignedDevice", "deviceName deviceType status");
    await shift.populate("employee", "firstName lastName");

    logger.info(`Device assigned to shift ${shiftId}`);
    return sendSuccess(shift, "Device assignment updated successfully");
  } catch (error) {
    logger.error("Failed to update device assignment", error);
    return sendError(error, "Failed to update device assignment", 500);
  }
}, ["ADMIN", "MANAGER"]);
