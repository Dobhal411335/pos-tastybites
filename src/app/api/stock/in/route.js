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
  hydrateLegacyStockInProducts,
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

function populateInvoice(query) {
  return query.populate(stockInProductPopulate);
}

// GET - List stock in invoices
export const GET = withAuth(async (request) => {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId");

    const query = { restaurant: request.restaurant };
    if (productId) {
      query.$or = [{ "items.product": productId }, { product: productId }];
    }

    const entries = await populateInvoice(
      StockIn.find(query).sort({ date: -1, createdAt: -1 })
    ).lean();

    return sendSuccess(
      await hydrateLegacyStockInProducts(entries),
      "Stock in entries retrieved successfully"
    );
  } catch (error) {
    logger.error("Failed to list stock in entries", error);
    return sendError(error, "Failed to retrieve stock in entries", 500);
  }
}, ["ADMIN", "MANAGER"]);

// POST - Create a stock in invoice with one or more products
export const POST = withAuth(async (request) => {
  try {
    const data = await request.json();
    const { date, items, invoiceNumber, tax, invoiceAmount } = data;

    if (!date || !Array.isArray(items) || items.length === 0) {
      return sendError(
        new Error("Missing fields"),
        "Date and at least one product line are required",
        400
      );
    }

    const mappedItems = mapItems(items);
    const invalid = mappedItems.some(
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

    const newEntry = await StockIn.create({
      restaurant: request.restaurant,
      date: new Date(date),
      items: mappedItems,
      invoiceNumber,
      tax: tax ? Number(tax) : undefined,
      invoiceAmount: invoiceAmount ? Number(invoiceAmount) : undefined,
      createdBy: request.user.id,
    });

    await newEntry.populate(stockInProductPopulate);

    // Optional: update product opening stock from stock-in form
    const openingUpdates = (items || []).filter(
      (item) =>
        item.product && Object.prototype.hasOwnProperty.call(item, "openingStock")
    );
    if (openingUpdates.length) {
      await Promise.all(
        openingUpdates.map(async (item) => {
          const raw = item.openingStock;
          await StockProduct.findOneAndUpdate(
            { _id: item.product, restaurant: request.restaurant },
            {
              $set: {
                updatedBy: request.user.id,
                openingStock:
                  raw === "" || raw === null || raw === undefined
                    ? null
                    : Number(raw),
              },
            }
          );
        })
      );
    }

    logger.info(`Stock In invoice created with ${mappedItems.length} item(s)`);
    return sendSuccess(
      normalizeStockInEntry(newEntry.toObject()),
      "Stock In entry created successfully",
      201
    );
  } catch (error) {
    logger.error("Failed to create stock in entry", error);
    return sendError(error, "Failed to create stock in entry", 500);
  }
}, ["ADMIN", "MANAGER"]);
