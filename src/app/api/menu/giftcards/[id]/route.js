import { withAuth } from "@/utils/auth";
import Giftcard from "@/models/menu/Giftcard";
import { sendSuccess } from "@/utils/apiResponse";
import { sendError } from "@/utils/errorHandler";
import { logger } from "@/utils/logger";

// GET - Retrieve all giftcards in a batch
export const GET = withAuth(async (request, { params }) => {
  try {
    const { id } = await params;
    if (!id) return sendError(new Error("Missing ID"), "Batch ID is required", 400);

    const giftcards = await Giftcard.find({ batchId: id, restaurant: request.restaurant }).sort({ createdAt: 1 }).lean();
    
    if (!giftcards || giftcards.length === 0) {
      return sendError(new Error("Not Found"), "Giftcards not found for this batch", 404);
    }

    return sendSuccess(giftcards, "Giftcards retrieved successfully");
  } catch (error) {
    logger.error(`Failed to get giftcards for batch ${params?.id}`, error);
    return sendError(error, "Failed to retrieve giftcards", 500);
  }
}, ["ADMIN", "MANAGER"]);

// PUT - Update a giftcard (e.g. status)
export const PUT = withAuth(async (request, { params }) => {
  try {
    const { id } = await params;
    if (!id) return sendError(new Error("Missing ID"), "Giftcard ID is required", 400);

    const data = await request.json();
    const updateData = { updatedBy: request.user.id };

    if (data.status !== undefined) updateData.status = data.status;
    if (data.name !== undefined) updateData.name = data.name;
    if (data.validFrom !== undefined) updateData.validFrom = data.validFrom;
    if (data.validUntil !== undefined) updateData.validUntil = data.validUntil;
    if (data.value !== undefined) updateData.value = data.value;
    if (data.discountType !== undefined) updateData.discountType = data.discountType;

    const updatedGiftcard = await Giftcard.updateMany(
      { batchId: id, restaurant: request.restaurant },
      { $set: updateData }
    );

    if (updatedGiftcard.matchedCount === 0) {
      return sendError(new Error("Not Found"), "Giftcard batch not found", 404);
    }

    logger.info(`Giftcard batch updated: ${id}`);
    return sendSuccess(null, "Giftcard batch updated successfully");
  } catch (error) {
    logger.error(`Failed to update giftcard ${params?.id}`, error);
    return sendError(error, "Failed to update giftcard", 500);
  }
}, ["ADMIN", "MANAGER"]);

// DELETE - Remove giftcard
export const DELETE = withAuth(async (request, { params }) => {
  try {
    const { id } = await params;
    if (!id) return sendError(new Error("Missing ID"), "Giftcard ID is required", 400);

    const deleted = await Giftcard.deleteMany({ batchId: id, restaurant: request.restaurant });
    
    if (deleted.deletedCount === 0) {
      return sendError(new Error("Not Found"), "Giftcard batch not found", 404);
    }

    logger.info(`Giftcard batch deleted: ${id}`);
    return sendSuccess(null, "Giftcard batch deleted successfully");
  } catch (error) {
    logger.error(`Failed to delete giftcard ${params?.id}`, error);
    return sendError(error, "Failed to delete giftcard", 500);
  }
}, ["ADMIN", "MANAGER"]);
