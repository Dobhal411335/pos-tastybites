import { withAuth } from "@/utils/auth";
import StockType from "@/models/stock/StockType";
import StockUnit from "@/models/stock/StockUnit";
import { sendSuccess } from "@/utils/apiResponse";
import { sendError } from "@/utils/errorHandler";
import { logger } from "@/utils/logger";

// GET - List settings based on type
export const GET = withAuth(async (request) => {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type"); // "productType" or "unitMeasure"
    
    let data = [];
    if (type === "productType") {
      data = await StockType.find({ restaurant: request.restaurant }).sort({ name: 1 }).lean();
    } else if (type === "unitMeasure") {
      data = await StockUnit.find({ restaurant: request.restaurant }).sort({ name: 1 }).lean();
    } else {
      return sendError(new Error("Invalid type"), "Invalid setting type", 400);
    }
    
    return sendSuccess(data, `${type} retrieved successfully`);
  } catch (error) {
    logger.error("Failed to list stock settings", error);
    return sendError(error, "Failed to retrieve stock settings", 500);
  }
}, ["ADMIN", "MANAGER"]);

// POST - Create a new setting
export const POST = withAuth(async (request) => {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const data = await request.json();
    const { name } = data;

    if (!name) {
      return sendError(new Error("Missing name"), "Name is required", 400);
    }

    let newItem;
    if (type === "productType") {
      newItem = await StockType.create({ restaurant: request.restaurant, name: name.trim() });
    } else if (type === "unitMeasure") {
      newItem = await StockUnit.create({ restaurant: request.restaurant, name: name.trim() });
    } else {
      return sendError(new Error("Invalid type"), "Invalid setting type", 400);
    }

    logger.info(`Stock Setting created: ${type} - ${name}`);
    return sendSuccess(newItem, "Created successfully", 201);
  } catch (error) {
    logger.error("Failed to create stock setting", error);
    return sendError(error, "Failed to create stock setting", 500);
  }
}, ["ADMIN", "MANAGER"]);
