import { createRequire } from "module";
import {
  employeeReportFilename,
  resolveExportView,
} from "@/lib/reports/employee/exportHelpers";

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

const hours = (n) => String(Math.round((Number(n) || 0) * 100) / 100);

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
    const opts = {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    };
    if (tz) opts.timeZone = tz;
    return d.toLocaleString("en-US", opts);
  } catch {
    return "—";
  }
}

function formatDate(dateStr, tz) {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "—";
    const opts = { month: "short", day: "numeric", year: "numeric" };
    if (tz) opts.timeZone = tz;
    return d.toLocaleDateString("en-US", opts);
  } catch {
    return "—";
  }
}

function formatTime(dateStr, tz) {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "—";
    const opts = { hour: "numeric", minute: "2-digit" };
    if (tz) opts.timeZone = tz;
    return d.toLocaleTimeString("en-US", opts);
  } catch {
    return "—";
  }
}

function cellText(doc, str, x, y, w, opts = {}) {
  doc.text(String(str ?? ""), x, y, {
    width: w,
    align: opts.align || "left",
    lineBreak: false,
    ellipsis: true,
  });
}

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
      doc.moveTo(x, y).lineTo(x, y + h).stroke();
      x += colW[i];
    }
    doc.moveTo(left + width, y).lineTo(left + width, y + h).stroke();
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
    }
    if (fill) {
      doc.rect(left, y, width, rowH).fill(fill);
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
        i >= (alignRightFrom ?? cells.length) ? "right" : "left";
      cellText(doc, cell, x + 3, y + 6, colW[i] - 6, { align });
      x += colW[i];
    });
    y += rowH;
    rowIndex += 1;
  };

  for (const row of rows) {
    drawRow(row, { fill: rowIndex % 2 === 1 ? ZEBRA : null });
  }
  if (totalRow) {
    drawRow(totalRow, { fill: TOTAL_FILL, bold: true });
  }
  doc.y = y + 8;
  resetCursor(doc);
}

function drawBanner(doc, restaurantName, title, lines) {
  const left = doc.page.margins.left;
  const width = pageWidth(doc);
  const padX = 12;
  const padY = 10;
  const innerW = width - padX * 2;

  doc.font("Helvetica-Bold").fontSize(10).fillColor("#9A3412");
  const brandH = doc.heightOfString(String(restaurantName || "Tasty Bites"), {
    width: innerW,
  });
  doc.font("Helvetica-Bold").fontSize(14).fillColor("#18181B");
  const titleH = doc.heightOfString(String(title || ""), { width: innerW });
  doc.font("Helvetica").fontSize(8).fillColor("#52525B");
  let linesH = 0;
  for (const line of lines) {
    linesH +=
      doc.heightOfString(String(line || ""), { width: innerW }) + 2;
  }
  const height = padY + brandH + 4 + titleH + 6 + linesH + padY;

  const startY = doc.y;
  doc.rect(left, startY, width, height).fill(ACCENT_BANNER);
  doc.rect(left, startY, width, height).strokeColor(BORDER).lineWidth(0.6).stroke();

  let y = startY + padY;
  doc.font("Helvetica-Bold").fontSize(10).fillColor("#9A3412");
  doc.text(String(restaurantName || "Tasty Bites"), left + padX, y, {
    width: innerW,
  });
  y += brandH + 4;
  doc.font("Helvetica-Bold").fontSize(14).fillColor("#18181B");
  doc.text(String(title || ""), left + padX, y, { width: innerW });
  y += titleH + 6;
  doc.font("Helvetica").fontSize(8).fillColor("#52525B");
  for (const line of lines) {
    const h = doc.heightOfString(String(line || ""), { width: innerW });
    doc.text(String(line || ""), left + padX, y, {
      width: innerW,
      lineBreak: true,
    });
    y += h + 2;
  }
  doc.y = startY + height + 12;
  resetCursor(doc);
}

function sectionTitle(doc, title) {
  if (doc.y > contentBottom(doc) - 60) {
    doc.addPage({ layout: "landscape" });
    resetCursor(doc, doc.page.margins.top);
  }
  doc.font("Helvetica-Bold").fontSize(11).fillColor("#18181B").text(title);
  doc.moveDown(0.3);
  resetCursor(doc);
}

function writeOverview(doc, payload) {
  const width = pageWidth(doc);
  const rows = payload.rows || [];
  const headers = [
    "Employee",
    "Role",
    "Orders",
    "Net Sales",
    "Tips",
    "Svc Charges",
    "Hours",
  ];
  const colW = [
    width * 0.22,
    width * 0.14,
    width * 0.1,
    width * 0.14,
    width * 0.12,
    width * 0.14,
    width * 0.14,
  ];
  const tableRows = rows.map((row) => [
    row.name || "",
    row.role || "",
    String(Number(row.orders) || 0),
    money(row.sales),
    money(row.tips),
    money(row.serviceCharges),
    hours(row.hours),
  ]);
  const totals = rows.reduce(
    (acc, row) => {
      acc.orders += Number(row.orders) || 0;
      acc.sales += Number(row.sales) || 0;
      acc.tips += Number(row.tips) || 0;
      acc.svc += Number(row.serviceCharges) || 0;
      acc.hours += Number(row.hours) || 0;
      return acc;
    },
    { orders: 0, sales: 0, tips: 0, svc: 0, hours: 0 }
  );
  sectionTitle(doc, "Staff performance");
  drawBorderedTable(doc, headers, colW, tableRows, {
    alignRightFrom: 2,
    totalRow: [
      "TOTAL",
      "",
      String(totals.orders),
      money(totals.sales),
      money(totals.tips),
      money(totals.svc),
      hours(totals.hours),
    ],
  });
}

function writeSales(doc, payload) {
  const width = pageWidth(doc);
  const rows = payload.rows || [];
  const headers = [
    "Employee",
    "Orders",
    "Gross",
    "Discounts",
    "Net",
    "AOV",
    "Cancelled",
  ];
  const colW = [
    width * 0.22,
    width * 0.1,
    width * 0.14,
    width * 0.14,
    width * 0.14,
    width * 0.12,
    width * 0.14,
  ];
  const tableRows = rows.map((row) => {
    const net = Number(row.sales) || 0;
    const disc = Number(row.discounts) || 0;
    return [
      `${row.name || ""}${row.role ? ` (${row.role})` : ""}`,
      String(Number(row.orders) || 0),
      money(net + disc),
      money(disc),
      money(net),
      money(row.aov),
      String(Number(row.cancellations) || 0),
    ];
  });
  sectionTitle(doc, "Sales by employee");
  drawBorderedTable(doc, headers, colW, tableRows, { alignRightFrom: 1 });
}

function writeTips(doc, payload) {
  const width = pageWidth(doc);
  const rows = payload.rows || [];
  const headers = [
    "Employee",
    "Orders",
    "Mode",
    "Collected",
    "Earned",
    "Avg Collected",
  ];
  const colW = [
    width * 0.26,
    width * 0.1,
    width * 0.12,
    width * 0.16,
    width * 0.16,
    width * 0.2,
  ];
  const tableRows = rows.map((row) => [
    `${row.name || ""}${row.receiveOwnTips ? " · Own tips" : row.role ? ` · ${row.role}` : ""}`,
    String(Number(row.orders) || 0),
    row.receiveOwnTips ? "Own" : `${row.tipPercent || 0}%`,
    money(row.collectedTips),
    money(row.tips),
    money(row.averageTip),
  ]);
  sectionTitle(doc, "Tips by employee");
  drawBorderedTable(doc, headers, colW, tableRows, { alignRightFrom: 1 });
}

function writeService(doc, payload) {
  const width = pageWidth(doc);
  const rows = payload.rows || [];
  const headers = ["Employee", "Orders", "Service Charges", "Total Sales"];
  const colW = [width * 0.34, width * 0.14, width * 0.26, width * 0.26];
  const tableRows = rows.map((row) => [
    `${row.name || ""}${row.role ? ` (${row.role})` : ""}`,
    String(Number(row.orders) || 0),
    money(row.serviceCharges),
    money(row.sales),
  ]);
  sectionTitle(doc, "Service charges by employee");
  drawBorderedTable(doc, headers, colW, tableRows, { alignRightFrom: 1 });
}

function writeHours(doc, payload) {
  const width = pageWidth(doc);
  const rows = payload.rows || [];
  const headers = [
    "Employee",
    "Regular",
    "Break",
    "Overtime",
    "Total",
    "Days",
  ];
  const colW = [
    width * 0.28,
    width * 0.14,
    width * 0.12,
    width * 0.14,
    width * 0.16,
    width * 0.16,
  ];
  const tableRows = rows.map((row) => [
    `${row.name || ""}${row.role ? ` (${row.role})` : ""}`,
    hours(row.regularHours),
    "—",
    hours(row.overtimeHours),
    hours(row.hours),
    String(Number(row.daysWorked) || 0),
  ]);
  sectionTitle(doc, "Working hours by employee");
  drawBorderedTable(doc, headers, colW, tableRows, { alignRightFrom: 1 });
}

function writeLabor(doc, payload) {
  const width = pageWidth(doc);
  const rows = payload.rows || [];
  const headers = [
    "Employee ID",
    "Employee",
    "Position",
    "Hourly Rate",
    "Hours Worked",
    "Total Earnings",
  ];
  const colW = [
    width * 0.14,
    width * 0.26,
    width * 0.16,
    width * 0.14,
    width * 0.14,
    width * 0.16,
  ];
  const tableRows = rows.map((row) => [
    row.employeeCode || "—",
    row.name || "—",
    row.role || "Staff",
    money(row.hourlyRate),
    hours(row.hours),
    money(row.estimatedPay),
  ]);
  const totals = rows.reduce(
    (acc, row) => {
      acc.hours += Number(row.hours) || 0;
      acc.pay += Number(row.estimatedPay) || 0;
      return acc;
    },
    { hours: 0, pay: 0 }
  );
  sectionTitle(doc, "Hourly labor cost");
  drawBorderedTable(doc, headers, colW, tableRows, {
    alignRightFrom: 3,
    totalRow: ["TOTAL", "", "", "", hours(totals.hours), money(totals.pay)],
  });
}

function writeClock(doc, payload) {
  const width = pageWidth(doc);
  const tz = payload.meta?.timezone;
  const rows = payload.rows || [];
  const headers = [
    "Employee",
    "Date",
    "Clock In",
    "Clock Out",
    "Break",
    "Hours",
    "OT",
    "Status",
  ];
  const colW = [
    width * 0.18,
    width * 0.12,
    width * 0.12,
    width * 0.12,
    width * 0.08,
    width * 0.1,
    width * 0.1,
    width * 0.18,
  ];
  const tableRows = rows.map((row) => [
    `${row.employeeName || ""}${row.role ? ` (${row.role})` : ""}`,
    formatDate(row.date || row.clockIn, tz),
    formatTime(row.clockIn, tz),
    row.isIncomplete ? "—" : formatTime(row.clockOut, tz),
    "—",
    hours(row.workedHours),
    hours(row.overtimeHours),
    row.isIncomplete
      ? "Working"
      : row.attendanceStatus || row.shiftStatus || "—",
  ]);
  sectionTitle(doc, "Clock in / out");
  drawBorderedTable(doc, headers, colW, tableRows, { alignRightFrom: 5 });
}

function writeTimesheet(doc, payload) {
  const width = pageWidth(doc);
  const tz = payload.meta?.timezone;
  const rows = payload.rows || [];
  const headers = [
    "Date",
    "Employee",
    "Scheduled",
    "Clock In",
    "Clock Out",
    "Break",
    "Regular",
    "OT",
    "Total",
  ];
  const colW = [
    width * 0.1,
    width * 0.16,
    width * 0.16,
    width * 0.1,
    width * 0.1,
    width * 0.08,
    width * 0.1,
    width * 0.1,
    width * 0.1,
  ];
  const tableRows = rows.map((row) => {
    let scheduled = row.scheduledShift || "—";
    if (row.scheduledStart) {
      scheduled = `${scheduled} ${formatTime(row.scheduledStart, tz)}${
        row.scheduledEnd ? `–${formatTime(row.scheduledEnd, tz)}` : ""
      }`;
    }
    return [
      formatDate(row.date || row.clockIn, tz),
      `${row.employeeName || ""}${row.role ? ` (${row.role})` : ""}`,
      scheduled,
      formatTime(row.clockIn, tz),
      row.isIncomplete ? "—" : formatTime(row.clockOut, tz),
      "—",
      hours(row.regularHours),
      hours(row.overtimeHours),
      hours(row.workedHours),
    ];
  });
  sectionTitle(doc, "Timesheet details");
  drawBorderedTable(doc, headers, colW, tableRows, { alignRightFrom: 6 });
}

function writeOrders(doc, payload) {
  const width = pageWidth(doc);
  const tz = payload.meta?.timezone;
  const rows = payload.rows || [];
  const headers = [
    "Order",
    "Date/Time",
    "Employee",
    "Table",
    "Subtotal",
    "Disc",
    "Tax",
    "Svc",
    "Tip",
    "Total",
    "Pay",
    "Status",
  ];
  const colW = [
    width * 0.07,
    width * 0.11,
    width * 0.12,
    width * 0.16,
    width * 0.08,
    width * 0.07,
    width * 0.06,
    width * 0.06,
    width * 0.06,
    width * 0.08,
    width * 0.07,
    width * 0.06,
  ];
  const tableRows = rows.map((row) => [
    `#${row.orderNumber || ""}`,
    formatDateTime(row.createdAt, tz),
    row.employeeName || "",
    row.tableNo || "—",
    money(row.subTotal),
    money(row.discountTotal),
    money(row.taxTotal),
    money(row.serviceChargeTotal),
    money(row.tipAmount),
    money(row.totalAmount),
    row.paymentLabel || "—",
    row.status || "",
  ]);
  sectionTitle(doc, "Staff order list");
  drawBorderedTable(doc, headers, colW, tableRows, { alignRightFrom: 4 });
}

function writeCancellations(doc, payload) {
  const width = pageWidth(doc);
  const tz = payload.meta?.timezone;
  const rows = payload.rows || [];
  const headers = [
    "Employee",
    "Order",
    "Date",
    "Amount",
    "Reason",
    "Cancelled By",
    "Status",
  ];
  const colW = [
    width * 0.16,
    width * 0.1,
    width * 0.14,
    width * 0.1,
    width * 0.22,
    width * 0.14,
    width * 0.14,
  ];
  const tableRows = rows.map((row) => [
    row.employeeName || "",
    `#${row.orderNumber || ""}`,
    formatDateTime(row.createdAt, tz),
    money(row.amount),
    row.reason || "—",
    row.cancelledBy || "—",
    row.status || "",
  ]);
  sectionTitle(doc, "Cancellations");
  drawBorderedTable(doc, headers, colW, tableRows, { alignRightFrom: 3 });
}

function writeTipsByPayment(doc, payload) {
  const width = pageWidth(doc);
  const methods = payload.methods || payload.rows || [];
  const earned = payload.earnedByEmployee || [];
  const byEmp = payload.byEmployee || [];

  sectionTitle(doc, "Collected tips by payment method");
  drawBorderedTable(
    doc,
    ["Payment Method", "Orders", "Collected Tips", "Average Tip", "Tip % of sales"],
    [width * 0.28, width * 0.14, width * 0.2, width * 0.2, width * 0.18],
    methods.map((row) => [
      row.method || "",
      String(Number(row.orders) || 0),
      money(row.tips),
      money(row.averageTip),
      `${Number(row.tipPercent || 0).toFixed(1)}%`,
    ]),
    { alignRightFrom: 1 }
  );

  if (earned.length) {
    sectionTitle(doc, "Earned tips by employee");
    drawBorderedTable(
      doc,
      ["Employee", "Mode", "Collected", "Earned", "Tip orders"],
      [width * 0.32, width * 0.14, width * 0.18, width * 0.18, width * 0.18],
      earned.map((row) => [
        `${row.name || ""}${row.role ? ` (${row.role})` : ""}`,
        row.receiveOwnTips ? "Own" : `${row.tipPercent || 0}%`,
        money(row.collectedTips),
        money(row.earnedTips),
        String(Number(row.orders) || 0),
      ]),
      { alignRightFrom: 2 }
    );
  }

  if (byEmp.length) {
    sectionTitle(doc, "Collected by employee × method");
    drawBorderedTable(
      doc,
      ["Employee", "Method", "Orders", "Tips", "Avg"],
      [width * 0.28, width * 0.2, width * 0.14, width * 0.2, width * 0.18],
      byEmp.map((row) => [
        `${row.name || ""}${row.role ? ` (${row.role})` : ""}`,
        row.method || "",
        String(Number(row.orders) || 0),
        money(row.tips),
        money(row.averageTip),
      ]),
      { alignRightFrom: 2 }
    );
  }
}

const WRITERS = {
  overview: writeOverview,
  sales: writeSales,
  tips: writeTips,
  service: writeService,
  hours: writeHours,
  labor: writeLabor,
  clock: writeClock,
  timesheet: writeTimesheet,
  orders: writeOrders,
  cancellations: writeCancellations,
  "tips-by-payment": writeTipsByPayment,
};

function buildMetaLines(payload) {
  const { labels, overview, employee, attendanceStats, tipsTotals, exportView } =
    payload;
  const lines = [
    `Generated: ${new Date().toLocaleString()}`,
    `Period: ${labels.periodLabel || "Current filters"} (${labels.dateFrom} to ${labels.dateTo})`,
    `Shift: ${labels.shiftLabel}  ·  Status: ${labels.orderStatusLabel}  ·  Payment: ${labels.paymentLabel}`,
  ];

  if (employee) {
    lines.push(
      `Employee: ${labels.employeeName || employee.name}  ·  Role: ${employee.role || "Staff"}`
    );
    if (attendanceStats) {
      lines.push(
        `Attendance: ${attendanceStats.workedDays ?? 0} worked / ${attendanceStats.scheduledDays ?? 0} scheduled  ·  Absent: ${attendanceStats.absentDays ?? 0}`
      );
    }
    return lines;
  }

  if (exportView === "tips") {
    lines.push(
      `Earned tips: ${money(tipsTotals.tips)}  ·  Collected: ${money(tipsTotals.collectedTips)}`
    );
  } else if (exportView === "sales") {
    lines.push(
      `Net sales: ${money(overview.totalSales)}  ·  Orders: ${overview.completedOrders ?? 0}  ·  Cancelled: ${overview.cancelCount ?? 0}`
    );
  } else if (exportView === "service") {
    lines.push(`Service charges: ${money(overview.serviceCharges)}`);
  } else if (exportView === "hours" || exportView === "clock" || exportView === "timesheet") {
    lines.push(
      `Total hours: ${hours(overview.totalHours)}  ·  Overtime: ${hours(overview.overtimeHours)}`
    );
  } else if (exportView === "labor") {
    lines.push(
      `Labor cost: ${money(overview.estimatedPay)}  ·  Hours: ${hours(overview.totalHours)}`
    );
  } else if (exportView === "tips-by-payment") {
    lines.push(
      `Collected: ${money(overview.totalTips)}  ·  Earned: ${money(overview.totalEarned)}  ·  Tipped orders: ${overview.totalOrders ?? 0}`
    );
  } else if (exportView === "cancellations") {
    lines.push(
      `Cancellations: ${overview.totalCancellations ?? 0}  ·  Amount: ${money(overview.cancelledAmount)}`
    );
  } else if (exportView === "orders") {
    lines.push(`Orders exported: ${(payload.rows || []).length}`);
  } else {
    lines.push(
      `Staff: ${overview.totalStaff ?? 0}  ·  Clocked in: ${overview.clockedIn ?? 0}  ·  Sales: ${money(overview.totalSales)}`
    );
  }
  return lines;
}

export async function exportEmployeeReportPdf(payload) {
  return new Promise((resolve, reject) => {
    try {
      const view = resolveExportView(payload.exportView);
      const doc = new PDFDocument({
        size: "LETTER",
        layout: "landscape",
        bufferPages: true,
        margins: { top: 32, bottom: 32, left: 28, right: 28 },
        info: {
          Title: payload.reportTitle || view.title,
          Author: "Tasty Bites",
        },
      });
      const chunks = [];
      doc.on("data", (c) => chunks.push(c));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      drawBanner(
        doc,
        payload.restaurantName,
        payload.reportTitle || view.title,
        buildMetaLines({ ...payload, exportView: view.id })
      );

      const writer = WRITERS[view.id] || writeOverview;
      writer(doc, payload);

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

export function employeePdfFilename(dateFrom, dateTo, employeeName, viewSlug) {
  return employeeReportFilename(dateFrom, dateTo, "pdf", employeeName, viewSlug);
}
