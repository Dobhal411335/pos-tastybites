import { withAuth } from "@/utils/auth";
import Offer from "@/models/menu/Offer";
import { sendSuccess } from "@/utils/apiResponse";
import { sendError } from "@/utils/errorHandler";
import { logger } from "@/utils/logger";
import { deleteImage } from "@/lib/cloudinary/deleteImage";
import Tax from "@/models/tax/Tax";

// PUT - Update an offer or toggle status
export const PUT = withAuth(async (request, { params }) => {
  try {
    const { id } = await params;
    
    if (!id) {
      return sendError(new Error("Missing ID"), "Offer ID is required", 400);
    }

    const updateData = await request.json();
    
    // Set updatedBy
    updateData.updatedBy = request.user.id;

    // Handle date strings if present
    if (updateData.validFrom) updateData.validFrom = new Date(updateData.validFrom);
    if (updateData.validTo) updateData.validTo = new Date(updateData.validTo);

    const activeTaxes = await Tax.find({ restaurant: request.restaurant, status: "Active" });
    const taxIds = activeTaxes.map(t => t._id);
    let totalPercentage = 0;
    let totalFixed = 0;
    const taxNames = [];
    const taxDetails = [];
    
    activeTaxes.forEach(t => {
      taxNames.push(t.name);
      taxDetails.push({ name: t.name, value: t.value, type: t.type });
      if (t.type === "percent" || t.type === "Percent") totalPercentage += t.value;
      else totalFixed += t.value;
    });

    updateData.taxes = taxIds;
    updateData.taxData = { totalPercentage, totalFixed, taxNames, taxDetails };

    const updatedOffer = await Offer.findOneAndUpdate(
      { _id: id, restaurant: request.restaurant },
      { $set: updateData },
      { returnDocument: 'after', runValidators: true }
    );

    if (!updatedOffer) {
      return sendError(new Error("Not Found"), "Offer not found", 404);
    }

    logger.info(`Offer updated: ${id}`);
    return sendSuccess(updatedOffer, "Offer updated successfully");
  } catch (error) {
    logger.error(`Failed to update offer ${params?.id}`, error);
    return sendError(error, "Failed to update offer", 500);
  }
}, ["ADMIN", "MANAGER"]);

// DELETE - Remove an offer
export const DELETE = withAuth(async (request, { params }) => {
  try {
    const { id } = await params;

    if (!id) {
      return sendError(new Error("Missing ID"), "Offer ID is required", 400);
    }

    const offer = await Offer.findOne({ _id: id, restaurant: request.restaurant });
    if (!offer) {
      return sendError(new Error("Not Found"), "Offer not found", 404);
    }

    // Clean up Cloudinary image
    if (offer.image?.key) {
      try { await deleteImage(offer.image.key); } catch (e) { logger.error("Cloudinary delete error", e); }
    }

    await Offer.findOneAndDelete({ _id: id, restaurant: request.restaurant });

    logger.info(`Offer deleted: ${id}`);
    return sendSuccess(null, "Offer deleted successfully");
  } catch (error) {
    logger.error(`Failed to delete offer ${params?.id}`, error);
    return sendError(error, "Failed to delete offer", 500);
  }
}, ["ADMIN", "MANAGER"]);
