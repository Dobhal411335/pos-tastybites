import Giftcard from "@/models/menu/Giftcard";
import Order from "@/models/Order";
import { sendGiftCardUsedEmail } from "@/lib/brevo/sendGiftCardUsedEmail";
import { logger } from "@/utils/logger";

const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

/**
 * Atomically debit a gift card for a restaurant-scoped order.
 * Returns { ok, giftcard?, error?, status? }.
 */
export async function redeemGiftCardAtomic({
  restaurantId,
  code,
  amountToUse,
  orderId = null,
  note = null,
  sendEmail = true,
}) {
  const amount = r2(amountToUse);
  if (!code || !Number.isFinite(amount) || amount <= 0) {
    return { ok: false, status: 400, error: "Giftcard code and positive amount are required" };
  }

  const normalizedCode = String(code).trim().toUpperCase();
  const now = new Date();

  let orderDoc = null;
  if (orderId) {
    orderDoc = await Order.findOne({
      _id: orderId,
      restaurantId,
    })
      .select("orderNumber partyName guestName totalAmount items")
      .lean();
  }

  await Giftcard.updateOne(
    {
      restaurant: restaurantId,
      code: normalizedCode,
      $or: [{ balance: null }, { balance: { $exists: false } }],
    },
    [{ $set: { balance: "$value" } }],
  );

  const giftcard = await Giftcard.findOneAndUpdate(
    {
      restaurant: restaurantId,
      code: normalizedCode,
      isIssued: true,
      status: "Active",
      balance: { $gte: amount },
      $and: [
        { $or: [{ validFrom: null }, { validFrom: { $exists: false } }, { validFrom: { $lte: now } }] },
        { $or: [{ validUntil: null }, { validUntil: { $exists: false } }, { validUntil: { $gte: now } }] },
      ],
    },
    {
      $inc: { balance: -amount },
      $push: {
        history: {
          usedAt: now,
          amountUsed: amount,
          balanceAfter: 0,
          orderId: orderId || null,
          note: note || null,
        },
      },
    },
    { new: true },
  );

  if (!giftcard) {
    const existing = await Giftcard.findOne({
      restaurant: restaurantId,
      code: normalizedCode,
    }).lean();

    if (!existing) {
      return { ok: false, status: 404, error: "Gift card with this code was not found" };
    }
    if (!existing.isIssued) {
      return { ok: false, status: 400, error: "This gift card has not been issued to a user yet" };
    }
    if (existing.status !== "Active") {
      return { ok: false, status: 400, error: "This gift card is not active" };
    }
    if (existing.validFrom && now < new Date(existing.validFrom)) {
      return { ok: false, status: 400, error: "This gift card is not valid yet" };
    }
    if (existing.validUntil && now > new Date(existing.validUntil)) {
      return { ok: false, status: 400, error: "This gift card has expired" };
    }
    const bal = existing.balance != null ? existing.balance : existing.value;
    return {
      ok: false,
      status: 400,
      error: `Insufficient balance. Available: $${Number(bal || 0).toFixed(2)}`,
    };
  }

  if (Array.isArray(giftcard.history) && giftcard.history.length > 0) {
    giftcard.history[giftcard.history.length - 1].balanceAfter = giftcard.balance;
    await giftcard.save();
  }

  if (sendEmail && giftcard.recipientEmail?.trim()) {
    try {
      const items = Array.isArray(orderDoc?.items)
        ? orderDoc.items.map((item) => ({
            name: item.name,
            qty: item.qty,
            price: item.price,
            size: item.size,
          }))
        : [];

      await sendGiftCardUsedEmail({
        email: giftcard.recipientEmail.trim(),
        recipientName: giftcard.recipientName,
        cardName: giftcard.name,
        code: giftcard.code,
        originalValue: giftcard.value,
        amountUsed: amount,
        remainingBalance: giftcard.balance,
        orderNumber: orderDoc?.orderNumber || "",
        partyName: orderDoc?.partyName || orderDoc?.guestName || "",
        totalAmount: Number(orderDoc?.totalAmount) || 0,
        items,
      });
    } catch (emailErr) {
      logger.error(`Gift card redeemed but email failed for ${giftcard.code}`, emailErr);
    }
  }

  return { ok: true, giftcard, amount };
}
