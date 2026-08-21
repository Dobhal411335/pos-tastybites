import mongoose from "mongoose";
import Employee from "@/models/employee/Employee";
import EmployeeLog from "@/models/employee/EmployeeLog";
import EmployeeSession from "@/models/employee/EmployeeSession";
import EmployeeShift from "@/models/employee/EmployeeShift";
import ShiftTemplate from "@/models/employee/ShiftTemplate";
import DutyChange from "@/models/employee/DutyChange";
import Order from "@/models/Order";
import { buildWorkingHoursSummaryPipeline } from "@/lib/payEstimate";
import { resolveScheduleFromDocs } from "@/lib/attendance";
import {
  DEFAULT_RESTAURANT_TIMEZONE,
  restaurantCalendarDate,
} from "@/lib/restaurantTime";
import {
  businessCalendarDate,
  businessDateBounds,
  formatEmployeeName,
  isValidBusinessDate,
  normalizePaymentTypeLabel,
  r2,
  resolveTenders,
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
const SECTIONS = [
  "summary",
  "attendance",
  "orders",
  "detail",
  "tipsbypayment",
  "cancellations",
];
const DETAIL_FOCUSES = [
  "profile",
  "sales",
  "tips",
  "service",
  "orders",
  "cancellations",
  "clock",
  "tipsByPayment",
  "hours",
  "labor",
];
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
  "items.price",
  "subTotal",
  "discountTotal",
  "taxTotal",
  "serviceChargeTotal",
  "tipAmount",
  "tipMethod",
  "totalAmount",
  "paymentMethod",
  "cashAmount",
  "cardAmount",
  "giftcardUsedAmount",
  "status",
  "paymentStatus",
  "processedBy",
  "waiveReason",
  "waivedBy",
  "waivedAt",
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
  "tipMethod",
  "totalAmount",
  "tableNo",
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
  
  const subTotal = Number(order.subTotal) || 0;
  const discountTotal = Number(order.discountTotal) || 0;
  
  bucket.sales = r2(bucket.sales + (subTotal - discountTotal));
  bucket.discounts = r2(bucket.discounts + discountTotal);
  
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
  const cancelCount = (bucket.cancelledOrders || 0) + (bucket.waivedOrders || 0);
  const cancellationRate =
    bucket.totalOrders > 0 ? r2((cancelCount / bucket.totalOrders) * 100) : 0;
  return {
    ...bucket,
    cancelCount,
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
  const subTotal = Number(order.subTotal) || 0;
  const discountTotal = Number(order.discountTotal) || 0;
  target.sales = r2(target.sales + (subTotal - discountTotal));
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
    itemSummary: names.length > 3 ? `${preview}` : preview,
  };
}

function paymentLabel(order) {
  if (order.paymentStatus !== "PAID") {
    return order.paymentMethod || "";
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

function tipShare(poolTips, tipPercent) {
  return r2((Number(poolTips) || 0) * ((Number(tipPercent) || 0) / 100));
}

function tipPaymentBucket(order) {
  const tip = Number(order.tipAmount) || 0;
  if (tip <= 0) return null;
  const raw = String(order.tipMethod || "").trim().toLowerCase();
  if (raw.includes("cash")) return "Cash";
  if (raw.includes("gift")) return "Gift Card";
  if (raw.includes("card")) return "Card";

  const method = String(order.paymentMethod || "").toLowerCase();
  if (method.includes("gift")) return "Gift Card";
  if (/\bcash\b/.test(method) && !method.includes("card")) return "Cash";
  if (method.includes("card")) return "Card";

  try {
    const tenders = resolveTenders(order);
    if (tenders.cash > 0 && tenders.card <= 0 && tenders.giftCard <= 0) return "Cash";
    if (tenders.card > 0 && tenders.cash <= 0) return "Card";
    if (tenders.giftCard > 0 && tenders.cash <= 0 && tenders.card <= 0) return "Gift Card";
  } catch {
    /* ignore */
  }
  return "Other";
}

function resolveReceiveOwnTips(id, hours, emp, filterEmployees) {
  if (hours?.receiveOwnTips != null) return Boolean(hours.receiveOwnTips);
  if (emp?.receiveOwnTips != null) return Boolean(emp.receiveOwnTips);
  const listed = (filterEmployees || []).find((row) => row.id === id);
  return Boolean(listed?.receiveOwnTips);
}

function resolveEmployeeTips({
  id,
  hours,
  emp,
  selected,
  filterEmployees,
  poolTips,
  collectedTips,
}) {
  const source = emp || selected;
  const receiveOwnTips = resolveReceiveOwnTips(id, hours, source, filterEmployees);
  if (receiveOwnTips) {
    return {
      receiveOwnTips: true,
      tipPercent: 0,
      tips: r2(collectedTips),
    };
  }
  const tipPercent = resolveTipPercent(id, hours, source, filterEmployees);
  return {
    receiveOwnTips: false,
    tipPercent,
    tips: tipShare(poolTips, tipPercent),
  };
}

function sumTipPool(orders) {
  return r2(
    (orders || []).reduce((sum, order) => {
      if (!isRevenueOrder(order)) return sum;
      return sum + (Number(order.tipAmount) || 0);
    }, 0)
  );
}

function sumShareableTipPool(orders, ownTipEmployeeIds) {
  const ownIds = ownTipEmployeeIds instanceof Set ? ownTipEmployeeIds : new Set(ownTipEmployeeIds || []);
  return r2(
    (orders || []).reduce((sum, order) => {
      if (!isRevenueOrder(order)) return sum;
      const tip = Number(order.tipAmount) || 0;
      if (tip <= 0) return sum;
      const pid = order.processedBy ? String(order.processedBy) : null;
      if (pid && ownIds.has(pid)) return sum;
      return sum + tip;
    }, 0)
  );
}

function countTablesServed(orders) {
  const tables = new Set();
  for (const order of orders || []) {
    if (!isRevenueOrder(order)) continue;
    const table = order.tableNo != null ? String(order.tableNo).trim() : "";
    if (table) tables.add(table);
  }
  return tables.size;
}

function tipMethodsFromOrders(orders) {
  const methodMap = new Map();
  for (const order of orders || []) {
    if (!isRevenueOrder(order)) continue;
    const tip = Number(order.tipAmount) || 0;
    if (tip <= 0) continue;
    const bucket = tipPaymentBucket(order) || "Other";
    if (!methodMap.has(bucket)) {
      methodMap.set(bucket, { method: bucket, orders: 0, tips: 0 });
    }
    const row = methodMap.get(bucket);
    row.orders += 1;
    row.tips = r2(row.tips + tip);
  }
  return [...methodMap.values()].sort((a, b) => b.tips - a.tips);
}

async function loadOwnTipEmployeeIdSet(rid) {
  const docs = await Employee.find({
    restaurant: rid,
    receiveOwnTips: true,
    status: { $in: ["Approved", "Active", "Suspended"] },
  })
    .select("_id")
    .lean();
  return new Set(docs.map((emp) => String(emp._id)));
}

async function loadTipPoolDocs(rid, dateFrom, dateTo, orderStatus, paymentMethod) {
  const match = orderDateMatch(rid, dateFrom, dateTo);
  if (orderStatus !== "ALL") match.status = orderStatus;
  const docs = await Order.find(match).select(SUMMARY_ORDER_SELECT).lean();
  return docs.filter((order) => matchesPaymentMethod(order, paymentMethod));
}

async function loadTipPool(rid, dateFrom, dateTo, orderStatus, paymentMethod) {
  const docs = await loadTipPoolDocs(rid, dateFrom, dateTo, orderStatus, paymentMethod);
  const ownIds = await loadOwnTipEmployeeIdSet(rid);
  return {
    totalTips: sumTipPool(docs),
    shareableTips: sumShareableTipPool(docs, ownIds),
    ownTipEmployeeIds: ownIds,
  };
}

function resolveTipPercent(id, hours, emp, filterEmployees) {
  if (hours?.tipPercent != null) return Number(hours.tipPercent) || 0;
  if (emp?.tipPercent != null) return Number(emp.tipPercent) || 0;
  const listed = (filterEmployees || []).find((row) => row.id === id);
  return Number(listed?.tipPercent) || 0;
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
      distributedTips: 0,
      serviceCharges: 0,
      totalOrders: 0,
      completedOrders: 0,
      cancelledOrders: 0,
      waivedOrders: 0,
      cancelCount: 0,
      totalSales: 0,
      totalStaff: 0,
      clockedIn: 0,
    },
    performance: [],
    sales: [],
    tips: { employees: [], totals: emptyMetrics() },
    cancellations: {
      totals: { totalOrders: 0, completed: 0, cancelled: 0, waived: 0, cancelCount: 0 },
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

  const focusRaw = String(searchParams.get("detailFocus") || "profile");
  const detailFocus = DETAIL_FOCUSES.includes(focusRaw) ? focusRaw : "profile";

  const sortRaw = String(searchParams.get("sort") || "createdAt");
  const sort = ORDER_SORTS.includes(sortRaw) ? sortRaw : "createdAt";
  const sortDir = String(searchParams.get("sortDir") || "desc").toLowerCase() === "asc" ? "asc" : "desc";

  const employeeRaw = String(searchParams.get("employeeId") || "").trim();
  const shiftRaw = String(searchParams.get("shiftId") || "").trim();
  const roleRaw = String(searchParams.get("role") || "").trim();

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
    role: roleRaw && roleRaw !== "ALL" ? roleRaw : null,
    orderStatus,
    paymentMethod,
    section,
    detailFocus,
    search: String(searchParams.get("search") || "").trim(),
    sort,
    sortDir,
    page: clampPage(searchParams.get("page"), 1),
    limit: clampLimit(
      searchParams.get("limit"),
      section === "detail" ? 200 : section === "attendance" ? 50 : 25,
      section === "detail" ? 500 : 100
    ),
  };
}

async function loadFilterOptions(rid) {
  const [employees, shifts] = await Promise.all([
    Employee.find({
      restaurant: rid,
      status: { $in: ["Approved", "Active", "Suspended"] },
    })
      .select("firstName lastName role employeeId status email tipPercent receiveOwnTips")
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
      email: emp.email || "",
      tipPercent: Number(emp.tipPercent) || 0,
      receiveOwnTips: Boolean(emp.receiveOwnTips),
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
    tipPercent: Number(emp.tipPercent) || 0,
    receiveOwnTips: Boolean(emp.receiveOwnTips),
    daysWorked: row.daysWorked || 0,
    incompleteDays: row.incompleteDays || 0,
  };
}

function mapAttendanceLog(log) {
  const workedMinutes = Number(log.workedMinutes) || 0;
  const overtimeMinutes = Number(log.overtimeMinutes) || 0;
  const regularMinutes = Math.max(0, workedMinutes - overtimeMinutes);
  const template = log.shift?.templateId;
  return {
    id: String(log._id),
    employeeId: log.employee?._id ? String(log.employee._id) : log.employee ? String(log.employee) : null,
    employeeName: displayName(log.employee),
    role: log.employee?.role || "Staff",
    date: log.date,
    dayKey: restaurantDayKey(log.date || log.loginTime),
    scheduledShift: template?.name || null,
    scheduledStart: log.scheduledShiftStart || log.shift?.startTime || null,
    scheduledEnd: log.scheduledShiftEnd || log.shift?.endTime || null,
    scheduledMinutes: Number(log.scheduledShiftMinutes) || 0,
    clockIn: log.loginTime || null,
    clockOut: log.logoutTime || null,
    workedMinutes,
    regularMinutes,
    overtimeMinutes,
    lateMinutes: Number(log.lateMinutes) || 0,
    earlyLeaveMinutes: Number(log.earlyLeaveMinutes) || 0,
    workedHours: hoursFromMinutes(workedMinutes),
    regularHours: hoursFromMinutes(regularMinutes),
    overtimeHours: hoursFromMinutes(overtimeMinutes),
    attendanceStatus: log.attendanceStatus,
    shiftStatus: log.shiftStatus,
    isIncomplete: Boolean(log.isIncomplete),
    loginDeviceName: log.loginDeviceName || "",
  };
}

function eachBusinessDate(dateFrom, dateTo) {
  const days = [];
  const cursor = new Date(`${dateFrom}T12:00:00Z`);
  const last = new Date(`${dateTo}T12:00:00Z`);
  while (cursor <= last) {
    days.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
}

function syntheticAttendanceRow({ employee, dayKey, shift, dutyChange }) {
  const resolved = resolveScheduleFromDocs(shift, dutyChange, { clockedIn: false });
  const template = shift?.templateId;
  const scheduledMinutes = Number(resolved.scheduledShiftMinutes) || 0;
  return {
    id: `cal-${employee?._id || employee?.id || "emp"}-${dayKey}`,
    employeeId: employee?._id ? String(employee._id) : null,
    employeeName: displayName(employee),
    role: employee?.role || "Staff",
    date: businessCalendarDate(dayKey),
    dayKey,
    scheduledShift: template?.name || null,
    scheduledStart: resolved.scheduledShiftStart || null,
    scheduledEnd: resolved.scheduledShiftEnd || null,
    scheduledMinutes,
    clockIn: null,
    clockOut: null,
    workedMinutes: 0,
    regularMinutes: 0,
    overtimeMinutes: 0,
    lateMinutes: 0,
    earlyLeaveMinutes: 0,
    workedHours: 0,
    regularHours: 0,
    overtimeHours: 0,
    attendanceStatus: resolved.attendanceStatus,
    shiftStatus: resolved.shiftStatus,
    isIncomplete: false,
    loginDeviceName: "",
  };
}

async function buildCalendarAttendance({ rid, empId, dateFrom, dateTo, shiftId, employee }) {
  const { start } = businessDateBounds(dateFrom);
  const { end } = businessDateBounds(dateTo);
  const dateRange = { $gte: start, $lt: end };

  let templateShiftIds = null;
  if (shiftId) {
    templateShiftIds = await shiftIdsForTemplate(rid, shiftId);
    if (!templateShiftIds.length) {
      return eachBusinessDate(dateFrom, dateTo).map((dayKey) =>
        syntheticAttendanceRow({ employee, dayKey, shift: null, dutyChange: null })
      );
    }
  }

  const shiftQuery = { restaurant: rid, employee: empId, date: dateRange };
  if (templateShiftIds) shiftQuery._id = { $in: templateShiftIds };

  const [shifts, dutyChanges, logs] = await Promise.all([
    EmployeeShift.find(shiftQuery)
      .populate("templateId", "name startTime endTime")
      .lean(),
    DutyChange.find({
      restaurant: rid,
      employee: empId,
      date: dateRange,
      status: "Approved",
    }).lean(),
    EmployeeLog.find({
      restaurant: rid,
      employee: empId,
      $or: [{ date: dateRange }, { loginTime: dateRange }],
    })
      .populate("employee", "firstName lastName role employeeId")
      .populate({
        path: "shift",
        select: "startTime endTime templateId",
        populate: { path: "templateId", select: "name startTime endTime" },
      })
      .lean(),
  ]);

  const shiftByDay = new Map();
  for (const shift of shifts) {
    const key = restaurantDayKey(shift.date || shift.startTime);
    if (key) shiftByDay.set(key, shift);
  }
  const dutyByDay = new Map();
  for (const duty of dutyChanges) {
    const key = restaurantDayKey(duty.date);
    if (key) dutyByDay.set(key, duty);
  }
  const logByDay = new Map();
  for (const log of logs) {
    const key = restaurantDayKey(log.date || log.loginTime);
    if (key) logByDay.set(key, log);
  }

  const rows = [];
  for (const dayKey of eachBusinessDate(dateFrom, dateTo)) {
    const shift = shiftByDay.get(dayKey) || null;
    const dutyChange = dutyByDay.get(dayKey) || null;
    const log = logByDay.get(dayKey) || null;
    if (shiftId && !shift && !log) {
      rows.push(syntheticAttendanceRow({ employee, dayKey, shift: null, dutyChange: null }));
      continue;
    }
    if (log) {
      const mapped = mapAttendanceLog(log);
      if (!mapped.scheduledStart && shift) {
        mapped.scheduledStart = dutyChange?.newStartTime || shift.startTime || null;
        mapped.scheduledEnd = dutyChange?.newEndTime || shift.endTime || null;
        mapped.scheduledShift = shift.templateId?.name || mapped.scheduledShift;
      }
      rows.push(mapped);
      continue;
    }
    rows.push(syntheticAttendanceRow({ employee, dayKey, shift, dutyChange }));
  }

  return rows.sort((a, b) => String(b.dayKey).localeCompare(String(a.dayKey)));
}

function mapSession(session) {
  const durationSeconds = Number(session.duration) || 0;
  return {
    id: String(session._id),
    loginTime: session.loginTime || null,
    logoutTime: session.logoutTime || null,
    durationSeconds,
    platform: session.platform || "",
    deviceName: session.device?.deviceName || "",
    deviceType: session.device?.deviceType || null,
    status: session.status || null,
    dayKey: restaurantDayKey(session.loginTime),
  };
}

function mapOrderRow(order, nameById) {
  const items = itemSummary(order.items);
  return {
    orderId: String(order._id),
    orderNumber: order.orderNumber,
    createdAt: order.createdAt,
    dayKey: restaurantDayKey(order.createdAt),
    employeeId: order.processedBy ? String(order.processedBy) : null,
    employeeName: order.processedBy
      ? nameById.get(String(order.processedBy)) || "Unknown"
      : "Unassigned",
    tableNo: order.tableNo || "",
    guest: order.partyName || order.guestName || "Walk-in",
    itemCount: items.itemCount,
    itemSummary: items.itemSummary,
    subTotal: r2(order.subTotal),
    discountTotal: r2(order.discountTotal),
    taxTotal: r2(order.taxTotal),
    serviceChargeTotal: r2(order.serviceChargeTotal),
    tipAmount: r2(order.tipAmount),
    tipMethod: order.tipMethod || null,
    tipPaymentMethod: tipPaymentBucket(order),
    totalAmount: r2(order.totalAmount),
    paymentMethod: order.paymentMethod || null,
    paymentLabel: paymentLabel(order),
    status: order.status,
    paymentStatus: order.paymentStatus,
    waiveReason: order.waiveReason || null,
    waivedBy: order.waivedBy ? String(order.waivedBy) : null,
    waivedAt: order.waivedAt || null,
  };
}

function cancelledItemsFromOrders(orders) {
  const rows = [];
  for (const order of orders) {
    if (order.status !== "CANCELLED" && order.status !== "WAIVED") continue;
    const items = Array.isArray(order.items) ? order.items : [];
    if (!items.length) {
      rows.push({
        orderId: String(order._id),
        orderNumber: order.orderNumber,
        item: order.status === "WAIVED" ? "Waived order" : "Cancelled order",
        qty: 1,
        value: r2(order.totalAmount),
        status: order.status,
        waiveReason: order.waiveReason || null,
        createdAt: order.createdAt,
        dayKey: restaurantDayKey(order.createdAt),
      });
      continue;
    }
    for (const item of items) {
      rows.push({
        orderId: String(order._id),
        orderNumber: order.orderNumber,
        item: item.name || "Item",
        qty: Number(item.qty) || 1,
        value: r2((Number(item.price) || 0) * (Number(item.qty) || 1)),
        status: order.status,
        waiveReason: order.waiveReason || null,
        createdAt: order.createdAt,
        dayKey: restaurantDayKey(order.createdAt),
      });
    }
  }
  return rows;
}

function buildHoursSeries(logs, dateFrom, dateTo) {
  const days = dayCountInclusive(dateFrom, dateTo);
  const buckets = new Map();
  for (const log of logs) {
    const key = log.dayKey || restaurantDayKey(log.date || log.loginTime || log.clockIn);
    if (!key) continue;
    const minutes =
      Number(log.workedMinutes) || Math.round((Number(log.workedHours) || 0) * MINUTES_PER_HOUR);
    buckets.set(key, r2((buckets.get(key) || 0) + hoursFromMinutes(minutes)));
  }

  if (days <= 60) {
    const series = [];
    const cursor = new Date(`${dateFrom}T12:00:00Z`);
    const last = new Date(`${dateTo}T12:00:00Z`);
    while (cursor <= last) {
      const key = cursor.toISOString().slice(0, 10);
      series.push({ label: key.slice(5), dayKey: key, hours: buckets.get(key) || 0 });
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    return series;
  }

  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dayKey, hours]) => ({ label: dayKey.slice(0, 7), dayKey, hours }));
}

function buildAttendanceStats(logs) {
  let scheduledDays = 0;
  let workedDays = 0;
  let absentDays = 0;
  let offDays = 0;
  let lateDays = 0;
  let scheduledMinutes = 0;
  let workedMinutes = 0;
  let overtimeMinutes = 0;
  let earliestClockIn = null;
  let latestClockOut = null;

  for (const log of logs) {
    const status = log.attendanceStatus;
    const shiftStatus = log.shiftStatus;
    scheduledMinutes += Number(log.scheduledShiftMinutes || log.scheduledMinutes) || 0;
    workedMinutes += Number(log.workedMinutes) || 0;
    overtimeMinutes += Number(log.overtimeMinutes) || 0;
    if (status === "Late") lateDays += 1;
    if (
      shiftStatus === "Off" ||
      status === "Holiday" ||
      status === "Leave" ||
      status === "Off"
    ) {
      offDays += 1;
    } else if (status === "Absent") {
      absentDays += 1;
      scheduledDays += 1;
    } else {
      scheduledDays += 1;
      if ((Number(log.workedMinutes) || 0) > 0 || log.isIncomplete) workedDays += 1;
    }
    if (log.loginTime && (!earliestClockIn || new Date(log.loginTime) < new Date(earliestClockIn))) {
      earliestClockIn = log.loginTime;
    } else if (log.clockIn && (!earliestClockIn || new Date(log.clockIn) < new Date(earliestClockIn))) {
      earliestClockIn = log.clockIn;
    }
    const out = log.logoutTime || log.clockOut || (log.isIncomplete ? new Date() : null);
    if (out && (!latestClockOut || new Date(out) > new Date(latestClockOut))) {
      latestClockOut = out;
    }
  }

  return {
    scheduledDays,
    workedDays,
    absentDays,
    offDays,
    lateDays,
    scheduledHours: hoursFromMinutes(scheduledMinutes),
    workedHours: hoursFromMinutes(workedMinutes),
    overtimeHours: hoursFromMinutes(overtimeMinutes),
    avgHoursPerDay: workedDays > 0 ? r2(hoursFromMinutes(workedMinutes) / workedDays) : 0,
    earliestClockIn,
    latestClockOut,
  };
}

async function loadClockSnapshots(rid, logMatch) {
  const [openLogs, latestInRange] = await Promise.all([
    EmployeeLog.find({ restaurant: rid, isIncomplete: true })
      .select("employee loginTime logoutTime attendanceStatus loginDeviceName")
      .lean(),
    EmployeeLog.aggregate([
      { $match: logMatch },
      { $sort: { loginTime: -1 } },
      {
        $group: {
          _id: "$employee",
          clockIn: { $first: "$loginTime" },
          clockOut: { $first: "$logoutTime" },
          isIncomplete: { $first: "$isIncomplete" },
          attendanceStatus: { $first: "$attendanceStatus" },
          loginDeviceName: { $first: "$loginDeviceName" },
        },
      },
    ]),
  ]);

  const openByEmployee = new Map(
    openLogs.map((log) => [
      String(log.employee),
      {
        clockedIn: true,
        clockIn: log.loginTime || null,
        clockOut: null,
        isIncomplete: true,
        attendanceStatus: log.attendanceStatus || "Present",
        loginDeviceName: log.loginDeviceName || "",
      },
    ])
  );
  const latestByEmployee = new Map(
    latestInRange.map((row) => [
      String(row._id),
      {
        clockedIn: Boolean(row.isIncomplete),
        clockIn: row.clockIn || null,
        clockOut: row.isIncomplete ? null : row.clockOut || null,
        isIncomplete: Boolean(row.isIncomplete),
        attendanceStatus: row.attendanceStatus || null,
        loginDeviceName: row.loginDeviceName || "",
      },
    ])
  );

  return { openByEmployee, latestByEmployee };
}

function clockFieldsForEmployee(id, openByEmployee, latestByEmployee) {
  const open = openByEmployee.get(id);
  if (open) return open;
  return (
    latestByEmployee.get(id) || {
      clockedIn: false,
      clockIn: null,
      clockOut: null,
      isIncomplete: false,
      attendanceStatus: null,
      loginDeviceName: "",
    }
  );
}

export async function buildEmployeeReport({
  restaurantId,
  dateFrom,
  dateTo,
  employeeId = null,
  shiftId = null,
  role = null,
  orderStatus = "ALL",
  paymentMethod = "ALL",
  section = "summary",
  detailFocus = "profile",
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
      role,
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
      role,
      orderStatus,
      paymentMethod,
      search,
      sort,
      sortDir,
      page,
      limit,
    });
  }

  if (section === "detail") {
    return buildDetailSection({
      rid,
      dateFrom,
      dateTo,
      empId,
      shiftId,
      orderStatus,
      paymentMethod,
      detailFocus,
    });
  }

  if (section === "tipsbypayment") {
    return buildTipsByPaymentSection({
      rid,
      dateFrom,
      dateTo,
      empId,
      role,
      orderStatus,
      paymentMethod,
    });
  }

  if (section === "cancellations") {
    return buildCancellationsSection({
      rid,
      dateFrom,
      dateTo,
      empId,
      role,
      paymentMethod,
      search,
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
    role,
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
  role = null,
  orderStatus,
  paymentMethod,
}) {
  const filters = await loadFilterOptions(rid);
  const selected = empId
    ? await Employee.findOne({ _id: empId, restaurant: rid })
        .select("firstName lastName role employeeId hourlyPaid status tipPercent receiveOwnTips")
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

  const [hourRows, orderDocs, clockSnapshots, tipPoolInfo, ownTipIdsFallback] = await Promise.all([
    shiftId && !shiftIds.length
      ? Promise.resolve([])
      : EmployeeLog.aggregate(buildWorkingHoursSummaryPipeline(logMatch)),
    Order.find(orderMatch).select(SUMMARY_ORDER_SELECT).lean(),
    shiftId && !shiftIds.length
      ? Promise.resolve({ openByEmployee: new Map(), latestByEmployee: new Map() })
      : loadClockSnapshots(rid, logMatch),
    empId
      ? loadTipPool(rid, dateFrom, dateTo, orderStatus, paymentMethod)
      : Promise.resolve(null),
    empId ? Promise.resolve(null) : loadOwnTipEmployeeIdSet(rid),
  ]);

  const hoursByEmployee = new Map(hourRows.map((row) => [String(row._id), mapHoursRow(row)]));
  const filteredOrders = orderDocs.filter((order) =>
    matchesPaymentMethod(order, paymentMethod)
  );

  const resolvedOwnTipIds = tipPoolInfo?.ownTipEmployeeIds || ownTipIdsFallback || new Set();
  const totalPoolTips =
    tipPoolInfo?.totalTips != null ? tipPoolInfo.totalTips : sumTipPool(filteredOrders);
  const poolTips =
    tipPoolInfo?.shareableTips != null
      ? tipPoolInfo.shareableTips
      : sumShareableTipPool(filteredOrders, resolvedOwnTipIds);

  const salesByEmployee = new Map();
  for (const order of filteredOrders) {
    const key = order.processedBy ? String(order.processedBy) : null;
    if (!key) continue;
    if (!salesByEmployee.has(key)) salesByEmployee.set(key, emptyMetrics());
    addOrderMetrics(salesByEmployee.get(key), order);
  }

  const employeeIds = new Set([...hoursByEmployee.keys(), ...salesByEmployee.keys()]);
  if (selected) employeeIds.add(String(selected._id));
  if (!empId) {
    for (const emp of filters.employees) {
      if (emp.status !== "Suspended") employeeIds.add(emp.id);
    }
  }

  const missingIds = [...employeeIds].filter((id) => {
    const hours = hoursByEmployee.get(id);
    return !hours;
  });
  const extraEmployees = missingIds.length
    ? await Employee.find({
        _id: { $in: missingIds.map((id) => toObjectId(id)).filter(Boolean) },
        restaurant: rid,
      })
        .select("firstName lastName role employeeId hourlyPaid tipPercent receiveOwnTips")
        .lean()
    : [];
  const extraById = new Map(extraEmployees.map((emp) => [String(emp._id), emp]));
  if (selected) extraById.set(String(selected._id), selected);

  const performance = [...employeeIds]
    .map((id) => {
      const hours = hoursByEmployee.get(id);
      const sales = finalizeMetrics(salesByEmployee.get(id) || emptyMetrics());
      const emp = hours ? extraById.get(id) || null : extraById.get(id);
      const clock = clockFieldsForEmployee(
        id,
        clockSnapshots.openByEmployee,
        clockSnapshots.latestByEmployee
      );
      const tipResult = resolveEmployeeTips({
        id,
        hours,
        emp,
        selected,
        filterEmployees: filters.employees,
        poolTips,
        collectedTips: sales.tips,
      });
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
        collectedTips: sales.tips,
        tipPercent: tipResult.tipPercent,
        receiveOwnTips: tipResult.receiveOwnTips,
        tips: tipResult.tips,
        averageTip: sales.averageTip,
        serviceCharges: sales.serviceCharges,
        averageCharge: sales.averageCharge,
        totalTipsAndCharges: r2(tipResult.tips + sales.serviceCharges),
        cancellations: sales.cancelCount,
        waived: sales.waivedOrders,
        cancellationRate: sales.cancellationRate,
        daysWorked: hours?.daysWorked || 0,
        tablesServed: 0,
        clockedIn: clock.clockedIn,
        clockIn: clock.clockIn,
        clockOut: clock.clockOut,
        isIncomplete: clock.isIncomplete,
        attendanceStatus: clock.attendanceStatus,
        loginDeviceName: clock.loginDeviceName,
      };
    })
    .sort((a, b) => b.sales - a.sales || b.hours - a.hours || a.name.localeCompare(b.name));

  // Fill tablesServed per employee from filtered orders
  const tablesByEmployee = new Map();
  for (const order of filteredOrders) {
    if (!isRevenueOrder(order) || !order.processedBy) continue;
    const key = String(order.processedBy);
    if (!tablesByEmployee.has(key)) tablesByEmployee.set(key, new Set());
    const table = order.tableNo != null ? String(order.tableNo).trim() : "";
    if (table) tablesByEmployee.get(key).add(table);
  }
  for (const row of performance) {
    row.tablesServed = tablesByEmployee.get(row.employeeId)?.size || 0;
  }

  const roleFiltered = role
    ? performance.filter((row) => String(row.role || "").toLowerCase() === String(role).toLowerCase())
    : performance;
  const performanceRows = roleFiltered;

  const overviewHours = performanceRows.reduce(
    (acc, row) => ({
      totalHours: acc.totalHours + (Number(row.hours) || 0),
      regularHours: acc.regularHours + (Number(row.regularHours) || 0),
      overtimeHours: acc.overtimeHours + (Number(row.overtimeHours) || 0),
      regularPay: acc.regularPay + (Number(row.regularPay) || 0),
      overtimePay: acc.overtimePay + (Number(row.overtimePay) || 0),
      estimatedPay: acc.estimatedPay + (Number(row.estimatedPay) || 0),
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
      if (!order.processedBy) return acc;
      if (role) {
        const empRow = performanceRows.find(
          (row) => row.employeeId === String(order.processedBy)
        );
        if (!empRow) return acc;
      }
      addOrderMetrics(acc, order);
      return acc;
    }, emptyMetrics())
  );

  const overTime = buildOverTimeSeries(filteredOrders, dateFrom, dateTo);
  const hoursOverTimeLogs =
    shiftId && !shiftIds.length
      ? []
      : await EmployeeLog.find(logMatch)
          .select("loginTime date workedMinutes workedHours")
          .lean();
  const hoursOverTime = buildHoursSeries(
    hoursOverTimeLogs.map((log) => ({
      ...log,
      dayKey: restaurantDayKey(log.date || log.loginTime),
      workedMinutes:
        Number(log.workedMinutes) ||
        Math.round((Number(log.workedHours) || 0) * MINUTES_PER_HOUR),
    })),
    dateFrom,
    dateTo
  );
  const chartPeople = selected
    ? performanceRows
    : performanceRows.filter((row) => row.sales > 0 || row.orders > 0);
  const tipPeople = selected
    ? performanceRows
    : performanceRows.filter(
        (row) => Number(row.tips) > 0 || Number(row.tipPercent) > 0 || row.receiveOwnTips
      );
  const chargePeople = selected
    ? performanceRows
    : performanceRows.filter((row) => row.serviceCharges > 0);

  const activeStaff = performanceRows.filter((row) => {
    const emp = filters.employees.find((e) => e.id === row.employeeId);
    return emp?.status === "Active" || emp?.status === "Approved";
  }).length;

  const laborConfigured = performanceRows.some((row) => Number(row.hourlyRate) > 0);

  return {
    overview: {
      employees: selected ? 1 : performanceRows.length,
      activeStaff: selected ? (performanceRows[0] ? 1 : 0) : activeStaff,
      totalHours: r2(overviewHours.totalHours),
      regularHours: r2(overviewHours.regularHours),
      overtimeHours: r2(overviewHours.overtimeHours),
      regularPay: r2(overviewHours.regularPay),
      overtimePay: r2(overviewHours.overtimePay),
      estimatedPay: r2(overviewHours.estimatedPay),
      laborConfigured,
      totalTips: totalPoolTips,
      shareableTipPool: poolTips,
      distributedTips: r2(performanceRows.reduce((sum, row) => sum + (Number(row.tips) || 0), 0)),
      serviceCharges: salesTotals.serviceCharges,
      totalOrders: salesTotals.totalOrders,
      completedOrders: salesTotals.completedOrders,
      cancelledOrders: salesTotals.cancelledOrders,
      waivedOrders: salesTotals.waivedOrders,
      cancelCount: salesTotals.cancelCount,
      totalSales: salesTotals.sales,
      totalStaff: selected ? 1 : performanceRows.length,
      clockedIn: selected
        ? performanceRows[0]?.clockedIn
          ? 1
          : 0
        : performanceRows.filter((row) => row.clockedIn).length,
    },
    performance: performanceRows,
    sales: performanceRows.map((row) => ({
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
      employees: performanceRows.map((row) => ({
        employeeId: row.employeeId,
        name: row.name,
        role: row.role,
        orders: row.orders,
        tipPercent: row.tipPercent,
        receiveOwnTips: Boolean(row.receiveOwnTips),
        collectedTips: row.collectedTips,
        tips: row.tips,
        averageTip: row.averageTip,
        serviceCharges: row.serviceCharges,
        averageCharge: row.averageCharge,
        totalTipsAndCharges: row.totalTipsAndCharges,
      })),
      totals: {
        orders: salesTotals.completedOrders,
        tips: r2(performanceRows.reduce((sum, row) => sum + (Number(row.tips) || 0), 0)),
        collectedTips: salesTotals.tips,
        serviceCharges: salesTotals.serviceCharges,
        tipPool: totalPoolTips,
        shareableTipPool: poolTips,
      },
    },
    cancellations: {
      totals: {
        totalOrders: salesTotals.totalOrders,
        completed: salesTotals.completedOrders,
        cancelled: salesTotals.cancelledOrders,
        waived: salesTotals.waivedOrders,
        cancelCount: salesTotals.cancelCount,
      },
      employees: performanceRows.map((row) => ({
        employeeId: row.employeeId,
        name: row.name,
        role: row.role,
        totalOrders: row.totalOrders,
        completed: row.orders,
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
      collectedTipsOverTime: overTime.map((row) => ({ label: row.label, tips: row.tips })),
      hoursByEmployee: performanceRows
        .filter((row) => Number(row.hours) > 0)
        .map((row) => ({ label: row.name, hours: row.hours })),
      hoursOverTime,
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
          tipPercent: Number(selected.tipPercent) || 0,
          receiveOwnTips: Boolean(selected.receiveOwnTips),
        }
      : null,
    meta: {
      dateFrom,
      dateTo,
      timezone: DEFAULT_RESTAURANT_TIMEZONE,
      employeeId: empId ? String(empId) : null,
      shiftId: shiftId || null,
      role: role || null,
      orderStatus,
      paymentMethod,
    },
  };
}

async function buildAttendanceSection({ rid, dateFrom, dateTo, empId, shiftId, role = null, page, limit }) {
  const filters = await loadFilterOptions(rid);
  const match = attendanceDateMatch(rid, dateFrom, dateTo);
  if (empId) match.employee = empId;
  if (shiftId) {
    const shiftIds = await shiftIdsForTemplate(rid, shiftId);
    if (!shiftIds.length) {
      return {
        rows: [],
        pagination: { page, limit, total: 0, pages: 1 },
        filters,
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
  let query = EmployeeLog.find(match)
    .populate("employee", "firstName lastName role employeeId")
    .populate({
      path: "shift",
      select: "startTime endTime templateId",
      populate: { path: "templateId", select: "name startTime endTime" },
    })
    .sort({ loginTime: -1, date: -1 });

  const allRows = await query.lean();
  const filtered = role
    ? allRows.filter(
        (log) =>
          String(log.employee?.role || "").toLowerCase() === String(role).toLowerCase()
      )
    : allRows;
  const total = filtered.length;
  const rows = filtered.slice(skip, skip + limit);

  const totals = filtered.reduce(
    (acc, log) => {
      const worked = Number(log.workedMinutes) || 0;
      const ot = Number(log.overtimeMinutes) || 0;
      acc.totalHours += worked / MINUTES_PER_HOUR;
      acc.overtimeHours += ot / MINUTES_PER_HOUR;
      if (log.isIncomplete) acc.currentlyWorking += 1;
      acc.attendanceCount += 1;
      return acc;
    },
    { totalHours: 0, overtimeHours: 0, currentlyWorking: 0, attendanceCount: 0 }
  );
  const avgHours =
    totals.attendanceCount > 0 ? totals.totalHours / totals.attendanceCount : 0;

  return {
    rows: rows.map((log) => mapAttendanceLog(log)),
    summary: {
      totalHours: r2(totals.totalHours),
      averageHours: r2(avgHours),
      overtimeHours: r2(totals.overtimeHours),
      currentlyWorking: totals.currentlyWorking,
      attendanceCount: totals.attendanceCount,
    },
    pagination: {
      page,
      limit,
      total,
      pages: Math.max(1, Math.ceil(total / limit)),
    },
    filters,
    meta: {
      dateFrom,
      dateTo,
      timezone: DEFAULT_RESTAURANT_TIMEZONE,
      role: role || null,
    },
  };
}

async function buildOrdersSection({
  rid,
  dateFrom,
  dateTo,
  empId,
  role = null,
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

  let filtered = docs.filter((order) => matchesPaymentMethod(order, paymentMethod));
  const employeeIds = [
    ...new Set(filtered.map((order) => (order.processedBy ? String(order.processedBy) : null)).filter(Boolean)),
  ];
  const employees = employeeIds.length
    ? await Employee.find({ _id: { $in: employeeIds.map((id) => toObjectId(id)) } })
        .select("firstName lastName role")
        .lean()
    : [];
  const nameById = new Map(employees.map((emp) => [String(emp._id), displayName(emp)]));
  const roleById = new Map(employees.map((emp) => [String(emp._id), emp.role || "Staff"]));

  if (role) {
    const roleLower = String(role).toLowerCase();
    filtered = filtered.filter((order) => {
      const id = order.processedBy ? String(order.processedBy) : null;
      return id && String(roleById.get(id) || "").toLowerCase() === roleLower;
    });
  }

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
  const filters = await loadFilterOptions(rid);

  return {
    rows: pageRows.map((order) => mapOrderRow(order, nameById)),
    pagination: {
      page,
      limit,
      total,
      pages: Math.max(1, Math.ceil(total / limit) || 1),
    },
    filters,
    meta: {
      dateFrom,
      dateTo,
      timezone: DEFAULT_RESTAURANT_TIMEZONE,
      role: role || null,
    },
  };
}

async function buildDetailSection({
  rid,
  dateFrom,
  dateTo,
  empId,
  shiftId,
  orderStatus,
  paymentMethod,
  detailFocus = "profile",
}) {
  if (!empId) {
    throw Object.assign(new Error("employeeId is required"), { status: 400 });
  }

  const focus = DETAIL_FOCUSES.includes(detailFocus) ? detailFocus : "profile";
  if (focus !== "profile") {
    return buildFocusedDetailSection({
      rid,
      dateFrom,
      dateTo,
      empId,
      shiftId,
      orderStatus,
      paymentMethod,
      detailFocus: focus,
    });
  }

  const employee = await Employee.findOne({ _id: empId, restaurant: rid })
    .select("firstName lastName role employeeId hourlyPaid status tipPercent receiveOwnTips lastLoginIP lastLoginAt lastLoginPlatform")
    .lean();

  if (!employee) {
    throw Object.assign(new Error("Employee not found"), { status: 404 });
  }

  const orderMatch = orderDateMatch(rid, dateFrom, dateTo);
  orderMatch.processedBy = empId;
  if (orderStatus !== "ALL") orderMatch.status = orderStatus;

  const { start } = businessDateBounds(dateFrom);
  const { end } = businessDateBounds(dateTo);

  const [attendance, orderDocs, sessions, openLog, tipPoolInfo] = await Promise.all([
    buildCalendarAttendance({ rid, empId, dateFrom, dateTo, shiftId, employee }),
    Order.find(orderMatch).select(ORDER_SELECT).sort({ createdAt: -1 }).limit(500).lean(),
    EmployeeSession.find({
      restaurant: rid,
      employee: empId,
      loginTime: { $gte: start, $lt: end },
    })
      .populate("device", "deviceName deviceType")
      .sort({ loginTime: -1 })
      .limit(500)
      .lean(),
    EmployeeLog.findOne({ restaurant: rid, employee: empId, isIncomplete: true })
      .select("loginTime attendanceStatus loginDeviceName")
      .lean(),
    loadTipPool(rid, dateFrom, dateTo, orderStatus, paymentMethod),
  ]);

  const filteredOrders = orderDocs.filter((order) => matchesPaymentMethod(order, paymentMethod));
  const nameById = new Map([[String(employee._id), displayName(employee)]]);
  const sessionRows = sessions.map((session) => mapSession(session));
  const orders = filteredOrders.map((order) => mapOrderRow(order, nameById));
  const sales = finalizeMetrics(
    filteredOrders.reduce((acc, order) => {
      addOrderMetrics(acc, order);
      return acc;
    }, emptyMetrics())
  );
  const hours = attendance.reduce(
    (acc, row) => ({
      hours: acc.hours + (Number(row.workedHours) || 0),
      regularHours: acc.regularHours + (Number(row.regularHours) || 0),
      overtimeHours: acc.overtimeHours + (Number(row.overtimeHours) || 0),
    }),
    { hours: 0, regularHours: 0, overtimeHours: 0 }
  );
  const hourlyRate = r2(employee.hourlyPaid?.amountPerHour);
  const overtimeRate = r2(
    employee.hourlyPaid?.overtimeAmountPerHour ?? employee.hourlyPaid?.amountPerHour
  );
  const regularPay = r2(hours.regularHours * hourlyRate);
  const overtimePay = r2(hours.overtimeHours * overtimeRate);
  const tipPercent = Number(employee.tipPercent) || 0;
  const receiveOwnTips = Boolean(employee.receiveOwnTips);
  const poolTips = tipPoolInfo.shareableTips;
  const distributedTips = receiveOwnTips
    ? r2(sales.tips)
    : tipShare(poolTips, tipPercent);

  return {
    focus: "profile",
    employee: {
      id: String(employee._id),
      name: displayName(employee),
      role: employee.role || "Staff",
      employeeCode: employee.employeeId || null,
      hourlyRate,
      overtimeRate,
      tipPercent: receiveOwnTips ? 0 : tipPercent,
      receiveOwnTips,
      clockedIn: Boolean(openLog),
      clockIn: openLog?.loginTime || attendance.find((row) => row.clockIn)?.clockIn || null,
      clockOut: openLog ? null : attendance.find((row) => row.clockOut)?.clockOut || null,
      lastLoginIP: employee.lastLoginIP || null,
      lastLoginAt: employee.lastLoginAt || null,
      lastLoginPlatform: employee.lastLoginPlatform || null,
    },
    overview: {
      hours: r2(hours.hours),
      regularHours: r2(hours.regularHours),
      overtimeHours: r2(hours.overtimeHours),
      regularPay,
      overtimePay,
      estimatedPay: r2(regularPay + overtimePay),
      sales: sales.sales,
      tips: distributedTips,
      collectedTips: sales.tips,
      tipPercent: receiveOwnTips ? 0 : tipPercent,
      receiveOwnTips,
      tipPool: tipPoolInfo.totalTips,
      shareableTipPool: poolTips,
      serviceCharges: sales.serviceCharges,
      totalOrders: sales.totalOrders,
      completedOrders: sales.completedOrders,
      cancelledOrders: sales.cancelledOrders,
      waivedOrders: sales.waivedOrders,
      cancelCount: sales.cancelCount,
      aov: sales.aov,
      tablesServed: countTablesServed(filteredOrders),
    },
    attendance,
    sessions: sessionRows,
    orders,
    cancelledItems: cancelledItemsFromOrders(filteredOrders),
    attendanceStats: buildAttendanceStats(attendance),
    charts: {
      salesOverTime: buildOverTimeSeries(filteredOrders, dateFrom, dateTo),
      hoursOverTime: buildHoursSeries(attendance, dateFrom, dateTo),
    },
    meta: {
      dateFrom,
      dateTo,
      timezone: DEFAULT_RESTAURANT_TIMEZONE,
      employeeId: String(empId),
      detailFocus: "profile",
    },
  };
}

async function buildFocusedDetailSection({
  rid,
  dateFrom,
  dateTo,
  empId,
  shiftId,
  orderStatus,
  paymentMethod,
  detailFocus,
}) {
  const employee = await Employee.findOne({ _id: empId, restaurant: rid })
    .select(
      "firstName lastName role employeeId hourlyPaid status tipPercent receiveOwnTips lastLoginIP lastLoginAt lastLoginPlatform"
    )
    .lean();

  if (!employee) {
    throw Object.assign(new Error("Employee not found"), { status: 404 });
  }

  const employeeBase = {
    id: String(employee._id),
    name: displayName(employee),
    role: employee.role || "Staff",
    employeeCode: employee.employeeId || null,
    hourlyRate: r2(employee.hourlyPaid?.amountPerHour),
    overtimeRate: r2(
      employee.hourlyPaid?.overtimeAmountPerHour ?? employee.hourlyPaid?.amountPerHour
    ),
    tipPercent: Boolean(employee.receiveOwnTips) ? 0 : Number(employee.tipPercent) || 0,
    receiveOwnTips: Boolean(employee.receiveOwnTips),
  };

  const meta = {
    dateFrom,
    dateTo,
    timezone: DEFAULT_RESTAURANT_TIMEZONE,
    employeeId: String(empId),
    detailFocus,
  };

  const needsOrders = [
    "sales",
    "tips",
    "service",
    "orders",
    "cancellations",
    "tipsByPayment",
  ].includes(detailFocus);
  const needsLogs = ["clock", "hours", "labor"].includes(detailFocus);

  const orderMatch = orderDateMatch(rid, dateFrom, dateTo);
  orderMatch.processedBy = empId;
  if (orderStatus !== "ALL" && detailFocus !== "cancellations") {
    orderMatch.status = orderStatus;
  }
  if (detailFocus === "cancellations") {
    orderMatch.status = { $in: ["CANCELLED", "WAIVED"] };
  }

  const logMatch = attendanceDateMatch(rid, dateFrom, dateTo);
  logMatch.employee = empId;
  if (shiftId) {
    const shiftIds = await shiftIdsForTemplate(rid, shiftId);
    if (shiftIds.length) logMatch.shift = { $in: shiftIds };
  }

  const [orderDocs, tipPoolInfo, logDocs, hourAgg] = await Promise.all([
    needsOrders
      ? Order.find(orderMatch).select(ORDER_SELECT).sort({ createdAt: -1 }).limit(500).lean()
      : Promise.resolve([]),
    ["tips", "tipsByPayment"].includes(detailFocus)
      ? loadTipPool(rid, dateFrom, dateTo, orderStatus === "ALL" ? "ALL" : orderStatus, paymentMethod)
      : Promise.resolve(null),
    needsLogs
      ? EmployeeLog.find(logMatch)
          .populate("employee", "firstName lastName role employeeId")
          .populate({
            path: "shift",
            select: "startTime endTime templateId",
            populate: { path: "templateId", select: "name startTime endTime" },
          })
          .sort({ loginTime: -1, date: -1 })
          .lean()
      : Promise.resolve([]),
    detailFocus === "labor" || detailFocus === "hours"
      ? EmployeeLog.aggregate(buildWorkingHoursSummaryPipeline(logMatch))
      : Promise.resolve([]),
  ]);

  const filteredOrders = (orderDocs || []).filter((order) =>
    matchesPaymentMethod(order, paymentMethod)
  );
  const nameById = new Map([[String(employee._id), displayName(employee)]]);
  const orders = filteredOrders.map((order) => mapOrderRow(order, nameById));
  const sales = finalizeMetrics(
    filteredOrders.reduce((acc, order) => {
      addOrderMetrics(acc, order);
      return acc;
    }, emptyMetrics())
  );
  const punches = (logDocs || []).map((log) => mapAttendanceLog(log));
  const hoursRow = hourAgg?.[0] ? mapHoursRow(hourAgg[0]) : null;

  if (detailFocus === "sales") {
    return {
      focus: "sales",
      employee: employeeBase,
      overview: {
        sales: sales.sales,
        discounts: sales.discounts,
        orders: sales.completedOrders,
        totalOrders: sales.totalOrders,
        aov: sales.aov,
        cancelCount: sales.cancelCount,
        tablesServed: countTablesServed(filteredOrders),
      },
      orders,
      charts: {
        salesOverTime: buildOverTimeSeries(filteredOrders, dateFrom, dateTo),
      },
      meta,
    };
  }

  if (detailFocus === "tips" || detailFocus === "tipsByPayment") {
    const receiveOwnTips = Boolean(employee.receiveOwnTips);
    const tipPercent = receiveOwnTips ? 0 : Number(employee.tipPercent) || 0;
    const shareable = tipPoolInfo?.shareableTips || 0;
    const allocatedTips = receiveOwnTips ? r2(sales.tips) : tipShare(shareable, tipPercent);
    const tipOrders = orders.filter((o) => Number(o.tipAmount) > 0);
    return {
      focus: detailFocus,
      employee: {
        ...employeeBase,
        tipPercent,
        receiveOwnTips,
      },
      overview: {
        collectedTips: sales.tips,
        allocatedTips,
        tipPercent,
        receiveOwnTips,
        tipPool: tipPoolInfo?.totalTips || 0,
        shareableTipPool: shareable,
        orders: sales.completedOrders,
        tipOrders: tipOrders.length,
        tablesServed: countTablesServed(filteredOrders),
        serviceCharges: sales.serviceCharges,
      },
      tipMethods: tipMethodsFromOrders(filteredOrders),
      orders: tipOrders.length ? tipOrders : orders,
      meta,
    };
  }

  if (detailFocus === "service") {
    const scOrders = orders.filter((o) => Number(o.serviceChargeTotal) > 0);
    return {
      focus: "service",
      employee: employeeBase,
      overview: {
        serviceCharges: sales.serviceCharges,
        averageCharge: sales.averageCharge,
        ordersWithCharge: scOrders.length,
        totalOrders: sales.completedOrders,
      },
      orders: scOrders,
      meta,
    };
  }

  if (detailFocus === "orders") {
    return {
      focus: "orders",
      employee: employeeBase,
      overview: {
        totalOrders: sales.totalOrders,
        completedOrders: sales.completedOrders,
        cancelCount: sales.cancelCount,
        sales: sales.sales,
        tips: sales.tips,
        serviceCharges: sales.serviceCharges,
        tablesServed: countTablesServed(filteredOrders),
      },
      orders,
      meta,
    };
  }

  if (detailFocus === "cancellations") {
    const cancelRows = filteredOrders.map((order) => ({
      orderId: String(order._id),
      orderNumber: order.orderNumber,
      createdAt: order.createdAt,
      dayKey: restaurantDayKey(order.createdAt),
      status: order.status,
      amount: r2(order.totalAmount),
      reason: order.waiveReason || null,
      cancelledBy:
        order.status === "WAIVED" && order.waivedBy ? String(order.waivedBy) : null,
      tableNo: order.tableNo || "",
    }));
    const waivedByIds = [
      ...new Set(cancelRows.map((row) => row.cancelledBy).filter(Boolean)),
    ];
    const waivedByEmps = waivedByIds.length
      ? await Employee.find({ _id: { $in: waivedByIds.map((id) => toObjectId(id)).filter(Boolean) } })
          .select("firstName lastName")
          .lean()
      : [];
    const waivedNameById = new Map(
      waivedByEmps.map((emp) => [String(emp._id), displayName(emp)])
    );
    for (const row of cancelRows) {
      row.cancelledByName = row.cancelledBy
        ? waivedNameById.get(row.cancelledBy) || "Staff"
        : null;
    }
    return {
      focus: "cancellations",
      employee: employeeBase,
      overview: {
        cancelCount: cancelRows.length,
        cancelledAmount: r2(cancelRows.reduce((s, r) => s + (Number(r.amount) || 0), 0)),
        cancelled: cancelRows.filter((r) => r.status === "CANCELLED").length,
        waived: cancelRows.filter((r) => r.status === "WAIVED").length,
      },
      cancellations: cancelRows,
      cancelledItems: cancelledItemsFromOrders(filteredOrders),
      meta,
    };
  }

  if (detailFocus === "clock") {
    const byDay = new Map();
    for (const punch of punches) {
      const key = punch.dayKey || "unknown";
      if (!byDay.has(key)) byDay.set(key, []);
      byDay.get(key).push(punch);
    }
    const days = [...byDay.entries()]
      .map(([dayKey, logs]) => ({
        dayKey,
        date: logs[0]?.date || null,
        logs,
        workedMinutes: logs.reduce((s, l) => s + (Number(l.workedMinutes) || 0), 0),
      }))
      .sort((a, b) => String(b.dayKey).localeCompare(String(a.dayKey)));

    return {
      focus: "clock",
      employee: employeeBase,
      overview: {
        punches: punches.length,
        totalHours: r2(
          punches.reduce((s, p) => s + (Number(p.workedHours) || 0), 0)
        ),
        overtimeHours: r2(
          punches.reduce((s, p) => s + (Number(p.overtimeHours) || 0), 0)
        ),
        days: days.length,
      },
      punches,
      days,
      meta,
    };
  }

  if (detailFocus === "hours") {
    return {
      focus: "hours",
      employee: employeeBase,
      overview: {
        hours: hoursRow?.hours || r2(punches.reduce((s, p) => s + (Number(p.workedHours) || 0), 0)),
        regularHours:
          hoursRow?.regularHours ||
          r2(punches.reduce((s, p) => s + (Number(p.regularHours) || 0), 0)),
        overtimeHours:
          hoursRow?.overtimeHours ||
          r2(punches.reduce((s, p) => s + (Number(p.overtimeHours) || 0), 0)),
        daysWorked: hoursRow?.daysWorked || new Set(punches.map((p) => p.dayKey).filter(Boolean)).size,
      },
      punches,
      charts: {
        hoursOverTime: buildHoursSeries(punches, dateFrom, dateTo),
      },
      meta,
    };
  }

  // labor
  const regularHours = hoursRow?.regularHours || 0;
  const overtimeHours = hoursRow?.overtimeHours || 0;
  const hourlyRate = employeeBase.hourlyRate;
  const overtimeRate = employeeBase.overtimeRate;
  const regularPay = hoursRow?.regularPay ?? r2(regularHours * hourlyRate);
  const overtimePay = hoursRow?.overtimePay ?? r2(overtimeHours * overtimeRate);
  return {
    focus: "labor",
    employee: employeeBase,
    overview: {
      hourlyRate,
      overtimeRate,
      regularHours,
      overtimeHours,
      hours: hoursRow?.hours || r2(regularHours + overtimeHours),
      regularPay,
      overtimePay,
      estimatedPay: hoursRow?.estimatedPay ?? r2(regularPay + overtimePay),
      daysWorked: hoursRow?.daysWorked || 0,
      laborConfigured: hourlyRate > 0,
    },
    calculation: {
      regular: {
        hours: regularHours,
        rate: hourlyRate,
        pay: regularPay,
        formula: `${regularHours}h × ${moneyPlain(hourlyRate)}`,
      },
      overtime: {
        hours: overtimeHours,
        rate: overtimeRate,
        pay: overtimePay,
        formula: `${overtimeHours}h × ${moneyPlain(overtimeRate)}`,
      },
      total: {
        pay: hoursRow?.estimatedPay ?? r2(regularPay + overtimePay),
        formula: `Regular + Overtime`,
      },
    },
    punches,
    meta,
  };
}

function moneyPlain(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

async function buildTipsByPaymentSection({
  rid,
  dateFrom,
  dateTo,
  empId,
  role = null,
  orderStatus,
  paymentMethod,
}) {
  const match = orderDateMatch(rid, dateFrom, dateTo);
  if (empId) match.processedBy = empId;
  if (orderStatus !== "ALL") match.status = orderStatus;

  const docs = await Order.find(match).select(SUMMARY_ORDER_SELECT).lean();
  let filtered = docs.filter((order) => matchesPaymentMethod(order, paymentMethod));

  const employeeIds = [
    ...new Set(
      filtered.map((order) => (order.processedBy ? String(order.processedBy) : null)).filter(Boolean)
    ),
  ];
  const employees = employeeIds.length
    ? await Employee.find({ _id: { $in: employeeIds.map((id) => toObjectId(id)).filter(Boolean) } })
        .select("firstName lastName role employeeId tipPercent receiveOwnTips")
        .lean()
    : [];
  const empById = new Map(employees.map((emp) => [String(emp._id), emp]));

  if (role) {
    const roleLower = String(role).toLowerCase();
    filtered = filtered.filter((order) => {
      const emp = order.processedBy ? empById.get(String(order.processedBy)) : null;
      return emp && String(emp.role || "").toLowerCase() === roleLower;
    });
  }

  const tipPoolInfo = await loadTipPool(rid, dateFrom, dateTo, orderStatus, paymentMethod);
  const shareable = tipPoolInfo.shareableTips;

  const methodMap = new Map();
  const employeeMethodMap = new Map();
  const collectedByEmployee = new Map();

  for (const order of filtered) {
    const tip = Number(order.tipAmount) || 0;
    if (tip <= 0 || !isRevenueOrder(order)) continue;
    const bucket = tipPaymentBucket(order) || "Other";
    const sales = r2(Math.max(0, (Number(order.subTotal) || 0) - (Number(order.discountTotal) || 0)));

    if (!methodMap.has(bucket)) {
      methodMap.set(bucket, { method: bucket, orders: 0, tips: 0, sales: 0 });
    }
    const m = methodMap.get(bucket);
    m.orders += 1;
    m.tips = r2(m.tips + tip);
    m.sales = r2(m.sales + sales);

    const empIdKey = order.processedBy ? String(order.processedBy) : "unassigned";
    const empKey = `${empIdKey}::${bucket}`;
    if (!employeeMethodMap.has(empKey)) {
      const emp = empById.get(empIdKey);
      employeeMethodMap.set(empKey, {
        employeeId: empIdKey === "unassigned" ? null : empIdKey,
        name: emp ? displayName(emp) : "Unassigned",
        role: emp?.role || "Staff",
        method: bucket,
        orders: 0,
        tips: 0,
        sales: 0,
      });
    }
    const em = employeeMethodMap.get(empKey);
    em.orders += 1;
    em.tips = r2(em.tips + tip);
    em.sales = r2(em.sales + sales);

    if (empIdKey !== "unassigned") {
      collectedByEmployee.set(
        empIdKey,
        r2((collectedByEmployee.get(empIdKey) || 0) + tip)
      );
    }
  }

  const methods = [...methodMap.values()]
    .map((row) => ({
      ...row,
      averageTip: row.orders > 0 ? r2(row.tips / row.orders) : 0,
      tipPercent: row.sales > 0 ? r2((row.tips / row.sales) * 100) : 0,
    }))
    .sort((a, b) => b.tips - a.tips);

  const byEmployee = [...employeeMethodMap.values()]
    .map((row) => ({
      ...row,
      averageTip: row.orders > 0 ? r2(row.tips / row.orders) : 0,
      tipPercent: row.sales > 0 ? r2((row.tips / row.sales) * 100) : 0,
    }))
    .sort((a, b) => b.tips - a.tips || a.name.localeCompare(b.name));

  const earnedByEmployee = [...new Set([...collectedByEmployee.keys(), ...empById.keys()])]
    .map((id) => {
      const emp = empById.get(id);
      if (!emp) return null;
      const collectedTips = collectedByEmployee.get(id) || 0;
      const tipResult = resolveEmployeeTips({
        id,
        hours: null,
        emp,
        selected: null,
        filterEmployees: [],
        poolTips: shareable,
        collectedTips,
      });
      return {
        employeeId: id,
        name: displayName(emp),
        role: emp.role || "Staff",
        receiveOwnTips: tipResult.receiveOwnTips,
        tipPercent: tipResult.tipPercent,
        collectedTips,
        earnedTips: tipResult.tips,
        orders: byEmployee
          .filter((row) => row.employeeId === id)
          .reduce((s, row) => s + (Number(row.orders) || 0), 0),
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.earnedTips - a.earnedTips || a.name.localeCompare(b.name));

  const totalTips = r2(methods.reduce((sum, row) => sum + row.tips, 0));
  const totalOrders = methods.reduce((sum, row) => sum + row.orders, 0);
  const totalEarned = r2(earnedByEmployee.reduce((s, row) => s + (Number(row.earnedTips) || 0), 0));
  const filters = await loadFilterOptions(rid);

  return {
    overview: {
      totalTips,
      totalEarned,
      shareableTipPool: shareable,
      tipPool: tipPoolInfo.totalTips,
      totalOrders,
      averageTip: totalOrders > 0 ? r2(totalTips / totalOrders) : 0,
      methods: methods.length,
    },
    methods,
    byEmployee,
    earnedByEmployee,
    charts: {
      tipsByMethod: methods.map((row) => ({ label: row.method, value: row.tips })),
      earnedByEmployee: earnedByEmployee.map((row) => ({
        label: row.name,
        value: row.earnedTips,
      })),
    },
    filters,
    meta: {
      dateFrom,
      dateTo,
      timezone: DEFAULT_RESTAURANT_TIMEZONE,
      role: role || null,
      note: "Collected tips by tender. Earned tips use own tips or tip % of the shareable pool (excluding own-tip staff collections).",
    },
  };
}

async function buildCancellationsSection({
  rid,
  dateFrom,
  dateTo,
  empId,
  role = null,
  paymentMethod,
  search = "",
  page = 1,
  limit = 25,
}) {
  const match = orderDateMatch(rid, dateFrom, dateTo);
  match.status = { $in: ["CANCELLED", "WAIVED"] };
  if (empId) match.processedBy = empId;
  if (search) {
    match.orderNumber = { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
  }

  const docs = await Order.find(match)
    .select(ORDER_SELECT)
    .sort({ createdAt: -1 })
    .limit(10000)
    .lean();

  let filtered = docs.filter((order) => matchesPaymentMethod(order, paymentMethod));

  const employeeIds = [
    ...new Set(
      filtered.map((order) => (order.processedBy ? String(order.processedBy) : null)).filter(Boolean)
    ),
  ];
  const waiveIds = [
    ...new Set(filtered.map((order) => (order.waivedBy ? String(order.waivedBy) : null)).filter(Boolean)),
  ];
  const allIds = [...new Set([...employeeIds, ...waiveIds])];
  const employees = allIds.length
    ? await Employee.find({ _id: { $in: allIds.map((id) => toObjectId(id)).filter(Boolean) } })
        .select("firstName lastName role employeeId")
        .lean()
    : [];
  const empById = new Map(employees.map((emp) => [String(emp._id), emp]));
  const nameById = new Map(employees.map((emp) => [String(emp._id), displayName(emp)]));

  if (role) {
    const roleLower = String(role).toLowerCase();
    filtered = filtered.filter((order) => {
      const emp = order.processedBy ? empById.get(String(order.processedBy)) : null;
      return emp && String(emp.role || "").toLowerCase() === roleLower;
    });
  }

  const byEmployeeMap = new Map();
  const overTimeMap = new Map();
  let cancelledAmount = 0;

  const rows = filtered.map((order) => {
    const amount = r2(order.totalAmount);
    cancelledAmount = r2(cancelledAmount + amount);
    const empIdKey = order.processedBy ? String(order.processedBy) : null;
    const emp = empIdKey ? empById.get(empIdKey) : null;
    const dayKey = restaurantDayKey(order.createdAt) || "unknown";

    if (empIdKey) {
      if (!byEmployeeMap.has(empIdKey)) {
        byEmployeeMap.set(empIdKey, {
          employeeId: empIdKey,
          name: displayName(emp),
          role: emp?.role || "Staff",
          count: 0,
          amount: 0,
        });
      }
      const bucket = byEmployeeMap.get(empIdKey);
      bucket.count += 1;
      bucket.amount = r2(bucket.amount + amount);
    }

    if (!overTimeMap.has(dayKey)) overTimeMap.set(dayKey, { label: dayKey, count: 0, amount: 0 });
    const ot = overTimeMap.get(dayKey);
    ot.count += 1;
    ot.amount = r2(ot.amount + amount);

    return {
      orderId: String(order._id),
      orderNumber: order.orderNumber,
      createdAt: order.createdAt,
      employeeId: empIdKey,
      employeeName: empIdKey ? nameById.get(empIdKey) || "Unknown" : "Unassigned",
      amount,
      status: order.status,
      reason: order.waiveReason || null,
      cancelledBy:
        order.status === "WAIVED" && order.waivedBy
          ? nameById.get(String(order.waivedBy)) || ""
          : null,
      waivedAt: order.waivedAt || null,
    };
  });

  const total = rows.length;
  const skip = (page - 1) * limit;
  const pageRows = rows.slice(skip, skip + limit);
  const byEmployee = [...byEmployeeMap.values()].sort((a, b) => b.count - a.count);
  const overTime = [...overTimeMap.values()].sort((a, b) => String(a.label).localeCompare(String(b.label)));

  // Cancellation rate vs all orders in range
  const allMatch = orderDateMatch(rid, dateFrom, dateTo);
  if (empId) allMatch.processedBy = empId;
  const allCount = await Order.countDocuments(allMatch);
  const cancellationRate = allCount > 0 ? r2((total / allCount) * 100) : 0;

  return {
    overview: {
      totalCancellations: total,
      cancelledAmount,
      cancellationRate,
      employeesWithCancellations: byEmployee.length,
    },
    rows: pageRows,
    byEmployee,
    charts: {
      cancellationsOverTime: overTime.map((row) => ({ label: row.label, value: row.count })),
      cancellationsByEmployee: byEmployee.map((row) => ({ label: row.name, value: row.count })),
      cancellationAmountByEmployee: byEmployee.map((row) => ({ label: row.name, value: row.amount })),
    },
    pagination: {
      page,
      limit,
      total,
      pages: Math.max(1, Math.ceil(total / limit) || 1),
    },
    filters: await loadFilterOptions(rid),
    meta: {
      dateFrom,
      dateTo,
      timezone: DEFAULT_RESTAURANT_TIMEZONE,
      role: role || null,
    },
  };
}
