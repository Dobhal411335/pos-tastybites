import { withAuth } from "@/utils/auth";
import Tax from "@/models/tax/Tax";
import { sendSuccess } from "@/utils/apiResponse";
import { sendError } from "@/utils/errorHandler";
import { logger } from "@/utils/logger";

// GET - List all taxes for the restaurant
export const GET = withAuth(async (request) => {
  try {
    const taxes = await Tax.find({ restaurant: request.restaurant }).sort({ createdAt: -1 }).lean();
    return sendSuccess(taxes, "Taxes retrieved successfully");
  } catch (error) {
    logger.error("Failed to list taxes", error);
    return sendError(error, "Failed to retrieve taxes", 500);
  }
}, ["ADMIN", "MANAGER"]);

// POST - Create a new tax
export const POST = withAuth(async (request) => {
  try {
    const data = await request.json();
    const { name, value, type } = data;

    if (!name || value === undefined || !type) {
      return sendError(new Error("Missing fields"), "Name, value, and type are required", 400);
    }

    const newTax = await Tax.create({
      restaurant: request.restaurant,
      name,
      value,
      type,
      status: "Active",
      createdBy: request.user.id
    });

    logger.info(`Tax created: ${name}`);
    return sendSuccess(newTax, "Tax created successfully", 201);
  } catch (error) {
    logger.error("Failed to create tax", error);
    return sendError(error, "Failed to create tax", 500);
  }
}, ["ADMIN", "MANAGER"]);

// PUT - Update an existing tax
export const PUT = withAuth(async (request) => {
  try {
    const data = await request.json();
    const { _id, name, value, type, status } = data;

    if (!_id) {
      return sendError(new Error("Missing ID"), "Tax ID is required", 400);
    }

    const updateData = { updatedBy: request.user.id };
    if (name) updateData.name = name;
    if (value !== undefined) updateData.value = value;
    if (type) updateData.type = type;
    if (status) updateData.status = status;

    const updatedTax = await Tax.findOneAndUpdate(
      { _id, restaurant: request.restaurant },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updatedTax) {
      return sendError(new Error("Not Found"), "Tax not found", 404);
    }

    logger.info(`Tax updated: ${_id}`);
    return sendSuccess(updatedTax, "Tax updated successfully");
  } catch (error) {
    logger.error("Failed to update tax", error);
    return sendError(error, "Failed to update tax", 500);
  }
}, ["ADMIN", "MANAGER"]);

// DELETE - Remove a tax
export const DELETE = withAuth(async (request) => {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return sendError(new Error("Missing ID"), "Tax ID is required", 400);
    }

    const deletedTax = await Tax.findOneAndDelete({ _id: id, restaurant: request.restaurant });
    
    if (!deletedTax) {
      return sendError(new Error("Not Found"), "Tax not found", 404);
    }

    logger.info(`Tax deleted: ${id}`);
    return sendSuccess(null, "Tax deleted successfully");
  } catch (error) {
    logger.error("Failed to delete tax", error);
    return sendError(error, "Failed to delete tax", 500);
  }
}, ["ADMIN", "MANAGER"]);
