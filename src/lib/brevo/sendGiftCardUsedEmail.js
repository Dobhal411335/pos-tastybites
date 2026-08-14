import { sendEmail } from "./sendEmail";
import { giftCardUsedTemplate } from "./templates/giftCardUsedTemplate";
import CompanyBasicInfo from "@/models/Web/CompanyBasicInfo";

/**
 * Sends a thank-you email after a gift card is used, with remaining balance and order details.
 */
export const sendGiftCardUsedEmail = async ({
  email,
  recipientName,
  cardName,
  code,
  originalValue,
  amountUsed,
  remainingBalance,
  orderNumber,
  partyName,
  totalAmount,
  items = [],
  restaurantName,
}) => {
  if (!email?.trim()) {
    throw new Error("Missing recipient email address");
  }

  let companyInfo = null;
  try {
    companyInfo = await CompanyBasicInfo.findOne().lean();
  } catch (err) {
    console.warn("Failed to fetch CompanyBasicInfo for gift card used email", err);
  }

  const remaining = Number(remainingBalance) || 0;
  const htmlContent = giftCardUsedTemplate({
    recipientName,
    cardName,
    code,
    originalValue,
    amountUsed,
    remainingBalance: remaining,
    orderNumber,
    partyName,
    totalAmount,
    items,
    companyInfo,
    restaurantName,
  });

  return await sendEmail({
    to: email.trim(),
    subject: `Gift card used — $${remaining.toFixed(2)} remaining`,
    htmlContent,
  });
};
