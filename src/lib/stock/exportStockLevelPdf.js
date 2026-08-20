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
 * Build a Current Stock Level PDF buffer with a bordered light-colored table.
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
        margins: { top: 36, bottom: 36, left: 28, right: 28 },
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
      const pageBottom = doc.page.height - doc.page.margins.bottom;

      const COLORS = {
        band: "#FFF7ED",
        bandLine: "#FDBA74",
        title: "#9A3412",
        subtitle: "#C2410C",
        border: "#D4D4D8",
        headerBg: "#FFEDD5",
        headerText: "#9A3412",
        altRow: "#FAFAFA",
        white: "#FFFFFF",
        totalBg: "#FFF7ED",
        body: "#18181B",
        muted: "#71717A",
        section: "#3F3F46",
      };

      // Light header band
      const headerBandH = 72;
      const bandTop = doc.page.margins.top - 8;
      doc.rect(left, bandTop, width, headerBandH).fill(COLORS.band);
      doc
        .rect(left, bandTop + headerBandH - 2, width, 2)
        .fill(COLORS.bandLine);

      let y = doc.page.margins.top;
      doc
        .font("Helvetica-Bold")
        .fontSize(18)
        .fillColor(COLORS.title)
        .text(restaurantName || "Tasty Bites", left + 14, y, {
          width: width - 28,
          align: "left",
        });
      y = doc.y + 2;
      doc
        .font("Helvetica-Bold")
        .fontSize(12)
        .fillColor(COLORS.subtitle)
        .text("Current Stock Level", left + 14, y, {
          width: width - 28,
          align: "left",
        });
      y = doc.y + 6;
      doc.font("Helvetica").fontSize(9).fillColor(COLORS.title);
      doc.text(
        `Generated: ${new Date().toLocaleString()}    ·    Category: ${
          categoryLabel || "All"
        }    ·    Type: ${typeLabel || "All"}`,
        left + 14,
        y,
        { width: width - 28, align: "left" }
      );

      // Extra spacing above table
      y = bandTop + headerBandH + 28;

      const headers = [
        "Product",
        "Category",
        "Type",
        "Unit",
        "Open",
        "In",
        "Out",
        "Balance",
        "Cost",
        "Status",
      ];
      const aligns = [
        "left",
        "left",
        "left",
        "center",
        "right",
        "right",
        "right",
        "right",
        "right",
        "center",
      ];
      const colW = [
        width * 0.16,
        width * 0.13,
        width * 0.13,
        width * 0.07,
        width * 0.07,
        width * 0.07,
        width * 0.07,
        width * 0.09,
        width * 0.1,
        width * 0.11,
      ];
      const headerH = 26;
      const rowH = 24;

      const drawCellBorder = (x, top, w, h) => {
        doc.lineWidth(0.8).strokeColor(COLORS.border).rect(x, top, w, h).stroke();
      };

      const drawHeaderRow = (top) => {
        let x = left;
        headers.forEach((label, i) => {
          doc.rect(x, top, colW[i], headerH).fill(COLORS.headerBg);
          drawCellBorder(x, top, colW[i], headerH);
          doc
            .font("Helvetica-Bold")
            .fontSize(8)
            .fillColor(COLORS.headerText)
            .text(label.toUpperCase(), x + 5, top + 9, {
              width: colW[i] - 10,
              align: aligns[i],
              lineBreak: false,
            });
          x += colW[i];
        });
        return top + headerH;
      };

      const ensureSpace = (needed) => {
        if (y + needed <= pageBottom) return;
        doc.addPage();
        y = doc.page.margins.top;
        y = drawHeaderRow(y);
      };

      const drawDataRow = (cells, { bold = false, bg = COLORS.white } = {}) => {
        ensureSpace(rowH);
        let x = left;
        cells.forEach((cell, i) => {
          doc.rect(x, y, colW[i], rowH).fill(bg);
          drawCellBorder(x, y, colW[i], rowH);
          doc
            .font(bold ? "Helvetica-Bold" : "Helvetica")
            .fontSize(8)
            .fillColor(COLORS.body)
            .text(String(cell ?? ""), x + 5, y + 8, {
              width: colW[i] - 10,
              align: aligns[i],
              lineBreak: false,
            });
          x += colW[i];
        });
        y += rowH;
      };

      doc
        .font("Helvetica-Bold")
        .fontSize(10)
        .fillColor(COLORS.section)
        .text("Stock Level Details", left, y - 18, {
          width,
          align: "left",
        });

      y = drawHeaderRow(y);

      if (!rows.length) {
        ensureSpace(rowH);
        doc.rect(left, y, width, rowH).fill(COLORS.altRow);
        drawCellBorder(left, y, width, rowH);
        doc
          .font("Helvetica")
          .fontSize(9)
          .fillColor(COLORS.muted)
          .text("No inventory products found for these filters.", left, y + 8, {
            width,
            align: "center",
          });
        y += rowH;
      } else {
        rows.forEach((row, index) => {
          drawDataRow(
            [
              row.name || "",
              row.category?.name || "",
              row.type?.name || "",
              row.unit?.name || "",
              row.openingStock ?? 0,
              row.totalIn ?? 0,
              row.totalOut ?? 0,
              row.currentBalance ?? 0,
              money(row.purchasePrice),
              row.status ? "Active" : "Inactive",
            ],
            { bg: index % 2 === 1 ? COLORS.altRow : COLORS.white }
          );
        });

        const totals = rows.reduce(
          (acc, row) => {
            acc.open += Number(row.openingStock) || 0;
            acc.in += Number(row.totalIn) || 0;
            acc.out += Number(row.totalOut) || 0;
            acc.balance += Number(row.currentBalance) || 0;
            return acc;
          },
          { open: 0, in: 0, out: 0, balance: 0 }
        );

        drawDataRow(
          [
            "TOTAL",
            "",
            "",
            "",
            totals.open,
            totals.in,
            totals.out,
            totals.balance,
            "",
            `${rows.length} products`,
          ],
          { bold: true, bg: COLORS.totalBg }
        );
      }

      y += 16;
      if (y + 20 <= pageBottom) {
        doc
          .font("Helvetica")
          .fontSize(8)
          .fillColor(COLORS.muted)
          .text(
            "Balance = Opening + Stock In − Stock Out. Values mirror the Current Stock Level screen.",
            left,
            y,
            { width, align: "left" }
          );
      }

      resetCursor(doc, y);
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
