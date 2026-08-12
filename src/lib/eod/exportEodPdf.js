import { createRequire } from "module";

// Load pdfkit via Node require so standard-font AFM paths resolve from real
// node_modules (Turbopack/webpack rewrites import.meta/__dirname to D:\ROOT\...).
const require = createRequire(import.meta.url);
const PDFDocument = require("pdfkit");

const money = (n) =>
  `$${(Math.round((Number(n) || 0) * 100) / 100).toFixed(2)}`;
const pct = (n) => `${(Number(n) || 0).toFixed(2)}%`;

function pageWidth(doc) {
  return doc.page.width - doc.page.margins.left - doc.page.margins.right;
}

/** Always pin the text cursor to the left margin. */
function resetCursor(doc, y = doc.y) {
  doc.x = doc.page.margins.left;
  doc.y = y;
}

function ensureSpace(doc, needed = 60) {
  if (doc.y + needed > doc.page.height - doc.page.margins.bottom) {
    doc.addPage();
    resetCursor(doc, doc.page.margins.top);
  }
}

function sectionTitle(doc, title) {
  ensureSpace(doc, 48);
  const left = doc.page.margins.left;
  const width = pageWidth(doc);
  doc.y += 10;
  doc
    .font("Helvetica-Bold")
    .fontSize(11)
    .fillColor("#111")
    .text(title, left, doc.y, {
      width,
      align: "left",
      lineBreak: false,
    });
  doc.y += 16;
  resetCursor(doc);
}

/**
 * Draw a label/value grid (2 rows max) so wide summaries don't overlap.
 * items: [{ label, value }]
 */
function metricGrid(doc, items, cols = 5) {
  const left = doc.page.margins.left;
  const usable = pageWidth(doc);
  const colW = usable / cols;
  const rowH = 28;

  for (let i = 0; i < items.length; i += cols) {
    ensureSpace(doc, rowH + 4);
    const slice = items.slice(i, i + cols);
    const y = doc.y;
    slice.forEach((item, idx) => {
      const x = left + idx * colW;
      doc
        .font("Helvetica")
        .fontSize(7)
        .fillColor("#666")
        .text(String(item.label), x, y, {
          width: colW - 6,
          align: "left",
          lineBreak: false,
        });
      doc
        .font("Helvetica-Bold")
        .fontSize(9)
        .fillColor("#111")
        .text(String(item.value), x, y + 11, {
          width: colW - 6,
          align: "left",
          lineBreak: false,
        });
    });
    doc.y = y + rowH;
    resetCursor(doc);
  }
}

/**
 * Left-aligned data table. Resets cursor afterward so next section title
 * never starts at the right edge.
 */
function dataTable(doc, headers, rows) {
  const left = doc.page.margins.left;
  const usable = pageWidth(doc);
  const colCount = Math.max(headers.length, 1);

  // Give first column more room when it looks like a name column
  const widths = headers.map((_, i) => {
    if (colCount === 1) return usable;
    if (i === 0 && colCount > 2) return Math.min(usable * 0.34, 170);
    const first = colCount > 2 ? Math.min(usable * 0.34, 170) : 0;
    return (usable - first) / (colCount - (colCount > 2 ? 1 : 0));
  });
  // Normalize if first-col special case not applied evenly
  const widthSum = widths.reduce((s, w) => s + w, 0);
  const norm = widths.map((w) => (w / widthSum) * usable);

  const rowH = 14;
  ensureSpace(doc, 20 + Math.max(rows.length, 1) * rowH);

  // Header
  let y = doc.y;
  let x = left;
  doc.font("Helvetica-Bold").fontSize(8).fillColor("#333");
  headers.forEach((h, i) => {
    doc.text(String(h), x, y, {
      width: norm[i] - 4,
      align: "left",
      lineBreak: false,
    });
    x += norm[i];
  });
  y += 12;
  doc
    .strokeColor("#cccccc")
    .lineWidth(0.5)
    .moveTo(left, y)
    .lineTo(left + usable, y)
    .stroke();
  y += 4;

  // Rows
  for (const row of rows) {
    if (y + rowH > doc.page.height - doc.page.margins.bottom) {
      doc.addPage();
      resetCursor(doc, doc.page.margins.top);
      y = doc.y;
      // repeat header on new page
      x = left;
      doc.font("Helvetica-Bold").fontSize(8).fillColor("#333");
      headers.forEach((h, i) => {
        doc.text(String(h), x, y, {
          width: norm[i] - 4,
          align: "left",
          lineBreak: false,
        });
        x += norm[i];
      });
      y += 12;
      doc
        .strokeColor("#cccccc")
        .lineWidth(0.5)
        .moveTo(left, y)
        .lineTo(left + usable, y)
        .stroke();
      y += 4;
    }

    const isTotal = String(row[0] ?? "")
      .toUpperCase()
      .startsWith("TOTAL");
    doc
      .font(isTotal ? "Helvetica-Bold" : "Helvetica")
      .fontSize(8)
      .fillColor("#111");
    x = left;
    row.forEach((cell, i) => {
      doc.text(String(cell ?? ""), x, y, {
        width: norm[i] - 4,
        align: i === 0 ? "left" : "left",
        lineBreak: false,
      });
      x += norm[i];
    });
    y += rowH;
  }

  doc.y = y + 4;
  resetCursor(doc);
}

/**
 * Build End-of-Day PDF (Letter) buffer.
 */
export async function exportEodPdf(report) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "LETTER",
        margins: { top: 40, bottom: 40, left: 40, right: 40 },
        info: {
          Title: report.meta?.title || "End Of Day Report",
          Author: "Tasty Bites",
        },
      });
      const chunks = [];
      doc.on("data", (c) => chunks.push(c));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      const meta = report.meta || {};
      const left = doc.page.margins.left;
      const width = pageWidth(doc);

      doc
        .font("Helvetica-Bold")
        .fontSize(16)
        .fillColor("#111")
        .text(meta.restaurantName || "Restaurant", left, doc.y, {
          width,
          align: "left",
        });
      doc
        .font("Helvetica-Bold")
        .fontSize(12)
        .text("End Of Day Report", left, doc.y, { width, align: "left" });
      doc.font("Helvetica").fontSize(9).fillColor("#444");
      doc.text(`Business Day: ${meta.businessDate || ""}`, left, doc.y, {
        width,
        align: "left",
      });
      if (meta.priorDate) {
        doc.text(
          `Period label: ${meta.businessDate}/${meta.priorDate}`,
          left,
          doc.y,
          { width, align: "left" }
        );
      }
      doc.text(
        `Generated: ${
          meta.generatedAt ? new Date(meta.generatedAt).toLocaleString() : ""
        }`,
        left,
        doc.y,
        { width, align: "left" }
      );
      if (meta.generatedByName) {
        doc.text(`Generated By: ${meta.generatedByName}`, left, doc.y, {
          width,
          align: "left",
        });
      }
      if (meta.source === "saved") {
        doc.text("Source: Saved snapshot", left, doc.y, {
          width,
          align: "left",
        });
      }
      doc.fillColor("#111");
      resetCursor(doc);

      const dss = report.detailedSalesSummary || {};
      sectionTitle(doc, "DETAILED SALES SUMMARY");
      metricGrid(doc, [
        { label: "Net Sales", value: money(dss.netSales) },
        { label: "Gross Sales", value: money(dss.grossSales) },
        { label: "Total Discounts", value: money(dss.totalDiscounts) },
        { label: "Menu Item Cost", value: money(dss.menuItemCost) },
        { label: "Labor Cost", value: money(dss.laborCost) },
        { label: "Gross Margin", value: money(dss.grossMargin) },
        { label: "Total Sales Taxes", value: money(dss.totalSalesTaxes) },
        { label: "Average Per Guest", value: money(dss.averagePerGuest) },
        { label: "Average Per Bill", value: money(dss.averagePerBill) },
        { label: "Total Refund Amount", value: money(dss.totalRefundAmount) },
      ]);

      const dls = report.detailedLaborSummary || {};
      sectionTitle(doc, "DETAILED LABOR SUMMARY");
      metricGrid(doc, [
        { label: "Total Labor Cost", value: money(dls.totalLaborCost) },
        { label: "Total Labor Hours", value: money(dls.totalLaborHours) },
        {
          label: "Labor Cost (% of Net Sales)",
          value: pct(dls.laborCostPctOfNetSales),
        },
        {
          label: "Avg Table Turn (Minutes)",
          value: money(dls.averageTableTurnTimeMinutes),
        },
        { label: "Total Non-Cash Tips", value: money(dls.totalNonCashTips) },
        { label: "Total Cash Tips", value: money(dls.totalCashTips) },
        { label: "Total Tips", value: money(dls.totalTips) },
        { label: "Total Gratuity", value: money(dls.totalGratuity) },
        { label: "Total Active Shifts", value: dls.totalActiveShifts ?? 0 },
        {
          label: "Total Completed Shifts",
          value: dls.totalCompletedShifts ?? 0,
        },
      ]);

      const ps = report.paymentsSummary || {};
      sectionTitle(doc, "PAYMENTS SUMMARY");
      metricGrid(
        doc,
        [
          { label: "Transactions Count", value: ps.transactionsCount ?? 0 },
          { label: "Refunds Count", value: ps.refundsCount ?? 0 },
          { label: "Total Cash", value: money(ps.totalCash) },
          { label: "Total Non-Cash", value: money(ps.totalNonCash) },
          { label: "Total Surcharges", value: money(ps.totalSurcharges) },
          { label: "Total Payment", value: money(ps.totalPayment) },
          {
            label: "Total Payments - Net Sales",
            value: money(ps.totalPaymentsMinusNetSales),
          },
          { label: "Total Cash Rounding", value: money(ps.totalCashRounding) },
        ],
        4
      );

      sectionTitle(doc, "SALES BY SECTION");
      dataTable(
        doc,
        [
          "Section Name",
          "Bill Count",
          "Net Sales",
          "Gross Sales",
          "Discounts",
          "Taxes",
        ],
        [
          ...(report.salesBySection?.rows || []).map((r) => [
            r.sectionName,
            r.billCount,
            money(r.netSales),
            money(r.grossSales),
            money(r.discounts),
            money(r.taxes),
          ]),
          report.salesBySection?.total
            ? [
                "TOTAL",
                report.salesBySection.total.billCount,
                money(report.salesBySection.total.netSales),
                money(report.salesBySection.total.grossSales),
                money(report.salesBySection.total.discounts),
                money(report.salesBySection.total.taxes),
              ]
            : null,
        ].filter(Boolean)
      );

      sectionTitle(doc, "SALES BY SALES CATEGORY");
      dataTable(
        doc,
        [
          "Sales Category",
          "Menu Item Qty",
          "Net Sales",
          "Gross Sales",
          "Discounts",
          "Taxes",
        ],
        [
          ...(report.salesBySalesCategory?.rows || []).map((r) => [
            r.salesCategory,
            r.menuItemQuantity,
            money(r.netSales),
            money(r.grossSales),
            money(r.discounts),
            money(r.taxes),
          ]),
          report.salesBySalesCategory?.total
            ? [
                "TOTAL",
                report.salesBySalesCategory.total.menuItemQuantity,
                money(report.salesBySalesCategory.total.netSales),
                money(report.salesBySalesCategory.total.grossSales),
                money(report.salesBySalesCategory.total.discounts),
                money(report.salesBySalesCategory.total.taxes),
              ]
            : null,
        ].filter(Boolean)
      );

      sectionTitle(doc, "GIFT CARD SALES");
      dataTable(
        doc,
        ["Item", "Count", "Total"],
        (report.giftCardSales?.rows || []).length
          ? report.giftCardSales.rows.map((r) => [
              r.item,
              r.count,
              money(r.total),
            ])
          : [["—", "0", money(0)]]
      );

      sectionTitle(doc, "TIPS BY EMPLOYEES");
      dataTable(
        doc,
        ["Employee Name", "Cash Tips", "Non-Cash Tips", "Total Tips"],
        [
          ...(report.tipsByEmployees?.rows || []).map((r) => [
            r.employeeName,
            money(r.cashTips),
            money(r.nonCashTips),
            money(r.totalTips),
          ]),
          report.tipsByEmployees?.total
            ? [
                "TOTAL",
                money(report.tipsByEmployees.total.cashTips),
                money(report.tipsByEmployees.total.nonCashTips),
                money(report.tipsByEmployees.total.totalTips),
              ]
            : null,
        ].filter(Boolean)
      );

      sectionTitle(doc, "TIPS SUMMARY");
      metricGrid(
        doc,
        [
          {
            label: "Total Cash Tips",
            value: money(report.tipsSummary?.totalCashTips),
          },
          {
            label: "Total Non-Cash Tips",
            value: money(report.tipsSummary?.totalNonCashTips),
          },
          {
            label: "Total Tips",
            value: money(report.tipsSummary?.totalTips),
          },
        ],
        3
      );

      sectionTitle(doc, "PAYMENT BY PAYMENT TYPE");
      dataTable(
        doc,
        ["Payment Type", "Payment Count", "Refunds", "Tips", "Payment Total"],
        [
          ...(report.paymentByPaymentType?.rows || []).map((r) => [
            r.paymentType,
            r.paymentCount,
            money(r.refunds),
            money(r.tips),
            money(r.paymentTotal),
          ]),
          report.paymentByPaymentType?.total
            ? [
                "TOTAL",
                report.paymentByPaymentType.total.paymentCount,
                money(report.paymentByPaymentType.total.refunds),
                money(report.paymentByPaymentType.total.tips),
                money(report.paymentByPaymentType.total.paymentTotal),
              ]
            : null,
        ].filter(Boolean)
      );

      sectionTitle(doc, "ACCOUNTS");
      dataTable(
        doc,
        ["Account Name", "Payments", "Deposits"],
        (report.accounts?.rows || []).length
          ? report.accounts.rows.map((r) => [
              r.accountName,
              money(r.payments),
              money(r.deposits),
            ])
          : [["—", money(0), money(0)]]
      );

      sectionTitle(doc, "TIP OUTS");
      metricGrid(
        doc,
        [
          {
            label: "Total Cash Owed To House",
            value: money(report.tipOuts?.totalCashOwedToHouse),
          },
          {
            label: "Total Cash Owed To Server",
            value: money(report.tipOuts?.totalCashOwedToServer),
          },
        ],
        2
      );

      sectionTitle(doc, "PAYOUTS");
      metricGrid(
        doc,
        [
          {
            label: "Total Payouts",
            value: money(report.payouts?.totalPayouts),
          },
        ],
        1
      );

      sectionTitle(doc, "PAYINS");
      metricGrid(
        doc,
        [{ label: "Total Payins", value: money(report.payins?.totalPayins) }],
        1
      );

      const st = report.salesTaxAndTipSummary || {};
      sectionTitle(doc, "SALES TAX AND TIP SUMMARY");
      dataTable(
        doc,
        ["Metric", "Value"],
        [
          ["Net Sales", money(st.netSales)],
          ["Gross Sales", money(st.grossSales)],
          ["Total Discounts", money(st.totalDiscounts)],
          ["Total Sales Taxes", money(st.totalSalesTaxes)],
          ["Total Tips", money(st.totalTips)],
          [
            "Total Net Sales, Taxes and Tips",
            money(st.totalNetSalesTaxesAndTips),
          ],
          ["Service Charges", money(st.serviceCharges)],
          ["Gratuities", money(st.gratuities)],
          ["Surcharges", money(st.surcharges)],
          ["Other Service Charges", money(st.otherServiceCharges)],
          ["Service Charges Taxes", money(st.serviceChargesTaxes)],
          ["Total Refunds Amount", money(st.totalRefundsAmount)],
          ["Total Voids", money(st.totalVoids)],
          ["Total Bill Count", st.totalBillCount ?? 0],
          ["Total Guest Count", st.totalGuestCount ?? 0],
          ["Gift Card Sales", money(st.giftCardSales)],
          ["Gross Margin", money(st.grossMargin)],
          [
            "Bills With Outstanding Balance",
            st.billsWithOutstandingBalance ?? 0,
          ],
        ]
      );

      const cd = report.cashDeposit || {};
      sectionTitle(doc, "CASH DEPOSIT");
      metricGrid(
        doc,
        [
          {
            label: "Business Day",
            value: cd.businessDay || meta.businessDate || "",
          },
          { label: "Expected Deposit", value: money(cd.expectedDeposit) },
          { label: "Actual Deposit", value: money(cd.actualDeposit) },
          { label: "Over Short", value: money(cd.overShort) },
          { label: "Created By", value: cd.createdBy || "—" },
        ],
        5
      );

      sectionTitle(doc, "TAX SUMMARY");
      dataTable(
        doc,
        ["Tax Name", "Bill Count", "Tax Amount", "Net Sales"],
        [
          ...(report.taxSummary?.rows || []).map((r) => [
            r.taxName,
            r.billCount,
            money(r.taxAmount),
            money(r.netSales),
          ]),
          report.taxSummary?.total
            ? [
                "TOTAL",
                report.taxSummary.total.billCount ?? "",
                money(report.taxSummary.total.taxAmount),
                report.taxSummary.total.netSales ?? "",
              ]
            : null,
        ].filter(Boolean)
      );

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

export function eodPdfFilename(businessDate) {
  return `End-of-Day-${businessDate}.pdf`;
}
