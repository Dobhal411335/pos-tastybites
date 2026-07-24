import { withAuth } from "@/utils/auth";
import Employee from "@/models/employee/Employee";
import Table from "@/models/floor/Table";
import { sendSuccess } from "@/utils/apiResponse";
import { sendError } from "@/utils/errorHandler";
import { logger } from "@/utils/logger";
import mongoose from "mongoose";

// GET - List Employees with their assigned tables and floors
export const GET = withAuth(async (request) => {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get("employeeId");

    const query = { restaurant: request.restaurant };
    
    if (employeeId) {
      query._id = employeeId;
    }

    const employees = await Employee.find(query)
      .select("firstName lastName role assignedTables employeeColor")
      .populate({
        path: "assignedTables",
        select: "tableNumber capacity status floor",
        populate: {
          path: "floor",
          select: "name",
        }
      })
      .lean();

    return sendSuccess(employees, "Employee table assignments retrieved successfully");
  } catch (error) {
    logger.error("Failed to list employee table assignments", error);
    return sendError(error, "Failed to retrieve employee table assignments", 500);
  }
}, ["ADMIN", "MANAGER"]);

// PUT - Update table assignments for an employee
export const PUT = withAuth(async (request) => {
  try {
    const data = await request.json();
    const { employeeId, assignedTables } = data;

    if (!employeeId || !Array.isArray(assignedTables)) {
      return sendError(new Error("Missing fields"), "Employee ID and assignedTables array are required", 400);
    }

    const employee = await Employee.findOne({ _id: employeeId, restaurant: request.restaurant });
    if (!employee) {
      return sendError(new Error("Not Found"), "Employee not found", 404);
    }

    // 1. Unassign the employee from any tables they currently have assigned
    await mongoose.model("Table").updateMany(
      { assignedEmployee: employeeId, restaurant: request.restaurant },
      { $set: { assignedEmployee: null } }
    );

    // 2. Assign the new tables to this employee
    if (assignedTables.length > 0) {
      await mongoose.model("Table").updateMany(
        { _id: { $in: assignedTables }, restaurant: request.restaurant },
        { $set: { assignedEmployee: employeeId } }
      );
    }

    // 3. Find primary floor from assigned tables
    let primaryFloor = null;
    if (assignedTables.length > 0) {
      const tables = await mongoose.model("Table").find({ _id: { $in: assignedTables } }).select("floor");
      if (tables.length > 0 && tables[0].floor) {
        primaryFloor = tables[0].floor;
      }
    }

    // 4. Update the employee document
    employee.assignedTables = assignedTables;
    employee.assignedFloor = primaryFloor;
    await employee.save();

    await employee.populate({
      path: "assignedTables",
      select: "tableNumber capacity status floor",
      populate: {
        path: "floor",
        select: "name",
      }
    });

    logger.info(`Tables assigned to employee ${employeeId}`);
    return sendSuccess(employee, "Table assignments updated successfully");
  } catch (error) {
    logger.error("Failed to update employee table assignment", error);
    return sendError(error, "Failed to update employee table assignment", 500);
  }
}, ["ADMIN", "MANAGER"]);
