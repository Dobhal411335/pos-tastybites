import { withAuth } from "@/utils/auth";
import Head from "@/models/menu/Head";
import { sendSuccess } from "@/utils/apiResponse";
import { sendError } from "@/utils/errorHandler";
import { logger } from "@/utils/logger";

// GET - List all heads
export const GET = withAuth(async (request) => {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly =
      searchParams.get("active") === "1" ||
      searchParams.get("status") === "Active";

    const query = { restaurant: request.restaurant };
    if (activeOnly) query.status = "Active";

    const heads = await Head.find(query).lean();
    return sendSuccess(heads, "Heads retrieved successfully");
  } catch (error) {
    logger.error("Failed to list heads", error);
    return sendError(error, "Failed to retrieve heads", 500);
  }
});

// POST - Create a new head
export const POST = withAuth(async (request) => {
  try {
    const data = await request.json();
    const { name } = data;

    if (!name) {
      return sendError(new Error("Missing name"), "Head name is required", 400);
    }

    // Check if head with same name already exists
    const existingHead = await Head.findOne({
      restaurant: request.restaurant,
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') }
    });

    if (existingHead) {
      return sendSuccess(existingHead, "Head already exists.", 200);
    }

    const newHead = await Head.create({
      restaurant: request.restaurant,
      name: name.trim(),
      createdBy: request.user.id
    });

    logger.info(`Head created: ${name}`);
    return sendSuccess(newHead, "Head created successfully", 201);
  } catch (error) {
    logger.error("Failed to create head", error);
    return sendError(error, "Failed to create head", 500);
  }
}, ["ADMIN", "MANAGER"]);

// PUT - Update head status
export const PUT = withAuth(async (request) => {
  try {
    const data = await request.json();
    const { _id, status } = data;

    if (!_id) {
      return sendError(new Error("Missing ID"), "Head ID is required", 400);
    }

    const updatedHead = await Head.findOneAndUpdate(
      { _id, restaurant: request.restaurant },
      { $set: { status, updatedBy: request.user.id } },
      { new: true, runValidators: true }
    );

    if (!updatedHead) {
      return sendError(new Error("Not Found"), "Head not found", 404);
    }

    logger.info(`Head status updated: ${_id}`);
    return sendSuccess(updatedHead, "Head status updated successfully");
  } catch (error) {
    logger.error("Failed to update head status", error);
    return sendError(error, "Failed to update head status", 500);
  }
}, ["ADMIN", "MANAGER"]);

// DELETE - Remove head
export const DELETE = withAuth(async (request) => {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return sendError(new Error("Missing ID"), "Head ID is required", 400);
    }

    const deleted = await Head.findOneAndDelete({ _id: id, restaurant: request.restaurant });
    
    if (!deleted) {
      return sendError(new Error("Not Found"), "Head not found", 404);
    }

    logger.info(`Head deleted: ${id}`);
    return sendSuccess(null, "Head deleted successfully");
  } catch (error) {
    logger.error("Failed to delete head", error);
    return sendError(error, "Failed to delete head", 500);
  }
}, ["ADMIN", "MANAGER"]);
