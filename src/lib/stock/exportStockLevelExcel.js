import ExcelJS from "exceljs";

const money = (n) => Math.round((Number(n) || 0) * 100) / 100;

/**
 * Build a Current Stock Level .xlsx buffer.
 */
export async function exportStockLevelExcel({
  levels,
  restaurantName,
  categoryLabel,
  typeLabel,
}) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Tasty Bites";
  wb.created = new Date();
  const sheet = wb.addWorksheet("Stock Level", {
    views: [{ showGridLines: true }],
  });

  sheet.columns = [
    { width: 28 },
    { width: 18 },
    { width: 16 },
    { width: 12 },
    { width: 12 },
    { width: 12 },
    { width: 14 },
    { width: 14 },
    { width: 12 },
  ];

  const title = sheet.addRow([`${restaurantName || "Tasty Bites"} — Current Stock Level`]);
  title.font = { bold: true, size: 14 };
  sheet.addRow([`Generated: ${new Date().toLocaleString()}`]);
  sheet.addRow([
    `Category: ${categoryLabel || "All"}    Type: ${typeLabel || "All"}`,
  ]);
  sheet.addRow([]);

  const header = sheet.addRow([
    "Product",
    "Category",
    "Type",
    "Unit",
    "Total In",
    "Total Out",
    "Balance",
    "Purchase Cost",
    "Status",
  ]);
  header.font = { bold: true, size: 10 };
  header.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE8E8E8" },
    };
  });

  for (const row of levels || []) {
    sheet.addRow([
      row.name || "",
      row.category?.name || "",
      row.type?.name || "",
      row.unit?.name || "",
      Number(row.totalIn) || 0,
      Number(row.totalOut) || 0,
      Number(row.currentBalance) || 0,
      money(row.purchasePrice),
      row.status ? "Active" : "Inactive",
    ]);
  }

  const totals = (levels || []).reduce(
    (acc, row) => {
      acc.in += Number(row.totalIn) || 0;
      acc.out += Number(row.totalOut) || 0;
      acc.balance += Number(row.currentBalance) || 0;
      return acc;
    },
    { in: 0, out: 0, balance: 0 }
  );

  sheet.addRow([]);
  const totalRow = sheet.addRow([
    "TOTAL",
    "",
    "",
    "",
    totals.in,
    totals.out,
    totals.balance,
    "",
    `${(levels || []).length} products`,
  ]);
  totalRow.font = { bold: true, size: 10 };

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export function stockLevelExcelFilename() {
  const d = new Date().toISOString().slice(0, 10);
  return `Stock-Level-${d}.xlsx`;
}
