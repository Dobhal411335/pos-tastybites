import fs from "fs";
import path from "path";
import { format } from "date-fns";

const escapeXml = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const fmtDate = (d) => {
  if (!d) return "";
  try {
    return format(new Date(d), "MMM d, yyyy");
  } catch {
    return "";
  }
};

const fmtMoney = (n) => `$${(Number(n) || 0).toFixed(2)}`;

const fmtPhone = (p) => {
  if (!p) return "(519) 235-0050";
  if (typeof p === "object") {
    const num = String(p.number || p.phone || "").replace(/\D/g, "");
    if (!num) return "(519) 235-0050";
    if (num.length === 10) {
      return `(${num.slice(0, 3)}) ${num.slice(3, 6)}-${num.slice(6)}`;
    }
    return num;
  }
  return String(p);
};

const fmtAddress = (a) => {
  if (!a) return "345 MAIN ST. S. EXETER, ON N0M 1S6";
  if (typeof a === "object") {
    return (
      a.line1 ||
      a.address ||
      a.full ||
      [a.street, a.city, a.province || a.state, a.postal]
        .filter(Boolean)
        .join(", ") ||
      "345 MAIN ST. S. EXETER, ON N0M 1S6"
    );
  }
  return String(a);
};

function loadFlowerDataUri() {
  const filePath = path.join(process.cwd(), "public", "flower.png");
  if (!fs.existsSync(filePath)) return null;
  const b64 = fs.readFileSync(filePath).toString("base64");
  return `data:image/png;base64,${b64}`;
}

/**
 * Build print-style gift certificate as SVG (matches GiftCardTemplate layout).
 * Flower/rosette is baked into the SVG — not a separate email asset.
 */
export function buildGiftCardSvg({
  code,
  value,
  recipientName = "",
  issueDate,
  companyInfo,
}) {
  const W = 900;
  const H = 320;
  const stubW = Math.round(W * 0.3);
  const mainW = W - stubW;
  const headerH = 64;
  const footerH = 48;
  const bodyH = H - headerH - footerH;

  const amountStr = escapeXml(fmtMoney(value));
  const codeStr = escapeXml(code || "");
  const forName = escapeXml(recipientName || "");
  const dateStr = escapeXml(fmtDate(issueDate));
  const phone = escapeXml(fmtPhone(companyInfo?.contactNumbers?.[0]));
  const address = escapeXml(
    String(fmtAddress(companyInfo?.officeAddresses?.[0])).toUpperCase(),
  );
  const website = escapeXml(
    companyInfo?.website || "www.tastybitesrestaurant.com",
  );
  const flowerUri = loadFlowerDataUri();

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <style>
      .brand { font-family: Georgia, 'Brush Script MT', cursive; font-style: italic; fill: #E3B12F; }
      .white { fill: #ffffff; font-family: Helvetica, Arial, sans-serif; }
      .black { fill: #000000; font-family: Helvetica, Arial, sans-serif; }
      .bold { font-weight: 700; }
      .extrabold { font-weight: 800; }
    </style>
  </defs>

  <!-- Outer border -->
  <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" fill="#ffffff" stroke="#A1A1AA" stroke-width="1"/>

  <!-- ===== STUB ===== -->
  <!-- stub header -->
  <rect x="0" y="0" width="${stubW}" height="${headerH}" fill="#000000"/>
  <text x="12" y="28" class="brand" font-size="22">Tasty Bites</text>
  <text x="12" y="46" class="white bold" font-size="9">Card Number:</text>
  <text x="12" y="58" class="white bold" font-size="10">${codeStr}</text>
  <line x1="12" y1="60" x2="${stubW - 12}" y2="60" stroke="#FFD700" stroke-width="1"/>

  <!-- stub body -->
  <rect x="0" y="${headerH}" width="${stubW}" height="${bodyH}" fill="#ffffff"/>
  <text x="12" y="${headerH + 28}" class="black bold" font-size="11">Date:</text>
  <line x1="48" y1="${headerH + 30}" x2="${stubW - 12}" y2="${headerH + 30}" stroke="#000" stroke-width="1.5" stroke-dasharray="2 2"/>
  <text x="52" y="${headerH + 26}" class="black" font-size="11">${dateStr}</text>

  <text x="12" y="${headerH + 58}" class="black bold" font-size="11">For:</text>
  <line x1="42" y1="${headerH + 60}" x2="${stubW - 12}" y2="${headerH + 60}" stroke="#000" stroke-width="1.5" stroke-dasharray="2 2"/>
  <text x="46" y="${headerH + 56}" class="black" font-size="11">${forName}</text>

  <line x1="12" y1="${headerH + 78}" x2="${stubW - 12}" y2="${headerH + 78}" stroke="#000" stroke-width="1" stroke-dasharray="2 2"/>

  <text x="12" y="${headerH + 108}" class="black bold" font-size="11">Amount:</text>
  <line x1="68" y1="${headerH + 110}" x2="${stubW - 12}" y2="${headerH + 110}" stroke="#000" stroke-width="1.5" stroke-dasharray="2 2"/>
  <text x="72" y="${headerH + 106}" class="black" font-size="12">${amountStr}</text>

  <text x="12" y="${headerH + 140}" class="black bold" font-size="11">Signature:</text>
  <line x1="78" y1="${headerH + 142}" x2="${stubW - 12}" y2="${headerH + 142}" stroke="#000" stroke-width="1.5" stroke-dasharray="2 2"/>

  <!-- stub footer -->
  <rect x="0" y="${H - footerH}" width="${stubW}" height="${footerH}" fill="#7B0F13"/>

  <!-- yellow dashed divider -->
  <line x1="${stubW}" y1="0" x2="${stubW}" y2="${H}" stroke="#FFD700" stroke-width="3" stroke-dasharray="6 5"/>

  <!-- ===== MAIN ===== -->
  <!-- main header -->
  <rect x="${stubW}" y="0" width="${mainW}" height="${headerH}" fill="#000000"/>
  <text x="${stubW + 16}" y="28" class="brand" font-size="22">Tasty Bites</text>
  <text x="${stubW + 16}" y="50" class="white bold" font-size="11">Card Number:</text>
  <rect x="${stubW + 100}" y="36" width="150" height="20" fill="#FFD700"/>
  <text x="${stubW + 175}" y="50" class="black extrabold" font-size="11" text-anchor="middle">${codeStr}</text>
  <text x="${W - 14}" y="22" class="white bold" font-size="10" text-anchor="end">HST #740811146RT0001</text>

  <!-- main body -->
  <rect x="${stubW}" y="${headerH}" width="${mainW}" height="${bodyH}" fill="#ffffff"/>
  <text x="${stubW + 16}" y="${headerH + 42}" class="black extrabold" font-size="32">Gift Certificate</text>

  <text x="${stubW + 16}" y="${headerH + 90}" class="black bold" font-size="12">Date:</text>
  <line x1="${stubW + 52}" y1="${headerH + 92}" x2="${stubW + 220}" y2="${headerH + 92}" stroke="#000" stroke-width="2" stroke-dasharray="2 2"/>
  <text x="${stubW + 136}" y="${headerH + 88}" class="black" font-size="12" text-anchor="middle">${dateStr}</text>

  <text x="${stubW + 240}" y="${headerH + 90}" class="black bold" font-size="12">Amount:</text>
  <rect x="${stubW + 300}" y="${headerH + 72}" width="90" height="26" fill="#FFD700" stroke="#000" stroke-width="2"/>
  <text x="${stubW + 345}" y="${headerH + 90}" class="black extrabold" font-size="13" text-anchor="middle">${amountStr}</text>

  <text x="${stubW + 16}" y="${headerH + 130}" class="black bold" font-size="12">For:</text>
  <line x1="${stubW + 46}" y1="${headerH + 132}" x2="${stubW + 390}" y2="${headerH + 132}" stroke="#000" stroke-width="2" stroke-dasharray="2 2"/>
  <text x="${stubW + 50}" y="${headerH + 128}" class="black" font-size="12">${forName}</text>

  <text x="${stubW + 16}" y="${headerH + 170}" class="black bold" font-size="12">Authorised Signature:</text>
  <line x1="${stubW + 150}" y1="${headerH + 172}" x2="${stubW + 390}" y2="${headerH + 172}" stroke="#000" stroke-width="2" stroke-dasharray="2 2"/>

  ${
    flowerUri
      ? `<image href="${flowerUri}" x="${W - 150}" y="${headerH - 8}" width="140" height="150" preserveAspectRatio="xMidYMid meet"/>`
      : ""
  }

  <!-- main footer -->
  <rect x="${stubW}" y="${H - footerH}" width="${mainW}" height="${footerH}" fill="#7B0F13"/>
  <text x="${stubW + 16}" y="${H - footerH + 20}" class="white bold" font-size="10">${address}</text>
  <text x="${stubW + 16}" y="${H - footerH + 36}" class="white bold" font-size="10">${website}</text>
  <text x="${W - 16}" y="${H - footerH + 30}" class="white extrabold" font-size="16" text-anchor="end">${phone}</text>
</svg>`;
}

/**
 * Render gift card PNG (base64) for Brevo attachment.
 */
export async function renderGiftCardPngBase64(cardData) {
  const svg = buildGiftCardSvg(cardData);
  const sharp = (await import("sharp")).default;
  const png = await sharp(Buffer.from(svg))
    .png({ quality: 90 })
    .toBuffer();
  return png.toString("base64");
}
