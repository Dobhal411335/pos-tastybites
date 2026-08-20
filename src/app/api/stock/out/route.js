import { withAuth } from "@/utils/auth";
import StockOut from "@/models/stock/StockOut";
import "@/models/stock/StockProduct";
import "@/models/stock/StockCategory";
import "@/models/stock/StockType";
import "@/models/stock/StockUnit";
import { sendSuccess } from "@/utils/apiResponse";
import { sendError } from "@/utils/errorHandler";
import { logger } from "@/utils/logger";

function populateProduct(query) {
  return query.populate({
    path: "product",
    populate: [
      { path: "category", select: "name" },
      { path: "type", select: "name" },
      { path: "unit", select: "name" },
    ],
  });
}

// GET - List all stock out entries
export const GET = withAuth(async (request) => {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId");

    const query = { restaurant: request.restaurant };
    if (productId) query.product = productId;

    const entries = await populateProduct(
      StockOut.find(query).sort({ date: -1, createdAt: -1 })
    ).lean();

    const withUnitPrice = (entries || []).map((entry) => {
      const quantity = Number(entry.quantity) || 0;
      const value = Number(entry.value) || 0;
      const unitPrice =
        entry.unitPrice !== undefined && entry.unitPrice !== null
          ? Number(entry.unitPrice)
          : quantity
            ? value / quantity
            : 0;
      return { ...entry, unitPrice };
    });

    return sendSuccess(withUnitPrice, "Stock out entries retrieved successfully");
  } catch (error) {
    logger.error("Failed to list stock out entries", error);
    return sendError(error, "Failed to retrieve stock out entries", 500);
  }
}, ["ADMIN", "MANAGER"]);

// POST - Create a new stock out entry (qty + date only; value optional)
export const POST = withAuth(async (request) => {
  try {
    const data = await request.json();
    const { product, date, quantity, unitPrice, value } = data;

    if (!product || !date || quantity === undefined || quantity === "") {
      return sendError(
        new Error("Missing fields"),
        "Product, Date, and Quantity are required",
        400
      );
    }

    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      return sendError(new Error("Invalid qty"), "Quantity must be greater than 0", 400);
    }

    const piece =
      unitPrice !== undefined && unitPrice !== "" && unitPrice !== null
        ? Number(unitPrice)
        : 0;
    const total =
      value !== undefined && value !== "" && value !== null
        ? Number(value)
        : Number((piece * qty).toFixed(2));

    const newEntry = await StockOut.create({
      restaurant: request.restaurant,
      product,
      date: new Date(date),
      quantity: qty,
      unitPrice: Number.isFinite(piece) ? piece : 0,
      value: Number.isFinite(total) ? total : 0,
      createdBy: request.user.id,
    });

    await populateProduct(newEntry);

    logger.info(`Stock Out created for product: ${product}`);
    return sendSuccess(newEntry, "Stock Out entry created successfully", 201);
  } catch (error) {
    logger.error("Failed to create stock out entry", error);
    return sendError(error, "Failed to create stock out entry", 500);
  }
}, ["ADMIN", "MANAGER"]);
