import { withAuth } from "@/utils/auth";
import Ingredient from "@/models/menu/Ingredient";
import { sendSuccess } from "@/utils/apiResponse";
import { sendError } from "@/utils/errorHandler";
import { logger } from "@/utils/logger";

// GET - List all ingredients for the restaurant
export const GET = withAuth(async (request) => {
  try {
    const ingredients = await Ingredient.find({ restaurant: request.restaurant, status: true })
      .sort({ createdAt: 1 })
      .lean();
    return sendSuccess(ingredients, "Ingredients retrieved successfully");
  } catch (error) {
    logger.error("Failed to list ingredients", error);
    return sendError(error, "Failed to retrieve ingredients", 500);
  }
}, ["ADMIN", "MANAGER"]);

// POST - Create a new ingredient
export const POST = withAuth(async (request) => {
  try {
    const data = await request.json();
    const { name } = data;

    if (!name) {
      return sendError(new Error("Missing fields"), "Name is required", 400);
    }

    const newIngredient = await Ingredient.create({
      restaurant: request.restaurant,
      name: String(name).trim(),
      status: true,
      createdBy: request.user.id,
    });

    logger.info(`Ingredient created: ${name}`);
    return sendSuccess(newIngredient, "Ingredient created successfully", 201);
  } catch (error) {
    logger.error("Failed to create ingredient", error);
    return sendError(error, "Failed to create ingredient", 500);
  }
}, ["ADMIN", "MANAGER"]);
