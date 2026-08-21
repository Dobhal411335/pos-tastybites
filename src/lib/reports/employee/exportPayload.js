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
  resolveExportView,
} from "@/lib/reports/employee/exportHelpers";

const EXPORT_LIMIT = 5000;

function displayName(emp) {
  if (!emp) return "Unknown";
  return (
    [emp.firstName, emp.lastName].filter(Boolean).join(" ").trim() || "Unknown"
  );
}

function baseLabels({ report, filters, staffTab, search, resolved }) {
  return {
    ...buildFilterLabels({
      meta: {
        ...(report.meta || {}),
        orderStatus: filters.orderStatus,
        paymentMethod: filters.paymentMethod,
        shiftId: filters.shiftId,
      },
      filters: report.filters || { shifts: [] },
      staffTab,
      search,
    }),
    dateFrom: resolved.dateFrom,
    dateTo: resolved.dateTo,
    periodLabel: resolved.periodLabel,
  };
}

function shapeSummaryPayload({ view, report, rows, labels, restaurant, search, staffTab }) {
  let tableRows = rows;
  if (view.id === "tips") {
    tableRows = filterPerformanceRows(report.tips?.employees || [], {
      search,
      staffTab,
    });
  } else if (view.id === "service") {
    tableRows = rows.filter(
      (r) => Number(r.serviceCharges) > 0 || Number(r.orders) > 0
    );
  } else if (view.id === "labor") {
    tableRows = rows.filter(
      (r) => Number(r.hourlyRate) > 0 || Number(r.estimatedPay) > 0
    );
  }

  return {
    exportView: view.id,
    reportTitle: view.title,
    restaurantName: restaurant?.name || "Tasty Bites",
    restaurantEmail: restaurant?.email || "",
    employeeEmail: "",
    overview: report.overview || {},
    tipsTotals: report.tips?.totals || {},
    meta: report.meta || {},
    rows: tableRows,
    labels,
    attendanceStats: null,
    employee: null,
    methods: [],
    earnedByEmployee: [],
    byEmployee: [],
  };
}

function shapeAttendancePayload({ view, report, labels, restaurant }) {
  return {
    exportView: view.id,
    reportTitle: view.title,
    restaurantName: restaurant?.name || "Tasty Bites",
    restaurantEmail: restaurant?.email || "",
    employeeEmail: "",
    overview: report.summary || {},
    tipsTotals: {},
    meta: report.meta || {},
    rows: report.rows || [],
    labels,
    attendanceStats: null,
    employee: null,
    methods: [],
    earnedByEmployee: [],
    byEmployee: [],
  };
}

function shapeOrdersPayload({ view, report, labels, restaurant }) {
  return {
    exportView: view.id,
    reportTitle: view.title,
    restaurantName: restaurant?.name || "Tasty Bites",
    restaurantEmail: restaurant?.email || "",
    employeeEmail: "",
    overview: {
      total: report.pagination?.total || (report.rows || []).length,
      ...(report.overview || {}),
    },
    tipsTotals: {},
    meta: report.meta || {},
    rows: report.rows || [],
    labels,
    attendanceStats: null,
    employee: null,
    methods: [],
    earnedByEmployee: [],
    byEmployee: [],
  };
}

function shapeTipsByPaymentPayload({ view, report, labels, restaurant }) {
  return {
    exportView: view.id,
    reportTitle: view.title,
    restaurantName: restaurant?.name || "Tasty Bites",
    restaurantEmail: restaurant?.email || "",
    employeeEmail: "",
    overview: report.overview || {},
    tipsTotals: {},
    meta: report.meta || {},
    rows: report.methods || [],
    labels,
    attendanceStats: null,
    employee: null,
    methods: report.methods || [],
    earnedByEmployee: report.earnedByEmployee || [],
    byEmployee: report.byEmployee || [],
  };
}

function shapeSingleEmployeePayload({
  view,
  detail,
  employeeDoc,
  filters,
  resolved,
  restaurant,
}) {
  const emp = detail.employee || {};
  const ov = detail.overview || {};
  const row = {
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
    daysWorked: ov.daysWorked,
    regularPay: ov.regularPay,
    overtimePay: ov.overtimePay,
    estimatedPay: ov.estimatedPay,
    sales: ov.sales,
    discounts: ov.discounts,
    aov: ov.aov,
    orders: ov.completedOrders ?? ov.orders,
    tipPercent: ov.tipPercent,
    receiveOwnTips: Boolean(ov.receiveOwnTips),
    tips: ov.tips,
    collectedTips: ov.collectedTips,
    averageTip: ov.averageTip,
    serviceCharges: ov.serviceCharges,
    cancellations: ov.cancelCount,
    hourlyRate: emp.hourlyRate,
  };

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
    exportView: view.id,
    reportTitle: `${view.title} — ${labels.employeeName}`,
    restaurantName: restaurant?.name || "Tasty Bites",
    restaurantEmail: restaurant?.email || "",
    employeeEmail: employeeDoc.email || "",
    overview: {
      totalStaff: 1,
      clockedIn: emp.clockedIn ? 1 : 0,
      estimatedPay: ov.estimatedPay,
      totalHours: ov.hours,
      regularHours: ov.regularHours,
      overtimeHours: ov.overtimeHours,
      totalSales: ov.sales,
      completedOrders: ov.completedOrders ?? ov.orders,
      cancelCount: ov.cancelCount,
      totalTips: ov.tips,
      distributedTips: ov.tips,
      serviceCharges: ov.serviceCharges,
      laborConfigured: Number(emp.hourlyRate) > 0,
      regularPay: ov.regularPay,
      overtimePay: ov.overtimePay,
    },
    tipsTotals: {
      tips: ov.tips,
      collectedTips: ov.collectedTips,
    },
    meta: detail.meta,
    rows: [row],
    labels,
    attendanceStats: detail.attendanceStats || null,
    employee: emp,
    methods: [],
    earnedByEmployee: [],
    byEmployee: [],
  };
}

export async function buildEmployeeExportPayload({
  restaurantId,
  searchParams,
}) {
  const filters = parseEmployeeReportQuery(searchParams);
  const view = resolveExportView(
    searchParams.get("exportView") || searchParams.get("section")
  );
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
    // List-style views: export that employee's rows from the page section
    if (
      view.apiSection === "attendance" ||
      view.apiSection === "orders" ||
      view.apiSection === "cancellations" ||
      view.apiSection === "tipsbypayment"
    ) {
      const report = await buildEmployeeReport({
        restaurantId,
        ...queryFilters,
        section: view.apiSection,
        page: 1,
        limit: EXPORT_LIMIT,
      });
      const labels = {
        ...baseLabels({
          report,
          filters,
          staffTab: "all",
          search: "",
          resolved,
        }),
        employeeName: displayName(employeeDoc),
        employeeEmail: employeeDoc.email || "",
      };

      if (view.apiSection === "attendance") {
        return {
          ...shapeAttendancePayload({ view, report, labels, restaurant }),
          employeeEmail: employeeDoc.email || "",
          employee: {
            id: String(employeeDoc._id),
            name: displayName(employeeDoc),
            role: employeeDoc.role,
          },
          reportTitle: `${view.title} — ${displayName(employeeDoc)}`,
        };
      }
      if (view.apiSection === "tipsbypayment") {
        return {
          ...shapeTipsByPaymentPayload({ view, report, labels, restaurant }),
          employeeEmail: employeeDoc.email || "",
          employee: {
            id: String(employeeDoc._id),
            name: displayName(employeeDoc),
            role: employeeDoc.role,
          },
          reportTitle: `${view.title} — ${displayName(employeeDoc)}`,
        };
      }
      return {
        ...shapeOrdersPayload({ view, report, labels, restaurant }),
        employeeEmail: employeeDoc.email || "",
        employee: {
          id: String(employeeDoc._id),
          name: displayName(employeeDoc),
          role: employeeDoc.role,
        },
        reportTitle: `${view.title} — ${displayName(employeeDoc)}`,
      };
    }

    const detail = await buildEmployeeReport({
      restaurantId,
      ...queryFilters,
      section: "detail",
    });
    return shapeSingleEmployeePayload({
      view,
      detail,
      employeeDoc,
      filters,
      resolved,
      restaurant,
    });
  }

  const report = await buildEmployeeReport({
    restaurantId,
    ...queryFilters,
    section: view.apiSection,
    page: 1,
    limit: EXPORT_LIMIT,
  });

  const labels = baseLabels({
    report,
    filters,
    staffTab,
    search,
    resolved,
  });

  if (view.apiSection === "summary") {
    const rows = filterPerformanceRows(report.performance || [], {
      search,
      staffTab,
    });
    return shapeSummaryPayload({
      view,
      report,
      rows,
      labels,
      restaurant,
      search,
      staffTab,
    });
  }

  if (view.apiSection === "attendance") {
    return shapeAttendancePayload({ view, report, labels, restaurant });
  }

  if (view.apiSection === "tipsbypayment") {
    return shapeTipsByPaymentPayload({ view, report, labels, restaurant });
  }

  return shapeOrdersPayload({ view, report, labels, restaurant });
}
