import { withAuth } from "@/utils/auth";
import RegisteredDevice from "@/models/RegisteredDevice";
import Employee from "@/models/employee/Employee";
import Floor from "@/models/floor/Floor";
import { sendSuccess } from "@/utils/apiResponse";
import { sendError } from "@/utils/errorHandler";
import { logger } from "@/utils/logger";
import { getNextDeviceCode } from "./next-code/route";

// GET - List all registered devices
export const GET = withAuth(async (request) => {
  try {
    const devices = await RegisteredDevice.find({ restaurant: request.restaurant })
      .populate("assignedFloor", "name")
      .populate("assignedEmployee", "firstName lastName role employeeColor")
      .lean();

    return sendSuccess(devices, "Devices retrieved successfully");
  } catch (error) {
    logger.error("Failed to list devices", error);
    return sendError(error, "Failed to retrieve devices", 500);
  }
}, ["ADMIN", "MANAGER"]);

// POST - Register a new device
export const POST = withAuth(async (request) => {
  try {
    const data = await request.json();
    const { deviceName, deviceType, assignedFloor, description, status } = data;

    if (!deviceName || !deviceType) {
      return sendError(new Error("Missing fields"), "Device Name and Device Type are required", 400);
    }

    // Safely generate the next sequence code to avoid collisions
    const deviceCode = await getNextDeviceCode(request.restaurant);

    const device = await RegisteredDevice.create({
      restaurant: request.restaurant,
      deviceCode,
      deviceName,
      deviceType,
      assignedFloor: assignedFloor || null,
      description,
      status: status || "Active",
      createdBy: request.user.id
    });

    logger.info(`Device Created: ${deviceName} with code ${deviceCode}`);
    return sendSuccess(device, "Device registered successfully", 201);
  } catch (error) {
    logger.error("Failed to register device", error);
    return sendError(error, "Failed to register device", 500);
  }
}, ["ADMIN", "MANAGER"]);

// PUT - Update an existing device
export const PUT = withAuth(async (request) => {
  try {
    const data = await request.json();
    const { _id, deviceName, deviceType, assignedFloor, description, status } = data;

    if (!_id) {
      return sendError(new Error("Missing ID"), "Device ID is required", 400);
    }

    const device = await RegisteredDevice.findOne({ _id, restaurant: request.restaurant });
    if (!device) {
      return sendError(new Error("Not Found"), "Device not found", 404);
    }

    if (deviceName) device.deviceName = deviceName;
    if (deviceType) device.deviceType = deviceType;
    if (assignedFloor !== undefined) device.assignedFloor = assignedFloor || null;
    if (description !== undefined) device.description = description;
    if (status) device.status = status;
    
    device.updatedBy = request.user.id;

    await device.save();

    logger.info(`Device Updated: ${device.deviceCode} (${device.deviceName})`);
    return sendSuccess(device, "Device updated successfully");
  } catch (error) {
    logger.error("Failed to update device", error);
    return sendError(error, "Failed to update device", 500);
  }
}, ["ADMIN", "MANAGER"]);
