import { withAuth } from "@/utils/auth";
import Offer from "@/models/menu/Offer";
import { sendSuccess } from "@/utils/apiResponse";
import { sendError } from "@/utils/errorHandler";
import { logger } from "@/utils/logger";
import { deleteImage } from "@/lib/cloudinary/deleteImage";
import Tax from "@/models/tax/Tax";
import { slugifyOfferName } from "@/utils/offerDetails";

async function ensureUniqueOfferSlug(restaurantId, baseSlug, excludeId = null) {
  let slug = slugifyOfferName(baseSlug);
  if (!slug) return "";

  let candidate = slug;
  let n = 2;
  while (true) {
    const query = { restaurant: restaurantId, slug: candidate };
    if (excludeId) query._id = { $ne: excludeId };
    const exists = await Offer.exists(query);
    if (!exists) return candidate;
    candidate = `${slug}-${n}`;
    n += 1;
    if (n > 50) return `${slug}-${Date.now().toString(36)}`;
  }
}

// PUT - Update an offer or toggle status
export const PUT = withAuth(async (request, { params }) => {
  try {
    const { id } = await params;

    if (!id) {
      return sendError(new Error("Missing ID"), "Offer ID is required", 400);
    }

    const existingOffer = await Offer.findOne({
      _id: id,
      restaurant: request.restaurant,
    });
    if (!existingOffer) {
      return sendError(new Error("Not Found"), "Offer not found", 404);
    }

    const updateData = await request.json();

    // Set updatedBy
    updateData.updatedBy = request.user.id;

    // Handle date strings if present
    if (updateData.validFrom) updateData.validFrom = new Date(updateData.validFrom);
    if (updateData.validTo) updateData.validTo = new Date(updateData.validTo);

    // Resolve slug when provided, or backfill from name if missing
    if (
      Object.prototype.hasOwnProperty.call(updateData, "slug") ||
      updateData.name ||
      !existingOffer.slug
    ) {
      const slugSource =
        updateData.slug ||
        existingOffer.slug ||
        updateData.name ||
        existingOffer.name;
      updateData.slug = await ensureUniqueOfferSlug(
        request.restaurant,
        slugSource,
        id
      );
    }

    const activeTaxes = await Tax.find({
      restaurant: request.restaurant,
      status: "Active",
    });
    const taxIds = activeTaxes.map((t) => t._id);
    let totalPercentage = 0;
    let totalFixed = 0;
    const taxNames = [];
    const taxDetails = [];

    activeTaxes.forEach((t) => {
      taxNames.push(t.name);
      taxDetails.push({ name: t.name, value: t.value, type: t.type });
      if (t.type === "percent" || t.type === "Percent") totalPercentage += t.value;
      else totalFixed += t.value;
    });

    updateData.taxes = taxIds;
    updateData.taxData = { totalPercentage, totalFixed, taxNames, taxDetails };

    const parsedPrice =
      updateData.price !== undefined
        ? Number(updateData.price) || 0
        : existingOffer.price;
    updateData.totalPrice =
      parsedPrice + (parsedPrice * totalPercentage) / 100 + totalFixed;

    const updatedOffer = await Offer.findOneAndUpdate(
      { _id: id, restaurant: request.restaurant },
      { $set: updateData },
      { returnDocument: "after", runValidators: true }
    );

    logger.info(`Offer updated: ${id}`);
    return sendSuccess(updatedOffer, "Offer updated successfully");
  } catch (error) {
    if (error?.code === 11000) {
      return sendError(error, "An offer with this slug already exists", 400);
    }
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
      try {
        await deleteImage(offer.image.key);
      } catch (e) {
        logger.error("Cloudinary delete error", e);
      }
    }

    await Offer.findOneAndDelete({ _id: id, restaurant: request.restaurant });

    logger.info(`Offer deleted: ${id}`);
    return sendSuccess(null, "Offer deleted successfully");
  } catch (error) {
    logger.error(`Failed to delete offer ${params?.id}`, error);
    return sendError(error, "Failed to delete offer", 500);
  }
}, ["ADMIN", "MANAGER"]);
