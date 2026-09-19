/**
 * Status emails for online pickup orders: placed | approved | ready
 */
export function onlineOrderStatusTemplate({
  type,
  guestName,
  restaurantName,
  orderNumber,
  pickupLabel,
  totalAmount,
  trackUrl,
  address,
}) {
  const brand = String(restaurantName || "Tasty Bites").trim() || "Tasty Bites";
  const hello = String(guestName || "").trim() || "there";
  const ticket = String(orderNumber || "").trim();
  const year = new Date().getFullYear();

  const copy = {
    placed: {
      eyebrow: "Order received",
      title: "We've got your order",
      intro: `Thanks ${hello}! Your pickup order <strong>#${ticket}</strong> at <strong>${brand}</strong> is confirmed and waiting for the kitchen to accept it.`,
      cta: "Track your order",
    },
    approved: {
      eyebrow: "Order accepted",
      title: "Kitchen is preparing your order",
      intro: `Good news ${hello} — <strong>${brand}</strong> accepted order <strong>#${ticket}</strong> and the kitchen is preparing it now.`,
      cta: "Track status",
    },
    ready: {
      eyebrow: "Ready for pickup",
      title: "Your order is ready",
      intro: `${hello}, order <strong>#${ticket}</strong> is ready at <strong>${brand}</strong>. Please come pick it up — pay at the restaurant when you arrive.`,
      cta: "View order",
    },
  }[type] || {
    eyebrow: "Order update",
    title: "Order update",
    intro: `Update for order <strong>#${ticket}</strong> at <strong>${brand}</strong>.`,
    cta: "Track order",
  };

  const total =
    totalAmount != null && !Number.isNaN(Number(totalAmount))
      ? `$${Number(totalAmount).toFixed(2)}`
      : null;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${copy.title}</title>
</head>
<body style="margin:0;padding:0;background:#fffaf4;font-family:Inter,Helvetica,Arial,sans-serif;color:#111827;">
  <div style="padding:28px 16px;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #f1e4d1;border-radius:20px;overflow:hidden;box-shadow:0 12px 30px rgba(15,23,42,0.08);">
      <div style="padding:36px 32px 28px;text-align:center;background:linear-gradient(180deg,#fff6ec 0%,#ffffff 100%);border-bottom:1px solid #f3dcc0;">
        <p style="margin:0;text-transform:uppercase;letter-spacing:1.8px;font-size:12px;color:#ea580c;font-weight:800;">
          ${copy.eyebrow}
        </p>
        <h1 style="margin:12px 0 0;font-size:26px;line-height:1.2;font-weight:900;color:#111827;">
          ${copy.title}
        </h1>
      </div>

      <div style="padding:32px;">
        <p style="margin:0 0 22px;font-size:16px;line-height:26px;color:#4b5563;">
          ${copy.intro}
        </p>

        <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:16px;padding:18px 20px;margin-bottom:22px;">
          <p style="margin:0 0 8px;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:1.2px;color:#c2410c;">Order #${ticket}</p>
          ${
            pickupLabel
              ? `<p style="margin:0 0 6px;font-size:14px;color:#4b5563;"><strong style="color:#111827;">Pickup:</strong> ${pickupLabel}</p>`
              : ""
          }
          ${
            total
              ? `<p style="margin:0;font-size:14px;color:#4b5563;"><strong style="color:#111827;">Total due at restaurant:</strong> ${total}</p>`
              : ""
          }
          ${
            address
              ? `<p style="margin:10px 0 0;font-size:13px;color:#6b7280;">${address}</p>`
              : ""
          }
        </div>

        ${
          trackUrl
            ? `<div style="text-align:center;margin:8px 0 20px;">
          <a href="${trackUrl}" style="display:inline-block;background:#f97316;color:#ffffff !important;text-decoration:none;font-weight:800;padding:14px 28px;border-radius:999px;box-shadow:0 10px 20px rgba(249,115,22,0.22);">
            ${copy.cta}
          </a>
        </div>`
            : ""
        }

        <div style="background:#fafafa;border-left:4px solid #f97316;padding:16px 18px;border-radius:12px;color:#4b5563;font-size:14px;line-height:22px;">
          Same-day pickup only. Payment is collected at the restaurant when you collect your order.
        </div>
      </div>

      <div style="padding:22px 32px 30px;background:#fafafa;text-align:center;border-top:1px solid #e5e7eb;">
        <p style="margin:0 0 8px;font-weight:800;color:#111827;">${brand}</p>
        <p style="margin:0;color:#6b7280;font-size:12px;">© ${year} ${brand}. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();
}
