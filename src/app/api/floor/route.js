import { withAuth } from "@/utils/auth";
import Floor from "@/models/Floor";
import Table from "@/models/Table";
import FloorHistory from "@/models/FloorHistory";
import { sendSuccess } from "@/utils/apiResponse";
import { sendError } from "@/utils/errorHandler";
import { logger } from "@/utils/logger";

// GET - List Floors
export const GET = withAuth(async (request) => {
  try {
    const floors = await Floor.find({ restaurant: request.restaurant }).lean();
    
    // Fetch tables for these floors to get table count
    const floorIds = floors.map(f => f._id);
    const tables = await Table.find({ floor: { $in: floorIds }, restaurant: request.restaurant }).lean();

    const result = floors.map(f => {
      const tableCount = tables.filter(t => t.floor.toString() === f._id.toString()).length;
      return {
        id: f._id,
        floorName: f.name,
        tableCount: tableCount,
        isActive: f.isActive,
        createdAt: f.createdAt
      };
    });

    return sendSuccess(result, "Floors retrieved successfully");
  } catch (error) {
    logger.error("Failed to list floors", error);
    return sendError(error, "Failed to retrieve floors", 500);
  }
}, ["ADMIN", "MANAGER"]);

// POST - Create Floor
export const POST = withAuth(async (request) => {
  try {
    const data = await request.json();
    const { name, isActive, width, height } = data;

    if (!name) {
      return sendError(new Error("Missing name"), "Floor name is required", 400);
    }

    const existingFloor = await Floor.findOne({ name: name.trim(), restaurant: request.restaurant });
    if (existingFloor) {
      return sendError(new Error("Conflict"), "Floor with this name already exists", 409);
    }

    const floor = await Floor.create({
      name: name.trim(),
      restaurant: request.restaurant,
      isActive: isActive !== undefined ? isActive : true,
      width: width || 1000,
      height: height || 800,
      lastTableSequence: 0
    });

    await FloorHistory.create({
      restaurant: request.restaurant,
      floor: floor._id,
      action: "CREATE_FLOOR",
      details: { name: floor.name },
      performedBy: request.user.id,
    });

    logger.info(`Floor created: ${floor.name}`);
    return sendSuccess(floor, "Floor created successfully", 201);
  } catch (error) {
    logger.error("Failed to create floor", error);
    return sendError(error, "Failed to create floor", 500);
  }
}, ["ADMIN", "MANAGER"]);

// PUT - Update Floor
export const PUT = withAuth(async (request) => {
  try {
    const data = await request.json();
    const { _id, name } = data;

    if (!_id) return sendError(new Error("Missing ID"), "Floor ID is required", 400);

    const floor = await Floor.findOne({ _id, restaurant: request.restaurant });
    if (!floor) return sendError(new Error("Not Found"), "Floor not found", 404);

    if (name) {
      const existingFloor = await Floor.findOne({ name: name.trim(), restaurant: request.restaurant, _id: { $ne: _id } });
      if (existingFloor) {
        return sendError(new Error("Conflict"), "Floor with this name already exists", 409);
      }
      floor.name = name.trim();
    }

    await floor.save();

    await FloorHistory.create({
      restaurant: request.restaurant,
      floor: floor._id,
      action: "UPDATE_FLOOR",
      details: { name: floor.name },
      performedBy: request.user.id,
    });

    logger.info(`Floor updated: ${floor.name}`);
    return sendSuccess(floor, "Floor updated successfully");
  } catch (error) {
    logger.error("Failed to update floor", error);
    return sendError(error, "Failed to update floor", 500);
  }
}, ["ADMIN", "MANAGER"]);

// DELETE - Delete Floor
export const DELETE = withAuth(async (request) => {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) return sendError(new Error("Missing ID"), "Floor ID is required", 400);

    const floor = await Floor.findOneAndDelete({ _id: id, restaurant: request.restaurant });
    if (!floor) return sendError(new Error("Not Found"), "Floor not found", 404);

    // Unassign all tables that were on this floor
    await Table.updateMany({ floor: id, restaurant: request.restaurant }, { $unset: { floor: 1 } });

    logger.info(`Floor ${id} deleted`);
    return sendSuccess(null, "Floor deleted successfully");
  } catch (error) {
    logger.error("Failed to delete floor", error);
    return sendError(error, "Failed to delete floor", 500);
  }
}, ["ADMIN", "MANAGER"]);
