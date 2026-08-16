import { sendTemplateEmail } from "@/lib/brevo/sendTemplateEmail";
import { stockLevelExcelFilename } from "@/lib/stock/exportStockLevelExcel";
import { stockLevelPdfFilename } from "@/lib/stock/exportStockLevelPdf";

/**
 * Email Current Stock Level PDF + Excel via Brevo.
 */
export async function sendStockLevelEmail({
  to,
  restaurantName,
  pdfBuffer,
  excelBuffer,
  categoryLabel,
  typeLabel,
  productCount,
}) {
  const name = restaurantName || "Tasty Bites";
  const pdfName = stockLevelPdfFilename();
  const excelName = stockLevelExcelFilename();
  const subject = `${name} — Current Stock Level Report`;

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; color: #222; line-height: 1.5;">
      <h2 style="margin-bottom: 8px;">${name} — Current Stock Level</h2>
      <p style="margin: 0 0 16px;">Please find the current stock level report attached (PDF and Excel).</p>
      <table style="border-collapse: collapse; min-width: 320px;">
        <tr><td style="padding: 4px 12px 4px 0;"><strong>Category</strong></td><td>${categoryLabel || "All"}</td></tr>
        <tr><td style="padding: 4px 12px 4px 0;"><strong>Product Type</strong></td><td>${typeLabel || "All"}</td></tr>
        <tr><td style="padding: 4px 12px 4px 0;"><strong>Products</strong></td><td>${productCount ?? 0}</td></tr>
        <tr><td style="padding: 4px 12px 4px 0;"><strong>Generated At</strong></td><td>${new Date().toLocaleString()}</td></tr>
      </table>
      <p style="margin-top: 16px; color: #666; font-size: 12px;">Attachments: ${pdfName}, ${excelName}</p>
    </div>
  `;

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
