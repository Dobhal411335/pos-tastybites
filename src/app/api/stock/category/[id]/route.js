import { withAuth } from "@/utils/auth";
import StockCategory from "@/models/stock/StockCategory";
import { sendSuccess } from "@/utils/apiResponse";
import { sendError } from "@/utils/errorHandler";
import { logger } from "@/utils/logger";

// PUT - Update a stock category or toggle status
export const PUT = withAuth(async (request, { params }) => {
  try {
    const { id } = await params;
    
    if (!id) {
      return sendError(new Error("Missing ID"), "Category ID is required", 400);
    }

    const updateData = await request.json();
    
    // Set updatedBy
    updateData.updatedBy = request.user.id;

    const updatedCategory = await StockCategory.findOneAndUpdate(
      { _id: id, restaurant: request.restaurant },
      { $set: updateData },
      { returnDocument: 'after', runValidators: true }
    );

    if (!updatedCategory) {
      return sendError(new Error("Not Found"), "Stock category not found", 404);
    }

    logger.info(`Stock Category updated: ${id}`);
    return sendSuccess(updatedCategory, "Stock category updated successfully");
  } catch (error) {
    logger.error(`Failed to update stock category ${params?.id}`, error);
    return sendError(error, "Failed to update stock category", 500);
  }
}, ["ADMIN", "MANAGER"]);

// DELETE - Remove a stock category
export const DELETE = withAuth(async (request, { params }) => {
  try {
    const { id } = await params;

    if (!id) {
      return sendError(new Error("Missing ID"), "Category ID is required", 400);
    }

    const category = await StockCategory.findOneAndDelete({ _id: id, restaurant: request.restaurant });
    if (!category) {
      return sendError(new Error("Not Found"), "Stock category not found", 404);
    }

    logger.info(`Stock Category deleted: ${id}`);
    return sendSuccess(null, "Stock category deleted successfully");
  } catch (error) {
    logger.error(`Failed to delete stock category ${params?.id}`, error);
    return sendError(error, "Failed to delete stock category", 500);
  }
}, ["ADMIN", "MANAGER"]);
