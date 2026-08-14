import { format } from "date-fns";

const fmtDate = (d) => {
  if (!d) return "—";
  try {
    return format(new Date(d), "MMM d, yyyy");
  } catch {
    return "—";
  }
};

const fmtMoney = (n) => `$${(Number(n) || 0).toFixed(2)}`;

/**
 * Gift card issued email — details only.
 * Full certificate is sent as an attached/inline PNG (cid:giftcard), not HTML.
 */
export const giftCardIssuedTemplate = ({
  recipientName,
  cardName,
  code,
  value,
  issueDate,
  validFrom,
  validUntil,
  companyInfo,
  restaurantName = "Tasty Bites",
  giftCardImageCid = "cid:giftcard",
}) => {
  const brandName = companyInfo?.companyName || restaurantName;
  const logoUrl = companyInfo?.mainLogo?.url || null;
  const forName = recipientName || "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your Gift Card</title>
</head>
<body style="margin:0;padding:0;background:#FAF8F4;font-family:Helvetica,Arial,sans-serif;color:#18181B;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#FAF8F4;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#ffffff;border:1px solid #E7E5E4;border-radius:16px;overflow:hidden;">
          <tr>
            <td style="padding:28px 24px;text-align:center;background:#FFF8F2;border-bottom:1px solid #FED7AA;">
              ${logoUrl ? `<img src="${logoUrl}" alt="${brandName}" style="max-height:48px;margin-bottom:12px;border:0;" />` : ""}
              <p style="margin:0;font-size:13px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:#F97316;">Gift Card Issued</p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 24px;">
              <h1 style="margin:0 0 10px;font-size:22px;font-weight:800;color:#111;text-align:center;">Your gift card is ready!</h1>
              <p style="margin:0 0 22px;font-size:14px;line-height:22px;color:#444;text-align:center;">
                Hi ${forName || "there"}, your gift card at <strong>${brandName}</strong> has been created.
                Your certificate image is below (and attached). Present the code when you visit us.
              </p>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:24px;border:1px solid #E7E5E4;border-radius:12px;overflow:hidden;">
                <tr><td colspan="2" style="padding:10px 14px;background:#F9FAFB;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#71717A;">Gift Card Details</td></tr>
                <tr><td style="padding:10px 14px;border-top:1px solid #F4F4F5;font-size:13px;color:#71717A;width:36%;">Recipient</td><td style="padding:10px 14px;border-top:1px solid #F4F4F5;font-size:13px;font-weight:700;color:#111;">${forName || "—"}</td></tr>
                <tr><td style="padding:10px 14px;border-top:1px solid #F4F4F5;font-size:13px;color:#71717A;">Card Name</td><td style="padding:10px 14px;border-top:1px solid #F4F4F5;font-size:13px;font-weight:700;color:#111;">${cardName || "Gift Card"}</td></tr>
                <tr><td style="padding:10px 14px;border-top:1px solid #F4F4F5;font-size:13px;color:#71717A;">Code</td><td style="padding:10px 14px;border-top:1px solid #F4F4F5;font-size:14px;font-weight:800;color:#111;letter-spacing:0.04em;">${code}</td></tr>
                <tr><td style="padding:10px 14px;border-top:1px solid #F4F4F5;font-size:13px;color:#71717A;">Amount</td><td style="padding:10px 14px;border-top:1px solid #F4F4F5;font-size:14px;font-weight:800;color:#111;">${fmtMoney(value)}</td></tr>
                <tr><td style="padding:10px 14px;border-top:1px solid #F4F4F5;font-size:13px;color:#71717A;">Issue Date</td><td style="padding:10px 14px;border-top:1px solid #F4F4F5;font-size:13px;font-weight:600;color:#111;">${fmtDate(issueDate)}</td></tr>
                <tr><td style="padding:10px 14px;border-top:1px solid #F4F4F5;font-size:13px;color:#71717A;">Valid From</td><td style="padding:10px 14px;border-top:1px solid #F4F4F5;font-size:13px;font-weight:600;color:#111;">${fmtDate(validFrom)}</td></tr>
                <tr><td style="padding:10px 14px;border-top:1px solid #F4F4F5;font-size:13px;color:#71717A;">Valid Until</td><td style="padding:10px 14px;border-top:1px solid #F4F4F5;font-size:13px;font-weight:600;color:#111;">${fmtDate(validUntil)}</td></tr>
              </table>

              ${
                giftCardImageCid
                  ? `<p style="margin:12px 0 0;font-size:12px;color:#71717A;text-align:center;">
                Your gift card image is also attached to this email.
              </p>`
                  : ""
              }
            </td>
          </tr>
          <tr>
            <td style="padding:18px 24px;background:#FAFAF9;border-top:1px solid #E7E5E4;text-align:center;font-size:12px;color:#71717A;">
              &copy; ${new Date().getFullYear()} ${brandName}. All rights reserved.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};
