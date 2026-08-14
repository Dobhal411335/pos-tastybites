import { withAuth } from "@/utils/auth";
import { sendSuccess } from "@/utils/apiResponse";
import { sendError } from "@/utils/errorHandler";
import { logger } from "@/utils/logger";
import { redeemGiftCardAtomic } from "@/lib/giftcards/redeemGiftCardAtomic";
import {
  checkRateLimit,
  clientIpFromRequest,
  rateLimitResponse,
} from "@/lib/rateLimit";

// POST - Redeem/Use a giftcard (atomic). Prefer payment-integrated redeem for POS.
export const POST = withAuth(async (request) => {
  try {
    const ip = clientIpFromRequest(request);
    const limited = checkRateLimit({
      key: `giftcard-redeem:${request.restaurant}:${ip}`,
      limit: 30,
      windowMs: 60_000,
    });
    if (!limited.ok) {
      return rateLimitResponse(limited.retryAfterSec, "Too many gift card redeem attempts");
    }

    const data = await request.json();
    const { code, amountToUse, orderId, note } = data;

    const result = await redeemGiftCardAtomic({
      restaurantId: request.restaurant,
      code,
      amountToUse,
      orderId: orderId || null,
      note: note || null,
      sendEmail: true,
    });

    if (!result.ok) {
      return sendError(new Error("Redeem Failed"), result.error, result.status || 400);
    }

    logger.info(`Redeemed $${result.amount} from giftcard ${code}`);
    return sendSuccess(
      {
        balance: result.giftcard.balance,
        history: result.giftcard.history,
      },
      `Successfully redeemed $${result.amount}`,
    );
  } catch (error) {
    logger.error("Failed to redeem giftcard", error);
    return sendError(error, "Failed to redeem gift card", 500);
  }
}, ["ADMIN", "MANAGER", "STAFF", "EMPLOYEE", "SERVER", "BARTENDER"]);
