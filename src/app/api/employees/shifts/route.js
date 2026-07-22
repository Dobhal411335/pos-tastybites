import { withAuth } from "@/utils/auth";
import EmployeeShift from "@/models/EmployeeShift";
import Employee from "@/models/Employee";
import { sendSuccess } from "@/utils/apiResponse";
import { sendError } from "@/utils/errorHandler";
import { logger } from "@/utils/logger";
import mongoose from "mongoose";

// GET - List all shifts
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
      .populate("employee", "firstName lastName email role")
      .populate("assignedFloor", "name")
      .populate("assignedSection", "name")
      .populate("assignedTables", "tableNumber capacity")
      .populate("assignedDevice", "deviceName")
      .lean();

    return sendSuccess(shifts, "Shifts retrieved successfully");
  } catch (error) {
    logger.error("Failed to list shifts", error);
    return sendError(error, "Failed to retrieve shifts", 500);
  }
}, ["ADMIN", "MANAGER"]);

// POST - Create new shift
export const POST = withAuth(async (request) => {
  try {
    const data = await request.json();
    const { employeeId, date, startTime, endTime, assignedFloor, assignedSection, assignedTables, assignedDevice, status, notes } = data;

    if (!employeeId || !date || !startTime) {
      return sendError(new Error("Missing fields"), "Employee, date, and start time are required", 400);
    }

    // Verify employee belongs to this restaurant
    const employeeExists = await Employee.findOne({ _id: employeeId, restaurant: request.restaurant });
    if (!employeeExists) {
      return sendError(new Error("Not Found"), "Employee not found", 404);
    }

    const shiftStart = new Date(startTime);
    const shiftEnd = endTime ? new Date(endTime) : null;

    if (shiftEnd && shiftStart >= shiftEnd) {
      return sendError(new Error("Invalid Time"), "End time must be after start time", 400);
    }

    const newShift = await EmployeeShift.create({
      employee: employeeId,
      restaurant: request.restaurant,
      date: new Date(date),
      startTime: shiftStart,
      endTime: shiftEnd,
      assignedFloor: assignedFloor || null,
      assignedSection: assignedSection || null,
      assignedTables: assignedTables || [],
      assignedDevice: assignedDevice || null,
      status: status || "Scheduled",
      notes: notes || "",
    });

    logger.info(`Shift created for employee ${employeeId}`);
    return sendSuccess(newShift, "Shift created successfully", 201);
  } catch (error) {
    logger.error("Failed to create shift", error);
    return sendError(error, "Failed to create shift", 500);
  }
}, ["ADMIN", "MANAGER"]);

// PUT - Update shift
export const PUT = withAuth(async (request) => {
  try {
    const data = await request.json();
    const { _id, startTime, endTime, assignedFloor, assignedSection, assignedTables, assignedDevice, status, notes } = data;

    if (!_id) {
      return sendError(new Error("Missing ID"), "Shift ID is required", 400);
    }

    const existingShift = await EmployeeShift.findOne({ _id, restaurant: request.restaurant });
    if (!existingShift) {
      return sendError(new Error("Not Found"), "Shift not found", 404);
    }

    const updateData = {};
    if (startTime) {
      updateData.startTime = new Date(startTime);
    }
    if (endTime) {
      updateData.endTime = new Date(endTime);
      if (updateData.startTime && updateData.startTime >= updateData.endTime) {
        return sendError(new Error("Invalid Time"), "End time must be after start time", 400);
      } else if (!updateData.startTime && existingShift.startTime >= updateData.endTime) {
        return sendError(new Error("Invalid Time"), "End time must be after existing start time", 400);
      }
    }
    
    if (assignedFloor !== undefined) updateData.assignedFloor = assignedFloor;
    if (assignedSection !== undefined) updateData.assignedSection = assignedSection;
    if (assignedTables !== undefined) updateData.assignedTables = assignedTables;
    if (assignedDevice !== undefined) updateData.assignedDevice = assignedDevice;
    if (status) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;

    const updatedShift = await EmployeeShift.findByIdAndUpdate(_id, updateData, { new: true })
      .populate("employee", "firstName lastName email role");

    logger.info(`Shift updated for employee ${existingShift.employee}`);
    return sendSuccess(updatedShift, "Shift updated successfully");
  } catch (error) {
    logger.error("Failed to update shift", error);
    return sendError(error, "Failed to update shift", 500);
  }
}, ["ADMIN", "MANAGER"]);

// DELETE - Remove shift
export const DELETE = withAuth(async (request) => {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return sendError(new Error("Missing ID"), "Shift ID is required", 400);
    }

    const deletedShift = await EmployeeShift.findOneAndDelete({ _id: id, restaurant: request.restaurant });
    
    if (!deletedShift) {
      return sendError(new Error("Not Found"), "Shift not found", 404);
    }

    logger.info(`Shift deleted: ${id}`);
    return sendSuccess(null, "Shift deleted successfully");
  } catch (error) {
    logger.error("Failed to delete shift", error);
    return sendError(error, "Failed to delete shift", 500);
  }
}, ["ADMIN", "MANAGER"]);
