import { createRequire } from "module";
import { stockStatusLabel } from "./status";

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

export async function exportInventoryPdf({
  restaurantName,
  overview,
  stock,
  movements,
  topItems,
  lowStock,
}) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "LETTER",
        layout: "landscape",
        margins: { top: 36, bottom: 36, left: 36, right: 36 },
        info: {
          Title: "Inventory & Stock Reports",
          Author: "Tasty Bites",
        },
      });
      const chunks = [];
      doc.on("data", (c) => chunks.push(c));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      const left = doc.page.margins.left;
      const width = pageWidth(doc);
      const kpis = overview?.kpis || {};
      const balance = overview?.balance || {};
      const meta = overview?.meta || {};

      doc
        .font("Helvetica-Bold")
        .fontSize(16)
        .fillColor("#111")
        .text(restaurantName || "Tasty Bites", left, doc.y, { width, align: "left" });
      doc.font("Helvetica-Bold").fontSize(12).text("Inventory & Stock Reports");
      doc.font("Helvetica").fontSize(9).fillColor("#444");
      doc.text(`Generated: ${new Date().toLocaleString()}`);
      doc.text(
        `Date range: ${meta.dateFrom || ""} to ${meta.dateTo || ""} (${meta.preset || ""})`
      );
      if (overview?.note) doc.text(overview.note);
      doc.moveDown(0.6);
      resetCursor(doc);

      sectionTitle(doc, "Summary");
      drawTable(
        doc,
        ["Metric", "Value"],
        [width * 0.4, width * 0.6],
        [
          ["Total Products", kpis.totalProducts || 0],
          ["Active Products", kpis.activeProducts || 0],
          ["Total Stock Units", kpis.totalUnits || 0],
          ["Low Stock Items", kpis.lowStockCount || 0],
          ["Out of Stock", kpis.outOfStockCount || 0],
          ["Stock Added (period)", kpis.stockAdded || 0],
          ["Stock Removed (period)", kpis.stockRemoved || 0],
          ["Top Outgoing Product", kpis.topOutgoingProduct?.name || "—"],
          ["Inventory Value", money(kpis.inventoryValue)],
          ["Opening Stock", balance.opening || 0],
          ["Stock Added", balance.added || 0],
          ["Stock Removed", balance.removed || 0],
          ["Closing Stock", balance.closing || 0],
        ]
      );

      sectionTitle(doc, "Current Stock");
      drawTable(
        doc,
        ["Product", "Category", "Stock", "Unit", "Min", "Status", "Out", "Value"],
        [
          width * 0.2,
          width * 0.14,
          width * 0.1,
          width * 0.08,
          width * 0.08,
          width * 0.12,
          width * 0.1,
          width * 0.18,
        ],
        (stock?.rows || []).map((row) => [
          row.name || "",
          row.categoryName || "",
          row.currentBalance ?? 0,
          row.unit || "",
          row.minStock == null ? "—" : row.minStock,
          stockStatusLabel(row.stockStatus),
          row.unitsOutPeriod ?? 0,
          money(row.stockValue),
        ])
      );

      sectionTitle(doc, "Stock Movement");
      drawTable(
        doc,
        ["Date", "Time", "Product", "Type", "Qty", "Prev", "New", "By"],
        [
          width * 0.12,
          width * 0.1,
          width * 0.2,
          width * 0.12,
          width * 0.08,
          width * 0.1,
          width * 0.1,
          width * 0.18,
        ],
        (movements?.rows || []).map((row) => [
          row.date || "",
          row.time || "",
          row.product || "",
          row.movementLabel || "",
          row.quantity ?? 0,
          row.previousStock == null ? "—" : row.previousStock,
          row.newStock == null ? "—" : row.newStock,
          row.performedBy || "—",
        ])
      );

      sectionTitle(doc, "Top Items (Stock Out)");
      drawTable(
        doc,
        ["Rank", "Product", "Category", "Qty Out", "Value", "Avg Unit"],
        [
          width * 0.08,
          width * 0.28,
          width * 0.18,
          width * 0.14,
          width * 0.16,
          width * 0.16,
        ],
        (topItems?.rows || []).map((row) => [
          row.rank,
          row.product || "",
          row.category || "",
          row.quantity ?? 0,
          money(row.value),
          money(row.averageUnitPrice),
        ])
      );

      sectionTitle(doc, "Low / Out of Stock");
      drawTable(
        doc,
        ["Product", "Category", "Stock", "Min", "Status", "Needed"],
        [
          width * 0.24,
          width * 0.18,
          width * 0.12,
          width * 0.12,
          width * 0.16,
          width * 0.18,
        ],
        (lowStock?.rows || []).map((row) => [
          row.name || "",
          row.categoryName || "",
          row.currentBalance ?? 0,
          row.minStock == null ? "—" : row.minStock,
          stockStatusLabel(row.stockStatus),
          row.quantityNeeded == null ? "—" : row.quantityNeeded,
        ])
      );

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

export function inventoryPdfFilename(dateFrom, dateTo) {
  return `Inventory-Stock-${dateFrom || "report"}-to-${dateTo || "report"}.pdf`;
}
