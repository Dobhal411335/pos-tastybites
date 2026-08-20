import ExcelJS from "exceljs";
import { stockStatusLabel } from "./status";

const money = (n) => Math.round((Number(n) || 0) * 100) / 100;

function styleHeader(row) {
  row.font = { bold: true, size: 10 };
  row.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE8E8E8" },
    };
  });
}

function addSheet(wb, name, columns) {
  const sheet = wb.addWorksheet(name, { views: [{ showGridLines: true }] });
  sheet.columns = columns.map((width) => ({ width }));
  return sheet;
}

export async function exportInventoryExcel({
  restaurantName,
  overview,
  stock,
  movements,
  topItems,
  lowStock,
}) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Tasty Bites";
  wb.created = new Date();

  const kpis = overview?.kpis || {};
  const balance = overview?.balance || {};
  const meta = overview?.meta || {};

  const summary = addSheet(wb, "Summary", [28, 22, 18, 18]);
  const title = summary.addRow([
    `${restaurantName || "Tasty Bites"} — Inventory & Stock Reports`,
  ]);
  title.font = { bold: true, size: 14 };
  summary.addRow([`Generated: ${new Date().toLocaleString()}`]);
  summary.addRow([
    `Date range: ${meta.dateFrom || ""} to ${meta.dateTo || ""} (${meta.preset || ""})`,
  ]);
  summary.addRow([]);
  styleHeader(summary.addRow(["Metric", "Value"]));
  summary.addRow(["Total Products", kpis.totalProducts || 0]);
  summary.addRow(["Active Products", kpis.activeProducts || 0]);
  summary.addRow(["Total Stock Units", kpis.totalUnits || 0]);
  summary.addRow(["Low Stock Items", kpis.lowStockCount || 0]);
  summary.addRow(["Out of Stock", kpis.outOfStockCount || 0]);
  summary.addRow(["Stock Added (period)", kpis.stockAdded || 0]);
  summary.addRow(["Stock Removed (period)", kpis.stockRemoved || 0]);
  summary.addRow(["Movement Count", kpis.movementCount || 0]);
  summary.addRow([
    "Top Outgoing Product",
    kpis.topOutgoingProduct?.name || "—",
  ]);
  summary.addRow(["Inventory Value", money(kpis.inventoryValue)]);
  summary.addRow([]);
  styleHeader(summary.addRow(["Balance", "Units"]));
  summary.addRow(["Opening Stock", balance.opening || 0]);
  summary.addRow(["Stock Added", balance.added || 0]);
  summary.addRow(["Stock Removed", balance.removed || 0]);
  summary.addRow(["Closing Stock", balance.closing || 0]);
  if (overview?.note) {
    summary.addRow([]);
    summary.addRow([overview.note]);
  }

  const stockSheet = addSheet(wb, "Stock", [28, 18, 12, 12, 12, 12, 12, 14, 14, 14]);
  styleHeader(
    stockSheet.addRow([
      "Product",
      "Category",
      "Opening",
      "Period In",
      "Period Out",
      "Current Stock",
      "Unit",
      "Minimum Stock",
      "Stock Status",
      "Stock Value",
    ])
  );
  for (const row of stock?.rows || []) {
    stockSheet.addRow([
      row.name || "",
      row.categoryName || "",
      Number(row.openingStock) || 0,
      Number(row.unitsInPeriod) || 0,
      Number(row.unitsOutPeriod) || 0,
      Number(row.currentBalance) || 0,
      row.unit || "",
      row.minStock == null ? "—" : row.minStock,
      stockStatusLabel(row.stockStatus),
      money(row.stockValue),
    ]);
  }

  const moveSheet = addSheet(wb, "Movements", [14, 12, 24, 16, 12, 12, 12, 12, 18, 18]);
  styleHeader(
    moveSheet.addRow([
      "Date",
      "Time",
      "Product",
      "Category",
      "Type",
      "Quantity",
      "Previous",
      "New",
      "Reason",
      "Performed By",
    ])
  );
  for (const row of movements?.rows || []) {
    moveSheet.addRow([
      row.date || "",
      row.time || "",
      row.product || "",
      row.category || "",
      row.movementLabel || row.movementType || "",
      Number(row.quantity) || 0,
      row.previousStock == null ? "—" : row.previousStock,
      row.newStock == null ? "—" : row.newStock,
      row.reason || "—",
      row.performedBy || "—",
    ]);
  }

  const topSheet = addSheet(wb, "Top Items", [8, 28, 18, 14, 16, 16]);
  styleHeader(
    topSheet.addRow([
      "Rank",
      "Product",
      "Category",
      "Quantity Out",
      "Outgoing Value",
      "Average Unit Price",
    ])
  );
  for (const row of topItems?.rows || []) {
    topSheet.addRow([
      row.rank,
      row.product || "",
      row.category || "",
      Number(row.quantity) || 0,
      money(row.value),
      money(row.averageUnitPrice),
    ]);
  }

  const lowSheet = addSheet(wb, "Low Out of Stock", [28, 18, 14, 14, 14, 16]);
  styleHeader(
    lowSheet.addRow([
      "Product",
      "Category",
      "Current Stock",
      "Minimum Stock",
      "Status",
      "Quantity Needed",
    ])
  );
  for (const row of lowStock?.rows || []) {
    lowSheet.addRow([
      row.name || "",
      row.categoryName || "",
      Number(row.currentBalance) || 0,
      row.minStock == null ? "—" : row.minStock,
      stockStatusLabel(row.stockStatus),
      row.quantityNeeded == null ? "—" : row.quantityNeeded,
    ]);
  }

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export function inventoryExcelFilename(dateFrom, dateTo) {
  return `Inventory-Stock-${dateFrom || "report"}-to-${dateTo || "report"}.xlsx`;
}
