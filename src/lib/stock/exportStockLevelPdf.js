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

/**
 * Build a Current Stock Level PDF buffer.
 */
export async function exportStockLevelPdf({
  levels,
  restaurantName,
  categoryLabel,
  typeLabel,
}) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "LETTER",
        layout: "landscape",
        margins: { top: 36, bottom: 36, left: 36, right: 36 },
        info: {
          Title: "Current Stock Level",
          Author: "Tasty Bites",
        },
      });
      const chunks = [];
      doc.on("data", (c) => chunks.push(c));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      const left = doc.page.margins.left;
      const width = pageWidth(doc);
      const rows = levels || [];

      doc
        .font("Helvetica-Bold")
        .fontSize(16)
        .fillColor("#111")
        .text(restaurantName || "Tasty Bites", left, doc.y, { width, align: "left" });
      doc
        .font("Helvetica-Bold")
        .fontSize(12)
        .text("Current Stock Level", left, doc.y, { width, align: "left" });
      doc.font("Helvetica").fontSize(9).fillColor("#444");
      doc.text(`Generated: ${new Date().toLocaleString()}`, left, doc.y, {
        width,
        align: "left",
      });
      doc.text(
        `Category: ${categoryLabel || "All"}    Type: ${typeLabel || "All"}`,
        left,
        doc.y,
        { width, align: "left" }
      );
      doc.moveDown(0.8);
      resetCursor(doc);

      const headers = [
        "Product",
        "Category",
        "Type",
        "Unit",
        "In",
        "Out",
        "Balance",
        "Cost",
        "Status",
      ];
      const colW = [
        width * 0.2,
        width * 0.14,
        width * 0.12,
        width * 0.08,
        width * 0.08,
        width * 0.08,
        width * 0.1,
        width * 0.1,
        width * 0.1,
      ];
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

      const drawRow = (cells, bold = false) => {
        if (y + rowH > doc.page.height - doc.page.margins.bottom) {
          doc.addPage();
          resetCursor(doc, doc.page.margins.top);
          y = drawHeader(doc.y);
        }
        let x = left;
        doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(8).fillColor("#111");
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

      for (const row of rows) {
        drawRow([
          row.name || "",
          row.category?.name || "",
          row.type?.name || "",
          row.unit?.name || "",
          row.totalIn ?? 0,
          row.totalOut ?? 0,
          row.currentBalance ?? 0,
          money(row.purchasePrice),
          row.status ? "Active" : "Inactive",
        ]);
      }

      const totals = rows.reduce(
        (acc, row) => {
          acc.in += Number(row.totalIn) || 0;
          acc.out += Number(row.totalOut) || 0;
          acc.balance += Number(row.currentBalance) || 0;
          return acc;
        },
        { in: 0, out: 0, balance: 0 }
      );

      y += 4;
      drawRow(
        [
          "TOTAL",
          "",
          "",
          "",
          totals.in,
          totals.out,
          totals.balance,
          "",
          `${rows.length} products`,
        ],
        true
      );

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

export function stockLevelPdfFilename() {
  const d = new Date().toISOString().slice(0, 10);
  return `Stock-Level-${d}.pdf`;
}
