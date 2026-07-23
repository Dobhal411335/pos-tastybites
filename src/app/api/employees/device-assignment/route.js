import { withAuth } from "@/utils/auth";
import Employee from "@/models/employee/Employee";
import RegisteredDevice from "@/models/RegisteredDevice";
import { sendSuccess } from "@/utils/apiResponse";
import { sendError } from "@/utils/errorHandler";
import { logger } from "@/utils/logger";

// GET - List Employees with their assigned devices
export const GET = withAuth(async (request) => {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get("employeeId");

    const query = { restaurant: request.restaurant };
    
    if (employeeId) {
      query._id = employeeId;
    }

    const employees = await Employee.find(query)
      .select("firstName lastName role employeeColor assignedDevice")
      .lean();

    return sendSuccess(employees, "Employees retrieved successfully");
  } catch (error) {
    logger.error("Failed to list employees for device assignment", error);
    return sendError(error, "Failed to retrieve employees", 500);
  }
}, ["ADMIN", "MANAGER"]);

// PUT - Update device assignments for an employee
export const PUT = withAuth(async (request) => {
  try {
    const data = await request.json();
    const { employeeId, deviceId, forceReassign } = data;

    if (!employeeId || !deviceId) {
      return sendError(new Error("Missing fields"), "Employee ID and Device ID are required", 400);
    }

    const employee = await Employee.findOne({ _id: employeeId, restaurant: request.restaurant });
    if (!employee) {
      return sendError(new Error("Not Found"), "Employee not found", 404);
    }

    const device = await RegisteredDevice.findOne({ _id: deviceId, restaurant: request.restaurant }).populate("assignedEmployee");
    if (!device) {
      return sendError(new Error("Not Found"), "Device not found", 404);
    }

    // Check if device is already assigned to someone else
    if (device.assignedEmployee && device.assignedEmployee._id.toString() !== employeeId.toString()) {
      if (!forceReassign) {
        return Response.json(
          {
            success: false,
            error: "ALREADY_ASSIGNED",
            message: `This device is already assigned to ${device.assignedEmployee.firstName} ${device.assignedEmployee.lastName}.`,
            employeeName: `${device.assignedEmployee.firstName} ${device.assignedEmployee.lastName}`
          },
          { status: 409 }
        );
      }
      
      // If forcing reassignment, remove the device from the old employee
      await Employee.updateOne(
        { _id: device.assignedEmployee._id },
        { $unset: { assignedDevice: "" } }
      );
      logger.info(`Device Unassigned: ${device.deviceCode} from ${device.assignedEmployee.firstName}`);
    }

    // Check if new employee already has a device (1-to-1 rule)
    if (employee.assignedDevice && employee.assignedDevice.toString() !== deviceId.toString()) {
      // Remove old device's reference to this employee
      await RegisteredDevice.updateOne(
        { _id: employee.assignedDevice },
        { $unset: { assignedEmployee: "" } }
      );
      logger.info(`Device Unassigned: Old device from ${employee.firstName}`);
    }

    // Update the employee document
    employee.assignedDevice = deviceId;
    await employee.save();

    // Update the device document
    device.assignedEmployee = employeeId;
    await device.save();

    logger.info(`Device Assigned: ${device.deviceCode} to ${employee.firstName} ${employee.lastName}`);
    return sendSuccess(device, "Device assigned successfully");
  } catch (error) {
    logger.error("Failed to assign device", error);
    return sendError(error, "Failed to assign device", 500);
  }
}, ["ADMIN", "MANAGER"]);
