import { withAuth } from "@/utils/auth";
import Giftcard from "@/models/menu/Giftcard";
import { sendSuccess } from "@/utils/apiResponse";
import { sendError } from "@/utils/errorHandler";
import { logger } from "@/utils/logger";

// POST - Redeem/Use a giftcard
export const POST = withAuth(async (request) => {
  try {
    const data = await request.json();
    const { code, amountToUse, orderId, note } = data;

    if (!code || !amountToUse) {
      return sendError(new Error("Missing fields"), "Giftcard code and amount to use are required", 400);
    }

    const amount = Number(amountToUse);
    if (isNaN(amount) || amount <= 0) {
      return sendError(new Error("Invalid Amount"), "Amount to use must be greater than zero", 400);
    }

    const giftcard = await Giftcard.findOne({
      restaurant: request.restaurant,
      code: code
    });

    if (!giftcard) {
      return sendError(new Error("Not Found"), "Gift card with this code was not found", 404);
    }

    if (!giftcard.isIssued) {
      return sendError(new Error("Not Issued"), "This gift card has not been issued to a user yet", 400);
    }

    if (giftcard.status !== "Active") {
      return sendError(new Error("Inactive"), "This gift card is not active", 400);
    }

    const now = new Date();
    if (giftcard.validFrom && now < giftcard.validFrom) {
      return sendError(new Error("Not Yet Valid"), "This gift card is not valid yet", 400);
    }
    if (giftcard.validUntil && now > giftcard.validUntil) {
      return sendError(new Error("Expired"), "This gift card has expired", 400);
    }

    // Initialize balance if needed
    if (giftcard.balance == null) {
      giftcard.balance = giftcard.value;
    }

    if (giftcard.balance < amount) {
      return sendError(new Error("Insufficient Balance"), `Insufficient balance. Available: $${giftcard.balance.toFixed(2)}`, 400);
    }

    // Deduct balance
    giftcard.balance -= amount;

    // Add to history
    giftcard.history.push({
      usedAt: now,
      amountUsed: amount,
      balanceAfter: giftcard.balance,
      orderId: orderId || null,
      note: note || null
    });

    await giftcard.save();

    logger.info(`Redeemed $${amount} from giftcard ${code}`);
    return sendSuccess({
      balance: giftcard.balance,
      history: giftcard.history
    }, `Successfully redeemed $${amount}`);
  } catch (error) {
    logger.error("Failed to redeem giftcard", error);
    return sendError(error, "Failed to redeem gift card", 500);
  }
}, ["ADMIN", "MANAGER", "STAFF"]);
