import { sendTemplateEmail } from "@/lib/brevo/sendTemplateEmail";
import { adminExcelFilename } from "@/lib/reports/admin/exportExcel";
import { adminPdfFilename } from "@/lib/reports/admin/exportPdf";

const SECTION_LABELS = {
  "daily-summary": "Daily Summary",
  revenue: "Revenue Generated",
  activity: "Admin Activity",
  audit: "Transaction Audit",
  kitchen: "Kitchen Log",
};

/**
 * Email Admin report PDF + Excel via Brevo.
 */
export async function sendAdminReportEmail({
  to,
  restaurantName,
  section,
  meta,
  pdfBuffer,
  excelBuffer,
  rowCount = 0,
}) {
  const name = restaurantName || "Tasty Bites";
  const sectionLabel = SECTION_LABELS[section] || "Admin Report";
  const dateFrom = meta?.dateFrom || "";
  const dateTo = meta?.dateTo || "";
  const pdfName = adminPdfFilename(section, dateFrom, dateTo);
  const excelName = adminExcelFilename(section, dateFrom, dateTo);
  const subject = `${name} — ${sectionLabel} (${dateFrom} to ${dateTo})`;

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; color: #222; line-height: 1.5;">
      <h2 style="margin-bottom: 8px;">${name} — ${sectionLabel}</h2>
      <p style="margin: 0 0 16px;">Please find the admin report attached (PDF and Excel).</p>
      <table style="border-collapse: collapse; min-width: 320px;">
        <tr><td style="padding: 4px 12px 4px 0;"><strong>Report</strong></td><td>${sectionLabel}</td></tr>
        <tr><td style="padding: 4px 12px 4px 0;"><strong>Period</strong></td><td>${meta?.preset || "Custom"} (${dateFrom} to ${dateTo})</td></tr>
        <tr><td style="padding: 4px 12px 4px 0;"><strong>Rows</strong></td><td>${rowCount ?? 0}</td></tr>
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
