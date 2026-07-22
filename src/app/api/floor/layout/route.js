import { withAuth } from "@/utils/auth";
import Floor from "@/models/Floor";
import Table from "@/models/Table";
import FloorHistory from "@/models/FloorHistory";
import { sendSuccess } from "@/utils/apiResponse";
import { sendError } from "@/utils/errorHandler";
import { logger } from "@/utils/logger";
import mongoose from "mongoose";

// GET - Retrieve Floor Layout (Floors and their Tables)
export const GET = withAuth(async (request) => {
  try {
    const { searchParams } = new URL(request.url);
    const floorId = searchParams.get("floorId");

    const query = { restaurant: request.restaurant };
    if (floorId) query._id = floorId;

    const floors = await Floor.find(query).lean();
    
    // Fetch tables for all retrieved floors
    const floorIds = floors.map(f => f._id);
    const tables = await Table.find({ floor: { $in: floorIds }, restaurant: request.restaurant })
      .populate("assignedEmployee", "firstName lastName employeeColor")
      .lean();

    // Group tables by floor
    const floorsWithTables = floors.map(floor => ({
      ...floor,
      tables: tables.filter(t => t.floor.toString() === floor._id.toString())
    }));

    return sendSuccess(floorsWithTables, "Floor layout retrieved successfully");
  } catch (error) {
    logger.error("Failed to retrieve floor layout", error);
    return sendError(error, "Failed to retrieve floor layout", 500);
  }
}, ["ADMIN", "MANAGER"]);

// PUT - Bulk Update Floor Layout (Save positions)
export const PUT = withAuth(async (request) => {
  try {
    const data = await request.json();
    const { floorId, updates } = data; // updates is an array of table position updates

    if (!floorId || !Array.isArray(updates)) {
      throw new Error("Missing floorId or updates array");
    }

    const floor = await Floor.findOne({ _id: floorId, restaurant: request.restaurant });
    if (!floor) throw new Error("Floor not found");

    // Track coordinates to detect collisions within the bulk update payload itself
    const newCoords = new Set();
    for (let update of updates) {
      if (update.x !== undefined && update.y !== undefined) {
        const coordKey = `${update.x},${update.y}`;
        if (newCoords.has(coordKey)) {
          throw new Error(`Collision detected in layout at coordinates: ${coordKey}`);
        }
        newCoords.add(coordKey);
      }
    }

    for (const update of updates) {
      const table = await Table.findOne({ _id: update._id, floor: floorId, restaurant: request.restaurant });
      if (table) {
        if (update.x !== undefined) table.x = update.x;
        if (update.y !== undefined) table.y = update.y;
        if (update.rotation !== undefined) table.rotation = update.rotation;
        if (update.width !== undefined) table.width = update.width;
        if (update.height !== undefined) table.height = update.height;
        if (update.seats !== undefined) table.seats = update.seats;
        if (update.section !== undefined) table.section = update.section;
        if (update.shape !== undefined) table.shape = update.shape;
        if (update.tableNumber !== undefined) table.tableNumber = update.tableNumber;
        await table.save();
      }
    }

    await FloorHistory.create({
      restaurant: request.restaurant,
      floor: floorId,
      action: "UPDATE_FLOOR",
      details: { updatedTablesCount: updates.length },
      performedBy: request.user.id,
    });

    logger.info(`Floor layout ${floorId} updated`);
    return sendSuccess(null, "Floor layout updated successfully");
  } catch (error) {
    logger.error("Failed to update floor layout", error);
    return sendError(error, error.message || "Failed to update floor layout", 400);
  }
}, ["ADMIN", "MANAGER"]);

// POST - Create Floor
export const POST = withAuth(async (request) => {
  try {
    const data = await request.json();
    const { name, width, height } = data;

    if (!name) return sendError(new Error("Missing name"), "Floor name is required", 400);

    const existingFloor = await Floor.findOne({ name, restaurant: request.restaurant });
    if (existingFloor) return sendError(new Error("Duplicate floor"), "Floor name already exists", 400);

    const floor = await Floor.create({
      name,
      restaurant: request.restaurant,
      width: width || 1000,
      height: height || 800,
    });

    await FloorHistory.create({
      restaurant: request.restaurant,
      floor: floor._id,
      action: "CREATE_FLOOR",
      details: { name: floor.name },
      performedBy: request.user.id,
    });

    return sendSuccess(floor, "Floor created successfully", 201);
  } catch (error) {
    logger.error("Failed to create floor", error);
    return sendError(error, "Failed to create floor", 500);
  }
}, ["ADMIN", "MANAGER"]);
