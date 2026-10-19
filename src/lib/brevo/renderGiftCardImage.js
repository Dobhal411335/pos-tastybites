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

let cachedFontCss = null;

/**
 * Embed Noto Sans so sharp/librsvg can render text on Linux (Vercel).
 * Without this, missing Helvetica/Georgia shows as □□□ tofu blocks.
 */
function loadEmbeddedFontCss() {
  if (cachedFontCss !== null) return cachedFontCss;
  try {
    const fontsDir = path.join(process.cwd(), "public", "fonts");
    const regularPath = path.join(fontsDir, "NotoSans-Regular.ttf");
    const boldPath = path.join(fontsDir, "NotoSans-Bold.ttf");
    if (!fs.existsSync(regularPath) || !fs.existsSync(boldPath)) {
      console.warn(
        "Gift card fonts missing under public/fonts — text may render as boxes",
      );
      cachedFontCss = "";
      return cachedFontCss;
    }
    const regular = fs.readFileSync(regularPath).toString("base64");
    const bold = fs.readFileSync(boldPath).toString("base64");
    cachedFontCss = `
  <defs>
    <style type="text/css"><![CDATA[
      @font-face {
        font-family: 'GiftCardSans';
        font-weight: 400;
        font-style: normal;
        src: url('data:font/ttf;charset=utf-8;base64,${regular}') format('truetype');
      }
      @font-face {
        font-family: 'GiftCardSans';
        font-weight: 700;
        font-style: normal;
        src: url('data:font/ttf;charset=utf-8;base64,${bold}') format('truetype');
      }
      @font-face {
        font-family: 'GiftCardSans';
        font-weight: 800;
        font-style: normal;
        src: url('data:font/ttf;charset=utf-8;base64,${bold}') format('truetype');
      }
    ]]></style>
  </defs>`;
    return cachedFontCss;
  } catch (err) {
    console.warn("Failed to load gift card fonts:", err?.message || err);
    cachedFontCss = "";
    return cachedFontCss;
  }
}

/** Truncate long strings so they fit on the certificate lines. */
function clip(str, max) {
  const s = String(str || "");
  if (s.length <= max) return s;
  return `${s.slice(0, Math.max(0, max - 1))}...`;
}

/**
 * Build print-style gift certificate as SVG (matches GiftCardTemplate layout).
 * Uses embedded Noto Sans — system Helvetica/Georgia are often missing on servers.
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
  const codeStr = escapeXml(clip(code || "", 22));
  const forName = escapeXml(clip(String(recipientName || "").trim() || "Guest", 36));
  const dateStr = escapeXml(fmtDate(issueDate) || fmtDate(new Date()));
  const phone = escapeXml(fmtPhone(companyInfo?.contactNumbers?.[0]));
  const address = escapeXml(
    String(fmtAddress(companyInfo?.officeAddresses?.[0])).toUpperCase(),
  );
  const website = escapeXml(
    companyInfo?.website || "www.tastybitesrestaurant.com",
  );
  const flowerUri = loadFlowerDataUri();
  const fontCss = loadEmbeddedFontCss();

  // Prefer embedded GiftCardSans; keep system fallbacks for local previews.
  const brand = `font-family="GiftCardSans, Georgia, 'Times New Roman', serif" font-style="italic" font-weight="700" fill="#E3B12F"`;
  const white = `font-family="GiftCardSans, Helvetica, Arial, sans-serif" fill="#ffffff"`;
  const black = `font-family="GiftCardSans, Helvetica, Arial, sans-serif" fill="#000000"`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  ${fontCss}
  <!-- Outer border -->
  <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" fill="#ffffff" stroke="#A1A1AA" stroke-width="1"/>

  <!-- ===== STUB ===== -->
  <rect x="0" y="0" width="${stubW}" height="${headerH}" fill="#000000"/>
  <text x="12" y="28" ${brand} font-size="22">Tasty Bites</text>
  <text x="12" y="46" ${white} font-weight="700" font-size="9">Card Number:</text>
  <text x="12" y="58" ${white} font-weight="700" font-size="10">${codeStr}</text>
  <line x1="12" y1="60" x2="${stubW - 12}" y2="60" stroke="#FFD700" stroke-width="1"/>

  <rect x="0" y="${headerH}" width="${stubW}" height="${bodyH}" fill="#ffffff"/>
  <text x="12" y="${headerH + 28}" ${black} font-weight="700" font-size="11">Date:</text>
  <line x1="48" y1="${headerH + 30}" x2="${stubW - 12}" y2="${headerH + 30}" stroke="#000" stroke-width="1.5" stroke-dasharray="2 2"/>
  <text x="52" y="${headerH + 26}" ${black} font-size="11">${dateStr}</text>

  <text x="12" y="${headerH + 58}" ${black} font-weight="700" font-size="11">For:</text>
  <line x1="42" y1="${headerH + 60}" x2="${stubW - 12}" y2="${headerH + 60}" stroke="#000" stroke-width="1.5" stroke-dasharray="2 2"/>
  <text x="46" y="${headerH + 56}" ${black} font-size="11">${forName}</text>

  <line x1="12" y1="${headerH + 78}" x2="${stubW - 12}" y2="${headerH + 78}" stroke="#000" stroke-width="1" stroke-dasharray="2 2"/>

  <text x="12" y="${headerH + 108}" ${black} font-weight="700" font-size="11">Amount:</text>
  <line x1="68" y1="${headerH + 110}" x2="${stubW - 12}" y2="${headerH + 110}" stroke="#000" stroke-width="1.5" stroke-dasharray="2 2"/>
  <text x="72" y="${headerH + 106}" ${black} font-size="12">${amountStr}</text>

  <text x="12" y="${headerH + 140}" ${black} font-weight="700" font-size="11">Signature:</text>
  <line x1="78" y1="${headerH + 142}" x2="${stubW - 12}" y2="${headerH + 142}" stroke="#000" stroke-width="1.5" stroke-dasharray="2 2"/>

  <rect x="0" y="${H - footerH}" width="${stubW}" height="${footerH}" fill="#7B0F13"/>

  <line x1="${stubW}" y1="0" x2="${stubW}" y2="${H}" stroke="#FFD700" stroke-width="3" stroke-dasharray="6 5"/>

  <!-- ===== MAIN ===== -->
  <rect x="${stubW}" y="0" width="${mainW}" height="${headerH}" fill="#000000"/>
  <text x="${stubW + 16}" y="28" ${brand} font-size="22">Tasty Bites</text>
  <text x="${stubW + 16}" y="50" ${white} font-weight="700" font-size="11">Card Number:</text>
  <rect x="${stubW + 100}" y="36" width="160" height="20" fill="#FFD700"/>
  <text x="${stubW + 180}" y="50" ${black} font-weight="800" font-size="11" text-anchor="middle">${codeStr}</text>
  <text x="${W - 14}" y="22" ${white} font-weight="700" font-size="10" text-anchor="end">HST #740811146RT0001</text>

  <rect x="${stubW}" y="${headerH}" width="${mainW}" height="${bodyH}" fill="#ffffff"/>
  <text x="${stubW + 16}" y="${headerH + 42}" ${black} font-weight="800" font-size="32">Gift Certificate</text>

  <text x="${stubW + 16}" y="${headerH + 90}" ${black} font-weight="700" font-size="12">Date:</text>
  <line x1="${stubW + 52}" y1="${headerH + 92}" x2="${stubW + 220}" y2="${headerH + 92}" stroke="#000" stroke-width="2" stroke-dasharray="2 2"/>
  <text x="${stubW + 136}" y="${headerH + 88}" ${black} font-size="12" text-anchor="middle">${dateStr}</text>

  <text x="${stubW + 240}" y="${headerH + 90}" ${black} font-weight="700" font-size="12">Amount:</text>
  <rect x="${stubW + 300}" y="${headerH + 72}" width="90" height="26" fill="#FFD700" stroke="#000" stroke-width="2"/>
  <text x="${stubW + 345}" y="${headerH + 90}" ${black} font-weight="800" font-size="13" text-anchor="middle">${amountStr}</text>

  <text x="${stubW + 16}" y="${headerH + 130}" ${black} font-weight="700" font-size="12">For:</text>
  <line x1="${stubW + 46}" y1="${headerH + 132}" x2="${stubW + 390}" y2="${headerH + 132}" stroke="#000" stroke-width="2" stroke-dasharray="2 2"/>
  <text x="${stubW + 50}" y="${headerH + 128}" ${black} font-size="12">${forName}</text>

  <text x="${stubW + 16}" y="${headerH + 170}" ${black} font-weight="700" font-size="12">Authorised Signature:</text>
  <line x1="${stubW + 150}" y1="${headerH + 172}" x2="${stubW + 390}" y2="${headerH + 172}" stroke="#000" stroke-width="2" stroke-dasharray="2 2"/>

  ${
    flowerUri
      ? `<image href="${flowerUri}" xlink:href="${flowerUri}" x="${W - 150}" y="${headerH - 8}" width="140" height="150" preserveAspectRatio="xMidYMid meet"/>`
      : ""
  }

  <rect x="${stubW}" y="${H - footerH}" width="${mainW}" height="${footerH}" fill="#7B0F13"/>
  <text x="${stubW + 16}" y="${H - footerH + 20}" ${white} font-weight="700" font-size="10">${address}</text>
  <text x="${stubW + 16}" y="${H - footerH + 36}" ${white} font-weight="700" font-size="10">${website}</text>
  <text x="${W - 16}" y="${H - footerH + 30}" ${white} font-weight="800" font-size="16" text-anchor="end">${phone}</text>
</svg>`;
}

let cachedSharp = null;
async function getSharpInstance() {
  if (cachedSharp !== null) return cachedSharp || null;
  try {
    const mod = await import("sharp");
    cachedSharp = mod.default || mod;
    return cachedSharp;
  } catch (err) {
    try {
      const mod = await import("next/node_modules/sharp/lib/index.js");
      cachedSharp = mod.default || mod;
      return cachedSharp;
    } catch {
      console.warn("Sharp is not available for image processing:", err?.message || err);
      cachedSharp = false;
      return null;
    }
  }
}

/**
 * Render gift card PNG (base64) for Brevo attachment.
 * Returns base64 PNG string or null if sharp is unavailable.
 */
export async function renderGiftCardPngBase64(cardData) {
  try {
    const sharp = await getSharpInstance();
    if (!sharp) return null;

    const svg = buildGiftCardSvg(cardData);
    const png = await sharp(Buffer.from(svg))
      .png({ quality: 90 })
      .toBuffer();
    return png.toString("base64");
  } catch (err) {
    console.warn("Failed to render gift card PNG with sharp:", err?.message || err);
    return null;
  }
}
