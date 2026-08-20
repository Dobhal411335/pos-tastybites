import { withAuth } from "@/utils/auth";
import StockIn from "@/models/stock/StockIn";
import StockProduct from "@/models/stock/StockProduct";
import "@/models/stock/StockCategory";
import "@/models/stock/StockType";
import "@/models/stock/StockUnit";
import { sendSuccess } from "@/utils/apiResponse";
import { sendError } from "@/utils/errorHandler";
import { logger } from "@/utils/logger";
import {
  normalizeStockInEntry,
  stockInProductPopulate,
} from "@/lib/stock/normalizeStockIn";

function mapItems(items) {
  return items.map((item) => {
    const quantity = Number(item.quantity);
    const unitPrice = Number(item.unitPrice);
    const value =
      item.value !== undefined && item.value !== ""
        ? Number(item.value)
        : Number((unitPrice * quantity).toFixed(2));
    return {
      product: item.product,
      quantity,
      unitPrice,
      value,
    };
  });
}

// PUT - Update a stock in invoice
export const PUT = withAuth(async (request, { params }) => {
  try {
    const { id } = await params;
    if (!id) return sendError(new Error("Missing ID"), "Entry ID is required", 400);

    const body = await request.json();
    const $set = { updatedBy: request.user.id };

    if (body.date) $set.date = new Date(body.date);
    if (body.invoiceNumber !== undefined) $set.invoiceNumber = body.invoiceNumber;
    if (body.tax !== undefined && body.tax !== "") $set.tax = Number(body.tax);
    if (body.invoiceAmount !== undefined && body.invoiceAmount !== "") {
      $set.invoiceAmount = Number(body.invoiceAmount);
    }

    const update = { $set };

    if (Array.isArray(body.items)) {
      if (body.items.length === 0) {
        return sendError(new Error("Invalid items"), "At least one product line is required", 400);
      }
      $set.items = mapItems(body.items);
      const invalid = $set.items.some(
        (item) =>
          !item.product ||
          Number.isNaN(item.quantity) ||
          Number.isNaN(item.unitPrice) ||
          Number.isNaN(item.value)
      );
      if (invalid) {
        return sendError(
          new Error("Invalid items"),
          "Each line needs product, quantity, per-piece value, and total",
          400
        );
      }
      update.$unset = { product: 1, quantity: 1, value: 1, unitPrice: 1 };
    }

    const updatedEntry = await StockIn.findOneAndUpdate(
      { _id: id, restaurant: request.restaurant },
      update,
      { returnDocument: "after", runValidators: true }
    ).populate(stockInProductPopulate);

    if (!updatedEntry) {
      return sendError(new Error("Not Found"), "Stock entry not found", 404);
    }

    if (Array.isArray(body.items)) {
      const openingUpdates = body.items.filter(
        (item) =>
          item.product &&
          (Object.prototype.hasOwnProperty.call(item, "openingStock") ||
            Object.prototype.hasOwnProperty.call(item, "openingStockPrice"))
      );
      await Promise.all(
        openingUpdates.map(async (item) => {
          const productSet = { updatedBy: request.user.id };
          if (Object.prototype.hasOwnProperty.call(item, "openingStock")) {
            const raw = item.openingStock;
            productSet.openingStock =
              raw === "" || raw === null || raw === undefined ? null : Number(raw);
          }
          if (Object.prototype.hasOwnProperty.call(item, "openingStockPrice")) {
            const raw = item.openingStockPrice;
            productSet.openingStockPrice =
              raw === "" || raw === null || raw === undefined ? null : Number(raw);
          }
          await StockProduct.findOneAndUpdate(
            { _id: item.product, restaurant: request.restaurant },
            { $set: productSet }
          );
        })
      );
    }

    logger.info(`Stock In invoice updated: ${id}`);
    return sendSuccess(
      normalizeStockInEntry(updatedEntry.toObject()),
      "Entry updated successfully"
    );
  } catch (error) {
    logger.error(`Failed to update stock in entry ${params?.id}`, error);
    return sendError(error, "Failed to update entry", 500);
  }
}, ["ADMIN", "MANAGER"]);

// DELETE - Remove a stock in invoice
export const DELETE = withAuth(async (request, { params }) => {
  try {
    const { id } = await params;
    if (!id) return sendError(new Error("Missing ID"), "Entry ID is required", 400);

    const entry = await StockIn.findOneAndDelete({ _id: id, restaurant: request.restaurant });
    if (!entry) {
      return sendError(new Error("Not Found"), "Stock entry not found", 404);
    }

    logger.info(`Stock In invoice deleted: ${id}`);
    return sendSuccess(null, "Entry deleted successfully");
  } catch (error) {
    logger.error(`Failed to delete stock in entry ${params?.id}`, error);
    return sendError(error, "Failed to delete entry", 500);
  }
}, ["ADMIN", "MANAGER"]);
