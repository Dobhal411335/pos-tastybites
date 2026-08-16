import mongoose from "mongoose";
import Employee from "@/models/employee/Employee";
import EmployeeLog from "@/models/employee/EmployeeLog";
import EmployeeShift from "@/models/employee/EmployeeShift";
import ShiftTemplate from "@/models/employee/ShiftTemplate";
import Order from "@/models/Order";
import { buildWorkingHoursSummaryPipeline } from "@/lib/payEstimate";
import {
  DEFAULT_RESTAURANT_TIMEZONE,
  restaurantCalendarDate,
} from "@/lib/restaurantTime";
import {
  businessDateBounds,
  formatEmployeeName,
  isValidBusinessDate,
  normalizePaymentTypeLabel,
  r2,
  todayBusinessDate,
} from "@/lib/eod/eodHelpers";
import {
  isRevenueOrder,
  matchesPaymentMethod,
} from "@/lib/reports/guestDirectory";

const MINUTES_PER_HOUR = 60;
const ORDER_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "COMPLETED",
  "PAID",
  "CANCELLED",
  "WAIVED",
];
const PAYMENT_FILTERS = ["CASH", "CARD", "GIFT_CARD"];
const SECTIONS = ["summary", "attendance", "orders"];
const ORDER_SORTS = [
  "createdAt",
  "orderNumber",
  "totalAmount",
  "status",
  "employee",
];
const ORDER_SELECT = [
  "orderNumber",
  "createdAt",
  "partyName",
  "guestName",
  "tableNo",
  "items.name",
  "items.qty",
  "subTotal",
  "discountTotal",
  "taxTotal",
  "serviceChargeTotal",
  "tipAmount",
  "totalAmount",
  "paymentMethod",
  "cashAmount",
  "cardAmount",
  "giftcardUsedAmount",
  "status",
  "paymentStatus",
  "processedBy",
  "waiveReason",
].join(" ");

const SUMMARY_ORDER_SELECT = [
  "createdAt",
  "processedBy",
  "status",
  "paymentStatus",
  "paymentMethod",
  "cashAmount",
  "cardAmount",
  "giftcardUsedAmount",
  "subTotal",
  "discountTotal",
  "taxTotal",
  "serviceChargeTotal",
  "tipAmount",
  "totalAmount",
].join(" ");

function toObjectId(value) {
  if (!value) return null;
  if (value instanceof mongoose.Types.ObjectId) return value;
  if (mongoose.Types.ObjectId.isValid(value) && String(new mongoose.Types.ObjectId(value)) === String(value)) {
    return new mongoose.Types.ObjectId(value);
  }
  return null;
}

function displayName(emp) {
  if (!emp) return "Unknown";
  const firstLast = [emp.firstName, emp.lastName].filter(Boolean).join(" ").trim();
  if (firstLast) return firstLast;
  return formatEmployeeName(emp);
}

function hoursFromMinutes(minutes) {
  return r2((Number(minutes) || 0) / MINUTES_PER_HOUR);
}

function emptyMetrics() {
  return {
    totalOrders: 0,
    completedOrders: 0,
    cancelledOrders: 0,
    waivedOrders: 0,
    sales: 0,
    discounts: 0,
    tips: 0,
    tippedOrders: 0,
    serviceCharges: 0,
    chargedOrders: 0,
  };
}

function addOrderMetrics(bucket, order) {
  bucket.totalOrders += 1;
  if (order.status === "CANCELLED") bucket.cancelledOrders += 1;
  if (order.status === "WAIVED") bucket.waivedOrders += 1;
  if (!isRevenueOrder(order)) return;
  bucket.completedOrders += 1;
  bucket.sales = r2(bucket.sales + (Number(order.totalAmount) || 0));
  bucket.discounts = r2(bucket.discounts + (Number(order.discountTotal) || 0));
  const tip = Number(order.tipAmount) || 0;
  const charge = Number(order.serviceChargeTotal) || 0;
  if (tip > 0) {
    bucket.tips = r2(bucket.tips + tip);
    bucket.tippedOrders += 1;
  }
  if (charge > 0) {
    bucket.serviceCharges = r2(bucket.serviceCharges + charge);
    bucket.chargedOrders += 1;
  }
}

function finalizeMetrics(bucket) {
  const aov = bucket.completedOrders > 0 ? r2(bucket.sales / bucket.completedOrders) : 0;
  const averageTip = bucket.tippedOrders > 0 ? r2(bucket.tips / bucket.tippedOrders) : 0;
  const averageCharge = bucket.chargedOrders > 0 ? r2(bucket.serviceCharges / bucket.chargedOrders) : 0;
  const cancellationRate =
    bucket.totalOrders > 0 ? r2((bucket.cancelledOrders / bucket.totalOrders) * 100) : 0;
  return {
    ...bucket,
    aov,
    averageTip,
    averageCharge,
    totalTipsAndCharges: r2(bucket.tips + bucket.serviceCharges),
    cancellationRate,
  };
}

function restaurantDayKey(date, timeZone = DEFAULT_RESTAURANT_TIMEZONE) {
  if (!date) return null;
  return restaurantCalendarDate(new Date(date), timeZone).toISOString().slice(0, 10);
}

function restaurantHour(date, timeZone = DEFAULT_RESTAURANT_TIMEZONE) {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour: "numeric",
      hour12: false,
    }).format(new Date(date))
  );
  return hour === 24 ? 0 : hour;
}

function restaurantMonthKey(date, timeZone = DEFAULT_RESTAURANT_TIMEZONE) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
    })
      .formatToParts(new Date(date))
      .map((part) => [part.type, part.value])
  );
  return `${parts.year}-${parts.month}`;
}

function dayCountInclusive(dateFrom, dateTo) {
  const start = new Date(`${dateFrom}T00:00:00Z`);
  const end = new Date(`${dateTo}T00:00:00Z`);
  return Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
}

function hourLabel(hour) {
  const suffix = hour >= 12 ? "PM" : "AM";
  const display = hour % 12 === 0 ? 12 : hour % 12;
  return `${display}${suffix}`;
}

function emptyPoint() {
  return { sales: 0, orders: 0, tips: 0, serviceCharges: 0 };
}

function addPoint(target, order) {
  if (!isRevenueOrder(order)) return;
  target.sales = r2(target.sales + (Number(order.totalAmount) || 0));
  target.orders += 1;
  target.tips = r2(target.tips + (Number(order.tipAmount) || 0));
  target.serviceCharges = r2(
    target.serviceCharges + (Number(order.serviceChargeTotal) || 0)
  );
}

function buildOverTimeSeries(orders, dateFrom, dateTo) {
  const days = dayCountInclusive(dateFrom, dateTo);

  if (days <= 1) {
    const buckets = new Map();
    for (const order of orders) {
      const hour = restaurantHour(order.createdAt);
      const prev = buckets.get(hour) || emptyPoint();
      addPoint(prev, order);
      buckets.set(hour, prev);
    }
    const hours = [...buckets.keys()].sort((a, b) => a - b);
    const startHour = hours.length ? Math.min(hours[0], 8) : 8;
    const endHour = hours.length ? Math.max(hours[hours.length - 1], 20) : 20;
    const series = [];
    for (let hour = startHour; hour <= endHour; hour += 1) {
      const point = buckets.get(hour) || emptyPoint();
      series.push({ label: hourLabel(hour), ...point });
    }
    return series;
  }

  if (days <= 60) {
    const buckets = new Map();
    for (const order of orders) {
      const key = restaurantDayKey(order.createdAt);
      if (!key) continue;
      const prev = buckets.get(key) || emptyPoint();
      addPoint(prev, order);
      buckets.set(key, prev);
    }
    const series = [];
    const cursor = new Date(`${dateFrom}T12:00:00Z`);
    const last = new Date(`${dateTo}T12:00:00Z`);
    while (cursor <= last) {
      const key = cursor.toISOString().slice(0, 10);
      series.push({ label: key.slice(5), ...(buckets.get(key) || emptyPoint()) });
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    return series;
  }

  const buckets = new Map();
  for (const order of orders) {
    const key = restaurantMonthKey(order.createdAt);
    const prev = buckets.get(key) || emptyPoint();
    addPoint(prev, order);
    buckets.set(key, prev);
  }
  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, point]) => ({ label, ...point }));
}

function itemSummary(items) {
  const list = Array.isArray(items) ? items : [];
  const names = list.map((item) => item?.name).filter(Boolean);
  const itemCount = list.reduce((sum, item) => sum + (Number(item?.qty) || 0), 0);
  const preview = names.slice(0, 3).join(", ");
  return {
    itemCount,
    itemSummary: names.length > 3 ? `${preview}…` : preview,
  };
}

function paymentLabel(order) {
  if (order.paymentStatus !== "PAID") {
    return order.paymentMethod || "—";
  }
  return normalizePaymentTypeLabel(order.paymentMethod, order.giftcardUsedAmount);
}

function clampPage(value, fallback = 1) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.floor(n);
}

function clampLimit(value, fallback, max = 100) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(Math.floor(n), max);
}

function attendanceDateMatch(rid, dateFrom, dateTo) {
  const { start } = businessDateBounds(dateFrom);
  const { end } = businessDateBounds(dateTo);
  return {
    restaurant: rid,
    loginTime: { $gte: start, $lt: end },
  };
}

function orderDateMatch(rid, dateFrom, dateTo) {
  const { start } = businessDateBounds(dateFrom);
  const { end } = businessDateBounds(dateTo);
  return {
    restaurantId: rid,
    createdAt: { $gte: start, $lt: end },
  };
}

async function shiftIdsForTemplate(rid, shiftId) {
  const templateId = toObjectId(shiftId);
  if (!templateId) return [];
  return EmployeeShift.find({ restaurant: rid, templateId }).distinct("_id");
}

function emptySummaryPayload(dateFrom, dateTo, extras = {}) {
  return {
    overview: {
      employees: 0,
      totalHours: 0,
      regularHours: 0,
      overtimeHours: 0,
      regularPay: 0,
      overtimePay: 0,
      estimatedPay: 0,
      totalTips: 0,
      serviceCharges: 0,
      totalOrders: 0,
      completedOrders: 0,
      cancelledOrders: 0,
      waivedOrders: 0,
      totalSales: 0,
    },
    performance: [],
    sales: [],
    tips: { employees: [], totals: emptyMetrics() },
    cancellations: {
      totals: { totalOrders: 0, completed: 0, cancelled: 0, waived: 0 },
      employees: [],
    },
    charts: {
      salesByEmployee: [],
      salesOverTime: [],
      ordersByEmployee: [],
      aovByEmployee: [],
      tipsByEmployee: [],
      tipsOverTime: [],
      serviceChargesByEmployee: [],
      serviceChargesOverTime: [],
    },
    filters: { employees: [], shifts: [] },
    selectedEmployee: null,
    meta: {
      dateFrom,
      dateTo,
      timezone: DEFAULT_RESTAURANT_TIMEZONE,
      ...extras,
    },
  };
}

export function parseEmployeeReportQuery(searchParams) {
  const today = todayBusinessDate();
  const dateFrom = isValidBusinessDate(searchParams.get("dateFrom"))
    ? searchParams.get("dateFrom")
    : today;
  const dateToRaw = isValidBusinessDate(searchParams.get("dateTo"))
    ? searchParams.get("dateTo")
    : today;
  const dateTo = dateToRaw < dateFrom ? dateFrom : dateToRaw;

  const status = String(searchParams.get("orderStatus") || "ALL").toUpperCase();
  const orderStatus =
    status === "ALL" || !status
      ? "ALL"
      : ORDER_STATUSES.includes(status)
        ? status
        : "ALL";

  const paymentRaw = String(searchParams.get("paymentMethod") || "ALL").toUpperCase();
  const paymentMethod = PAYMENT_FILTERS.includes(paymentRaw) ? paymentRaw : "ALL";

  const sectionRaw = String(searchParams.get("section") || "summary").toLowerCase();
  const section = SECTIONS.includes(sectionRaw) ? sectionRaw : "summary";

  const sortRaw = String(searchParams.get("sort") || "createdAt");
  const sort = ORDER_SORTS.includes(sortRaw) ? sortRaw : "createdAt";
  const sortDir = String(searchParams.get("sortDir") || "desc").toLowerCase() === "asc" ? "asc" : "desc";

  const employeeRaw = String(searchParams.get("employeeId") || "").trim();
  const shiftRaw = String(searchParams.get("shiftId") || "").trim();

  if (employeeRaw && employeeRaw !== "ALL" && !toObjectId(employeeRaw)) {
    throw Object.assign(new Error("Invalid employeeId"), { status: 400 });
  }
  if (shiftRaw && shiftRaw !== "ALL" && !toObjectId(shiftRaw)) {
    throw Object.assign(new Error("Invalid shiftId"), { status: 400 });
  }

  return {
    dateFrom,
    dateTo,
    employeeId: employeeRaw && employeeRaw !== "ALL" ? employeeRaw : null,
    shiftId: shiftRaw && shiftRaw !== "ALL" ? shiftRaw : null,
    orderStatus,
    paymentMethod,
    section,
    search: String(searchParams.get("search") || "").trim(),
    sort,
    sortDir,
    page: clampPage(searchParams.get("page"), 1),
    limit: clampLimit(searchParams.get("limit"), section === "attendance" ? 50 : 25),
  };
}

async function loadFilterOptions(rid) {
  const [employees, shifts] = await Promise.all([
    Employee.find({
      restaurant: rid,
      status: { $in: ["Approved", "Active", "Suspended"] },
    })
      .select("firstName lastName role employeeId status")
      .sort({ firstName: 1, lastName: 1 })
      .lean(),
    ShiftTemplate.find({ restaurant: rid })
      .select("name startTime endTime")
      .sort({ name: 1 })
      .lean(),
  ]);

  return {
    employees: employees.map((emp) => ({
      id: String(emp._id),
      name: displayName(emp),
      role: emp.role || "Staff",
      employeeCode: emp.employeeId || null,
      status: emp.status,
    })),
    shifts: shifts.map((shift) => ({
      id: String(shift._id),
      name: shift.name,
      startTime: shift.startTime,
      endTime: shift.endTime,
    })),
  };
}

function mapHoursRow(row) {
  const emp = row.employee || {};
  return {
    employeeId: String(row._id),
    name: displayName(emp),
    role: emp.role || "Staff",
    employeeCode: emp.employeeId || null,
    hourlyRate: r2(row.hourlyRate),
    overtimeRate: r2(row.overtimeRate),
    hours: r2(row.totalWorkedHours),
    regularHours: r2(row.regularHours),
    overtimeHours: r2(row.overtimeHours),
    regularPay: r2(row.regularPay),
    overtimePay: r2(row.overtimePay),
    estimatedPay: r2(row.estimatedTotalPay),
    daysWorked: row.daysWorked || 0,
    incompleteDays: row.incompleteDays || 0,
  };
}

export async function buildEmployeeReport({
  restaurantId,
  dateFrom,
  dateTo,
  employeeId = null,
  shiftId = null,
  orderStatus = "ALL",
  paymentMethod = "ALL",
  section = "summary",
  search = "",
  sort = "createdAt",
  sortDir = "desc",
  page = 1,
  limit = 25,
}) {
  const rid = toObjectId(restaurantId) || restaurantId;
  const empId = toObjectId(employeeId);

  if (section === "attendance") {
    return buildAttendanceSection({
      rid,
      dateFrom,
      dateTo,
      empId,
      shiftId,
      page,
      limit,
    });
  }

  if (section === "orders") {
    return buildOrdersSection({
      rid,
      dateFrom,
      dateTo,
      empId,
      orderStatus,
      paymentMethod,
      search,
      sort,
      sortDir,
      page,
      limit,
    });
  }

  return buildSummarySection({
    rid,
    dateFrom,
    dateTo,
    empId,
    shiftId,
    orderStatus,
    paymentMethod,
  });
}

async function buildSummarySection({
  rid,
  dateFrom,
  dateTo,
  empId,
  shiftId,
  orderStatus,
  paymentMethod,
}) {
  const filters = await loadFilterOptions(rid);
  const selected = empId
    ? await Employee.findOne({ _id: empId, restaurant: rid })
        .select("firstName lastName role employeeId hourlyPaid status")
        .lean()
    : null;

  if (empId && !selected) {
    const empty = emptySummaryPayload(dateFrom, dateTo, {
      employeeId: String(empId),
      shiftId: shiftId || null,
      orderStatus,
      paymentMethod,
    });
    empty.filters = filters;
    return empty;
  }

  const logMatch = attendanceDateMatch(rid, dateFrom, dateTo);
  if (empId) logMatch.employee = empId;

  const orderMatch = orderDateMatch(rid, dateFrom, dateTo);
  if (empId) orderMatch.processedBy = empId;
  if (orderStatus !== "ALL") orderMatch.status = orderStatus;

  let shiftIds = null;
  if (shiftId) {
    shiftIds = await shiftIdsForTemplate(rid, shiftId);
    if (shiftIds.length) logMatch.shift = { $in: shiftIds };
  }

  const [hourRows, orderDocs] = await Promise.all([
    shiftId && !shiftIds.length
      ? Promise.resolve([])
      : EmployeeLog.aggregate(buildWorkingHoursSummaryPipeline(logMatch)),
    Order.find(orderMatch).select(SUMMARY_ORDER_SELECT).lean(),
  ]);

  const hoursByEmployee = new Map(hourRows.map((row) => [String(row._id), mapHoursRow(row)]));
  const filteredOrders = orderDocs.filter((order) =>
    matchesPaymentMethod(order, paymentMethod)
  );

  const salesByEmployee = new Map();
  for (const order of filteredOrders) {
    const key = order.processedBy ? String(order.processedBy) : null;
    if (!key) continue;
    if (!salesByEmployee.has(key)) salesByEmployee.set(key, emptyMetrics());
    addOrderMetrics(salesByEmployee.get(key), order);
  }

  const employeeIds = new Set([...hoursByEmployee.keys(), ...salesByEmployee.keys()]);
  if (selected) employeeIds.add(String(selected._id));

  const missingIds = [...employeeIds].filter((id) => {
    const hours = hoursByEmployee.get(id);
    return !hours;
  });
  const extraEmployees = missingIds.length
    ? await Employee.find({ _id: { $in: missingIds.map((id) => toObjectId(id)) }, restaurant: rid })
        .select("firstName lastName role employeeId hourlyPaid")
        .lean()
    : [];
  const extraById = new Map(extraEmployees.map((emp) => [String(emp._id), emp]));
  if (selected) extraById.set(String(selected._id), selected);

  const performance = [...employeeIds]
    .map((id) => {
      const hours = hoursByEmployee.get(id);
      const sales = finalizeMetrics(salesByEmployee.get(id) || emptyMetrics());
      const emp = hours
        ? null
        : extraById.get(id);
      return {
        employeeId: id,
        name: hours?.name || displayName(emp),
        role: hours?.role || emp?.role || "Staff",
        employeeCode: hours?.employeeCode || emp?.employeeId || null,
        hours: hours?.hours || 0,
        regularHours: hours?.regularHours || 0,
        overtimeHours: hours?.overtimeHours || 0,
        regularPay: hours?.regularPay || 0,
        overtimePay: hours?.overtimePay || 0,
        estimatedPay: hours?.estimatedPay || 0,
        hourlyRate: hours?.hourlyRate ?? r2(emp?.hourlyPaid?.amountPerHour),
        overtimeRate:
          hours?.overtimeRate ??
          r2(emp?.hourlyPaid?.overtimeAmountPerHour ?? emp?.hourlyPaid?.amountPerHour),
        sales: sales.sales,
        orders: sales.completedOrders,
        totalOrders: sales.totalOrders,
        discounts: sales.discounts,
        aov: sales.aov,
        tips: sales.tips,
        averageTip: sales.averageTip,
        serviceCharges: sales.serviceCharges,
        averageCharge: sales.averageCharge,
        totalTipsAndCharges: sales.totalTipsAndCharges,
        cancellations: sales.cancelledOrders,
        waived: sales.waivedOrders,
        cancellationRate: sales.cancellationRate,
      };
    })
    .sort((a, b) => b.sales - a.sales || b.hours - a.hours || a.name.localeCompare(b.name));

  const overviewHours = hourRows.reduce(
    (acc, row) => ({
      totalHours: acc.totalHours + (Number(row.totalWorkedHours) || 0),
      regularHours: acc.regularHours + (Number(row.regularHours) || 0),
      overtimeHours: acc.overtimeHours + (Number(row.overtimeHours) || 0),
      regularPay: acc.regularPay + (Number(row.regularPay) || 0),
      overtimePay: acc.overtimePay + (Number(row.overtimePay) || 0),
      estimatedPay: acc.estimatedPay + (Number(row.estimatedTotalPay) || 0),
    }),
    {
      totalHours: 0,
      regularHours: 0,
      overtimeHours: 0,
      regularPay: 0,
      overtimePay: 0,
      estimatedPay: 0,
    }
  );

  const salesTotals = finalizeMetrics(
    filteredOrders.reduce((acc, order) => {
      if (order.processedBy) addOrderMetrics(acc, order);
      return acc;
    }, emptyMetrics())
  );

  const overTime = buildOverTimeSeries(filteredOrders, dateFrom, dateTo);
  const chartPeople = selected ? performance : performance.filter((row) => row.sales > 0 || row.orders > 0);
  const tipPeople = selected ? performance : performance.filter((row) => row.tips > 0);
  const chargePeople = selected ? performance : performance.filter((row) => row.serviceCharges > 0);

  return {
    overview: {
      employees: selected ? 1 : performance.length,
      totalHours: r2(overviewHours.totalHours),
      regularHours: r2(overviewHours.regularHours),
      overtimeHours: r2(overviewHours.overtimeHours),
      regularPay: r2(overviewHours.regularPay),
      overtimePay: r2(overviewHours.overtimePay),
      estimatedPay: r2(overviewHours.estimatedPay),
      totalTips: salesTotals.tips,
      serviceCharges: salesTotals.serviceCharges,
      totalOrders: salesTotals.totalOrders,
      completedOrders: salesTotals.completedOrders,
      cancelledOrders: salesTotals.cancelledOrders,
      waivedOrders: salesTotals.waivedOrders,
      totalSales: salesTotals.sales,
    },
    performance,
    sales: performance.map((row) => ({
      employeeId: row.employeeId,
      name: row.name,
      role: row.role,
      totalOrders: row.totalOrders,
      completedOrders: row.orders,
      sales: row.sales,
      aov: row.aov,
      discounts: row.discounts,
      cancelledOrders: row.cancellations,
      waivedOrders: row.waived,
    })),
    tips: {
      employees: performance.map((row) => ({
        employeeId: row.employeeId,
        name: row.name,
        role: row.role,
        orders: row.orders,
        tips: row.tips,
        averageTip: row.averageTip,
        serviceCharges: row.serviceCharges,
        averageCharge: row.averageCharge,
        totalTipsAndCharges: row.totalTipsAndCharges,
      })),
      totals: {
        orders: salesTotals.completedOrders,
        tips: salesTotals.tips,
        averageTip: salesTotals.averageTip,
        serviceCharges: salesTotals.serviceCharges,
        averageCharge: salesTotals.averageCharge,
        totalTipsAndCharges: salesTotals.totalTipsAndCharges,
      },
    },
    cancellations: {
      totals: {
        totalOrders: salesTotals.totalOrders,
        completed: salesTotals.completedOrders,
        cancelled: salesTotals.cancelledOrders,
        waived: salesTotals.waivedOrders,
      },
      employees: performance.map((row) => ({
        employeeId: row.employeeId,
        name: row.name,
        role: row.role,
        totalOrders: row.totalOrders,
        cancelled: row.cancellations,
        waived: row.waived,
        cancellationRate: row.cancellationRate,
      })),
    },
    charts: {
      salesByEmployee: chartPeople.map((row) => ({ label: row.name, sales: row.sales })),
      salesOverTime: overTime.map((row) => ({ label: row.label, sales: row.sales })),
      ordersByEmployee: chartPeople.map((row) => ({ label: row.name, orders: row.orders })),
      aovByEmployee: chartPeople.map((row) => ({ label: row.name, aov: row.aov })),
      tipsByEmployee: tipPeople.map((row) => ({ label: row.name, tips: row.tips })),
      tipsOverTime: overTime.map((row) => ({ label: row.label, tips: row.tips })),
      serviceChargesByEmployee: chargePeople.map((row) => ({
        label: row.name,
        serviceCharges: row.serviceCharges,
      })),
      serviceChargesOverTime: overTime.map((row) => ({
        label: row.label,
        serviceCharges: row.serviceCharges,
      })),
    },
    filters,
    selectedEmployee: selected
      ? {
          id: String(selected._id),
          name: displayName(selected),
          role: selected.role || "Staff",
          employeeCode: selected.employeeId || null,
          hourlyRate: r2(selected.hourlyPaid?.amountPerHour),
          overtimeRate: r2(
            selected.hourlyPaid?.overtimeAmountPerHour ?? selected.hourlyPaid?.amountPerHour
          ),
        }
      : null,
    meta: {
      dateFrom,
      dateTo,
      timezone: DEFAULT_RESTAURANT_TIMEZONE,
      employeeId: empId ? String(empId) : null,
      shiftId: shiftId || null,
      orderStatus,
      paymentMethod,
    },
  };
}

async function buildAttendanceSection({ rid, dateFrom, dateTo, empId, shiftId, page, limit }) {
  const match = attendanceDateMatch(rid, dateFrom, dateTo);
  if (empId) match.employee = empId;
  if (shiftId) {
    const shiftIds = await shiftIdsForTemplate(rid, shiftId);
    if (!shiftIds.length) {
      return {
        rows: [],
        pagination: { page, limit, total: 0, pages: 1 },
        meta: {
          dateFrom,
          dateTo,
          timezone: DEFAULT_RESTAURANT_TIMEZONE,
        },
      };
    }
    match.shift = { $in: shiftIds };
  }

  const skip = (page - 1) * limit;
  const [total, rows] = await Promise.all([
    EmployeeLog.countDocuments(match),
    EmployeeLog.find(match)
      .populate("employee", "firstName lastName role employeeId")
      .populate({
        path: "shift",
        select: "startTime endTime templateId",
        populate: { path: "templateId", select: "name startTime endTime" },
      })
      .sort({ loginTime: -1, date: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
  ]);

  return {
    rows: rows.map((log) => {
      const workedMinutes = Number(log.workedMinutes) || 0;
      const overtimeMinutes = Number(log.overtimeMinutes) || 0;
      const regularMinutes = Math.max(0, workedMinutes - overtimeMinutes);
      const template = log.shift?.templateId;
      return {
        id: String(log._id),
        employeeId: log.employee?._id ? String(log.employee._id) : null,
        employeeName: displayName(log.employee),
        role: log.employee?.role || "Staff",
        date: log.date,
        scheduledShift: template?.name || null,
        scheduledStart: log.scheduledShiftStart || log.shift?.startTime || null,
        scheduledEnd: log.scheduledShiftEnd || log.shift?.endTime || null,
        scheduledMinutes: Number(log.scheduledShiftMinutes) || 0,
        clockIn: log.loginTime || null,
        clockOut: log.logoutTime || null,
        workedMinutes,
        regularMinutes,
        overtimeMinutes,
        workedHours: hoursFromMinutes(workedMinutes),
        regularHours: hoursFromMinutes(regularMinutes),
        overtimeHours: hoursFromMinutes(overtimeMinutes),
        attendanceStatus: log.attendanceStatus,
        shiftStatus: log.shiftStatus,
        isIncomplete: Boolean(log.isIncomplete),
      };
    }),
    pagination: {
      page,
      limit,
      total,
      pages: Math.max(1, Math.ceil(total / limit)),
    },
    meta: {
      dateFrom,
      dateTo,
      timezone: DEFAULT_RESTAURANT_TIMEZONE,
    },
  };
}

async function buildOrdersSection({
  rid,
  dateFrom,
  dateTo,
  empId,
  orderStatus,
  paymentMethod,
  search,
  sort,
  sortDir,
  page,
  limit,
}) {
  const match = orderDateMatch(rid, dateFrom, dateTo);
  if (empId) match.processedBy = empId;
  if (orderStatus !== "ALL") match.status = orderStatus;
  if (search) {
    match.orderNumber = { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
  }

  const docs = await Order.find(match)
    .select(ORDER_SELECT)
    .sort({ createdAt: -1 })
    .limit(10000)
    .lean();

  const filtered = docs.filter((order) => matchesPaymentMethod(order, paymentMethod));
  const employeeIds = [
    ...new Set(filtered.map((order) => (order.processedBy ? String(order.processedBy) : null)).filter(Boolean)),
  ];
  const employees = employeeIds.length
    ? await Employee.find({ _id: { $in: employeeIds.map((id) => toObjectId(id)) } })
        .select("firstName lastName role")
        .lean()
    : [];
  const nameById = new Map(employees.map((emp) => [String(emp._id), displayName(emp)]));

  const dir = sortDir === "asc" ? 1 : -1;
  const sorted = [...filtered].sort((a, b) => {
    if (sort === "orderNumber") {
      return String(a.orderNumber || "").localeCompare(String(b.orderNumber || "")) * dir;
    }
    if (sort === "totalAmount") {
      return ((Number(a.totalAmount) || 0) - (Number(b.totalAmount) || 0)) * dir;
    }
    if (sort === "status") {
      return String(a.status || "").localeCompare(String(b.status || "")) * dir;
    }
    if (sort === "employee") {
      const aName = nameById.get(String(a.processedBy || "")) || "";
      const bName = nameById.get(String(b.processedBy || "")) || "";
      return aName.localeCompare(bName) * dir;
    }
    return (new Date(a.createdAt) - new Date(b.createdAt)) * dir;
  });

  const total = sorted.length;
  const skip = (page - 1) * limit;
  const pageRows = sorted.slice(skip, skip + limit);

  return {
    rows: pageRows.map((order) => {
      const items = itemSummary(order.items);
      return {
        orderId: String(order._id),
        orderNumber: order.orderNumber,
        createdAt: order.createdAt,
        employeeId: order.processedBy ? String(order.processedBy) : null,
        employeeName: order.processedBy ? nameById.get(String(order.processedBy)) || "Unknown" : "Unassigned",
        tableNo: order.tableNo || "—",
        guest: order.partyName || order.guestName || "Walk-in",
        itemCount: items.itemCount,
        itemSummary: items.itemSummary,
        subTotal: r2(order.subTotal),
        discountTotal: r2(order.discountTotal),
        taxTotal: r2(order.taxTotal),
        serviceChargeTotal: r2(order.serviceChargeTotal),
        tipAmount: r2(order.tipAmount),
        totalAmount: r2(order.totalAmount),
        paymentMethod: order.paymentMethod || null,
        paymentLabel: paymentLabel(order),
        status: order.status,
        paymentStatus: order.paymentStatus,
        waiveReason: order.waiveReason || null,
      };
    }),
    pagination: {
      page,
      limit,
      total,
      pages: Math.max(1, Math.ceil(total / limit) || 1),
    },
    meta: {
      dateFrom,
      dateTo,
      timezone: DEFAULT_RESTAURANT_TIMEZONE,
    },
  };
}
