import { withAuth } from "@/utils/auth";
import StockProduct from "@/models/stock/StockProduct";
import "@/models/stock/StockCategory";
import "@/models/stock/StockType";
import "@/models/stock/StockUnit";
import { sendSuccess } from "@/utils/apiResponse";
import { sendError } from "@/utils/errorHandler";
import { logger } from "@/utils/logger";

function parseOptionalNonNeg(value, label) {
  if (value === undefined || value === null || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) {
    const error = new Error(`${label} must be 0 or greater`);
    error.status = 400;
    throw error;
  }
  return n;
}

function parseMinStock(value) {
  return parseOptionalNonNeg(value, "Minimum stock");
}

// PUT - Update a stock product
export const PUT = withAuth(async (request, { params }) => {
  try {
    const { id } = await params;
    if (!id) return sendError(new Error("Missing ID"), "Product ID is required", 400);

    const updateData = await request.json();
    updateData.updatedBy = request.user.id;

    if (updateData.purchasePrice !== undefined) updateData.purchasePrice = Number(updateData.purchasePrice);
    if (Object.prototype.hasOwnProperty.call(updateData, "minStock")) {
      updateData.minStock = parseMinStock(updateData.minStock);
    }
    if (Object.prototype.hasOwnProperty.call(updateData, "openingStock")) {
      updateData.openingStock = parseOptionalNonNeg(
        updateData.openingStock,
        "Opening stock"
      );
    }
    delete updateData.openingStockPrice;
    delete updateData.salePrice;

    const updatedProduct = await StockProduct.findOneAndUpdate(
      { _id: id, restaurant: request.restaurant },
      { $set: updateData },
      { returnDocument: 'after', runValidators: true }
    ).populate(['category', 'type', 'unit']);

    if (!updatedProduct) {
      return sendError(new Error("Not Found"), "Stock product not found", 404);
    }

    logger.info(`Stock Product updated: ${id}`);
    return sendSuccess(updatedProduct, "Stock product updated successfully");
  } catch (error) {
    logger.error(`Failed to update stock product ${params?.id}`, error);
    return sendError(error, "Failed to update stock product", 500);
  }
}, ["ADMIN", "MANAGER"]);

// DELETE - Remove a stock product
export const DELETE = withAuth(async (request, { params }) => {
  try {
    const { id } = await params;
    if (!id) return sendError(new Error("Missing ID"), "Product ID is required", 400);

    const product = await StockProduct.findOneAndDelete({ _id: id, restaurant: request.restaurant });
    if (!product) {
      return sendError(new Error("Not Found"), "Stock product not found", 404);
    }

    logger.info(`Stock Product deleted: ${id}`);
    return sendSuccess(null, "Stock product deleted successfully");
  } catch (error) {
    logger.error(`Failed to delete stock product ${params?.id}`, error);
    return sendError(error, "Failed to delete stock product", 500);
  }
}, ["ADMIN", "MANAGER"]);
