import mongoose from "mongoose";
import Giftcard from "@/models/menu/Giftcard";
import Order from "@/models/Order";
import { sendGiftCardUsedEmail } from "@/lib/brevo/sendGiftCardUsedEmail";
import { logger } from "@/utils/logger";

const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const toCents = (n) => Math.round(r2(n) * 100);

/**
 * Atomically debit a gift card for a restaurant-scoped order.
 * Returns { ok, giftcard?, error?, status?, amount? }.
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
  const amountCents = toCents(amount);
  if (!code || !Number.isFinite(amount) || amountCents <= 0) {
    return { ok: false, status: 400, error: "Giftcard code and positive amount are required" };
  }

  const normalizedCode = String(code).trim().toUpperCase();
  const now = new Date();
  const restaurantObjectId = mongoose.Types.ObjectId.isValid(String(restaurantId))
    ? new mongoose.Types.ObjectId(String(restaurantId))
    : restaurantId;

  let orderDoc = null;
  if (orderId) {
    orderDoc = await Order.findOne({
      _id: orderId,
      restaurantId: restaurantObjectId,
    })
      .select("orderNumber partyName guestName totalAmount items")
      .lean();
  }

  const existing = await Giftcard.findOne({
    restaurant: restaurantObjectId,
    code: normalizedCode,
  });

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

  // Normalize legacy / non-numeric balances before comparing in cents
  const rawBal =
    existing.balance != null && existing.balance !== ""
      ? Number(existing.balance)
      : Number(existing.value);
  const balanceDollars = r2(Number.isFinite(rawBal) ? rawBal : 0);
  const balanceCents = toCents(balanceDollars);

  if (balanceCents < amountCents) {
    return {
      ok: false,
      status: 400,
      error: `Insufficient balance. Available: $${balanceDollars.toFixed(2)}`,
    };
  }

  if (existing.balance == null || existing.balance !== balanceDollars) {
    existing.balance = balanceDollars;
    await existing.save();
  }

  const orderNumber =
    orderDoc?.orderNumber != null && String(orderDoc.orderNumber).trim()
      ? String(orderDoc.orderNumber).trim()
      : null;

  const balanceAfter = r2((balanceCents - amountCents) / 100);

  const giftcard = await Giftcard.findOneAndUpdate(
    {
      _id: existing._id,
      restaurant: restaurantObjectId,
      isIssued: true,
      status: "Active",
      balance: { $gte: amount - 0.0001 },
    },
    {
      $inc: { balance: -amount },
      $push: {
        history: {
          usedAt: now,
          amountUsed: amount,
          balanceAfter,
          orderId: orderId ? String(orderId) : null,
          orderNumber,
          note: note || null,
        },
      },
    },
    { returnDocument: "after" },
  );

  if (!giftcard) {
    const again = await Giftcard.findById(existing._id).lean();
    const bal =
      again?.balance != null ? Number(again.balance) : Number(again?.value || 0);
    return {
      ok: false,
      status: 400,
      error: `Insufficient balance. Available: $${r2(bal).toFixed(2)}`,
    };
  }

  // Keep stored balance on a clean 2-decimal cent boundary
  if (toCents(giftcard.balance) !== toCents(balanceAfter)) {
    giftcard.balance = balanceAfter;
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
