import { sendTemplateEmail } from "@/lib/brevo/sendTemplateEmail";
import { inventoryExcelFilename } from "@/lib/reports/inventory/exportExcel";
import { inventoryPdfFilename } from "@/lib/reports/inventory/exportPdf";

/**
 * Email Inventory & Stock report PDF + Excel via Brevo.
 */
export async function sendInventoryReportEmail({
  to,
  restaurantName,
  meta,
  overview,
  pdfBuffer,
  excelBuffer,
  rowCount,
}) {
  const name = restaurantName || "Tasty Bites";
  const dateFrom = meta?.dateFrom || "";
  const dateTo = meta?.dateTo || "";
  const pdfName = inventoryPdfFilename(dateFrom, dateTo);
  const excelName = inventoryExcelFilename(dateFrom, dateTo);
  const subject = `${name} — Inventory & Stock Report (${dateFrom} to ${dateTo})`;
  const kpis = overview?.kpis || {};

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; color: #222; line-height: 1.5;">
      <h2 style="margin-bottom: 8px;">${name} — Inventory & Stock Report</h2>
      <p style="margin: 0 0 16px;">Please find the inventory report attached (PDF and Excel).</p>
      <table style="border-collapse: collapse; min-width: 320px;">
        <tr><td style="padding: 4px 12px 4px 0;"><strong>Period</strong></td><td>${meta?.preset || "Custom"} (${dateFrom} to ${dateTo})</td></tr>
        <tr><td style="padding: 4px 12px 4px 0;"><strong>Products</strong></td><td>${rowCount ?? kpis.totalProducts ?? 0}</td></tr>
        <tr><td style="padding: 4px 12px 4px 0;"><strong>Stock In</strong></td><td>+${kpis.stockAdded ?? 0} units</td></tr>
        <tr><td style="padding: 4px 12px 4px 0;"><strong>Stock Out</strong></td><td>-${kpis.stockRemoved ?? 0} units</td></tr>
        <tr><td style="padding: 4px 12px 4px 0;"><strong>Movements</strong></td><td>${kpis.movementCount ?? 0}</td></tr>
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
