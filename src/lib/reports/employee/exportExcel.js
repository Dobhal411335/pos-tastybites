import ExcelJS from "exceljs";
import { employeeReportFilename } from "@/lib/reports/employee/exportHelpers";

const money = (n) => Math.round((Number(n) || 0) * 100) / 100;

function addMetaRows(sheet, payload) {
  const { restaurantName, labels, overview, employee } = payload;
  const titleText = employee
    ? `${restaurantName || "Tasty Bites"} — ${labels.employeeName || employee.name}`
    : `${restaurantName || "Tasty Bites"} — Employee & Staff Report`;
  const title = sheet.addRow([titleText]);
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
  if (!employee) {
    sheet.addRow([
      `Staff group: ${labels.staffTabLabel}${
        labels.searchLabel ? `    Search: ${labels.searchLabel}` : ""
      }`,
    ]);
    sheet.addRow([
      `Staff: ${overview.totalStaff ?? 0}    Clocked in: ${overview.clockedIn ?? 0}    Est. pay: ${money(overview.estimatedPay)}`,
    ]);
  } else {
    sheet.addRow([
      `Hours: ${overview.totalHours ?? 0}    Sales: ${money(overview.totalSales)}    Tips: ${money(overview.totalTips)}    Est. pay: ${money(overview.estimatedPay)}`,
    ]);
  }
  sheet.addRow([]);
}

export async function exportEmployeeReportExcel(payload) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Tasty Bites";
  wb.created = new Date();
  const sheet = wb.addWorksheet("Employee Report", {
    views: [{ showGridLines: true }],
  });

  sheet.columns = [
    { width: 24 },
    { width: 16 },
    { width: 14 },
    { width: 14 },
    { width: 14 },
    { width: 10 },
    { width: 12 },
    { width: 10 },
    { width: 12 },
    { width: 14 },
    { width: 10 },
    { width: 14 },
  ];

  addMetaRows(sheet, payload);

  const header = sheet.addRow([
    "Employee",
    "Role",
    "Status",
    "Clock In",
    "Clock Out",
    "Hours",
    "Sales",
    "Tip %",
    "Tips",
    "Service Charges",
    "Cancels",
    "Estimated Pay",
  ]);
  header.font = { bold: true, size: 10 };
  header.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE8E8E8" },
    };
  });

  for (const row of payload.rows || []) {
    sheet.addRow([
      row.name || "",
      row.role || "",
      row.clockedIn ? "Clocked In" : "Clocked Out",
      row.clockIn || "",
      row.clockOut || "",
      Number(row.hours) || 0,
      money(row.sales),
      row.receiveOwnTips ? "Own tips" : Number(row.tipPercent) || 0,
      money(row.tips),
      money(row.serviceCharges),
      Number(row.cancellations) || 0,
      money(row.estimatedPay),
    ]);
  }

  sheet.addRow([]);
  const totals = (payload.rows || []).reduce(
    (acc, row) => {
      acc.hours += Number(row.hours) || 0;
      acc.sales += Number(row.sales) || 0;
      acc.tips += Number(row.tips) || 0;
      acc.serviceCharges += Number(row.serviceCharges) || 0;
      acc.cancels += Number(row.cancellations) || 0;
      acc.pay += Number(row.estimatedPay) || 0;
      return acc;
    },
    { hours: 0, sales: 0, tips: 0, serviceCharges: 0, cancels: 0, pay: 0 }
  );
  const totalRow = sheet.addRow([
    "TOTAL",
    "",
    "",
    "",
    "",
    Math.round(totals.hours * 100) / 100,
    money(totals.sales),
    "",
    money(totals.tips),
    money(totals.serviceCharges),
    totals.cancels,
    money(totals.pay),
  ]);
  totalRow.font = { bold: true, size: 10 };

  const stats = payload.attendanceStats;
  if (stats) {
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

export function employeeExcelFilename(dateFrom, dateTo, employeeName) {
  return employeeReportFilename(dateFrom, dateTo, "xlsx", employeeName);
}
