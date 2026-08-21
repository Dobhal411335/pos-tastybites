import ExcelJS from "exceljs";
import {
  employeeReportFilename,
  resolveExportView,
} from "@/lib/reports/employee/exportHelpers";

const money = (n) => Math.round((Number(n) || 0) * 100) / 100;
const hours = (n) => Math.round((Number(n) || 0) * 100) / 100;

function styleHeader(row) {
  row.font = { bold: true, size: 10, color: { argb: "FF7C2D12" } };
  row.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFFCE4D6" },
    };
    cell.border = {
      top: { style: "thin", color: { argb: "FFD4D4D8" } },
      left: { style: "thin", color: { argb: "FFD4D4D8" } },
      bottom: { style: "thin", color: { argb: "FFD4D4D8" } },
      right: { style: "thin", color: { argb: "FFD4D4D8" } },
    };
    cell.alignment = { horizontal: "center", vertical: "middle" };
  });
}

function styleDataRow(row) {
  row.eachCell((cell) => {
    cell.border = {
      top: { style: "thin", color: { argb: "FFE4E4E7" } },
      left: { style: "thin", color: { argb: "FFE4E4E7" } },
      bottom: { style: "thin", color: { argb: "FFE4E4E7" } },
      right: { style: "thin", color: { argb: "FFE4E4E7" } },
    };
  });
}

function styleTotalRow(row) {
  row.font = { bold: true, size: 10 };
  row.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFF4F4F5" },
    };
    cell.border = {
      top: { style: "thin", color: { argb: "FFD4D4D8" } },
      left: { style: "thin", color: { argb: "FFD4D4D8" } },
      bottom: { style: "thin", color: { argb: "FFD4D4D8" } },
      right: { style: "thin", color: { argb: "FFD4D4D8" } },
    };
  });
}

function addMetaRows(sheet, payload) {
  const { restaurantName, labels, reportTitle, employee } = payload;
  const title = sheet.addRow([
    `${restaurantName || "Tasty Bites"} — ${reportTitle || "Employee Report"}`,
  ]);
  title.font = { bold: true, size: 14 };
  sheet.addRow([`Generated: ${new Date().toLocaleString()}`]);
  sheet.addRow([
    `Period: ${labels.periodLabel || "Current filters"} (${labels.dateFrom} to ${labels.dateTo})`,
  ]);
  if (employee) {
    sheet.addRow([
      `Employee: ${labels.employeeName || employee.name}    Role: ${employee.role || "Staff"}`,
    ]);
  }
  sheet.addRow([
    `Shift: ${labels.shiftLabel}    Order status: ${labels.orderStatusLabel}    Payment: ${labels.paymentLabel}`,
  ]);
  sheet.addRow([]);
}

function addTable(sheet, headers, rows, totalRow) {
  const header = sheet.addRow(headers);
  styleHeader(header);
  for (const cells of rows) {
    styleDataRow(sheet.addRow(cells));
  }
  if (totalRow) styleTotalRow(sheet.addRow(totalRow));
}

function writeOverview(sheet, payload) {
  const rows = payload.rows || [];
  addTable(
    sheet,
    ["Employee", "Role", "Orders", "Net Sales", "Tips", "Svc Charges", "Hours"],
    rows.map((row) => [
      row.name || "",
      row.role || "",
      Number(row.orders) || 0,
      money(row.sales),
      money(row.tips),
      money(row.serviceCharges),
      hours(row.hours),
    ]),
    [
      "TOTAL",
      "",
      rows.reduce((s, r) => s + (Number(r.orders) || 0), 0),
      money(rows.reduce((s, r) => s + (Number(r.sales) || 0), 0)),
      money(rows.reduce((s, r) => s + (Number(r.tips) || 0), 0)),
      money(rows.reduce((s, r) => s + (Number(r.serviceCharges) || 0), 0)),
      hours(rows.reduce((s, r) => s + (Number(r.hours) || 0), 0)),
    ]
  );
}

function writeSales(sheet, payload) {
  const rows = payload.rows || [];
  addTable(
    sheet,
    ["Employee", "Role", "Orders", "Gross", "Discounts", "Net", "AOV", "Cancelled"],
    rows.map((row) => {
      const net = Number(row.sales) || 0;
      const disc = Number(row.discounts) || 0;
      return [
        row.name || "",
        row.role || "",
        Number(row.orders) || 0,
        money(net + disc),
        money(disc),
        money(net),
        money(row.aov),
        Number(row.cancellations) || 0,
      ];
    })
  );
}

function writeTips(sheet, payload) {
  const rows = payload.rows || [];
  addTable(
    sheet,
    ["Employee", "Orders", "Mode", "Collected", "Earned", "Avg Collected"],
    rows.map((row) => [
      row.name || "",
      Number(row.orders) || 0,
      row.receiveOwnTips ? "Own" : `${row.tipPercent || 0}%`,
      money(row.collectedTips),
      money(row.tips),
      money(row.averageTip),
    ])
  );
}

function writeService(sheet, payload) {
  const rows = payload.rows || [];
  addTable(
    sheet,
    ["Employee", "Role", "Orders", "Service Charges", "Total Sales"],
    rows.map((row) => [
      row.name || "",
      row.role || "",
      Number(row.orders) || 0,
      money(row.serviceCharges),
      money(row.sales),
    ])
  );
}

function writeHours(sheet, payload) {
  const rows = payload.rows || [];
  addTable(
    sheet,
    ["Employee", "Role", "Regular", "Break", "Overtime", "Total", "Days"],
    rows.map((row) => [
      row.name || "",
      row.role || "",
      hours(row.regularHours),
      "—",
      hours(row.overtimeHours),
      hours(row.hours),
      Number(row.daysWorked) || 0,
    ])
  );
}

function writeLabor(sheet, payload) {
  const rows = payload.rows || [];
  addTable(
    sheet,
    [
      "Employee ID",
      "Employee",
      "Position",
      "Hourly Rate",
      "Hours Worked",
      "Total Earnings",
    ],
    rows.map((row) => [
      row.employeeCode || "—",
      row.name || "—",
      row.role || "Staff",
      money(row.hourlyRate),
      hours(row.hours),
      money(row.estimatedPay),
    ]),
    [
      "TOTAL",
      "",
      "",
      "",
      hours(rows.reduce((s, r) => s + (Number(r.hours) || 0), 0)),
      money(rows.reduce((s, r) => s + (Number(r.estimatedPay) || 0), 0)),
    ]
  );
}

function writeClock(sheet, payload) {
  const rows = payload.rows || [];
  addTable(
    sheet,
    [
      "Employee",
      "Role",
      "Date",
      "Clock In",
      "Clock Out",
      "Break",
      "Hours",
      "OT",
      "Status",
    ],
    rows.map((row) => [
      row.employeeName || "",
      row.role || "",
      row.date || row.clockIn || "",
      row.clockIn || "",
      row.isIncomplete ? "" : row.clockOut || "",
      "—",
      hours(row.workedHours),
      hours(row.overtimeHours),
      row.isIncomplete
        ? "Working"
        : row.attendanceStatus || row.shiftStatus || "—",
    ])
  );
}

function writeTimesheet(sheet, payload) {
  const rows = payload.rows || [];
  addTable(
    sheet,
    [
      "Date",
      "Employee",
      "Role",
      "Scheduled Shift",
      "Clock In",
      "Clock Out",
      "Break",
      "Regular",
      "OT",
      "Total",
    ],
    rows.map((row) => [
      row.date || row.clockIn || "",
      row.employeeName || "",
      row.role || "",
      row.scheduledShift || "—",
      row.clockIn || "",
      row.isIncomplete ? "" : row.clockOut || "",
      "—",
      hours(row.regularHours),
      hours(row.overtimeHours),
      hours(row.workedHours),
    ])
  );
}

function writeOrders(sheet, payload) {
  const rows = payload.rows || [];
  addTable(
    sheet,
    [
      "Order",
      "Date/Time",
      "Employee",
      "Table",
      "Items",
      "Subtotal",
      "Discount",
      "Tax",
      "Svc",
      "Tip",
      "Total",
      "Payment",
      "Status",
    ],
    rows.map((row) => [
      `#${row.orderNumber || ""}`,
      row.createdAt || "",
      row.employeeName || "",
      row.tableNo || "—",
      row.itemSummary || `${row.itemCount || 0} items`,
      money(row.subTotal),
      money(row.discountTotal),
      money(row.taxTotal),
      money(row.serviceChargeTotal),
      money(row.tipAmount),
      money(row.totalAmount),
      row.paymentLabel || "—",
      row.status || "",
    ])
  );
}

function writeCancellations(sheet, payload) {
  const rows = payload.rows || [];
  addTable(
    sheet,
    ["Employee", "Order", "Date", "Amount", "Reason", "Cancelled By", "Status"],
    rows.map((row) => [
      row.employeeName || "",
      `#${row.orderNumber || ""}`,
      row.createdAt || "",
      money(row.amount),
      row.reason || "—",
      row.cancelledBy || "—",
      row.status || "",
    ])
  );
}

function writeTipsByPayment(sheet, payload) {
  const methods = payload.methods || payload.rows || [];
  const earned = payload.earnedByEmployee || [];
  const byEmp = payload.byEmployee || [];

  const methodTitle = sheet.addRow(["Collected tips by payment method"]);
  methodTitle.font = { bold: true, size: 12 };
  addTable(
    sheet,
    ["Payment Method", "Orders", "Collected Tips", "Average Tip", "Tip % of sales"],
    methods.map((row) => [
      row.method || "",
      Number(row.orders) || 0,
      money(row.tips),
      money(row.averageTip),
      Number(row.tipPercent || 0),
    ])
  );

  if (earned.length) {
    sheet.addRow([]);
    const earnedTitle = sheet.addRow(["Earned tips by employee"]);
    earnedTitle.font = { bold: true, size: 12 };
    addTable(
      sheet,
      ["Employee", "Role", "Mode", "Collected", "Earned", "Tip orders"],
      earned.map((row) => [
        row.name || "",
        row.role || "",
        row.receiveOwnTips ? "Own" : `${row.tipPercent || 0}%`,
        money(row.collectedTips),
        money(row.earnedTips),
        Number(row.orders) || 0,
      ])
    );
  }

  if (byEmp.length) {
    sheet.addRow([]);
    const byTitle = sheet.addRow(["Collected by employee × method"]);
    byTitle.font = { bold: true, size: 12 };
    addTable(
      sheet,
      ["Employee", "Role", "Method", "Orders", "Tips", "Avg"],
      byEmp.map((row) => [
        row.name || "",
        row.role || "",
        row.method || "",
        Number(row.orders) || 0,
        money(row.tips),
        money(row.averageTip),
      ])
    );
  }
}

const WRITERS = {
  overview: writeOverview,
  sales: writeSales,
  tips: writeTips,
  service: writeService,
  hours: writeHours,
  labor: writeLabor,
  clock: writeClock,
  timesheet: writeTimesheet,
  orders: writeOrders,
  cancellations: writeCancellations,
  "tips-by-payment": writeTipsByPayment,
};

export async function exportEmployeeReportExcel(payload) {
  const view = resolveExportView(payload.exportView);
  const wb = new ExcelJS.Workbook();
  wb.creator = "Tasty Bites";
  wb.created = new Date();
  const sheet = wb.addWorksheet(view.slug.slice(0, 31) || "Report", {
    views: [{ showGridLines: true }],
  });

  sheet.columns = Array.from({ length: 14 }, () => ({ width: 14 }));
  sheet.getColumn(1).width = 24;

  addMetaRows(sheet, { ...payload, reportTitle: payload.reportTitle || view.title });
  const writer = WRITERS[view.id] || writeOverview;
  writer(sheet, payload);

  const stats = payload.attendanceStats;
  if (stats && payload.employee) {
    sheet.addRow([]);
    const attTitle = sheet.addRow(["Attendance"]);
    attTitle.font = { bold: true, size: 12 };
    sheet.addRow(["Scheduled days", stats.scheduledDays ?? 0]);
    sheet.addRow(["Worked days", stats.workedDays ?? 0]);
    sheet.addRow(["Absent days", stats.absentDays ?? 0]);
    sheet.addRow(["Off / leave days", stats.offDays ?? 0]);
    sheet.addRow(["Late days", stats.lateDays ?? 0]);
    sheet.addRow(["Worked hours", stats.workedHours ?? 0]);
    sheet.addRow(["Overtime hours", stats.overtimeHours ?? 0]);
  }

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export function employeeExcelFilename(dateFrom, dateTo, employeeName, viewSlug) {
  return employeeReportFilename(dateFrom, dateTo, "xlsx", employeeName, viewSlug);
}
