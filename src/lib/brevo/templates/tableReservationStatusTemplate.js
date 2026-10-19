/**
 * Guest emails for table reservations: received | accepted | declined.
 */

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function contactBlock({ address, phone }) {
  const lines = [];
  if (phone) {
    lines.push(
      `<p style="margin:0 0 6px;font-size:14px;color:#4b5563;"><strong style="color:#111827;">Restaurant phone:</strong> <a href="tel:${escapeHtml(String(phone).replace(/[^\d+]/g, ""))}" style="color:#c2410c;font-weight:700;text-decoration:none;">${escapeHtml(phone)}</a></p>`,
    );
  }
  if (address) {
    lines.push(
      `<p style="margin:${phone ? "6px" : "10px"} 0 0;font-size:13px;color:#6b7280;">${escapeHtml(address)}</p>`,
    );
  }
  return lines.join("");
}

export function tableReservationStatusTemplate({
  type,
  guestName,
  restaurantName,
  date,
  timeLabel,
  guests,
  reasonForVisit,
  specialRequest,
  assignedTableNo,
  address,
  phone,
}) {
  const brand = String(restaurantName || "Tasty Bites").trim() || "Tasty Bites";
  const hello = escapeHtml(String(guestName || "").trim() || "there");
  const brandSafe = escapeHtml(brand);
  const year = new Date().getFullYear();
  const party = Number(guests) || 1;
  const dateSafe = date ? escapeHtml(date) : "";
  const timeSafe = timeLabel ? escapeHtml(timeLabel) : "";
  const tableLine = assignedTableNo
    ? `<p style="margin:0 0 6px;font-size:14px;color:#4b5563;"><strong style="color:#111827;">Table:</strong> ${escapeHtml(assignedTableNo)}</p>`
    : "";
  const reasonLine = reasonForVisit
    ? `<p style="margin:0 0 6px;font-size:14px;color:#4b5563;"><strong style="color:#111827;">Reason for visit:</strong> ${escapeHtml(reasonForVisit)}</p>`
    : "";
  const requestLine = specialRequest
    ? `<p style="margin:0 0 6px;font-size:14px;color:#4b5563;"><strong style="color:#111827;">Special request:</strong> ${escapeHtml(specialRequest)}</p>`
    : "";
  const phoneHint = phone
    ? ` Call us at <strong>${escapeHtml(phone)}</strong> if you need to change anything.`
    : " Please call the restaurant if you need to change anything.";

  const copy =
    type === "declined"
      ? {
          eyebrow: "Booking update",
          title: "We couldn't hold this table",
          intro: `Hi ${hello}, unfortunately <strong>${brandSafe}</strong> could not accept your table request for <strong>${timeSafe || "your selected time"}</strong>${dateSafe ? ` on <strong>${dateSafe}</strong>` : ""}.${phoneHint}`,
          tip: phone
            ? `Questions? Reach ${brandSafe} at ${escapeHtml(phone)}.`
            : "Please call the restaurant if you'd like to try another time.",
        }
      : type === "received"
        ? {
            eyebrow: "Reservation received",
            title: "We've got your table request",
            intro: `Thanks ${hello}! Your table reservation request at <strong>${brandSafe}</strong> has been received. The restaurant will review it shortly and confirm once accepted.`,
            tip: phone
              ? `You'll get another email when your booking is confirmed or if we need changes. For urgent questions, call ${escapeHtml(phone)}.`
              : "You'll get another email when your booking is confirmed or if we need changes.",
          }
        : {
            eyebrow: "Table confirmed",
            title: "Your table is booked",
            intro: `Good news ${hello} — <strong>${brandSafe}</strong> accepted your table booking. We look forward to seeing you.`,
            tip: phone
              ? `If you're running late, please call ${escapeHtml(phone)} so we can hold your spot.`
              : "If you're running late, please call the restaurant so we can hold your spot.",
          };

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
          ${escapeHtml(copy.eyebrow)}
        </p>
        <h1 style="margin:12px 0 0;font-size:26px;line-height:1.2;font-weight:900;color:#111827;">
          ${escapeHtml(copy.title)}
        </h1>
      </div>

      <div style="padding:32px;">
        <p style="margin:0 0 22px;font-size:16px;line-height:26px;color:#4b5563;">
          ${copy.intro}
        </p>

        <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:16px;padding:18px 20px;margin-bottom:22px;">
          <p style="margin:0 0 8px;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:1.2px;color:#c2410c;">Reservation details</p>
          ${
            dateSafe
              ? `<p style="margin:0 0 6px;font-size:14px;color:#4b5563;"><strong style="color:#111827;">Date:</strong> ${dateSafe}</p>`
              : ""
          }
          ${
            timeSafe
              ? `<p style="margin:0 0 6px;font-size:14px;color:#4b5563;"><strong style="color:#111827;">Arrival:</strong> ${timeSafe}</p>`
              : ""
          }
          <p style="margin:0 0 6px;font-size:14px;color:#4b5563;"><strong style="color:#111827;">Guests:</strong> ${party}</p>
          ${reasonLine}
          ${requestLine}
          ${tableLine}
          ${contactBlock({ address, phone })}
        </div>

        <div style="background:#fafafa;border-left:4px solid #f97316;padding:16px 18px;border-radius:12px;color:#4b5563;font-size:14px;line-height:22px;">
          ${copy.tip}
        </div>
      </div>

      <div style="padding:22px 32px 30px;background:#fafafa;text-align:center;border-top:1px solid #e5e7eb;">
        <p style="margin:0 0 8px;font-weight:800;color:#111827;">${brandSafe}</p>
        ${
          phone
            ? `<p style="margin:0 0 8px;color:#6b7280;font-size:13px;"><a href="tel:${escapeHtml(String(phone).replace(/[^\d+]/g, ""))}" style="color:#c2410c;font-weight:700;text-decoration:none;">${escapeHtml(phone)}</a></p>`
            : ""
        }
        <p style="margin:0;color:#6b7280;font-size:12px;">© ${year} ${brandSafe}. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();
}
