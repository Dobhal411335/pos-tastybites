import { withAuth } from "@/utils/auth";
import Giftcard from "@/models/menu/Giftcard";
import { sendSuccess } from "@/utils/apiResponse";
import { sendError } from "@/utils/errorHandler";
import { logger } from "@/utils/logger";

// POST - Apply a giftcard
export const POST = withAuth(async (request) => {
  try {
    const { code } = await request.json();

    if (!code) {
      return sendError(new Error("Code missing"), "Please provide a giftcard code", 400);
    }

    const giftcard = await Giftcard.findOne({
      restaurant: request.restaurant,
      $or: [
        { code: code.trim().toUpperCase() },
        { code: code.trim() },
        { name: code.trim() }
      ]
    });

    if (!giftcard) {
      return sendError(new Error("Invalid code"), "Giftcard not found", 404);
    }

    if (!giftcard.isIssued) {
      return sendError(new Error("Not Issued"), "This gift card has not been issued to a user yet", 400);
    }

    if (giftcard.status !== "Active") {
      return sendError(new Error("Inactive code"), "This giftcard is no longer active", 400);
    }

    const now = new Date();
    if (giftcard.validFrom && new Date(giftcard.validFrom) > now) {
      return sendError(new Error("Not yet valid"), "This giftcard is not valid yet", 400);
    }
    if (giftcard.validUntil && new Date(giftcard.validUntil) < now) {
      return sendError(new Error("Expired code"), "This giftcard has expired", 400);
    }

    // Default balance to value if balance is not set (e.g., old giftcards before migration)
    const currentBalance = giftcard.balance !== undefined ? giftcard.balance : giftcard.value;

    if (currentBalance <= 0) {
      return sendError(new Error("Empty balance"), "This giftcard has no remaining balance", 400);
    }

    const responseData = {
      _id: giftcard._id,
      code: giftcard.code,
      name: giftcard.name,
      discountType: giftcard.discountType,
      value: giftcard.value,
      balance: currentBalance,
    };

    return sendSuccess(responseData, "Giftcard applied successfully");
  } catch (error) {
    logger.error("Failed to apply giftcard", error);
    return sendError(error, "Failed to apply giftcard", 500);
  }
}, ["ADMIN", "MANAGER", "SUPER_ADMIN"]);
