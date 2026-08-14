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

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/**
 * Gift card used email — remaining balance + order snapshot.
 */
export const giftCardUsedTemplate = ({
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
  companyInfo,
  restaurantName = "Tasty Bites",
}) => {
  const brandName = companyInfo?.companyName || restaurantName;
  const logoUrl = companyInfo?.mainLogo?.url || null;
  const forName = recipientName || "";

  const itemRows = (items || [])
    .map((item) => {
      const qty = Number(item.qty) || 1;
      const price = Number(item.price) || 0;
      const line = qty * price;
      return `<tr>
        <td style="padding:10px 14px;border-top:1px solid #F4F4F5;font-size:13px;color:#111;">${escapeHtml(item.name || "Item")}${qty > 1 ? ` × ${qty}` : ""}</td>
        <td style="padding:10px 14px;border-top:1px solid #F4F4F5;font-size:13px;font-weight:700;color:#111;text-align:right;">${fmtMoney(line)}</td>
      </tr>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Gift Card Used</title>
</head>
<body style="margin:0;padding:0;background:#FAF8F4;font-family:Helvetica,Arial,sans-serif;color:#18181B;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#FAF8F4;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#ffffff;border:1px solid #E7E5E4;border-radius:16px;overflow:hidden;">
          <tr>
            <td style="padding:28px 24px;text-align:center;background:#FFF8F2;border-bottom:1px solid #FED7AA;">
              ${logoUrl ? `<img src="${logoUrl}" alt="${escapeHtml(brandName)}" style="max-height:48px;margin-bottom:12px;border:0;" />` : ""}
              <p style="margin:0;font-size:13px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:#F97316;">Gift Card Used</p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 24px;">
              <h1 style="margin:0 0 10px;font-size:22px;font-weight:800;color:#111;text-align:center;">Thank you for using your gift card</h1>
              <p style="margin:0 0 22px;font-size:14px;line-height:22px;color:#444;text-align:center;">
                Hi ${escapeHtml(forName || "there")}, your gift card was used at <strong>${escapeHtml(brandName)}</strong>.
                Here is your remaining balance and this visit's order details.
              </p>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:24px;border:1px solid #E7E5E4;border-radius:12px;overflow:hidden;">
                <tr><td colspan="2" style="padding:10px 14px;background:#F9FAFB;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#71717A;">Gift Card</td></tr>
                <tr><td style="padding:10px 14px;border-top:1px solid #F4F4F5;font-size:13px;color:#71717A;width:36%;">Recipient</td><td style="padding:10px 14px;border-top:1px solid #F4F4F5;font-size:13px;font-weight:700;color:#111;">${escapeHtml(forName || "—")}</td></tr>
                <tr><td style="padding:10px 14px;border-top:1px solid #F4F4F5;font-size:13px;color:#71717A;">Card Name</td><td style="padding:10px 14px;border-top:1px solid #F4F4F5;font-size:13px;font-weight:700;color:#111;">${escapeHtml(cardName || "Gift Card")}</td></tr>
                <tr><td style="padding:10px 14px;border-top:1px solid #F4F4F5;font-size:13px;color:#71717A;">Code</td><td style="padding:10px 14px;border-top:1px solid #F4F4F5;font-size:14px;font-weight:800;color:#111;letter-spacing:0.04em;">${escapeHtml(code)}</td></tr>
                <tr><td style="padding:10px 14px;border-top:1px solid #F4F4F5;font-size:13px;color:#71717A;">Original Value</td><td style="padding:10px 14px;border-top:1px solid #F4F4F5;font-size:13px;font-weight:700;color:#111;">${fmtMoney(originalValue)}</td></tr>
                <tr><td style="padding:10px 14px;border-top:1px solid #F4F4F5;font-size:13px;color:#71717A;">Amount Used</td><td style="padding:10px 14px;border-top:1px solid #F4F4F5;font-size:14px;font-weight:800;color:#111;">${fmtMoney(amountUsed)}</td></tr>
                <tr><td style="padding:10px 14px;border-top:1px solid #F4F4F5;font-size:13px;color:#71717A;">Remaining Balance</td><td style="padding:10px 14px;border-top:1px solid #F4F4F5;font-size:16px;font-weight:800;color:#111;">${fmtMoney(remainingBalance)}</td></tr>
              </table>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #E7E5E4;border-radius:12px;overflow:hidden;">
                <tr><td colspan="2" style="padding:10px 14px;background:#F9FAFB;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#71717A;">Order Details</td></tr>
                <tr><td style="padding:10px 14px;border-top:1px solid #F4F4F5;font-size:13px;color:#71717A;width:36%;">Order #</td><td style="padding:10px 14px;border-top:1px solid #F4F4F5;font-size:13px;font-weight:700;color:#111;">${escapeHtml(orderNumber || "—")}</td></tr>
                <tr><td style="padding:10px 14px;border-top:1px solid #F4F4F5;font-size:13px;color:#71717A;">Party</td><td style="padding:10px 14px;border-top:1px solid #F4F4F5;font-size:13px;font-weight:700;color:#111;">${escapeHtml(partyName || "—")}</td></tr>
                <tr><td style="padding:10px 14px;border-top:1px solid #F4F4F5;font-size:13px;color:#71717A;">Date</td><td style="padding:10px 14px;border-top:1px solid #F4F4F5;font-size:13px;font-weight:600;color:#111;">${fmtDate(new Date())}</td></tr>
                ${itemRows}
                <tr>
                  <td style="padding:10px 14px;border-top:1px solid #E7E5E4;font-size:13px;font-weight:800;color:#111;">Order Total</td>
                  <td style="padding:10px 14px;border-top:1px solid #E7E5E4;font-size:14px;font-weight:800;color:#111;text-align:right;">${fmtMoney(totalAmount)}</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 24px;background:#FAFAF9;border-top:1px solid #E7E5E4;text-align:center;font-size:12px;color:#71717A;">
              &copy; ${new Date().getFullYear()} ${escapeHtml(brandName)}. All rights reserved.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};
