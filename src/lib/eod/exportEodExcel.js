import ExcelJS from "exceljs";

const money = (n) => Math.round((Number(n) || 0) * 100) / 100;

function styleSectionHeader(row) {
  row.font = { bold: true, size: 12 };
  row.getCell(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE8E8E8" },
  };
}

function styleColumnHeader(row) {
  row.font = { bold: true, size: 10 };
}

function styleTotalRow(row) {
  row.font = { bold: true, size: 10 };
}

function addBlank(sheet) {
  sheet.addRow([]);
}

function addMoneyRow(sheet, values) {
  const row = sheet.addRow(values.map((v) => (typeof v === "number" ? money(v) : v)));
  return row;
}

/**
 * Build an End-of-Day .xlsx buffer matching the reference CSV section order.
 */
export async function exportEodExcel(report) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Tasty Bites";
  wb.created = new Date();
  const sheet = wb.addWorksheet("End Of Day", {
    views: [{ showGridLines: true }],
  });

  sheet.columns = Array.from({ length: 18 }, (_, i) => ({
    width: i === 0 ? 36 : 16,
  }));

  // Title
  const titleRow = sheet.addRow([report.meta?.title || "End Of Day"]);
  titleRow.font = { bold: true, size: 14 };
  addBlank(sheet);

  // 1. DETAILED SALES SUMMARY
  styleSectionHeader(sheet.addRow(["DETAILED SALES SUMMARY"]));
  styleColumnHeader(
    sheet.addRow([
      "Net Sales",
      "Gross Sales",
      "Total Discounts",
      "Menu Item Cost",
      "Labor Cost",
      "Gross Margin",
      "Total Sales Taxes",
      "Average Per Guest",
      "Average Per Bill",
      "Total Refund Amount",
    ])
  );
  const dss = report.detailedSalesSummary || {};
  addMoneyRow(sheet, [
    dss.netSales,
    dss.grossSales,
    dss.totalDiscounts,
    dss.menuItemCost,
    dss.laborCost,
    dss.grossMargin,
    dss.totalSalesTaxes,
    dss.averagePerGuest,
    dss.averagePerBill,
    dss.totalRefundAmount,
  ]);
  addBlank(sheet);

  // 2. DETAILED LABOR SUMMARY
  styleSectionHeader(sheet.addRow(["DETAILED LABOR SUMMARY"]));
  styleColumnHeader(
    sheet.addRow([
      "Total Labor Cost",
      "Total Labor Hours",
      "Labor Cost (% of Net Sales)",
      "Average Table Turn Time (Minutes)",
      "Total Non-Cash Tips",
      "Total Cash Tips",
      "Total Tips",
      "Total Gratuity",
      "Total Active Shifts",
      "Total Completed Shifts",
    ])
  );
  const dls = report.detailedLaborSummary || {};
  const laborRow = sheet.addRow([
    money(dls.totalLaborCost),
    money(dls.totalLaborHours),
    `${Number(dls.laborCostPctOfNetSales || 0).toFixed(2)}%`,
    money(dls.averageTableTurnTimeMinutes),
    money(dls.totalNonCashTips),
    money(dls.totalCashTips),
    money(dls.totalTips),
    money(dls.totalGratuity),
    dls.totalActiveShifts ?? 0,
    dls.totalCompletedShifts ?? 0,
  ]);
  void laborRow;
  addBlank(sheet);

  // 3. PAYMENTS SUMMARY
  styleSectionHeader(sheet.addRow(["PAYMENTS SUMMARY"]));
  styleColumnHeader(
    sheet.addRow([
      "Transactions Count",
      "Refunds Count",
      "Total Cash",
      "Total Non-Cash",
      "Total Surcharges",
      "Total Payment",
      "Total Payments - Total Net Sales",
      "Total Cash Rounding",
    ])
  );
  const ps = report.paymentsSummary || {};
  sheet.addRow([
    ps.transactionsCount ?? 0,
    ps.refundsCount ?? 0,
    money(ps.totalCash),
    money(ps.totalNonCash),
    money(ps.totalSurcharges),
    money(ps.totalPayment),
    money(ps.totalPaymentsMinusNetSales),
    money(ps.totalCashRounding),
  ]);
  addBlank(sheet);

  // 4. SALES BY SECTION
  styleSectionHeader(sheet.addRow(["SALES BY SECTION"]));
  styleColumnHeader(
    sheet.addRow([
      "Section Name",
      "Bill Count",
      "Net Sales",
      "Gross Sales",
      "Discounts",
      "Taxes",
    ])
  );
  for (const row of report.salesBySection?.rows || []) {
    sheet.addRow([
      row.sectionName,
      row.billCount,
      money(row.netSales),
      money(row.grossSales),
      money(row.discounts),
      money(row.taxes),
    ]);
  }
  const secTot = report.salesBySection?.total;
  if (secTot) {
    styleTotalRow(
      sheet.addRow([
        "TOTAL",
        secTot.billCount,
        money(secTot.netSales),
        money(secTot.grossSales),
        money(secTot.discounts),
        money(secTot.taxes),
      ])
    );
  }
  addBlank(sheet);

  // 5. SALES BY SALES CATEGORY
  styleSectionHeader(sheet.addRow(["SALES BY SALES CATEGORY"]));
  styleColumnHeader(
    sheet.addRow([
      "Sales Category",
      "Menu Item Quantity",
      "Net Sales",
      "Gross Sales",
      "Discounts",
      "Taxes",
    ])
  );
  for (const row of report.salesBySalesCategory?.rows || []) {
    sheet.addRow([
      row.salesCategory,
      row.menuItemQuantity,
      money(row.netSales),
      money(row.grossSales),
      money(row.discounts),
      money(row.taxes),
    ]);
  }
  const catTot = report.salesBySalesCategory?.total;
  if (catTot) {
    styleTotalRow(
      sheet.addRow([
        "TOTAL",
        catTot.menuItemQuantity,
        money(catTot.netSales),
        money(catTot.grossSales),
        money(catTot.discounts),
        money(catTot.taxes),
      ])
    );
  }
  addBlank(sheet);

  // 6. GIFT CARD SALES
  styleSectionHeader(sheet.addRow(["GIFT CARD SALES"]));
  styleColumnHeader(sheet.addRow(["Item", "Count", "Total"]));
  const gcRows = report.giftCardSales?.rows || [];
  if (gcRows.length === 0) {
    sheet.addRow(["", "", ""]);
  } else {
    for (const row of gcRows) {
      sheet.addRow([row.item, row.count, money(row.total)]);
    }
  }
  addBlank(sheet);

  // 7. TIPS BY EMPLOYEES
  styleSectionHeader(sheet.addRow(["TIPS BY EMPLOYEES"]));
  styleColumnHeader(
    sheet.addRow(["Employee Name", "Cash Tips", "Non-Cash Tips", "Total Tips"])
  );
  for (const row of report.tipsByEmployees?.rows || []) {
    sheet.addRow([
      row.employeeName,
      money(row.cashTips),
      money(row.nonCashTips),
      money(row.totalTips),
    ]);
  }
  const tipTot = report.tipsByEmployees?.total;
  if (tipTot) {
    styleTotalRow(
      sheet.addRow([
        "TOTAL",
        money(tipTot.cashTips),
        money(tipTot.nonCashTips),
        money(tipTot.totalTips),
      ])
    );
  }
  addBlank(sheet);

  // 8. TIPS SUMMARY
  styleSectionHeader(sheet.addRow(["TIPS SUMMARY"]));
  styleColumnHeader(
    sheet.addRow(["Total Cash Tips", "Total Non-Cash Tips", "Total Tips"])
  );
  const ts = report.tipsSummary || {};
  sheet.addRow([
    money(ts.totalCashTips),
    money(ts.totalNonCashTips),
    money(ts.totalTips),
  ]);
  addBlank(sheet);

  // 9. PAYMENT BY PAYMENT TYPE
  styleSectionHeader(sheet.addRow(["PAYMENT BY PAYMENT TYPE"]));
  styleColumnHeader(
    sheet.addRow([
      "Payment Type",
      "Payment Count",
      "Refunds",
      "Tips",
      "Payment Total",
    ])
  );
  for (const row of report.paymentByPaymentType?.rows || []) {
    sheet.addRow([
      row.paymentType,
      row.paymentCount,
      money(row.refunds),
      money(row.tips),
      money(row.paymentTotal),
    ]);
  }
  const payTot = report.paymentByPaymentType?.total;
  if (payTot) {
    styleTotalRow(
      sheet.addRow([
        "TOTAL",
        payTot.paymentCount,
        money(payTot.refunds),
        money(payTot.tips),
        money(payTot.paymentTotal),
      ])
    );
  }
  addBlank(sheet);

  // 10. ACCOUNTS
  styleSectionHeader(sheet.addRow(["ACCOUNTS"]));
  styleColumnHeader(sheet.addRow(["Account Name", "Payments", "Deposits"]));
  const acctRows = report.accounts?.rows || [];
  if (acctRows.length === 0) sheet.addRow(["", "", ""]);
  else {
    for (const row of acctRows) {
      sheet.addRow([row.accountName, money(row.payments), money(row.deposits)]);
    }
  }
  addBlank(sheet);

  // 11. TIP OUTS
  styleSectionHeader(sheet.addRow(["TIP OUTS"]));
  styleColumnHeader(
    sheet.addRow(["Total Cash Owed To House", "Total Cash Owed To Server"])
  );
  const tipOuts = report.tipOuts || {};
  sheet.addRow([
    money(tipOuts.totalCashOwedToHouse),
    money(tipOuts.totalCashOwedToServer),
  ]);
  addBlank(sheet);

  // 12. PAYOUTS
  styleSectionHeader(sheet.addRow(["PAYOUTS"]));
  styleColumnHeader(sheet.addRow(["Total Payouts"]));
  sheet.addRow([money(report.payouts?.totalPayouts)]);
  addBlank(sheet);

  // 13. PAYINS
  styleSectionHeader(sheet.addRow(["PAYINS"]));
  styleColumnHeader(sheet.addRow(["Total Payins"]));
  sheet.addRow([money(report.payins?.totalPayins)]);
  addBlank(sheet);

  // 14. SALES TAX AND TIP SUMMARY
  styleSectionHeader(sheet.addRow(["SALES TAX AND TIP SUMMARY"]));
  styleColumnHeader(
    sheet.addRow([
      "Net Sales",
      "Gross Sales",
      "Total Discounts",
      "Total Sales Taxes",
      "Total Tips",
      "Total Net Sales, Taxes and Tips",
      "Service Charges",
      "Gratuities",
      "Surcharges",
      "Other Service Charges",
      "Service Charges Taxes",
      "Total Refunds Amount",
      "Total Voids",
      "Total Bill Count",
      "Total Guest Count",
      "Gift Card Sales",
      "Gross Margin",
      "Bills With Outstanding Balance",
    ])
  );
  const st = report.salesTaxAndTipSummary || {};
  sheet.addRow([
    money(st.netSales),
    money(st.grossSales),
    money(st.totalDiscounts),
    money(st.totalSalesTaxes),
    money(st.totalTips),
    money(st.totalNetSalesTaxesAndTips),
    money(st.serviceCharges),
    money(st.gratuities),
    money(st.surcharges),
    money(st.otherServiceCharges),
    money(st.serviceChargesTaxes),
    money(st.totalRefundsAmount),
    money(st.totalVoids),
    st.totalBillCount ?? 0,
    st.totalGuestCount ?? 0,
    money(st.giftCardSales),
    money(st.grossMargin),
    st.billsWithOutstandingBalance ?? 0,
  ]);
  addBlank(sheet);

  // 15. CASH DEPOSIT
  styleSectionHeader(sheet.addRow(["CASH DEPOSIT"]));
  styleColumnHeader(
    sheet.addRow([
      "Business Day",
      "Expected Deposit",
      "Actual Deposit",
      "Over Short",
      "Created By",
    ])
  );
  const cd = report.cashDeposit || {};
  sheet.addRow([
    cd.businessDay || report.meta?.businessDate,
    money(cd.expectedDeposit),
    money(cd.actualDeposit),
    money(cd.overShort),
    cd.createdBy || "",
  ]);
  addBlank(sheet);

  // 16. TAX SUMMARY
  styleSectionHeader(sheet.addRow(["TAX SUMMARY"]));
  styleColumnHeader(
    sheet.addRow(["Tax Name", "Bill Count", "Tax Amount", "Net Sales"])
  );
  for (const row of report.taxSummary?.rows || []) {
    sheet.addRow([
      row.taxName,
      row.billCount,
      money(row.taxAmount),
      money(row.netSales),
    ]);
  }
  const taxTot = report.taxSummary?.total;
  if (taxTot) {
    styleTotalRow(
      sheet.addRow([
        "TOTAL",
        taxTot.billCount ?? "",
        money(taxTot.taxAmount),
        taxTot.netSales ?? "",
      ])
    );
  }

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export function eodExcelFilename(businessDate) {
  return `End-of-Day-${businessDate}.xlsx`;
}
