import { withAuth } from "@/utils/auth";
import Size from "@/models/menu/Size";
import { sendSuccess } from "@/utils/apiResponse";
import { sendError } from "@/utils/errorHandler";
import { logger } from "@/utils/logger";

// GET - List all sizes for the restaurant
export const GET = withAuth(async (request) => {
  try {
    const sizes = await Size.find({ restaurant: request.restaurant, status: true })
      .sort({ createdAt: 1 })
      .lean();
    return sendSuccess(sizes, "Sizes retrieved successfully");
  } catch (error) {
    logger.error("Failed to list sizes", error);
    return sendError(error, "Failed to retrieve sizes", 500);
  }
}, ["ADMIN", "MANAGER"]);

// POST - Create a new size
export const POST = withAuth(async (request) => {
  try {
    const data = await request.json();
    const { name } = data;

    if (!name) {
      return sendError(new Error("Missing fields"), "Name is required", 400);
    }

    const newSize = await Size.create({
      restaurant: request.restaurant,
      name,
      status: true,
      createdBy: request.user.id
    });

    logger.info(`Size created: ${name}`);
    return sendSuccess(newSize, "Size created successfully", 201);
  } catch (error) {
    logger.error("Failed to create size", error);
    return sendError(error, "Failed to create size", 500);
  }
}, ["ADMIN", "MANAGER"]);
