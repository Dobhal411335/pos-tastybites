import { withAuth } from "@/utils/auth";
import Addon from "@/models/menu/Addon";
import { sendSuccess } from "@/utils/apiResponse";
import { sendError } from "@/utils/errorHandler";
import { logger } from "@/utils/logger";

// GET - List all addons for the restaurant
export const GET = withAuth(async (request) => {
  try {
    const addons = await Addon.find({ restaurant: request.restaurant, status: true })
      .sort({ createdAt: 1 })
      .lean();
    return sendSuccess(addons, "Addons retrieved successfully");
  } catch (error) {
    logger.error("Failed to list addons", error);
    return sendError(error, "Failed to retrieve addons", 500);
  }
}, ["ADMIN", "MANAGER"]);

// POST - Create a new addon
export const POST = withAuth(async (request) => {
  try {
    const data = await request.json();
    const { name } = data;

    if (!name) {
      return sendError(new Error("Missing fields"), "Name is required", 400);
    }

    const newAddon = await Addon.create({
      restaurant: request.restaurant,
      name,
      status: true,
      createdBy: request.user.id
    });

    logger.info(`Addon created: ${name}`);
    return sendSuccess(newAddon, "Addon created successfully", 201);
  } catch (error) {
    logger.error("Failed to create addon", error);
    return sendError(error, "Failed to create addon", 500);
  }
}, ["ADMIN", "MANAGER"]);
