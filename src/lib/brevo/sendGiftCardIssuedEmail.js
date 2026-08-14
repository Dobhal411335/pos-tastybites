import { sendEmail } from "./sendEmail";
import { giftCardIssuedTemplate } from "./templates/giftCardIssuedTemplate";
import { renderGiftCardPngBase64 } from "./renderGiftCardImage";
import CompanyBasicInfo from "@/models/Web/CompanyBasicInfo";

const GIFTCARD_CONTENT_ID = "giftcard";

/**
 * Sends gift card details + full certificate as a PNG image attachment.
 * Flower is baked into the gift card image — not sent separately.
 */
export const sendGiftCardIssuedEmail = async ({
  email,
  recipientName,
  cardName,
  code,
  value,
  issueDate,
  validFrom,
  validUntil,
  restaurantName,
}) => {
  if (!email?.trim()) {
    throw new Error("Missing recipient email address");
  }

  let companyInfo = null;
  try {
    companyInfo = await CompanyBasicInfo.findOne().lean();
  } catch (err) {
    console.warn("Failed to fetch CompanyBasicInfo for gift card email", err);
  }

  let giftCardPngBase64 = null;
  try {
    giftCardPngBase64 = await renderGiftCardPngBase64({
      code,
      value,
      recipientName,
      issueDate,
      companyInfo,
    });
  } catch (err) {
    console.error("Failed to render gift card image for email", err);
  }

  const safeCode = String(code || "giftcard").replace(/[^a-zA-Z0-9-_]/g, "");
  const attachment = giftCardPngBase64
    ? [
        {
          name: `gift-card-${safeCode}.png`,
          content: giftCardPngBase64,
          contentId: GIFTCARD_CONTENT_ID,
        },
      ]
    : undefined;

  const htmlContent = giftCardIssuedTemplate({
    recipientName,
    cardName,
    code,
    value,
    issueDate,
    validFrom,
    validUntil,
    companyInfo,
    restaurantName,
    giftCardImageCid: giftCardPngBase64 ? `cid:${GIFTCARD_CONTENT_ID}` : "",
  });

  return await sendEmail({
    to: email.trim(),
    subject: "Your Gift Card Has Been Created",
    htmlContent,
    ...(attachment ? { attachment } : {}),
  });
};
