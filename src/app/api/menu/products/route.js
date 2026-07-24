import { withAuth } from "@/utils/auth";
import Product from "@/models/menu/Product";
import Category from "@/models/menu/Category";
import { sendSuccess } from "@/utils/apiResponse";
import { sendError } from "@/utils/errorHandler";
import { logger } from "@/utils/logger";
import Coupon from "@/models/menu/Coupon";
// GET - List all products
export const GET = withAuth(async (request) => {
  try {
    const products = await Product.find({ restaurant: request.restaurant })
      .populate("category", "name")
      .populate("discount")
      .sort({ createdAt: -1 })
      .lean();

    return sendSuccess(products, "Products retrieved successfully");
  } catch (error) {
    logger.error("Failed to list products", error);
    return sendError(error, "Failed to retrieve products", 500);
  }
}, ["ADMIN", "MANAGER"]);

// POST - Create a new product (basic info)
export const POST = withAuth(async (request) => {
  try {
    const data = await request.json();
    const { name, categoryId } = data;

    if (!name || !categoryId) {
      return sendError(new Error("Missing fields"), "Product name and category are required", 400);
    }

    const category = await Category.findOne({ _id: categoryId, restaurant: request.restaurant });
    if (!category) {
      return sendError(new Error("Invalid Category"), "Selected category does not exist", 404);
    }

    const newProduct = await Product.create({
      restaurant: request.restaurant,
      category: categoryId,
      name,
      status: "Active",
      createdBy: request.user.id
    });

    logger.info(`Product created: ${name}`);
    return sendSuccess(newProduct, "Product created successfully", 201);
  } catch (error) {
    logger.error("Failed to create product", error);
    return sendError(error, "Failed to create product", 500);
  }
}, ["ADMIN", "MANAGER"]);
