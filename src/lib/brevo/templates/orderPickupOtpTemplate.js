/**
 * HTML email for online pickup order email verification (OTP).
 */
export function orderPickupOtpTemplate({
  otpCode,
  guestName,
  restaurantName,
  expiresInMinutes = 10,
}) {
  const currentYear = new Date().getFullYear();
  const brand = String(restaurantName || "Tasty Bites").trim() || "Tasty Bites";
  const helloName = String(guestName || "").trim() || "there";
  const code = String(otpCode || "").trim();

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your verification code</title>
</head>
<body style="margin:0;padding:0;background:#fffaf4;font-family:Inter,Helvetica,Arial,sans-serif;color:#111827;">
  <div style="padding:28px 16px;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #f1e4d1;border-radius:20px;overflow:hidden;box-shadow:0 12px 30px rgba(15,23,42,0.08);">
      <div style="padding:36px 32px 28px;text-align:center;background:linear-gradient(180deg,#fff6ec 0%,#ffffff 100%);border-bottom:1px solid #f3dcc0;">
        <p style="margin:0;text-transform:uppercase;letter-spacing:1.8px;font-size:12px;color:#ea580c;font-weight:800;">
          Pickup order verification
        </p>
        <h1 style="margin:12px 0 0;font-size:26px;line-height:1.2;font-weight:900;color:#111827;">
          Confirm your email
        </h1>
      </div>

      <div style="padding:32px;">
        <p style="margin:0 0 18px;font-size:16px;line-height:26px;color:#4b5563;">
          Hi ${helloName},
        </p>
        <p style="margin:0 0 22px;font-size:16px;line-height:26px;color:#4b5563;">
          Use this one-time code to verify your email and place your same-day pickup order at
          <strong style="color:#111827;">${brand}</strong>.
        </p>

        <div style="background:#fff7ed;border:1px dashed #fb923c;border-radius:16px;padding:22px 20px;text-align:center;margin-bottom:22px;">
          <p style="margin:0 0 10px;color:#c2410c;text-transform:uppercase;letter-spacing:1.4px;font-size:12px;font-weight:800;">
            Your verification code
          </p>
          <div style="display:inline-block;background:#ffffff;border-radius:12px;padding:14px 22px;font-size:32px;letter-spacing:8px;font-weight:900;color:#9a3412;border:1px solid #fdba74;font-family:'Courier New',Courier,monospace;">
            ${code}
          </div>
          <p style="margin:14px 0 0;font-size:13px;color:#9a3412;">
            Expires in ${expiresInMinutes} minutes
          </p>
        </div>

        <div style="background:#fafafa;border-left:4px solid #f97316;padding:16px 18px;border-radius:12px;color:#4b5563;font-size:14px;line-height:22px;">
          If you didn&apos;t request this code, you can ignore this email. Never share this code with anyone.
        </div>
      </div>

      <div style="padding:22px 32px 30px;background:#fafafa;text-align:center;border-top:1px solid #e5e7eb;">
        <p style="margin:0 0 8px;font-weight:800;color:#111827;">${brand}</p>
        <p style="margin:0;color:#6b7280;font-size:12px;line-height:20px;">
          Same-day pickup · Pay at the restaurant
        </p>
        <p style="margin:8px 0 0;color:#6b7280;font-size:12px;">
          © ${currentYear} ${brand}. All rights reserved.
        </p>
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();
}
