import ExcelJS from "exceljs";

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

function writeMeta(sheet, restaurantName, title, data) {
  const meta = data?.meta || {};
  const titleRow = sheet.addRow([`${restaurantName || "Tasty Bites"} — ${title}`]);
  titleRow.font = { bold: true, size: 14 };
  sheet.addRow([`Generated: ${new Date().toLocaleString()}`]);
  sheet.addRow([
    `Date range: ${meta.dateFrom || ""} to ${meta.dateTo || ""} (${meta.preset || ""})`,
  ]);
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
  if (extras.length) sheet.addRow([extras.join("  |  ")]);
  if (data?.note) sheet.addRow([data.note]);
  sheet.addRow([]);
}

function writeActivity(wb, restaurantName, data) {
  const sheet = addSheet(wb, "Activity", [14, 12, 22, 20, 12, 22, 36]);
  writeMeta(sheet, restaurantName, "Admin Activity", data);
  styleHeader(
    sheet.addRow(["Date", "Time", "Actor", "Action", "Module", "Target", "Description"])
  );
  for (const row of data.rows || []) {
    sheet.addRow([
      row.date,
      row.time,
      row.admin,
      row.action,
      row.module,
      row.target,
      row.description,
    ]);
  }
}

function writeRevenue(wb, restaurantName, data) {
  const kpis = data.kpis || {};
  const summary = addSheet(wb, "Summary", [28, 18]);
  writeMeta(summary, restaurantName, "Revenue Generated", data);
  styleHeader(summary.addRow(["Metric", "Value"]));
  summary.addRow(["Gross Sales", money(kpis.grossSales)]);
  summary.addRow(["Discounts", money(kpis.discounts)]);
  summary.addRow(["Net Sales", money(kpis.netSales)]);
  summary.addRow(["Tax", money(kpis.tax)]);
  summary.addRow(["Tips", money(kpis.tips)]);
  summary.addRow(["Service Charges", money(kpis.serviceCharges)]);
  summary.addRow(["Total Collected", money(kpis.collected)]);
  summary.addRow(["Orders", kpis.orderCount || 0]);
  summary.addRow(["Cash", money(kpis.cash)]);
  summary.addRow(["Card", money(kpis.card)]);
  summary.addRow(["Gift Card", money(kpis.giftCard)]);

  const days = addSheet(wb, "By Day", [14, 10, 14, 14, 14, 12, 12, 14, 14]);
  styleHeader(
    days.addRow([
      "Date",
      "Orders",
      "Gross Sales",
      "Discount",
      "Net Sales",
      "Tax",
      "Tips",
      "Service Charges",
      "Total",
    ])
  );
  for (const row of data.byDay || []) {
    days.addRow([
      row.date,
      row.orders,
      money(row.grossSales),
      money(row.discounts),
      money(row.netSales),
      money(row.tax),
      money(row.tips),
      money(row.serviceCharges),
      money(row.total),
    ]);
  }

  const emp = addSheet(wb, "By Employee", [24, 10, 14, 14, 14]);
  styleHeader(emp.addRow(["Employee", "Orders", "Gross", "Net", "Collected"]));
  for (const row of data.byEmployee || []) {
    emp.addRow([
      row.employeeName,
      row.orders,
      money(row.grossSales),
      money(row.netSales),
      money(row.collected),
    ]);
  }

  const cat = addSheet(wb, "By Category", [24, 12, 14, 14, 14]);
  styleHeader(cat.addRow(["Category", "Quantity", "Gross", "Discount", "Net"]));
  for (const row of data.byCategory || []) {
    cat.addRow([
      row.category,
      row.quantity,
      money(row.grossSales),
      money(row.discounts),
      money(row.netSales),
    ]);
  }
}

function writeDaily(wb, restaurantName, data) {
  const counts = data.counts || {};
  const kpis = data.kpis || {};
  const summary = addSheet(wb, "Summary", [32, 18]);
  writeMeta(summary, restaurantName, "Daily Summary", data);
  styleHeader(summary.addRow(["Metric", "Value"]));
  summary.addRow(["Total Orders", counts.total || 0]);
  summary.addRow(["Completed (Paid)", counts.completed || 0]);
  summary.addRow(["Pending", counts.pending || 0]);
  summary.addRow(["Cancelled", counts.cancelled || 0]);
  summary.addRow(["Waived", counts.waived || 0]);
  summary.addRow(["Voided (not recorded)", counts.voided || 0]);
  summary.addRow(["Refunded (not recorded)", counts.refunded || 0]);
  summary.addRow(["Gross Sales", money(kpis.grossSales)]);
  summary.addRow(["Discounts", money(kpis.discounts)]);
  summary.addRow(["Net Sales", money(kpis.netSales)]);
  summary.addRow(["Tax", money(kpis.tax)]);
  summary.addRow(["Tips", money(kpis.tips)]);
  summary.addRow(["Service Charges", money(kpis.serviceCharges)]);
  summary.addRow(["Final Total", money(kpis.collected)]);

  const emp = addSheet(wb, "Employees", [24, 10, 14, 12]);
  styleHeader(emp.addRow(["Employee", "Orders", "Sales", "Tips"]));
  for (const row of data.byEmployee || []) {
    emp.addRow([row.employeeName, row.orders, money(row.sales), money(row.tips)]);
  }

  const items = addSheet(wb, "Top Items", [28, 12, 14, 10]);
  styleHeader(items.addRow(["Item", "Quantity", "Revenue", "Orders"]));
  for (const row of data.topItems || []) {
    items.addRow([row.item, row.quantity, money(row.revenue), row.orderCount]);
  }
}

function writeAudit(wb, restaurantName, data) {
  const sheet = addSheet(wb, "Audit", [14, 12, 16, 22, 20, 12, 28, 12]);
  writeMeta(sheet, restaurantName, "Transaction Audit", data);
  if (data.notes?.unsupported) sheet.addRow([data.notes.unsupported]);
  sheet.addRow([]);
  styleHeader(
    sheet.addRow([
      "Date",
      "Time",
      "Order #",
      "Employee",
      "Event Type",
      "Amount",
      "Reason",
      "Status",
    ])
  );
  for (const row of data.rows || []) {
    sheet.addRow([
      row.date,
      row.time,
      row.orderNumber,
      row.employee,
      row.eventType,
      money(row.amount),
      row.reason,
      row.status,
    ]);
  }
}

function writeKitchen(wb, restaurantName, data) {
  const tickets = addSheet(wb, "KOTs", [18, 16, 14, 12, 12, 22, 14, 12]);
  writeMeta(tickets, restaurantName, "Kitchen Log", data);
  styleHeader(
    tickets.addRow([
      "KOT #",
      "Order #",
      "Date",
      "Time",
      "Table",
      "Server",
      "Status",
      "Type",
    ])
  );
  for (const row of data.rows || []) {
    tickets.addRow([
      row.kotNumber,
      row.orderNumber,
      row.date,
      row.time,
      row.table,
      row.employee,
      row.status,
      row.type,
    ]);
  }

  const items = addSheet(wb, "Top Items", [8, 28, 12, 12]);
  styleHeader(items.addRow(["Rank", "Item", "Quantity", "Orders"]));
  for (const row of data.topItems || []) {
    items.addRow([row.rank, row.item, row.quantity, row.orderCount]);
  }
}

const WRITERS = {
  activity: writeActivity,
  revenue: writeRevenue,
  "daily-summary": writeDaily,
  audit: writeAudit,
  kitchen: writeKitchen,
};

export async function exportAdminExcel({ section, restaurantName, data }) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Tasty Bites";
  wb.created = new Date();
  const writer = WRITERS[section] || writeActivity;
  writer(wb, restaurantName, data);
  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export function adminExcelFilename(section, dateFrom, dateTo) {
  return `Admin-${section || "report"}-${dateFrom || "from"}-to-${dateTo || "to"}.xlsx`;
}
