import { createRequire } from "module";
import { stockStatusLabel } from "./status";

const require = createRequire(import.meta.url);
const PDFDocument = require("pdfkit");

const money = (n) =>
  `$${(Math.round((Number(n) || 0) * 100) / 100).toFixed(2)}`;

const HEADER_FILL = "#FFF7ED";
const HEADER_TEXT = "#9A3412";
const BORDER = "#E4E4E7";
const ZEBRA = "#FAFAFA";

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

function cellText(doc, str, x, y, width, { align = "left" } = {}) {
  doc.text(str, x, y, {
    width,
    align,
    lineBreak: false,
    height: 12,
  });
}

function drawTable(doc, headers, colW, rows, { alignRightFrom = null } = {}) {
  if (!rows.length) return;

  const left = doc.page.margins.left;
  const width = pageWidth(doc);
  const rowH = 18;
  const headerH = 20;
  const limit = contentBottom(doc);

  const drawHeader = (y) => {
    doc.rect(left, y, width, headerH).fill(HEADER_FILL);
    doc.rect(left, y, width, headerH).strokeColor(BORDER).lineWidth(0.5).stroke();

    let x = left;
    doc.font("Helvetica-Bold").fontSize(8).fillColor(HEADER_TEXT);
    headers.forEach((h, i) => {
      cellText(doc, h, x + 4, y + 6, colW[i] - 8, {
        align: i >= (alignRightFrom ?? headers.length) ? "right" : "left",
      });
      x += colW[i];
    });
    return y + headerH;
  };

  let y = drawHeader(doc.y);
  let rowIndex = 0;

  const drawRow = (cells) => {
    if (y + rowH > limit) {
      doc.addPage();
      resetCursor(doc, doc.page.margins.top);
      y = drawHeader(doc.y);
      rowIndex = 0;
    }

    if (rowIndex % 2 === 1) {
      doc.rect(left, y, width, rowH).fill(ZEBRA);
    }

    doc.rect(left, y, width, rowH).strokeColor(BORDER).lineWidth(0.3).stroke();

    let x = left;
    doc.font("Helvetica").fontSize(8).fillColor("#18181B");
    cells.forEach((cell, i) => {
      cellText(doc, String(cell ?? ""), x + 4, y + 5, colW[i] - 8, {
        align: i >= (alignRightFrom ?? headers.length) ? "right" : "left",
      });
      x += colW[i];
    });
    y += rowH;
    rowIndex += 1;
  };

  for (const cells of rows) drawRow(cells);
  doc.y = y + 10;
  resetCursor(doc);
}

function sectionTitle(doc, title, subtitle) {
  const titleH = subtitle ? 32 : 20;
  if (doc.y + titleH + 40 > contentBottom(doc)) {
    doc.addPage();
    resetCursor(doc, doc.page.margins.top);
  }
  doc.font("Helvetica-Bold").fontSize(12).fillColor("#18181B").text(title);
  if (subtitle) {
    doc.font("Helvetica").fontSize(8).fillColor("#71717A").text(subtitle);
  }
  doc.moveDown(0.35);
  resetCursor(doc);
}

function drawSection(doc, title, subtitle, headers, colW, rows, opts) {
  if (!rows.length) return;
  sectionTitle(doc, title, subtitle);
  drawTable(doc, headers, colW, rows, opts);
}

function drawReportHeader(doc, restaurantName, meta, note) {
  const left = doc.page.margins.left;
  const width = pageWidth(doc);
  const startY = doc.y;

  doc.rect(left, startY, width, 52).fill("#FFF7ED");

  doc
    .font("Helvetica-Bold")
    .fontSize(16)
    .fillColor("#9A3412")
    .text(restaurantName || "Tasty Bites", left + 12, startY + 8, {
      width: width - 24,
    });
  doc
    .font("Helvetica-Bold")
    .fontSize(11)
    .fillColor("#18181B")
    .text("Inventory & Stock Report", left + 12, startY + 26);
  doc.font("Helvetica").fontSize(8).fillColor("#52525B");
  doc.text(
    `Generated: ${new Date().toLocaleString()} · Period: ${meta.dateFrom || ""} to ${meta.dateTo || ""} (${meta.preset || ""})`,
    left + 12,
    startY + 40,
    { width: width - 24 }
  );
  if (note) {
    doc.text(note, left + 12, startY + 50, { width: width - 24 });
  }

  doc.y = startY + 64;
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
        bufferPages: true,
        margins: { top: 36, bottom: 40, left: 36, right: 36 },
        info: {
          Title: "Inventory & Stock Reports",
          Author: "Tasty Bites",
        },
      });
      const chunks = [];
      doc.on("data", (c) => chunks.push(c));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      const width = pageWidth(doc);
      const kpis = overview?.kpis || {};
      const balance = overview?.balance || {};
      const meta = overview?.meta || {};

      drawReportHeader(doc, restaurantName, meta, overview?.note);

      sectionTitle(doc, "Summary KPIs", "Key inventory metrics for the selected period");
      drawTable(
        doc,
        ["Metric", "Value"],
        [width * 0.45, width * 0.55],
        [
          ["Total Products", kpis.totalProducts || 0],
          ["Active Products", kpis.activeProducts || 0],
          ["Total Stock Units", kpis.totalUnits || 0],
          ["Low Stock Items", kpis.lowStockCount || 0],
          ["Out of Stock", kpis.outOfStockCount || 0],
          ["Stock Added (period)", kpis.stockAdded || 0],
          ["Stock Removed (period)", kpis.stockRemoved || 0],
          ["Movement Count", kpis.movementCount || 0],
          ["Top Outgoing Product", kpis.topOutgoingProduct?.name || "—"],
          ["Inventory Value", money(kpis.inventoryValue)],
          ["Opening Stock", balance.opening || 0],
          ["Stock Added", balance.added || 0],
          ["Stock Removed", balance.removed || 0],
          ["Closing Stock", balance.closing || 0],
        ],
        { alignRightFrom: 1 }
      );

      const stockRows = (stock?.rows || []).map((row) => [
        row.name || "",
        row.categoryName || "",
        row.openingStock ?? 0,
        row.unitsInPeriod ?? 0,
        row.unitsOutPeriod ?? 0,
        row.currentBalance ?? 0,
        row.unit || "",
        row.minStock == null ? "—" : row.minStock,
        stockStatusLabel(row.stockStatus),
        money(row.stockValue),
      ]);
      drawSection(
        doc,
        "Current Stock",
        `${stockRows.length} products — opening, period movement, balance, and value`,
        [
          "Product",
          "Category",
          "Opening",
          "Period In",
          "Period Out",
          "Current",
          "Unit",
          "Min",
          "Status",
          "Value",
        ],
        [
          width * 0.15,
          width * 0.11,
          width * 0.08,
          width * 0.08,
          width * 0.08,
          width * 0.08,
          width * 0.07,
          width * 0.07,
          width * 0.1,
          width * 0.18,
        ],
        stockRows,
        { alignRightFrom: 2 }
      );

      const movementRows = (movements?.rows || []).map((row) => [
        row.date || "",
        row.time || "",
        row.product || "",
        row.category || "",
        row.movementLabel || "",
        row.quantity ?? 0,
        row.previousStock == null ? "—" : row.previousStock,
        row.newStock == null ? "—" : row.newStock,
        row.reason || "—",
        row.performedBy || "—",
      ]);
      drawSection(
        doc,
        "Stock Movement Log",
        `${movementRows.length} transactions with timing and balances`,
        [
          "Date",
          "Time",
          "Product",
          "Category",
          "Type",
          "Qty",
          "Previous",
          "New",
          "Reason",
          "By",
        ],
        [
          width * 0.09,
          width * 0.07,
          width * 0.14,
          width * 0.1,
          width * 0.09,
          width * 0.07,
          width * 0.08,
          width * 0.08,
          width * 0.14,
          width * 0.14,
        ],
        movementRows,
        { alignRightFrom: 5 }
      );

      const topRows = (topItems?.rows || []).map((row) => [
        row.rank,
        row.product || "",
        row.category || "",
        row.quantity ?? 0,
        money(row.value),
        money(row.averageUnitPrice),
      ]);
      drawSection(
        doc,
        "Top Items (Stock Out)",
        "Highest quantity removed in period",
        ["Rank", "Product", "Category", "Qty Out", "Value", "Avg Unit Cost"],
        [
          width * 0.06,
          width * 0.26,
          width * 0.16,
          width * 0.12,
          width * 0.14,
          width * 0.14,
        ],
        topRows,
        { alignRightFrom: 3 }
      );

      const lowRows = (lowStock?.rows || []).map((row) => [
        row.name || "",
        row.categoryName || "",
        row.currentBalance ?? 0,
        row.minStock == null ? "—" : row.minStock,
        stockStatusLabel(row.stockStatus),
        row.quantityNeeded == null ? "—" : row.quantityNeeded,
      ]);
      drawSection(
        doc,
        "Low / Out of Stock",
        "Items at or below minimum threshold",
        ["Product", "Category", "Current", "Min", "Status", "Qty Needed"],
        [
          width * 0.22,
          width * 0.16,
          width * 0.1,
          width * 0.1,
          width * 0.14,
          width * 0.12,
        ],
        lowRows,
        { alignRightFrom: 2 }
      );

      const pages = doc.bufferedPageRange();
      const lastPage = pages.start + pages.count;
      const footerY = doc.page.height - 22;
      doc.font("Helvetica").fontSize(7).fillColor("#A1A1AA");
      for (let i = pages.start; i < lastPage; i += 1) {
        doc.switchToPage(i);
        const label = `Page ${i - pages.start + 1} of ${pages.count}`;
        const footerX =
          doc.page.margins.left + (pageWidth(doc) - doc.widthOfString(label)) / 2;
        doc.text(label, footerX, footerY, { lineBreak: false });
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

export function inventoryPdfFilename(dateFrom, dateTo) {
  return `Inventory-Stock-${dateFrom || "report"}-to-${dateTo || "report"}.pdf`;
}
