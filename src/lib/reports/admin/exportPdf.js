import { createRequire } from "module";

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

function drawTable(doc, headers, colW, rows) {
  const left = doc.page.margins.left;
  const width = pageWidth(doc);
  const rowH = 16;

  const drawHeader = (y) => {
    let x = left;
    doc.font("Helvetica-Bold").fontSize(8).fillColor("#333");
    headers.forEach((h, i) => {
      doc.text(h, x, y, { width: colW[i] - 4, align: "left", lineBreak: false });
      x += colW[i];
    });
    y += 12;
    doc
      .strokeColor("#cccccc")
      .lineWidth(0.5)
      .moveTo(left, y)
      .lineTo(left + width, y)
      .stroke();
    return y + 4;
  };

  let y = drawHeader(doc.y);

  const drawRow = (cells) => {
    if (y + rowH > doc.page.height - doc.page.margins.bottom) {
      doc.addPage();
      resetCursor(doc, doc.page.margins.top);
      y = drawHeader(doc.y);
    }
    let x = left;
    doc.font("Helvetica").fontSize(8).fillColor("#111");
    cells.forEach((cell, i) => {
      doc.text(String(cell ?? ""), x, y, {
        width: colW[i] - 4,
        align: "left",
        lineBreak: false,
      });
      x += colW[i];
    });
    y += rowH;
  };

  for (const cells of rows) drawRow(cells);
  doc.y = y + 8;
  resetCursor(doc);
}

function sectionTitle(doc, title) {
  if (doc.y > doc.page.height - 120) {
    doc.addPage();
    resetCursor(doc, doc.page.margins.top);
  }
  doc.font("Helvetica-Bold").fontSize(11).fillColor("#111").text(title);
  doc.moveDown(0.4);
  resetCursor(doc);
}

function writeHeader(doc, restaurantName, title, data) {
  const meta = data?.meta || {};
  const left = doc.page.margins.left;
  const width = pageWidth(doc);
  doc
    .font("Helvetica-Bold")
    .fontSize(16)
    .fillColor("#111")
    .text(restaurantName || "Tasty Bites", left, doc.y, { width });
  doc.font("Helvetica-Bold").fontSize(12).text(title);
  doc.font("Helvetica").fontSize(9).fillColor("#444");
  doc.text(`Generated: ${new Date().toLocaleString()}`);
  doc.text(
    `Date range: ${meta.dateFrom || ""} to ${meta.dateTo || ""} (${meta.preset || ""})`
  );
  const extras = [];
  if (meta.employeeId) extras.push(`Employee: ${meta.employeeId}`);
  if (meta.paymentMethod && meta.paymentMethod !== "ALL") {
    extras.push(`Payment: ${meta.paymentMethod}`);
  }
  if (meta.eventType && meta.eventType !== "ALL") {
    extras.push(`Event: ${meta.eventType}`);
  }
  if (meta.kotStatus && meta.kotStatus !== "ALL") {
    extras.push(`KOT status: ${meta.kotStatus}`);
  }
  if (extras.length) doc.text(extras.join("  |  "));
  if (data?.note) doc.text(data.note);
  doc.moveDown(0.6);
  resetCursor(doc);
}

function writeActivity(doc, data) {
  const width = pageWidth(doc);
  writeHeader(doc, data._restaurantName, "Admin Activity", data);
  sectionTitle(doc, "Summary");
  drawTable(
    doc,
    ["Metric", "Value"],
    [width * 0.4, width * 0.6],
    [["Total events", data.total || 0]]
  );
  sectionTitle(doc, "Events");
  drawTable(
    doc,
    ["Date", "Time", "Actor", "Action", "Module", "Target", "Description"],
    [
      width * 0.12,
      width * 0.1,
      width * 0.14,
      width * 0.16,
      width * 0.1,
      width * 0.16,
      width * 0.22,
    ],
    (data.rows || []).map((row) => [
      row.date,
      row.time,
      row.admin,
      row.action,
      row.module,
      row.target,
      row.description,
    ])
  );
}

function writeRevenue(doc, data) {
  const width = pageWidth(doc);
  const kpis = data.kpis || {};
  writeHeader(doc, data._restaurantName, "Revenue Generated", data);
  sectionTitle(doc, "Summary");
  drawTable(
    doc,
    ["Metric", "Value"],
    [width * 0.4, width * 0.6],
    [
      ["Gross Sales", money(kpis.grossSales)],
      ["Discounts", money(kpis.discounts)],
      ["Net Sales", money(kpis.netSales)],
      ["Tax", money(kpis.tax)],
      ["Tips", money(kpis.tips)],
      ["Service Charges", money(kpis.serviceCharges)],
      ["Total Collected", money(kpis.collected)],
      ["Orders", kpis.orderCount || 0],
      ["Cash", money(kpis.cash)],
      ["Card", money(kpis.card)],
      ["Gift Card", money(kpis.giftCard)],
    ]
  );
  sectionTitle(doc, "By Day");
  drawTable(
    doc,
    ["Date", "Orders", "Gross", "Discount", "Net", "Tax", "Tips", "Service", "Total"],
    [
      width * 0.12,
      width * 0.08,
      width * 0.1,
      width * 0.1,
      width * 0.1,
      width * 0.1,
      width * 0.1,
      width * 0.1,
      width * 0.1,
    ],
    (data.byDay || []).map((row) => [
      row.date,
      row.orders,
      money(row.grossSales),
      money(row.discounts),
      money(row.netSales),
      money(row.tax),
      money(row.tips),
      money(row.serviceCharges),
      money(row.total),
    ])
  );
}

function writeDaily(doc, data) {
  const width = pageWidth(doc);
  const counts = data.counts || {};
  const kpis = data.kpis || {};
  writeHeader(doc, data._restaurantName, "Daily Summary", data);
  sectionTitle(doc, "Order counts");
  drawTable(
    doc,
    ["Metric", "Value"],
    [width * 0.4, width * 0.6],
    [
      ["Total Orders", counts.total || 0],
      ["Completed (Paid)", counts.completed || 0],
      ["Pending", counts.pending || 0],
      ["Cancelled", counts.cancelled || 0],
      ["Waived", counts.waived || 0],
      ["Voided (not recorded)", counts.voided || 0],
      ["Refunded (not recorded)", counts.refunded || 0],
    ]
  );
  sectionTitle(doc, "Sales");
  drawTable(
    doc,
    ["Metric", "Value"],
    [width * 0.4, width * 0.6],
    [
      ["Gross Sales", money(kpis.grossSales)],
      ["Discounts", money(kpis.discounts)],
      ["Net Sales", money(kpis.netSales)],
      ["Tax", money(kpis.tax)],
      ["Tips", money(kpis.tips)],
      ["Service Charges", money(kpis.serviceCharges)],
      ["Final Total", money(kpis.collected)],
    ]
  );
  sectionTitle(doc, "Top selling items");
  drawTable(
    doc,
    ["Item", "Quantity", "Revenue", "Orders"],
    [width * 0.4, width * 0.2, width * 0.2, width * 0.2],
    (data.topItems || []).map((row) => [
      row.item,
      row.quantity,
      money(row.revenue),
      row.orderCount,
    ])
  );
}

function writeAudit(doc, data) {
  const width = pageWidth(doc);
  const summary = data.summary || {};
  writeHeader(doc, data._restaurantName, "Transaction Audit", data);
  sectionTitle(doc, "Summary");
  drawTable(
    doc,
    ["Metric", "Value"],
    [width * 0.4, width * 0.6],
    [
      ["Total events", summary.total || 0],
      ["Cancelled / waived", summary.cancelled || 0],
      ["Discounted", summary.discounted || 0],
      ["Gift card used", summary.giftCard || 0],
    ]
  );
  if (data.notes?.unsupported) {
    doc.font("Helvetica").fontSize(8).fillColor("#555").text(data.notes.unsupported);
    doc.moveDown(0.4);
    resetCursor(doc);
  }
  sectionTitle(doc, "Events");
  drawTable(
    doc,
    ["Date", "Time", "Order", "Employee", "Event", "Amount", "Reason", "Status"],
    [
      width * 0.1,
      width * 0.09,
      width * 0.12,
      width * 0.14,
      width * 0.16,
      width * 0.1,
      width * 0.19,
      width * 0.1,
    ],
    (data.rows || []).map((row) => [
      row.date,
      row.time,
      row.orderNumber,
      row.employee,
      row.eventType,
      money(row.amount),
      row.reason,
      row.status,
    ])
  );
}

function writeKitchen(doc, data) {
  const width = pageWidth(doc);
  const counts = data.counts || {};
  writeHeader(doc, data._restaurantName, "Kitchen Log", data);
  sectionTitle(doc, "Summary");
  drawTable(
    doc,
    ["Metric", "Value"],
    [width * 0.4, width * 0.6],
    [
      ["Total KOTs", counts.total || 0],
      ["Completed (printed)", counts.completed || 0],
      ["Pending", counts.pending || 0],
      ["Cancelled", counts.cancelled || 0],
    ]
  );
  sectionTitle(doc, "Tickets");
  drawTable(
    doc,
    ["KOT #", "Order #", "Date", "Time", "Table", "Server", "Status", "Type"],
    [
      width * 0.14,
      width * 0.12,
      width * 0.12,
      width * 0.1,
      width * 0.1,
      width * 0.16,
      width * 0.12,
      width * 0.14,
    ],
    (data.rows || []).map((row) => [
      row.kotNumber,
      row.orderNumber,
      row.date,
      row.time,
      row.table,
      row.employee,
      row.status,
      row.type,
    ])
  );
  sectionTitle(doc, "Top kitchen items");
  drawTable(
    doc,
    ["Rank", "Item", "Quantity", "Orders"],
    [width * 0.1, width * 0.5, width * 0.2, width * 0.2],
    (data.topItems || []).map((row) => [
      row.rank,
      row.item,
      row.quantity,
      row.orderCount,
    ])
  );
}

const WRITERS = {
  activity: writeActivity,
  revenue: writeRevenue,
  "daily-summary": writeDaily,
  audit: writeAudit,
  kitchen: writeKitchen,
};

export async function exportAdminPdf({ section, restaurantName, data }) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "LETTER",
        layout: "landscape",
        margins: { top: 36, bottom: 36, left: 36, right: 36 },
        info: {
          Title: "Admin Reports",
          Author: "Tasty Bites",
        },
      });
      const chunks = [];
      doc.on("data", (c) => chunks.push(c));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      const writer = WRITERS[section] || writeActivity;
      writer(doc, { ...data, _restaurantName: restaurantName });
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

export function adminPdfFilename(section, dateFrom, dateTo) {
  return `Admin-${section || "report"}-${dateFrom || "from"}-to-${dateTo || "to"}.pdf`;
}
