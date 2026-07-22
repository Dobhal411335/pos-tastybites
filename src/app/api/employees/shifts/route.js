import { withAuth } from "@/utils/auth";
import EmployeeShift from "@/models/employee/EmployeeShift";
import Employee from "@/models/employee/Employee";
import { sendSuccess } from "@/utils/apiResponse";
import { sendError } from "@/utils/errorHandler";
import { logger } from "@/utils/logger";
import mongoose from "mongoose";

// Helper function to recalculate all shifts for an employee in a given week
async function calculateWeeklyHours(employeeId, restaurantId, targetDate) {
  const d = new Date(targetDate);
  const day = d.getDay();
  // Set to previous Monday (or today if Monday). If Sunday (0), go back 6 days.
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); 
  const startOfWeek = new Date(d);
  startOfWeek.setDate(diff);
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  const shifts = await EmployeeShift.find({
    employee: employeeId,
    restaurant: restaurantId,
    date: { $gte: startOfWeek, $lte: endOfWeek }
  }).sort({ startTime: 1 });

  let cumulativeHours = 0;
  const bulkOps = [];

  for (const shift of shifts) {
    if (!shift.endTime) continue; // Can't calculate without end time

    const durationMs = shift.endTime.getTime() - shift.startTime.getTime();
    const shiftTotalHours = durationMs / (1000 * 60 * 60);

    let reg = shiftTotalHours;
    let ot = 0;

    if (cumulativeHours >= 40) {
      ot = shiftTotalHours;
      reg = 0;
    } else if (cumulativeHours + shiftTotalHours > 40) {
      reg = 40 - cumulativeHours;
      ot = shiftTotalHours - reg;
    }

    cumulativeHours += shiftTotalHours;

    bulkOps.push({
      updateOne: {
        filter: { _id: shift._id },
        update: { 
          totalHours: Number(shiftTotalHours.toFixed(2)), 
          regularHours: Number(reg.toFixed(2)), 
          overtimeHours: Number(ot.toFixed(2)) 
        }
      }
    });
  }

  if (bulkOps.length > 0) {
    await EmployeeShift.bulkWrite(bulkOps);
  }
}

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

    await calculateWeeklyHours(employeeId, request.restaurant, new Date(date));

    // Fetch the updated shift to return
    const finalShift = await EmployeeShift.findById(newShift._id)
      .populate("employee", "firstName lastName email role");

    logger.info(`Shift created for employee ${employeeId}`);
    return sendSuccess(finalShift, "Shift created successfully", 201);
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

    await EmployeeShift.findByIdAndUpdate(_id, updateData);
    
    // Recalculate hours for the week containing this shift
    await calculateWeeklyHours(existingShift.employee, request.restaurant, existingShift.date);

    const updatedShift = await EmployeeShift.findById(_id)
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

    // Recalculate hours for the week to remove this shift's hours from the totals
    await calculateWeeklyHours(deletedShift.employee, request.restaurant, deletedShift.date);

    logger.info(`Shift deleted: ${id}`);
    return sendSuccess(null, "Shift deleted successfully");
  } catch (error) {
    logger.error("Failed to delete shift", error);
    return sendError(error, "Failed to delete shift", 500);
  }
}, ["ADMIN", "MANAGER"]);
