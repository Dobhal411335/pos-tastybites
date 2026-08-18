import { createRequire } from "module";
import { employeeReportFilename } from "@/lib/reports/employee/exportHelpers";

const require = createRequire(import.meta.url);
const PDFDocument = require("pdfkit");

const money = (n) =>
  `$${(Math.round((Number(n) || 0) * 100) / 100).toFixed(2)}`;

function pageWidth(doc) {
  return doc.page.width - doc.page.margins.left - doc.page.margins.right;
}

function resetCursor(doc, y = doc.y) {
  doc.x = doc.page.margins.left;
  doc.y = y;
}

export async function exportEmployeeReportPdf(payload) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "LETTER",
        layout: "landscape",
        margins: { top: 36, bottom: 36, left: 36, right: 36 },
        info: {
          Title: "Employee & Staff Report",
          Author: "Tasty Bites",
        },
      });
      const chunks = [];
      doc.on("data", (c) => chunks.push(c));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      const left = doc.page.margins.left;
      const width = pageWidth(doc);
      const { restaurantName, labels, overview, rows = [], employee, attendanceStats } = payload;

      doc
        .font("Helvetica-Bold")
        .fontSize(16)
        .fillColor("#111")
        .text(restaurantName || "Tasty Bites", left, doc.y, { width, align: "left" });
      doc
        .font("Helvetica-Bold")
        .fontSize(12)
        .text(
          employee
            ? `${labels.employeeName || employee.name} — Performance Report`
            : "Employee & Staff Report",
          left,
          doc.y,
          { width, align: "left" }
        );
      doc.font("Helvetica").fontSize(9).fillColor("#444");
      doc.text(`Generated: ${new Date().toLocaleString()}`, left, doc.y, {
        width,
        align: "left",
      });
      doc.text(
        `Period: ${labels.periodLabel || "Current filters"} (${labels.dateFrom} to ${labels.dateTo})`,
        left,
        doc.y,
        { width, align: "left" }
      );
      if (employee) {
        doc.text(
          `Employee: ${labels.employeeName || employee.name}    Role: ${employee.role || "Staff"}`,
          left,
          doc.y,
          { width, align: "left" }
        );
      }
      doc.text(
        `Shift: ${labels.shiftLabel}    Status: ${labels.orderStatusLabel}    Payment: ${labels.paymentLabel}`,
        left,
        doc.y,
        { width, align: "left" }
      );
      if (!employee) {
        doc.text(
          `Staff group: ${labels.staffTabLabel}${
            labels.searchLabel ? `    Search: ${labels.searchLabel}` : ""
          }`,
          left,
          doc.y,
          { width, align: "left" }
        );
        doc.text(
          `Staff: ${overview.totalStaff ?? 0}    Clocked in: ${overview.clockedIn ?? 0}    Est. pay: ${money(overview.estimatedPay)}`,
          left,
          doc.y,
          { width, align: "left" }
        );
      } else {
        doc.text(
          `Hours: ${overview.totalHours ?? 0}    Sales: ${money(overview.totalSales)}    Tips: ${money(overview.totalTips)}    Est. pay: ${money(overview.estimatedPay)}`,
          left,
          doc.y,
          { width, align: "left" }
        );
        if (attendanceStats) {
          doc.text(
            `Attendance: ${attendanceStats.workedDays ?? 0} worked / ${attendanceStats.scheduledDays ?? 0} scheduled    Absent: ${attendanceStats.absentDays ?? 0}    Late: ${attendanceStats.lateDays ?? 0}`,
            left,
            doc.y,
            { width, align: "left" }
          );
        }
      }
      doc.moveDown(0.8);
      resetCursor(doc);

      const headers = [
        "Employee",
        "Role",
        "Status",
        "Clock In",
        "Clock Out",
        "Hrs",
        "Sales",
        "Tips",
        "Svc",
        "Can",
        "Est Pay",
      ];
      const colW = [
        width * 0.14,
        width * 0.1,
        width * 0.08,
        width * 0.09,
        width * 0.09,
        width * 0.06,
        width * 0.09,
        width * 0.08,
        width * 0.09,
        width * 0.06,
        width * 0.12,
      ];
      const rowH = 16;

      const drawHeader = (y) => {
        let x = left;
        doc.font("Helvetica-Bold").fontSize(8).fillColor("#333");
        headers.forEach((h, i) => {
          doc.text(h, x, y, { width: colW[i] - 4, align: "left", lineBreak: false });
          x += colW[i];
        });
        doc
          .moveTo(left, y + rowH - 2)
          .lineTo(left + width, y + rowH - 2)
          .strokeColor("#ccc")
          .stroke();
        return y + rowH;
      };

      let y = drawHeader(doc.y);

      const drawRow = (row) => {
        if (y + rowH > doc.page.height - doc.page.margins.bottom) {
          doc.addPage({ layout: "landscape" });
          y = drawHeader(doc.page.margins.top);
        }
        let x = left;
        doc.font("Helvetica").fontSize(8).fillColor("#222");
        const values = [
          row.name || "",
          row.role || "",
          row.clockedIn ? "In" : "Out",
          row.clockIn || "—",
          row.clockOut || "—",
          String(Number(row.hours) || 0),
          money(row.sales),
          money(row.tips),
          money(row.serviceCharges),
          String(Number(row.cancellations) || 0),
          money(row.estimatedPay),
        ];
        values.forEach((value, i) => {
          doc.text(String(value), x, y, {
            width: colW[i] - 4,
            align: i >= 5 ? "right" : "left",
            lineBreak: false,
          });
          x += colW[i];
        });
        y += rowH;
      };

      for (const row of rows) drawRow(row);

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

export function employeePdfFilename(dateFrom, dateTo, employeeName) {
  return employeeReportFilename(dateFrom, dateTo, "pdf", employeeName);
}
