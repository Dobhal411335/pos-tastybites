import { sendTemplateEmail } from "@/lib/brevo/sendTemplateEmail";
import { stockLevelExcelFilename } from "@/lib/stock/exportStockLevelExcel";
import { stockLevelPdfFilename } from "@/lib/stock/exportStockLevelPdf";

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const money = (n) =>
  `$${(Math.round((Number(n) || 0) * 100) / 100).toFixed(2)}`;

const qty = (n) => {
  const num = Number(n);
  if (!Number.isFinite(num)) return "0";
  return String(num);
};

const th = (label, align = "left") =>
  `<th style="padding:10px 12px;border:1px solid #D4D4D8;background:#FFF7ED;color:#9A3412;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;text-align:${align};white-space:nowrap;">${label}</th>`;

const td = (value, align = "left", extra = "") =>
  `<td style="padding:9px 12px;border:1px solid #E4E4E7;font-size:13px;color:#18181B;text-align:${align};vertical-align:middle;${extra}">${value}</td>`;

function buildLevelRows(levels = []) {
  if (!levels.length) {
    return `<tr>
      <td colspan="10" style="padding:20px 12px;border:1px solid #E4E4E7;text-align:center;color:#71717A;font-size:13px;background:#FAFAFA;">
        No inventory products found for these filters.
      </td>
    </tr>`;
  }

  return levels
    .map((row, index) => {
      const bg = index % 2 === 0 ? "#FFFFFF" : "#FAFAFA";
      const status = row.status
        ? `<span style="display:inline-block;padding:3px 8px;border-radius:999px;background:#DCFCE7;color:#166534;font-size:11px;font-weight:700;">Active</span>`
        : `<span style="display:inline-block;padding:3px 8px;border-radius:999px;background:#FEE2E2;color:#991B1B;font-size:11px;font-weight:700;">Inactive</span>`;
      const balanceColor =
        Number(row.currentBalance) < 0
          ? "color:#B91C1C;font-weight:700;"
          : "color:#1D4ED8;font-weight:700;";

      return `<tr style="background:${bg};">
        ${td(escapeHtml(row.name || "—"))}
        ${td(escapeHtml(row.category?.name || "—"))}
        ${td(escapeHtml(row.type?.name || "—"))}
        ${td(escapeHtml(row.unit?.name || "—"), "center")}
        ${td(qty(row.openingStock), "right")}
        ${td(`<span style="color:#15803D;font-weight:600;">${qty(row.totalIn)}</span>`, "right")}
        ${td(`<span style="color:#B91C1C;font-weight:600;">${qty(row.totalOut)}</span>`, "right")}
        ${td(qty(row.currentBalance), "right", balanceColor)}
        ${td(money(row.purchasePrice), "right")}
        ${td(status, "center")}
      </tr>`;
    })
    .join("");
}

function buildTotalsRow(levels = []) {
  const totals = levels.reduce(
    (acc, row) => {
      acc.open += Number(row.openingStock) || 0;
      acc.in += Number(row.totalIn) || 0;
      acc.out += Number(row.totalOut) || 0;
      acc.balance += Number(row.currentBalance) || 0;
      return acc;
    },
    { open: 0, in: 0, out: 0, balance: 0 }
  );

  return `<tr style="background:#FFF7ED;">
    ${td("<strong>TOTAL</strong>", "left", "background:#FFF7ED;")}
    ${td("", "left", "background:#FFF7ED;")}
    ${td("", "left", "background:#FFF7ED;")}
    ${td("", "center", "background:#FFF7ED;")}
    ${td(`<strong>${qty(totals.open)}</strong>`, "right", "background:#FFF7ED;")}
    ${td(`<strong style="color:#15803D;">${qty(totals.in)}</strong>`, "right", "background:#FFF7ED;")}
    ${td(`<strong style="color:#B91C1C;">${qty(totals.out)}</strong>`, "right", "background:#FFF7ED;")}
    ${td(`<strong style="color:#1D4ED8;">${qty(totals.balance)}</strong>`, "right", "background:#FFF7ED;")}
    ${td("", "right", "background:#FFF7ED;")}
    ${td(`<strong>${levels.length} products</strong>`, "center", "background:#FFF7ED;")}
  </tr>`;
}

/**
 * Email Current Stock Level PDF + Excel via Brevo, with an inline data table.
 */
export async function sendStockLevelEmail({
  to,
  restaurantName,
  pdfBuffer,
  excelBuffer,
  categoryLabel,
  typeLabel,
  productCount,
  levels = [],
}) {
  const name = restaurantName || "Tasty Bites";
  const pdfName = stockLevelPdfFilename();
  const excelName = stockLevelExcelFilename();
  const subject = `${name} — Current Stock Level Report`;
  const generatedAt = new Date().toLocaleString();
  const rows = Array.isArray(levels) ? levels : [];
  const count = productCount ?? rows.length;

  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#F4F4F5;font-family:Arial,Helvetica,sans-serif;color:#18181B;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#F4F4F5;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:920px;background:#FFFFFF;border:1px solid #E4E4E7;border-radius:16px;overflow:hidden;">
          <tr>
            <td style="background:linear-gradient(135deg,#FFF7ED 0%,#FFEDD5 100%);padding:24px 28px;border-bottom:1px solid #FED7AA;">
              <p style="margin:0 0 4px;font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#C2410C;">Inventory Report</p>
              <h1 style="margin:0;font-size:22px;line-height:1.3;color:#9A3412;">${escapeHtml(name)} — Current Stock Level</h1>
              <p style="margin:8px 0 0;font-size:13px;color:#9A3412;">Live balances including opening stock, stock in, and stock out.</p>
            </td>
          </tr>

          <tr>
            <td style="padding:20px 28px 8px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;width:100%;border:1px solid #E4E4E7;border-radius:10px;overflow:hidden;">
                <tr>
                  <td style="padding:10px 14px;border:1px solid #E4E4E7;background:#FAFAFA;width:25%;">
                    <div style="font-size:11px;font-weight:700;color:#71717A;text-transform:uppercase;">Category</div>
                    <div style="margin-top:4px;font-size:14px;font-weight:700;color:#18181B;">${escapeHtml(categoryLabel || "All")}</div>
                  </td>
                  <td style="padding:10px 14px;border:1px solid #E4E4E7;background:#FAFAFA;width:25%;">
                    <div style="font-size:11px;font-weight:700;color:#71717A;text-transform:uppercase;">Product Type</div>
                    <div style="margin-top:4px;font-size:14px;font-weight:700;color:#18181B;">${escapeHtml(typeLabel || "All")}</div>
                  </td>
                  <td style="padding:10px 14px;border:1px solid #E4E4E7;background:#FAFAFA;width:25%;">
                    <div style="font-size:11px;font-weight:700;color:#71717A;text-transform:uppercase;">Products</div>
                    <div style="margin-top:4px;font-size:14px;font-weight:700;color:#18181B;">${count}</div>
                  </td>
                  <td style="padding:10px 14px;border:1px solid #E4E4E7;background:#FAFAFA;width:25%;">
                    <div style="font-size:11px;font-weight:700;color:#71717A;text-transform:uppercase;">Generated</div>
                    <div style="margin-top:4px;font-size:14px;font-weight:700;color:#18181B;">${escapeHtml(generatedAt)}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:16px 28px 8px;">
              <p style="margin:0 0 10px;font-size:14px;font-weight:700;color:#3F3F46;">Stock Level Details</p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;width:100%;border:1px solid #D4D4D8;">
                <thead>
                  <tr>
                    ${th("Product")}
                    ${th("Category")}
                    ${th("Type")}
                    ${th("Unit", "center")}
                    ${th("Opening", "right")}
                    ${th("Stock In", "right")}
                    ${th("Stock Out", "right")}
                    ${th("Balance", "right")}
                    ${th("Cost", "right")}
                    ${th("Status", "center")}
                  </tr>
                </thead>
                <tbody>
                  ${buildLevelRows(rows)}
                  ${rows.length ? buildTotalsRow(rows) : ""}
                </tbody>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:16px 28px 28px;">
              <div style="padding:14px 16px;background:#F0FDF4;border:1px solid #BBF7D0;border-radius:10px;">
                <p style="margin:0;font-size:13px;color:#166534;line-height:1.5;">
                  PDF and Excel attachments are included for offline use:
                  <strong>${escapeHtml(pdfName)}</strong> and
                  <strong>${escapeHtml(excelName)}</strong>.
                </p>
              </div>
              <p style="margin:14px 0 0;font-size:12px;color:#A1A1AA;">
                Balance = Opening + Stock In − Stock Out. This email was sent from ${escapeHtml(name)}.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return sendTemplateEmail({
    to: [{ email: to }],
    subject,
    htmlContent,
    attachment: [
      { name: pdfName, content: Buffer.from(pdfBuffer).toString("base64") },
      { name: excelName, content: Buffer.from(excelBuffer).toString("base64") },
    ],
  });
}
