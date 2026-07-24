import { withAuth } from "@/utils/auth";
import StockIn from "@/models/stock/StockIn";
import "@/models/stock/StockProduct";
import "@/models/stock/StockCategory";
import "@/models/stock/StockType";
import "@/models/stock/StockUnit";
import { sendSuccess } from "@/utils/apiResponse";
import { sendError } from "@/utils/errorHandler";
import { logger } from "@/utils/logger";

// GET - List all stock in entries
export const GET = withAuth(async (request) => {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId");
    
    let query = { restaurant: request.restaurant };
    if (productId) query.product = productId;

    const entries = await StockIn.find(query)
      .populate({
        path: 'product',
        populate: [
          { path: 'category', select: 'name' },
          { path: 'type', select: 'name' },
          { path: 'unit', select: 'name' }
        ]
      })
      .sort({ date: -1, createdAt: -1 })
      .lean();
      
    return sendSuccess(entries, "Stock in entries retrieved successfully");
  } catch (error) {
    logger.error("Failed to list stock in entries", error);
    return sendError(error, "Failed to retrieve stock in entries", 500);
  }
}, ["ADMIN", "MANAGER"]);

// POST - Create a new stock in entry
export const POST = withAuth(async (request) => {
  try {
    const data = await request.json();
    const { product, date, quantity, value, invoiceNumber, tax, invoiceAmount } = data;

    if (!product || !date || quantity === undefined || value === undefined) {
      return sendError(new Error("Missing fields"), "Product, Date, Quantity, and Value are required", 400);
    }

    const newEntry = await StockIn.create({
      restaurant: request.restaurant,
      product,
      date: new Date(date),
      quantity: Number(quantity),
      value: Number(value),
      invoiceNumber,
      tax: tax ? Number(tax) : undefined,
      invoiceAmount: invoiceAmount ? Number(invoiceAmount) : undefined,
      createdBy: request.user.id
    });

    await newEntry.populate({
      path: 'product',
      populate: [
        { path: 'category', select: 'name' },
        { path: 'type', select: 'name' },
        { path: 'unit', select: 'name' }
      ]
    });

    logger.info(`Stock In created for product: ${product}`);
    return sendSuccess(newEntry, "Stock In entry created successfully", 201);
  } catch (error) {
    logger.error("Failed to create stock in entry", error);
    return sendError(error, "Failed to create stock in entry", 500);
  }
}, ["ADMIN", "MANAGER"]);
