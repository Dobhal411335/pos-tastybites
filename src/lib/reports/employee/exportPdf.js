import { createRequire } from "module";
import { employeeReportFilename } from "@/lib/reports/employee/exportHelpers";

const require = createRequire(import.meta.url);
const PDFDocument = require("pdfkit");

const HEADER_FILL = "#FCE4D6";
const HEADER_TEXT = "#7C2D12";
const TOTAL_FILL = "#F4F4F5";
const ZEBRA = "#FFFBF7";
const BORDER = "#D4D4D8";
const ACCENT_BANNER = "#FFF7ED";

const money = (n) =>
  `$${(Math.round((Number(n) || 0) * 100) / 100).toFixed(2)}`;

function pageWidth(doc) {
  return doc.page.width - doc.page.margins.left - doc.page.margins.right;
}

function resetCursor(doc, y = doc.y) {
  doc.x = doc.page.margins.left;
  doc.y = y;
}

function contentBottom(doc) {
  return doc.page.height - doc.page.margins.bottom;
}

function formatDateTime(dateStr, tz) {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "—";
    const opts = { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" };
    if (tz) opts.timeZone = tz;
    return d.toLocaleString("en-US", opts);
  } catch (err) {
    return "—";
  }
}

function splitName(name) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return { first: "—", last: "—" };
  if (parts.length === 1) return { first: parts[0], last: "—" };
  return { first: parts[0], last: parts.slice(1).join(" ") };
}

function cellText(doc, str, x, y, w, opts = {}) {
  doc.text(String(str ?? ""), x, y, {
    width: w,
    align: opts.align || "left",
    lineBreak: false,
    ellipsis: true,
  });
}

/**
 * Draw a full-grid table with light header fill and cell borders.
 */
function drawBorderedTable(doc, headers, colW, rows, { alignRightFrom, totalRow } = {}) {
  const left = doc.page.margins.left;
  const width = pageWidth(doc);
  const rowH = 20;
  const headerH = 22;
  const limit = contentBottom(doc);

  const drawVerticals = (y, h) => {
    let x = left;
    doc.strokeColor(BORDER).lineWidth(0.4);
    for (let i = 0; i < colW.length; i++) {
      doc
        .moveTo(x, y)
        .lineTo(x, y + h)
        .stroke();
      x += colW[i];
    }
    doc
      .moveTo(left + width, y)
      .lineTo(left + width, y + h)
      .stroke();
  };

  const drawHeader = (y) => {
    doc.rect(left, y, width, headerH).fill(HEADER_FILL);
    doc.rect(left, y, width, headerH).strokeColor(BORDER).lineWidth(0.6).stroke();
    drawVerticals(y, headerH);

    let x = left;
    doc.font("Helvetica-Bold").fontSize(8).fillColor(HEADER_TEXT);
    headers.forEach((h, i) => {
      const align =
        i >= (alignRightFrom ?? headers.length) ? "right" : "center";
      cellText(doc, h, x + 3, y + 7, colW[i] - 6, { align });
      x += colW[i];
    });
    return y + headerH;
  };

  let y = drawHeader(doc.y);
  let rowIndex = 0;

  const drawRow = (cells, { fill, bold } = {}) => {
    if (y + rowH > limit) {
      doc.addPage({ layout: "landscape" });
      resetCursor(doc, doc.page.margins.top);
      y = drawHeader(doc.y);
      rowIndex = 0;
    }

    if (fill) {
      doc.rect(left, y, width, rowH).fill(fill);
    } else if (rowIndex % 2 === 1) {
      doc.rect(left, y, width, rowH).fill(ZEBRA);
    }

    doc.rect(left, y, width, rowH).strokeColor(BORDER).lineWidth(0.4).stroke();
    drawVerticals(y, rowH);

    let x = left;
    doc
      .font(bold ? "Helvetica-Bold" : "Helvetica")
      .fontSize(8)
      .fillColor("#18181B");
    cells.forEach((cell, i) => {
      const align =
        i >= (alignRightFrom ?? headers.length) ? "right" : "center";
      cellText(doc, String(cell ?? ""), x + 3, y + 6, colW[i] - 6, { align });
      x += colW[i];
    });
    y += rowH;
    rowIndex += 1;
  };

  for (const cells of rows) drawRow(cells);
  if (totalRow) drawRow(totalRow, { fill: TOTAL_FILL, bold: true });

  doc.y = y + 10;
  resetCursor(doc);
}

function drawBanner(doc, restaurantName, title, lines = []) {
  const left = doc.page.margins.left;
  const width = pageWidth(doc);
  const startY = doc.y;
  const height = 28 + lines.length * 12;

  doc.rect(left, startY, width, height).fill(ACCENT_BANNER);
  doc.rect(left, startY, width, height).strokeColor(BORDER).lineWidth(0.5).stroke();

  doc
    .font("Helvetica-Bold")
    .fontSize(14)
    .fillColor("#9A3412")
    .text(restaurantName || "Tasty Bites", left + 12, startY + 8, {
      width: width - 24,
    });
  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor("#18181B")
    .text(title, left + 12, startY + 24, { width: width - 24 });

  doc.font("Helvetica").fontSize(8).fillColor("#52525B");
  let ly = startY + 38;
  for (const line of lines) {
    doc.text(line, left + 12, ly, { width: width - 24 });
    ly += 12;
  }

  doc.y = startY + height + 12;
  resetCursor(doc);
}

export async function exportEmployeeReportPdf(payload) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "LETTER",
        layout: "landscape",
        bufferPages: true,
        margins: { top: 32, bottom: 32, left: 28, right: 28 },
        info: {
          Title: "Employee & Staff Report",
          Author: "Tasty Bites",
        },
      });
      const chunks = [];
      doc.on("data", (c) => chunks.push(c));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      const width = pageWidth(doc);
      const { restaurantName, labels, overview, rows = [], employee, attendanceStats } =
        payload;

      const title = employee
        ? `${labels.employeeName || employee.name} — Performance Report`
        : "Employee & Staff Report";

      const metaLines = [
        `Generated: ${new Date().toLocaleString()}`,
        `Period: ${labels.periodLabel || "Current filters"} (${labels.dateFrom} to ${labels.dateTo})`,
        `Shift: ${labels.shiftLabel}  ·  Status: ${labels.orderStatusLabel}  ·  Payment: ${labels.paymentLabel}`,
      ];
      if (employee) {
        metaLines.push(
          `Employee: ${labels.employeeName || employee.name}  ·  Role: ${employee.role || "Staff"}  ·  Hours: ${overview.totalHours ?? 0}  ·  Sales: ${money(overview.totalSales)}  ·  Tips: ${money(overview.totalTips)}`
        );
        if (attendanceStats) {
          metaLines.push(
            `Attendance: ${attendanceStats.workedDays ?? 0} worked / ${attendanceStats.scheduledDays ?? 0} scheduled  ·  Absent: ${attendanceStats.absentDays ?? 0}  ·  Late: ${attendanceStats.lateDays ?? 0}`
          );
        }
      } else {
        metaLines.push(
          `Staff: ${overview.totalStaff ?? 0}  ·  Clocked in: ${overview.clockedIn ?? 0}  ·  Sales: ${money(overview.totalSales)}  ·  Tips: ${money(overview.distributedTips ?? overview.totalTips)}  ·  Est. pay: ${money(overview.estimatedPay)}`
        );
      }

      drawBanner(doc, restaurantName, title, metaLines);

      // Performance grid
      const perfHeaders = [
        "Employee",
        "Role",
        "Status",
        "Clock In",
        "Clock Out",
        "Hrs",
        "Sales",
        "Tips",
        "Svc",
        "Cancel",
        "Est Pay",
      ];
      const perfColW = [
        width * 0.14,
        width * 0.1,
        width * 0.07,
        width * 0.09,
        width * 0.09,
        width * 0.06,
        width * 0.09,
        width * 0.08,
        width * 0.08,
        width * 0.07,
        width * 0.13,
      ];

      const perfRows = rows.map((row) => [
        row.name || "",
        row.role || "",
        row.clockedIn ? "In" : "Out",
        formatDateTime(row.clockIn, payload.meta?.timezone),
        formatDateTime(row.clockOut, payload.meta?.timezone),
        String(Number(row.hours) || 0),
        money(row.sales),
        money(row.tips),
        money(row.serviceCharges),
        String(Number(row.cancellations) || 0),
        money(row.estimatedPay),
      ]);

      const totals = rows.reduce(
        (acc, row) => {
          acc.hours += Number(row.hours) || 0;
          acc.sales += Number(row.sales) || 0;
          acc.tips += Number(row.tips) || 0;
          acc.serviceCharges += Number(row.serviceCharges) || 0;
          acc.cancellations += Number(row.cancellations) || 0;
          acc.estimatedPay += Number(row.estimatedPay) || 0;
          return acc;
        },
        { hours: 0, sales: 0, tips: 0, serviceCharges: 0, cancellations: 0, estimatedPay: 0 }
      );

      doc.font("Helvetica-Bold").fontSize(11).fillColor("#18181B").text("Staff Performance");
      doc.moveDown(0.3);
      resetCursor(doc);

      drawBorderedTable(doc, perfHeaders, perfColW, perfRows, {
        alignRightFrom: 5,
        totalRow: [
          "TOTAL",
          "",
          "",
          "",
          "",
          String(Math.round(totals.hours * 100) / 100),
          money(totals.sales),
          money(totals.tips),
          money(totals.serviceCharges),
          String(totals.cancellations),
          money(totals.estimatedPay),
        ],
      });

      // Payroll-style earnings table (second section)
      const hasPay = rows.some(
        (r) => Number(r.hourlyRate) > 0 || Number(r.estimatedPay) > 0
      );
      if (hasPay) {
        if (doc.y > contentBottom(doc) - 80) {
          doc.addPage({ layout: "landscape" });
          resetCursor(doc, doc.page.margins.top);
        }
        doc.font("Helvetica-Bold").fontSize(11).fillColor("#18181B").text("Labor / Earnings");
        doc.moveDown(0.3);
        resetCursor(doc);

        const payHeaders = [
          "Employee ID",
          "First Name",
          "Last Name",
          "Position",
          "Hourly Rate",
          "Hours Worked",
          "Total Earnings",
        ];
        const payColW = [
          width * 0.12,
          width * 0.14,
          width * 0.14,
          width * 0.16,
          width * 0.14,
          width * 0.14,
          width * 0.16,
        ];
        const payRows = rows.map((row) => {
          const { first, last } = splitName(row.name);
          return [
            row.employeeCode || "—",
            first,
            last,
            row.role || "Staff",
            money(row.hourlyRate),
            String(Number(row.hours) || 0),
            money(row.estimatedPay),
          ];
        });

        drawBorderedTable(doc, payHeaders, payColW, payRows, {
          alignRightFrom: 4,
          totalRow: [
            "TOTAL",
            "",
            "",
            "",
            "",
            String(Math.round(totals.hours * 100) / 100),
            money(totals.estimatedPay),
          ],
        });
      }

      // Footer page numbers
      const pages = doc.bufferedPageRange();
      const footerY = doc.page.height - 20;
      doc.font("Helvetica").fontSize(7).fillColor("#A1A1AA");
      for (let i = pages.start; i < pages.start + pages.count; i++) {
        doc.switchToPage(i);
        const label = `Page ${i - pages.start + 1} of ${pages.count}`;
        const footerX =
          doc.page.margins.left + (pageWidth(doc) - doc.widthOfString(label)) / 2;
        doc.text(label, footerX, footerY, { lineBreak: false });
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

export function employeePdfFilename(dateFrom, dateTo, employeeName) {
  return employeeReportFilename(dateFrom, dateTo, "pdf", employeeName);
}
