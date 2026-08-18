const STATUS_LABELS = {
  ALL: "All statuses",
  PAID: "Paid",
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  WAIVED: "Waived",
};

const PAYMENT_LABELS = {
  ALL: "All methods",
  CASH: "Cash",
  CARD: "Card",
  GIFT_CARD: "Gift Card",
};

const STAFF_TAB_LABELS = {
  all: "All Staff",
  servers: "Servers",
  kitchen: "Kitchen",
};

export function staffGroup(role) {
  const value = String(role || "").toUpperCase();
  if (/CHEF|COOK|KITCHEN|PREP/.test(value)) return "kitchen";
  if (/SERVER|WAIT|BARTEND|HOST|STAFF|EMPLOYEE/.test(value)) return "servers";
  return "other";
}

export function filterPerformanceRows(performance, { search = "", staffTab = "all" } = {}) {
  const term = String(search || "").trim().toLowerCase();
  return (performance || []).filter((row) => {
    if (staffTab !== "all" && staffGroup(row.role) !== staffTab) return false;
    if (!term) return true;
    const haystack = `${row.name} ${row.role} ${row.employeeCode || ""}`.toLowerCase();
    return haystack.includes(term);
  });
}

export function buildFilterLabels({ meta, filters, staffTab, search }) {
  const shiftName =
    meta?.shiftId && filters?.shifts
      ? filters.shifts.find((shift) => shift.id === meta.shiftId)?.name || "Selected shift"
      : "All shifts";

  return {
    dateFrom: meta?.dateFrom || "",
    dateTo: meta?.dateTo || "",
    shiftLabel: shiftName,
    orderStatusLabel: STATUS_LABELS[meta?.orderStatus] || "All statuses",
    paymentLabel: PAYMENT_LABELS[meta?.paymentMethod] || "All methods",
    staffTabLabel: STAFF_TAB_LABELS[staffTab] || "All Staff",
    searchLabel: String(search || "").trim() || null,
    periodLabel: "Current filters",
    employeeName: null,
  };
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

export function resolveExportPeriod({
  period,
  dateFrom,
  dateTo,
  allTimeFrom,
  today,
}) {
  const p = String(period || "current").toLowerCase();
  if (p === "this_month") {
    const [y, m] = today.split("-");
    return {
      dateFrom: `${y}-${m}-01`,
      dateTo: today,
      period: p,
      periodLabel: "This month",
    };
  }
  if (p === "last_month") {
    const [y, m] = today.split("-").map(Number);
    const year = m === 1 ? y - 1 : y;
    const month = m === 1 ? 12 : m - 1;
    const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
    return {
      dateFrom: `${year}-${pad2(month)}-01`,
      dateTo: `${year}-${pad2(month)}-${pad2(lastDay)}`,
      period: p,
      periodLabel: "Last month",
    };
  }
  if (p === "all_time") {
    return {
      dateFrom: allTimeFrom || dateFrom,
      dateTo: today,
      period: p,
      periodLabel: "All time",
    };
  }
  return {
    dateFrom,
    dateTo,
    period: "current",
    periodLabel: "Current filters",
  };
}

function slugName(name) {
  const slug = String(name || "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return slug || "Staff";
}

export function employeeReportFilename(dateFrom, dateTo, ext, employeeName) {
  const from = dateFrom || "report";
  const to = dateTo || from;
  if (employeeName) {
    return `Employee-Report-${slugName(employeeName)}-${from}-to-${to}.${ext}`;
  }
  return `Employee-Staff-Report-${from}-to-${to}.${ext}`;
}
