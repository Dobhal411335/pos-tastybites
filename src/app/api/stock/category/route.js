import { withAuth } from "@/utils/auth";
import StockCategory from "@/models/stock/StockCategory";
import { sendSuccess } from "@/utils/apiResponse";
import { sendError } from "@/utils/errorHandler";
import { logger } from "@/utils/logger";

// GET - List all stock categories for the restaurant
export const GET = withAuth(async (request) => {
  try {
    const categories = await StockCategory.find({ restaurant: request.restaurant })
      .sort({ createdAt: -1 })
      .lean();
    return sendSuccess(categories, "Stock categories retrieved successfully");
  } catch (error) {
    logger.error("Failed to list stock categories", error);
    return sendError(error, "Failed to retrieve stock categories", 500);
  }
}, ["ADMIN", "MANAGER"]);

// POST - Create a new stock category
export const POST = withAuth(async (request) => {
  try {
    const data = await request.json();
    const { name, status } = data;

    if (!name) {
      return sendError(new Error("Missing fields"), "Category Name is required", 400);
    }

    const newCategory = await StockCategory.create({
      restaurant: request.restaurant,
      name: name.trim(),
      status: status !== undefined ? status : true,
      createdBy: request.user.id
    });

    logger.info(`Stock Category created: ${name}`);
    return sendSuccess(newCategory, "Stock Category created successfully", 201);
  } catch (error) {
    logger.error("Failed to create stock category", error);
    return sendError(error, "Failed to create stock category", 500);
  }
}, ["ADMIN", "MANAGER"]);
