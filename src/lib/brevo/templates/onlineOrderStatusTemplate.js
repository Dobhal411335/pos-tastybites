/**
 * Status emails for online pickup orders: placed | approved | ready | paid
 */

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function money(amount) {
  if (amount == null || Number.isNaN(Number(amount))) return null;
  return `$${Number(amount).toFixed(2)}`;
}

function statusMeta(type, status) {
  const raw = String(status || "").toUpperCase();
  if (type === "placed") {
    return {
      label: raw === "PENDING" || !raw ? "Pending" : raw,
      hint: "Awaiting kitchen acceptance",
      color: "#c2410c",
      bg: "#fff7ed",
      border: "#fed7aa",
    };
  }
  if (type === "approved") {
    return {
      label: raw || "Confirmed",
      hint: "Kitchen is preparing your order",
      color: "#166534",
      bg: "#f0fdf4",
      border: "#bbf7d0",
    };
  }
  if (type === "ready") {
    return {
      label: "Ready for pickup",
      hint: "Come collect your order",
      color: "#1d4ed8",
      bg: "#eff6ff",
      border: "#bfdbfe",
    };
  }
  if (type === "paid") {
    return {
      label: "Paid & completed",
      hint: "Thanks for dining with us",
      color: "#166534",
      bg: "#f0fdf4",
      border: "#bbf7d0",
    };
  }
  return {
    label: raw || "Update",
    hint: "Order update",
    color: "#c2410c",
    bg: "#fff7ed",
    border: "#fed7aa",
  };
}

function renderPaymentDetails({
  paymentMethod,
  tipAmount,
  tipMethod,
  cashAmount,
  cardAmount,
  giftcardUsedAmount,
  giftcardCode,
  totalAmount,
}) {
  const lines = [];
  if (paymentMethod) {
    lines.push(
      `<p style="margin:0 0 6px;font-size:14px;color:#4b5563;"><strong style="color:#111827;">Method:</strong> ${escapeHtml(paymentMethod)}</p>`,
    );
  }
  const cash = money(cashAmount);
  const card = money(cardAmount);
  const gift = money(giftcardUsedAmount);
  const tip = money(tipAmount);
  const total = money(totalAmount);

  if (cash && Number(cashAmount) > 0) {
    lines.push(
      `<p style="margin:0 0 6px;font-size:14px;color:#4b5563;"><strong style="color:#111827;">Cash:</strong> ${cash}</p>`,
    );
  }
  if (card && Number(cardAmount) > 0) {
    lines.push(
      `<p style="margin:0 0 6px;font-size:14px;color:#4b5563;"><strong style="color:#111827;">Card:</strong> ${card}</p>`,
    );
  }
  if (gift && Number(giftcardUsedAmount) > 0) {
    const giftLabel = giftcardCode
      ? `Gift card (${escapeHtml(giftcardCode)})`
      : "Gift card";
    lines.push(
      `<p style="margin:0 0 6px;font-size:14px;color:#4b5563;"><strong style="color:#111827;">${giftLabel}:</strong> ${gift}</p>`,
    );
  }
  if (tip && Number(tipAmount) > 0) {
    lines.push(
      `<p style="margin:0 0 6px;font-size:14px;color:#4b5563;"><strong style="color:#111827;">Tip${tipMethod ? ` (${escapeHtml(tipMethod)})` : ""}:</strong> ${tip}</p>`,
    );
  }
  if (total) {
    lines.push(
      `<p style="margin:8px 0 0;font-size:15px;font-weight:800;color:#111827;">Amount paid: ${total}${Number(tipAmount) > 0 && tip ? ` + tip ${tip}` : ""}</p>`,
    );
  }

  if (!lines.length) return "";

  return `
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:16px;padding:18px 20px;margin:0 0 22px;">
      <p style="margin:0 0 10px;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:1.2px;color:#166534;">
        Payment details
      </p>
      ${lines.join("")}
    </div>`;
}

function meaningfulSize(size) {
  const s = String(size || "").trim();
  if (!s) return null;
  if (s.toLowerCase() === "standard") return null;
  return s;
}

function metaChip(text) {
  const t = String(text || "").trim();
  if (!t) return "";
  return `<span style="display:inline-block;margin:0 6px 6px 0;padding:3px 9px;border-radius:999px;background:#fff7ed;border:1px solid #fed7aa;font-size:11px;font-weight:700;color:#9a3412;line-height:16px;">${escapeHtml(t)}</span>`;
}

function renderDetailRow(label, valueHtml) {
  if (!valueHtml) return "";
  return `
    <tr>
      <td style="padding:3px 10px 3px 0;font-size:11px;font-weight:800;letter-spacing:0.4px;text-transform:uppercase;color:#c2410c;vertical-align:top;white-space:nowrap;width:88px;">
        ${escapeHtml(label)}
      </td>
      <td style="padding:3px 0;font-size:13px;line-height:19px;color:#4b5563;vertical-align:top;">
        ${valueHtml}
      </td>
    </tr>`;
}

function renderSelectionGroups(groups = []) {
  if (!Array.isArray(groups) || !groups.length) return "";
  return groups
    .map((group) => {
      const name = String(group?.name || "").trim();
      const subs = (Array.isArray(group?.subChoices) ? group.subChoices : [])
        .map((s) => String(s || "").trim())
        .filter(Boolean);
      if (!name || !subs.length) return "";
      return `<div style="margin:0 0 4px;"><span style="font-weight:700;color:#111827;">${escapeHtml(name)}</span> — ${subs.map(escapeHtml).join(", ")}</div>`;
    })
    .filter(Boolean)
    .join("");
}

function renderCustomExtras(extras = []) {
  if (!Array.isArray(extras) || !extras.length) return "";
  return extras
    .map((extra) => {
      const name = String(extra?.name || "").trim();
      if (!name) return "";
      const qty = Number(extra?.qty) || 1;
      const unit = Number(extra?.price);
      const line =
        Number.isFinite(unit) && unit >= 0 ? money(unit * qty) : null;
      const qtySuffix = qty > 1 ? ` ×${qty}` : "";
      return `<div style="margin:0 0 4px;">${escapeHtml(name)}${qtySuffix}${line ? ` <span style="color:#9a3412;font-weight:700;">${line}</span>` : ""}</div>`;
    })
    .filter(Boolean)
    .join("");
}

function renderItemDetails(item) {
  const rows = [];
  const size = meaningfulSize(item?.size);
  if (size) rows.push(renderDetailRow("Size", escapeHtml(size)));
  if (item?.preparationStyle) {
    rows.push(renderDetailRow("Style", escapeHtml(item.preparationStyle)));
  }
  if (item?.isOffer) {
    const inclusions = (item.inclusions || []).filter(Boolean);
    const choices = (item.choices || []).filter(Boolean);
    const drinks = (item.drinks || []).filter(Boolean);
    if (inclusions.length) {
      rows.push(renderDetailRow("Includes", escapeHtml(inclusions.join(", "))));
    }
    if (choices.length) {
      rows.push(renderDetailRow("Choices", escapeHtml(choices.join(", "))));
    }
    if (drinks.length) {
      rows.push(renderDetailRow("Drinks", escapeHtml(drinks.join(", "))));
    }
  }
  const custom = renderSelectionGroups(item.customDataSelections);
  if (custom) rows.push(renderDetailRow("Custom", custom));
  const modifiers = renderSelectionGroups(item.choiceSelections);
  if (modifiers) rows.push(renderDetailRow("Modifiers", modifiers));
  const addons = renderSelectionGroups(item.addonChoiceSelections);
  if (addons) rows.push(renderDetailRow("Add-ons", addons));
  const options = (item.options || []).filter(Boolean);
  if (options.length) {
    rows.push(renderDetailRow("Options", escapeHtml(options.join(", "))));
  }
  const extras = renderCustomExtras(item.customExtras);
  if (extras) rows.push(renderDetailRow("Extras", extras));
  if (item?.notes) {
    rows.push(renderDetailRow("Note", escapeHtml(item.notes)));
  }
  if (!rows.length) return "";
  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;margin-top:8px;">
      ${rows.join("")}
    </table>`;
}

function renderItems(items = []) {
  if (!Array.isArray(items) || items.length === 0) return "";

  const bodyRows = items
    .map((item, index) => {
      const name = escapeHtml(item?.name || "Item");
      const qty = Number(item?.qty) || 1;
      const size = meaningfulSize(item?.size);
      const unit = money(item?.price);
      const lineTotal =
        item?.lineTotal != null
          ? money(item.lineTotal)
          : item?.price != null
            ? money(Number(item.price) * qty)
            : null;
      const chips = [
        size ? metaChip(size) : "",
        item?.preparationStyle ? metaChip(item.preparationStyle) : "",
      ]
        .filter(Boolean)
        .join("");
      const details = renderItemDetails({
        ...item,
        // Style already shown as chip — avoid repeating in detail rows.
        preparationStyle: null,
        size: null,
      });
      const border =
        index === items.length - 1
          ? "border-bottom:none;"
          : "border-bottom:1px solid #f3e8d8;";

      return `
        <tr>
          <td style="padding:14px 10px 14px 0;${border}vertical-align:top;width:44px;">
            <div style="display:inline-block;min-width:34px;padding:6px 0;border-radius:10px;background:#fff7ed;border:1px solid #fed7aa;text-align:center;font-size:13px;font-weight:800;color:#c2410c;">
              ${qty}
            </div>
          </td>
          <td style="padding:14px 8px;${border}vertical-align:top;">
            <div style="font-size:15px;font-weight:800;color:#111827;line-height:20px;">${name}</div>
            ${
              unit
                ? `<div style="margin-top:2px;font-size:12px;color:#9ca3af;">${unit} each</div>`
                : ""
            }
            ${chips ? `<div style="margin-top:8px;">${chips}</div>` : ""}
            ${details}
          </td>
          <td style="padding:14px 0 14px 8px;${border}vertical-align:top;text-align:right;white-space:nowrap;font-size:14px;font-weight:800;color:#111827;width:84px;">
            ${lineTotal || ""}
          </td>
        </tr>`;
    })
    .join("");

  return `
    <div style="margin:0 0 22px;">
      <p style="margin:0 0 12px;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:1.2px;color:#c2410c;">
        Order summary
      </p>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;background:#fffdf9;border:1px solid #f3e8d8;border-radius:14px;overflow:hidden;">
        <tr>
          <td colspan="3" style="padding:0;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
              <tr style="background:#fff7ed;">
                <th align="left" style="padding:10px 10px 10px 14px;font-size:11px;font-weight:800;letter-spacing:0.8px;text-transform:uppercase;color:#9a3412;width:44px;">Qty</th>
                <th align="left" style="padding:10px 8px;font-size:11px;font-weight:800;letter-spacing:0.8px;text-transform:uppercase;color:#9a3412;">Item</th>
                <th align="right" style="padding:10px 14px 10px 8px;font-size:11px;font-weight:800;letter-spacing:0.8px;text-transform:uppercase;color:#9a3412;width:84px;">Amount</th>
              </tr>
              <tr>
                <td colspan="3" style="padding:0 14px;">
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
                    ${bodyRows}
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div>`;
}

function renderTotals({
  subTotal,
  taxTotal,
  discountTotal,
  discountCode,
  serviceChargeTotal,
  serviceChargeName,
  totalAmount,
  tipAmount,
  paid = false,
}) {
  const lines = [];
  const sub = money(subTotal);
  const tax = money(taxTotal);
  const discount = money(discountTotal);
  const service = money(serviceChargeTotal);
  const tip = money(tipAmount);
  const total = money(totalAmount);
  const discountLabel = discountCode
    ? `Discount (${escapeHtml(discountCode)})`
    : "Discount";
  const serviceLabel = serviceChargeName
    ? escapeHtml(serviceChargeName)
    : "Service";

  if (sub) {
    lines.push(
      `<tr><td style="padding:4px 0;font-size:13px;color:#6b7280;">Subtotal</td><td style="padding:4px 0;font-size:13px;color:#4b5563;text-align:right;">${sub}</td></tr>`,
    );
  }
  if (discount && Number(discountTotal) > 0) {
    lines.push(
      `<tr><td style="padding:4px 0;font-size:13px;color:#6b7280;">${discountLabel}</td><td style="padding:4px 0;font-size:13px;color:#16a34a;text-align:right;">−${discount}</td></tr>`,
    );
  }
  if (tax && Number(taxTotal) > 0) {
    lines.push(
      `<tr><td style="padding:4px 0;font-size:13px;color:#6b7280;">Tax</td><td style="padding:4px 0;font-size:13px;color:#4b5563;text-align:right;">${tax}</td></tr>`,
    );
  }
  if (service && Number(serviceChargeTotal) > 0) {
    lines.push(
      `<tr><td style="padding:4px 0;font-size:13px;color:#6b7280;">${serviceLabel}</td><td style="padding:4px 0;font-size:13px;color:#4b5563;text-align:right;">${service}</td></tr>`,
    );
  }
  if (tip && Number(tipAmount) > 0) {
    lines.push(
      `<tr><td style="padding:4px 0;font-size:13px;color:#6b7280;">Tip</td><td style="padding:4px 0;font-size:13px;color:#4b5563;text-align:right;">${tip}</td></tr>`,
    );
  }
  if (total) {
    const totalLabel = paid ? "Order total" : "Total due at restaurant";
    lines.push(
      `<tr><td style="padding:10px 0 0;font-size:15px;font-weight:800;color:#111827;border-top:1px solid #fed7aa;">${totalLabel}</td><td style="padding:10px 0 0;font-size:15px;font-weight:800;color:#111827;text-align:right;border-top:1px solid #fed7aa;">${total}</td></tr>`,
    );
  }

  if (!lines.length) return "";

  return `
    <div style="margin:0 0 22px;background:#fffdf9;border:1px solid #f3e8d8;border-radius:14px;padding:14px 16px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
        ${lines.join("")}
      </table>
    </div>`;
}

export function onlineOrderStatusTemplate({
  type,
  guestName,
  restaurantName,
  orderNumber,
  invoiceNumber,
  pickupLabel,
  totalAmount,
  trackUrl,
  address,
  status,
  paymentStatus,
  items = [],
  subTotal,
  taxTotal,
  discountTotal,
  discountCode,
  serviceChargeTotal,
  serviceChargeName,
  customerNote,
  guestPhone,
  guestEmail,
  paymentMethod,
  tipAmount,
  tipMethod,
  cashAmount,
  cardAmount,
  giftcardUsedAmount,
  giftcardCode,
  orderAgainUrl,
}) {
  const brand = String(restaurantName || "Tasty Bites").trim() || "Tasty Bites";
  const hello = escapeHtml(String(guestName || "").trim() || "there");
  const ticket = escapeHtml(String(orderNumber || "").trim());
  const year = new Date().getFullYear();
  const meta = statusMeta(type, status);
  const isPaidType = type === "paid";
  const payLabel =
    isPaidType || String(paymentStatus || "").toUpperCase() === "PAID"
      ? "Paid"
      : "Pay at restaurant";

  const copy = {
    placed: {
      eyebrow: "Thank you for your order",
      title: "We've received your order",
      intro: `Thanks ${hello}! Your pickup order <strong>#${ticket}</strong> at <strong>${escapeHtml(brand)}</strong> is confirmed on our side.`,
      nextStep:
        "The kitchen will review and accept your order shortly. You'll get another email when they start preparing it.",
      cta: "Track your order",
      ctaUrl: trackUrl,
    },
    approved: {
      eyebrow: "Order accepted",
      title: "Kitchen is preparing your order",
      intro: `Good news ${hello} — <strong>${escapeHtml(brand)}</strong> accepted order <strong>#${ticket}</strong> and the kitchen is preparing it now.`,
      nextStep:
        "We'll email you again when your order is ready for pickup. Please bring payment when you arrive.",
      cta: "Track status",
      ctaUrl: trackUrl,
    },
    ready: {
      eyebrow: "Ready for pickup",
      title: "Your order is ready",
      intro: `${hello}, order <strong>#${ticket}</strong> is ready at <strong>${escapeHtml(brand)}</strong>. Please come pick it up — pay at the restaurant when you arrive.`,
      nextStep:
        "Show your order number at the counter. Same-day pickup only.",
      cta: "View order",
      ctaUrl: trackUrl,
    },
    paid: {
      eyebrow: "Payment received",
      title: "Thanks — hope to see you again",
      intro: `${hello}, payment for order <strong>#${ticket}</strong> at <strong>${escapeHtml(brand)}</strong> is complete. Here's your receipt summary.`,
      nextStep:
        "We'd love to serve you again. Order online anytime for same-day pickup — it's quick, easy, and ready when you are.",
      cta: "Order online again",
      ctaUrl: orderAgainUrl || trackUrl,
    },
  }[type] || {
    eyebrow: "Order update",
    title: "Order update",
    intro: `Update for order <strong>#${ticket}</strong> at <strong>${escapeHtml(brand)}</strong>.`,
    nextStep: "You can track the latest status anytime with the link below.",
    cta: "Track order",
    ctaUrl: trackUrl,
  };

  const note = String(customerNote || "").trim();
  const ctaHref = copy.ctaUrl || trackUrl;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(copy.title)}</title>
</head>
<body style="margin:0;padding:0;background:#fffaf4;font-family:Inter,Helvetica,Arial,sans-serif;color:#111827;">
  <div style="padding:28px 16px;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #f1e4d1;border-radius:20px;overflow:hidden;box-shadow:0 12px 30px rgba(15,23,42,0.08);">
      <div style="padding:36px 32px 28px;text-align:center;background:linear-gradient(180deg,#fff6ec 0%,#ffffff 100%);border-bottom:1px solid #f3dcc0;">
        <p style="margin:0;text-transform:uppercase;letter-spacing:1.8px;font-size:12px;color:#ea580c;font-weight:800;">
          ${copy.eyebrow}
        </p>
        <h1 style="margin:12px 0 0;font-size:26px;line-height:1.2;font-weight:900;color:#111827;">
          ${escapeHtml(copy.title)}
        </h1>
      </div>

      <div style="padding:32px;">
        <p style="margin:0 0 18px;font-size:16px;line-height:26px;color:#4b5563;">
          ${copy.intro}
        </p>

        <div style="display:inline-block;background:${meta.bg};border:1px solid ${meta.border};border-radius:999px;padding:8px 14px;margin:0 0 22px;">
          <span style="font-size:12px;font-weight:800;letter-spacing:0.6px;text-transform:uppercase;color:${meta.color};">
            Status: ${escapeHtml(meta.label)}
          </span>
          <span style="font-size:12px;color:#6b7280;"> · ${escapeHtml(meta.hint)}</span>
        </div>

        <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:16px;padding:18px 20px;margin-bottom:22px;">
          <p style="margin:0 0 8px;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:1.2px;color:#c2410c;">Order #${ticket}</p>
          ${
            invoiceNumber
              ? `<p style="margin:0 0 6px;font-size:14px;color:#4b5563;"><strong style="color:#111827;">Invoice:</strong> ${escapeHtml(invoiceNumber)}</p>`
              : ""
          }
          ${
            pickupLabel
              ? `<p style="margin:0 0 6px;font-size:14px;color:#4b5563;"><strong style="color:#111827;">Pickup:</strong> ${escapeHtml(pickupLabel)}</p>`
              : ""
          }
          <p style="margin:0 0 6px;font-size:14px;color:#4b5563;"><strong style="color:#111827;">Payment:</strong> ${escapeHtml(payLabel)}</p>
          ${
            guestPhone
              ? `<p style="margin:0 0 6px;font-size:14px;color:#4b5563;"><strong style="color:#111827;">Phone:</strong> ${escapeHtml(guestPhone)}</p>`
              : ""
          }
          ${
            guestEmail
              ? `<p style="margin:0 0 6px;font-size:14px;color:#4b5563;"><strong style="color:#111827;">Email:</strong> ${escapeHtml(guestEmail)}</p>`
              : ""
          }
          ${
            address
              ? `<p style="margin:10px 0 0;font-size:13px;color:#6b7280;">${escapeHtml(address)}</p>`
              : ""
          }
        </div>

        ${renderItems(items)}
        ${renderTotals({
          subTotal,
          taxTotal,
          discountTotal,
          discountCode,
          serviceChargeTotal,
          serviceChargeName,
          totalAmount,
          tipAmount: isPaidType ? tipAmount : null,
          paid: isPaidType,
        })}
        ${
          isPaidType
            ? renderPaymentDetails({
                paymentMethod,
                tipAmount,
                tipMethod,
                cashAmount,
                cardAmount,
                giftcardUsedAmount,
                giftcardCode,
                totalAmount,
              })
            : ""
        }

        ${
          note
            ? `<div style="margin:0 0 22px;background:#fafafa;border-radius:12px;padding:14px 16px;">
          <p style="margin:0 0 4px;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:#9a3412;">Your note</p>
          <p style="margin:0;font-size:14px;line-height:22px;color:#4b5563;">${escapeHtml(note)}</p>
        </div>`
            : ""
        }

        <div style="background:#fafafa;border-left:4px solid #f97316;padding:16px 18px;border-radius:12px;color:#4b5563;font-size:14px;line-height:22px;margin:0 0 22px;">
          ${escapeHtml(copy.nextStep)}
        </div>

        ${
          ctaHref
            ? `<div style="text-align:center;margin:8px 0 8px;">
          <a href="${escapeHtml(ctaHref)}" style="display:inline-block;background:#f97316;color:#ffffff !important;text-decoration:none;font-weight:800;padding:14px 28px;border-radius:999px;box-shadow:0 10px 20px rgba(249,115,22,0.22);">
            ${escapeHtml(copy.cta)}
          </a>
        </div>`
            : ""
        }

        <p style="margin:18px 0 0;font-size:12px;line-height:18px;color:#9ca3af;text-align:center;">
          ${
            isPaidType
              ? "Thanks for choosing us. Skip the wait next time — place your next pickup order online."
              : "Same-day pickup only. Payment is collected at the restaurant when you collect your order."
          }
        </p>
      </div>

      <div style="padding:22px 32px 30px;background:#fafafa;text-align:center;border-top:1px solid #e5e7eb;">
        <p style="margin:0 0 8px;font-weight:800;color:#111827;">${escapeHtml(brand)}</p>
        <p style="margin:0;color:#6b7280;font-size:12px;">© ${year} ${escapeHtml(brand)}. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();
}
