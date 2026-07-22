import { withAuth } from "@/utils/auth";
import Employee from "@/models/employee/Employee";
import { hashPassword } from "@/utils/password";
import { sendSuccess } from "@/utils/apiResponse";
import { sendError } from "@/utils/errorHandler";
import { logger } from "@/utils/logger";
import mongoose from "mongoose";

// GET - List all employees
export const GET = withAuth(async (request) => {
  try {
    const { searchParams } = new URL(request.url);
    const role = searchParams.get("role");
    const status = searchParams.get("status");

    const query = { restaurant: request.restaurant };
    if (role) query.role = role;
    if (status) query.status = status;

    const employees = await Employee.find(query)
      .select("-password")
      .populate("defaultFloor", "name")
      .populate("assignedFloor", "name")
      .populate("assignedTables", "tableNumber")
      .lean();

    return sendSuccess(employees, "Employees retrieved successfully");
  } catch (error) {
    logger.error("Failed to list employees", error);
    return sendError(error, "Failed to retrieve employees", 500);
  }
}, ["ADMIN", "MANAGER"]);

// POST - Create new employee
export const POST = withAuth(async (request) => {
  try {
    const data = await request.json();
    const { firstName, lastName, email, phoneNumber, role, password, status, profileImage, defaultFloor, employeeColor, assignedFloor, assignedTables } = data;

    // Validation
    if (!firstName || !lastName || !email || !phoneNumber) {
      return sendError(new Error("Missing fields"), "First name, last name, email, and phone number are required", 400);
    }

    // Check unique email and phone
    const existingEmail = await Employee.findOne({ email: email.toLowerCase() });
    if (existingEmail) {
      return sendError(new Error("Conflict"), "Employee with this email already exists", 409);
    }

    const existingPhone = await Employee.findOne({ phoneNumber });
    if (existingPhone) {
      return sendError(new Error("Conflict"), "Employee with this phone number already exists", 409);
    }

    // Generate unique employee ID (e.g., EMP-12345)
    const count = await Employee.countDocuments({ restaurant: request.restaurant });
    const employeeId = `EMP-${(count + 1).toString().padStart(4, "0")}`;

    // Default password if not provided
    const rawPassword = password || "TempPassword123!";
    const hashedPassword = await hashPassword(rawPassword);

    const newEmployee = await Employee.create({
      employeeId,
      restaurant: request.restaurant,
      firstName,
      lastName,
      email: email.toLowerCase(),
      phoneNumber,
      password: hashedPassword,
      role: role || "Staff",
      status: status || "Active",
      profileImage,
      defaultFloor: defaultFloor || null,
      employeeColor: employeeColor || "#4ade80",
      assignedFloor: assignedFloor || null,
      assignedTables: assignedTables || [],
    });

    // Update tables with this employee assignment
    if (assignedTables && assignedTables.length > 0) {
      await mongoose.model("Table").updateMany(
        { _id: { $in: assignedTables }, restaurant: request.restaurant },
        { $set: { assignedEmployee: newEmployee._id } }
      );
      logger.info(`Employee Assigned to tables: ${assignedTables.join(', ')}`);
    }

    const employeeObj = newEmployee.toObject();
    delete employeeObj.password;

    logger.info(`Employee created: ${email}`);
    return sendSuccess(employeeObj, "Employee created successfully", 201);
  } catch (error) {
    logger.error("Failed to create employee", error);
    return sendError(error, "Failed to create employee", 500);
  }
}, ["ADMIN", "MANAGER"]);

// PUT - Update employee
export const PUT = withAuth(async (request) => {
  try {
    const data = await request.json();
    const { _id, firstName, lastName, phoneNumber, role, status, profileImage, defaultFloor, employeeColor, assignedFloor, assignedTables } = data;

    if (!_id) {
      return sendError(new Error("Missing ID"), "Employee ID is required", 400);
    }

    // Ensure they belong to the same restaurant
    const existing = await Employee.findOne({ _id, restaurant: request.restaurant });
    if (!existing) {
      return sendError(new Error("Not Found"), "Employee not found", 404);
    }

    const updateData = {
      ...(firstName && { firstName }),
      ...(lastName && { lastName }),
      ...(phoneNumber && { phoneNumber }),
      ...(role && { role }),
      ...(status && { status }),
      ...(profileImage && { profileImage }),
      ...(defaultFloor && { defaultFloor }),
      ...(employeeColor && { employeeColor }),
      ...(assignedFloor !== undefined && { assignedFloor }),
      ...(assignedTables && { assignedTables }),
    };

    const updatedEmployee = await Employee.findByIdAndUpdate(_id, updateData, { new: true }).select("-password");

    // Manage Table Assignments
    if (assignedTables !== undefined) {
      // Unassign from old tables
      await mongoose.model("Table").updateMany(
        { assignedEmployee: _id, restaurant: request.restaurant },
        { $set: { assignedEmployee: null } }
      );
      // Assign to new tables
      if (assignedTables.length > 0) {
        await mongoose.model("Table").updateMany(
          { _id: { $in: assignedTables }, restaurant: request.restaurant },
          { $set: { assignedEmployee: _id } }
        );
      }
      logger.info(`Employee ${_id} assignments updated`);
    }

    logger.info(`Employee updated: ${existing.email}`);
    return sendSuccess(updatedEmployee, "Employee updated successfully");
  } catch (error) {
    logger.error("Failed to update employee", error);
    return sendError(error, "Failed to update employee", 500);
  }
}, ["ADMIN", "MANAGER"]);

// DELETE - Remove employee
export const DELETE = withAuth(async (request) => {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return sendError(new Error("Missing ID"), "Employee ID is required", 400);
    }

    const employee = await Employee.findOneAndDelete({ _id: id, restaurant: request.restaurant });

    if (!employee) {
      return sendError(new Error("Not Found"), "Employee not found", 404);
    }

    logger.info(`Employee deleted: ${employee.email}`);
    return sendSuccess(null, "Employee deleted successfully");
  } catch (error) {
    logger.error("Failed to delete employee", error);
    return sendError(error, "Failed to delete employee", 500);
  }
}, ["ADMIN"]);
