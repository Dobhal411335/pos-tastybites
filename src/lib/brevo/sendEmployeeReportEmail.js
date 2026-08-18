import { sendTemplateEmail } from "@/lib/brevo/sendTemplateEmail";
import { employeeExcelFilename } from "@/lib/reports/employee/exportExcel";
import { employeePdfFilename } from "@/lib/reports/employee/exportPdf";

/**
 * Email Employee & Staff report PDF + Excel via Brevo.
 */
export async function sendEmployeeReportEmail({
  to,
  restaurantName,
  labels,
  overview,
  pdfBuffer,
  excelBuffer,
  rowCount,
}) {
  const name = restaurantName || "Tasty Bites";
  const pdfName = employeePdfFilename(labels.dateFrom, labels.dateTo, labels.employeeName);
  const excelName = employeeExcelFilename(labels.dateFrom, labels.dateTo, labels.employeeName);
  const subject = labels.employeeName
    ? `${name} — ${labels.employeeName} performance report (${labels.dateFrom} to ${labels.dateTo})`
    : `${name} — Employee & Staff Report (${labels.dateFrom} to ${labels.dateTo})`;

  const intro = labels.employeeName
    ? `Please find the performance report for ${labels.employeeName} attached (PDF and Excel).`
    : "Please find the employee performance report attached (PDF and Excel).";

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; color: #222; line-height: 1.5;">
      <h2 style="margin-bottom: 8px;">${name} — ${labels.employeeName ? `${labels.employeeName} Report` : "Employee & Staff Report"}</h2>
      <p style="margin: 0 0 16px;">${intro}</p>
      <table style="border-collapse: collapse; min-width: 320px;">
        ${
          labels.employeeName
            ? `<tr><td style="padding: 4px 12px 4px 0;"><strong>Employee</strong></td><td>${labels.employeeName}</td></tr>`
            : ""
        }
        <tr><td style="padding: 4px 12px 4px 0;"><strong>Period</strong></td><td>${labels.periodLabel || "Current filters"} (${labels.dateFrom} to ${labels.dateTo})</td></tr>
        <tr><td style="padding: 4px 12px 4px 0;"><strong>Shift</strong></td><td>${labels.shiftLabel}</td></tr>
        <tr><td style="padding: 4px 12px 4px 0;"><strong>Order Status</strong></td><td>${labels.orderStatusLabel}</td></tr>
        <tr><td style="padding: 4px 12px 4px 0;"><strong>Payment</strong></td><td>${labels.paymentLabel}</td></tr>
        ${
          labels.employeeName
            ? ""
            : `<tr><td style="padding: 4px 12px 4px 0;"><strong>Staff Group</strong></td><td>${labels.staffTabLabel}</td></tr>`
        }
        ${
          labels.searchLabel
            ? `<tr><td style="padding: 4px 12px 4px 0;"><strong>Search</strong></td><td>${labels.searchLabel}</td></tr>`
            : ""
        }
        <tr><td style="padding: 4px 12px 4px 0;"><strong>Employees</strong></td><td>${rowCount ?? 0}</td></tr>
        <tr><td style="padding: 4px 12px 4px 0;"><strong>Estimated Pay</strong></td><td>$${(Math.round((Number(overview?.estimatedPay) || 0) * 100) / 100).toFixed(2)}</td></tr>
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
