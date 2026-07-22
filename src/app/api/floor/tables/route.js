import { withAuth } from "@/utils/auth";
import Table from "@/models/Table";
import Floor from "@/models/Floor";
import FloorHistory from "@/models/FloorHistory";
import { sendSuccess } from "@/utils/apiResponse";
import { sendError } from "@/utils/errorHandler";
import { logger } from "@/utils/logger";

// GET - List Tables
export const GET = withAuth(async (request) => {
  try {
    const { searchParams } = new URL(request.url);
    const floorId = searchParams.get("floorId");

    const query = { restaurant: request.restaurant };
    if (floorId) query.floor = floorId;

    const tables = await Table.find(query)
      .populate("assignedEmployee", "firstName lastName employeeColor")
      .lean();

    return sendSuccess(tables, "Tables retrieved successfully");
  } catch (error) {
    logger.error("Failed to retrieve tables", error);
    return sendError(error, "Failed to retrieve tables", 500);
  }
}, ["ADMIN", "MANAGER"]);

// POST - Create Table
export const POST = withAuth(async (request) => {
  try {
    const data = await request.json();
    const { tableNumber } = data;

    if (!tableNumber) {
      return sendError(new Error("Missing fields"), "tableNumber is required", 400);
    }

    // Check Duplicate Table Number
    const existingNum = await Table.findOne({ tableNumber, restaurant: request.restaurant });
    if (existingNum) {
      return sendError(new Error("Duplicate Table"), "A table with this number already exists.", 400);
    }

    const table = await Table.create({
      tableNumber,
      restaurant: request.restaurant,
      status: "Available"
    });

    logger.info(`Table ${tableNumber} created`);
    return sendSuccess(table, "Table created successfully", 201);
  } catch (error) {
    logger.error("Failed to create table", error);
    return sendError(error, "Failed to create table", 500);
  }
}, ["ADMIN", "MANAGER"]);

// PUT - Update Table
export const PUT = withAuth(async (request) => {
  try {
    const data = await request.json();
    const { _id, tableNumber, floor, x, y, width, height, rotation, shape, seats, section, color, assignedEmployee, status } = data;

    if (!_id) return sendError(new Error("Missing ID"), "Table ID is required", 400);

    const table = await Table.findOne({ _id, restaurant: request.restaurant });
    if (!table) return sendError(new Error("Not Found"), "Table not found", 404);

    if (floor !== undefined) table.floor = floor;
    if (x !== undefined) table.x = x;
    if (y !== undefined) table.y = y;
    if (width !== undefined) table.width = width;
    if (height !== undefined) table.height = height;
    if (rotation !== undefined) table.rotation = rotation;
    if (shape !== undefined) table.shape = shape;
    if (seats !== undefined) table.seats = seats;
    if (section !== undefined) table.section = section;
    if (color !== undefined) table.color = color;
    if (assignedEmployee !== undefined) table.assignedEmployee = assignedEmployee;
    if (status !== undefined) table.status = status;

    await table.save();

    await FloorHistory.create({
      restaurant: request.restaurant,
      floor: table.floor,
      action: "UPDATE_TABLE",
      details: { tableId: table._id, tableNumber: table.tableNumber },
      performedBy: request.user.id,
    });

    logger.info(`Table ${table._id} updated`);
    return sendSuccess(table, "Table updated successfully");
  } catch (error) {
    logger.error("Failed to update table", error);
    return sendError(error, "Failed to update table", 500);
  }
}, ["ADMIN", "MANAGER"]);

// DELETE - Delete Table
export const DELETE = withAuth(async (request) => {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) return sendError(new Error("Missing ID"), "Table ID is required", 400);

    const table = await Table.findOneAndDelete({ _id: id, restaurant: request.restaurant });
    if (!table) return sendError(new Error("Not Found"), "Table not found", 404);

    if (table.floor) {
      await FloorHistory.create({
        restaurant: request.restaurant,
        floor: table.floor,
        action: "DELETE_TABLE",
        details: { tableId: table._id, tableNumber: table.tableNumber },
        performedBy: request.user.id,
      });
    }

    logger.info(`Table ${id} deleted`);
    return sendSuccess(null, "Table deleted successfully");
  } catch (error) {
    logger.error("Failed to delete table", error);
    return sendError(error, "Failed to delete table", 500);
  }
}, ["ADMIN", "MANAGER"]);
