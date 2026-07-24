import { withAuth } from "@/utils/auth";
import StockProduct from "@/models/stock/StockProduct";
// We need to import referenced models to ensure they are registered before populate()
import "@/models/stock/StockCategory";
import "@/models/stock/StockType";
import "@/models/stock/StockUnit";

import { sendSuccess } from "@/utils/apiResponse";
import { sendError } from "@/utils/errorHandler";
import { logger } from "@/utils/logger";

// GET - List all stock products
export const GET = withAuth(async (request) => {
  try {
    const products = await StockProduct.find({ restaurant: request.restaurant })
      .populate('category', 'name')
      .populate('type', 'name')
      .populate('unit', 'name')
      .sort({ createdAt: -1 })
      .lean();
    return sendSuccess(products, "Stock products retrieved successfully");
  } catch (error) {
    logger.error("Failed to list stock products", error);
    return sendError(error, "Failed to retrieve stock products", 500);
  }
}, ["ADMIN", "MANAGER"]);

// POST - Create a new stock product
export const POST = withAuth(async (request) => {
  try {
    const data = await request.json();
    const { category, name, type, unit, purchasePrice, salePrice, status } = data;

    if (!category || !name || !type || !unit || purchasePrice === undefined || salePrice === undefined) {
      return sendError(new Error("Missing fields"), "All product fields are required", 400);
    }

    const newProduct = await StockProduct.create({
      restaurant: request.restaurant,
      category,
      name: name.trim(),
      type,
      unit,
      purchasePrice: Number(purchasePrice),
      salePrice: Number(salePrice),
      status: status !== undefined ? status : true,
      createdBy: request.user.id
    });

    // Populate for the frontend response
    await newProduct.populate(['category', 'type', 'unit']);

    logger.info(`Stock Product created: ${name}`);
    return sendSuccess(newProduct, "Stock Product created successfully", 201);
  } catch (error) {
    logger.error("Failed to create stock product", error);
    return sendError(error, "Failed to create stock product", 500);
  }
}, ["ADMIN", "MANAGER"]);
