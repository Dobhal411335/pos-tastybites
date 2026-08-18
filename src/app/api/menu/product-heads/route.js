import { withAuth } from "@/utils/auth";
import ProductHead from "@/models/menu/ProductHead";
import { sendSuccess } from "@/utils/apiResponse";
import { sendError } from "@/utils/errorHandler";
import { logger } from "@/utils/logger";
import mongoose from "mongoose";

// GET - List all product head mappings
export const GET = withAuth(async (request) => {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly =
      searchParams.get("active") === "1" ||
      searchParams.get("status") === "Active";

    const query = { restaurant: request.restaurant };
    if (activeOnly) query.status = "Active";

    const productHeads = await ProductHead.find(query)
      .populate("head")
      .populate("categories.category", "name status")
      .lean();

    const data = activeOnly
      ? productHeads.filter(
          (ph) =>
            ph.head &&
            String(ph.head.status || "Active") !== "Inactive",
        )
      : productHeads;

    return sendSuccess(data, "Product Heads retrieved successfully");
  } catch (error) {
    logger.error("Failed to list product heads", error);
    return sendError(error, "Failed to retrieve product heads", 500);
  }
});

// PUT - Upsert product head mapping (create or update)
export const PUT = withAuth(async (request) => {
  try {
    const data = await request.json();
    const { headId, categories } = data;

    if (!headId) {
      return sendError(new Error("Missing Head ID"), "Head ID is required", 400);
    }

    const updatedProductHead = await ProductHead.findOneAndUpdate(
      { head: headId, restaurant: request.restaurant },
      { 
        $set: { 
          categories,
          updatedBy: request.user.id
        },
        $setOnInsert: {
          createdBy: request.user.id
        }
      },
      { new: true, upsert: true, runValidators: true }
    ).populate('head').populate('categories.category', 'name');

    logger.info(`Product Head mapping saved for head: ${headId}`);
    return sendSuccess(updatedProductHead, "Product Head configuration saved successfully");
  } catch (error) {
    logger.error("Failed to save product head configuration", error);
    return sendError(error, "Failed to save product head configuration", 500);
  }
}, ["ADMIN", "MANAGER"]);

// DELETE - Remove product head mapping
export const DELETE = withAuth(async (request) => {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return sendError(new Error("Missing ID"), "Mapping ID is required", 400);
    }

    const deleted = await ProductHead.findOneAndDelete({ _id: id, restaurant: request.restaurant });
    
    if (!deleted) {
      return sendError(new Error("Not Found"), "Product Head mapping not found", 404);
    }

    logger.info(`Product Head mapping deleted: ${id}`);
    return sendSuccess(null, "Product Head mapping deleted successfully");
  } catch (error) {
    logger.error("Failed to delete product head mapping", error);
    return sendError(error, "Failed to delete product head mapping", 500);
  }
}, ["ADMIN", "MANAGER"]);
