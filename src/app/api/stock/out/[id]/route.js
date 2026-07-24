import { withAuth } from "@/utils/auth";
import StockOut from "@/models/stock/StockOut";
import "@/models/stock/StockProduct";
import "@/models/stock/StockCategory";
import "@/models/stock/StockType";
import "@/models/stock/StockUnit";
import { sendSuccess } from "@/utils/apiResponse";
import { sendError } from "@/utils/errorHandler";
import { logger } from "@/utils/logger";

// PUT - Update a stock out entry
export const PUT = withAuth(async (request, { params }) => {
  try {
    const { id } = await params;
    if (!id) return sendError(new Error("Missing ID"), "Entry ID is required", 400);

    const updateData = await request.json();
    updateData.updatedBy = request.user.id;

    if (updateData.quantity !== undefined) updateData.quantity = Number(updateData.quantity);
    if (updateData.value !== undefined) updateData.value = Number(updateData.value);
    if (updateData.date) updateData.date = new Date(updateData.date);

    const updatedEntry = await StockOut.findOneAndUpdate(
      { _id: id, restaurant: request.restaurant },
      { $set: updateData },
      { returnDocument: 'after', runValidators: true }
    ).populate({
      path: 'product',
      populate: [
        { path: 'category', select: 'name' },
        { path: 'type', select: 'name' },
        { path: 'unit', select: 'name' }
      ]
    });

    if (!updatedEntry) {
      return sendError(new Error("Not Found"), "Stock entry not found", 404);
    }

    logger.info(`Stock Out entry updated: ${id}`);
    return sendSuccess(updatedEntry, "Entry updated successfully");
  } catch (error) {
    logger.error(`Failed to update stock out entry ${params?.id}`, error);
    return sendError(error, "Failed to update entry", 500);
  }
}, ["ADMIN", "MANAGER"]);

// DELETE - Remove a stock out entry
export const DELETE = withAuth(async (request, { params }) => {
  try {
    const { id } = await params;
    if (!id) return sendError(new Error("Missing ID"), "Entry ID is required", 400);

    const entry = await StockOut.findOneAndDelete({ _id: id, restaurant: request.restaurant });
    if (!entry) {
      return sendError(new Error("Not Found"), "Stock entry not found", 404);
    }

    logger.info(`Stock Out entry deleted: ${id}`);
    return sendSuccess(null, "Entry deleted successfully");
  } catch (error) {
    logger.error(`Failed to delete stock out entry ${params?.id}`, error);
    return sendError(error, "Failed to delete entry", 500);
  }
}, ["ADMIN", "MANAGER"]);
