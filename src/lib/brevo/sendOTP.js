import { sendTemplateEmail } from "./sendTemplateEmail";
import { orderPickupOtpTemplate } from "./templates/orderPickupOtpTemplate";

/**
 * Send a 4-digit pickup-order OTP to the guest email using an inline HTML template
 * (does not depend on a Brevo dashboard template ID).
 */
export const sendOTP = async (
  to,
  otpCode,
  { guestName, restaurantName, expiresInMinutes = 10 } = {}
) => {
  const brand = restaurantName || process.env.BREVO_SENDER_NAME || "Tasty Bites";
  const htmlContent = orderPickupOtpTemplate({
    otpCode,
    guestName,
    restaurantName: brand,
    expiresInMinutes,
  });

  return await sendTemplateEmail({
    to,
    subject: `${otpCode} is your ${brand} pickup verification code`,
    htmlContent,
    params: {
      otp: otpCode,
      guestName: guestName || "",
      restaurantName: brand,
    },
  });
};
