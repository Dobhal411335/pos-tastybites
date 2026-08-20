import Restaurant from "@/models/Restaurant";
import Employee from "@/models/employee/Employee";
import { todayBusinessDate } from "@/lib/eod/eodHelpers";
import {
  buildEmployeeReport,
  parseEmployeeReportQuery,
} from "@/lib/reports/employeeReports";
import {
  buildFilterLabels,
  filterPerformanceRows,
  resolveExportPeriod,
} from "@/lib/reports/employee/exportHelpers";

function displayName(emp) {
  if (!emp) return "Unknown";
  return [emp.firstName, emp.lastName].filter(Boolean).join(" ").trim() || "Unknown";
}

export async function buildEmployeeExportPayload({
  restaurantId,
  searchParams,
}) {
  const filters = parseEmployeeReportQuery(searchParams);
  const staffTab = String(searchParams.get("staffTab") || "all").toLowerCase();
  const search = filters.search || "";
  const periodRaw = searchParams.get("period") || "current";
  const today = todayBusinessDate();

  let employeeDoc = null;
  if (filters.employeeId) {
    employeeDoc = await Employee.findOne({
      _id: filters.employeeId,
      restaurant: restaurantId,
    })
      .select("firstName lastName email createdAt role employeeId")
      .lean();
    if (!employeeDoc) {
      throw Object.assign(new Error("Employee not found"), { status: 404 });
    }
  }

  if (String(periodRaw).toLowerCase() === "all_time" && !filters.employeeId) {
    throw Object.assign(new Error("Select an employee for an all-time report"), {
      status: 400,
    });
  }

  const allTimeFrom = employeeDoc?.createdAt
    ? new Date(employeeDoc.createdAt).toISOString().slice(0, 10)
    : today;

  const resolved = resolveExportPeriod({
    period: periodRaw,
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    allTimeFrom,
    today,
  });

  const queryFilters = {
    ...filters,
    dateFrom: resolved.dateFrom,
    dateTo: resolved.dateTo,
  };

  const restaurant = await Restaurant.findById(restaurantId)
    .select("name email")
    .lean();

  if (filters.employeeId) {
    const detail = await buildEmployeeReport({
      restaurantId,
      ...queryFilters,
      section: "detail",
    });
    const emp = detail.employee || {};
    const ov = detail.overview || {};
    const rows = [
      {
        employeeId: emp.id,
        name: emp.name,
        role: emp.role,
        employeeCode: emp.employeeCode,
        clockedIn: emp.clockedIn,
        clockIn: emp.clockIn,
        clockOut: emp.clockOut,
        hours: ov.hours,
        regularHours: ov.regularHours,
        overtimeHours: ov.overtimeHours,
        regularPay: ov.regularPay,
        overtimePay: ov.overtimePay,
        estimatedPay: ov.estimatedPay,
        sales: ov.sales,
        tipPercent: ov.tipPercent,
        receiveOwnTips: Boolean(ov.receiveOwnTips),
        tips: ov.tips,
        serviceCharges: ov.serviceCharges,
        cancellations: ov.cancelCount,
      },
    ];
    const labels = {
      ...buildFilterLabels({
        meta: {
          ...detail.meta,
          orderStatus: filters.orderStatus,
          paymentMethod: filters.paymentMethod,
          shiftId: filters.shiftId,
        },
        filters: { shifts: [] },
        staffTab: "all",
        search: "",
      }),
      dateFrom: resolved.dateFrom,
      dateTo: resolved.dateTo,
      periodLabel: resolved.periodLabel,
      employeeName: emp.name || displayName(employeeDoc),
      employeeEmail: employeeDoc.email || "",
    };

    return {
      restaurantName: restaurant?.name || "Tasty Bites",
      restaurantEmail: restaurant?.email || "",
      employeeEmail: employeeDoc.email || "",
      overview: {
        totalStaff: 1,
        clockedIn: emp.clockedIn ? 1 : 0,
        estimatedPay: ov.estimatedPay,
        totalHours: ov.hours,
        totalSales: ov.sales,
        totalTips: ov.tips,
        serviceCharges: ov.serviceCharges,
      },
      meta: detail.meta,
      rows,
      labels,
      attendanceStats: detail.attendanceStats || null,
      employee: emp,
    };
  }

  const report = await buildEmployeeReport({
    restaurantId,
    ...queryFilters,
    section: "summary",
  });

  const rows = filterPerformanceRows(report.performance || [], {
    search,
    staffTab,
  });

  const labels = {
    ...buildFilterLabels({
      meta: report.meta,
      filters: report.filters,
      staffTab,
      search,
    }),
    dateFrom: resolved.dateFrom,
    dateTo: resolved.dateTo,
    periodLabel: resolved.periodLabel,
  };

  return {
    restaurantName: restaurant?.name || "Tasty Bites",
    restaurantEmail: restaurant?.email || "",
    employeeEmail: "",
    overview: report.overview || {},
    meta: report.meta || {},
    rows,
    labels,
    attendanceStats: null,
    employee: null,
  };
}
