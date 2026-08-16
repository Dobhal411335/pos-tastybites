import mongoose from "mongoose";
import Order from "@/models/Order";
import {
  DEFAULT_RESTAURANT_TIMEZONE,
  restaurantCalendarDate,
} from "@/lib/restaurantTime";
import {
  businessDateBounds,
  isCashPaymentMethod,
  isValidBusinessDate,
  normalizePaymentTypeLabel,
  r2,
  resolveTenders,
  todayBusinessDate,
} from "@/lib/eod/eodHelpers";

const GENERIC_NAMES = new Set([
  "",
  "walk-in",
  "walkin",
  "walk in",
  "guest",
  "walk-in guest",
]);

const ORDER_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "COMPLETED",
  "PAID",
  "CANCELLED",
  "WAIVED",
];

const PAYMENT_FILTERS = ["CASH", "CARD", "GIFT_CARD"];
const SORT_OPTIONS = ["revenue", "visits", "orders", "recent"];

const ORDER_SELECT = [
  "orderNumber",
  "createdAt",
  "partyName",
  "guestName",
  "contactNumber",
  "tableNo",
  "items.name",
  "items.qty",
  "subTotal",
  "discountTotal",
  "taxTotal",
  "totalAmount",
  "paymentMethod",
  "cashAmount",
  "cardAmount",
  "giftcardUsedAmount",
  "tipAmount",
  "status",
  "paymentStatus",
  "guestCount",
].join(" ");

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizePhone(phone) {
  if (!phone) return null;
  const digits = String(phone).replace(/\D/g, "");
  if (digits.length < 7) return null;
  return digits;
}

function normalizeName(name) {
  return String(name || "").trim().replace(/\s+/g, " ");
}

function isGenericName(name) {
  return GENERIC_NAMES.has(normalizeName(name).toLowerCase());
}

export function guestIdentity(order) {
  const phone = normalizePhone(order.contactNumber);
  const name = normalizeName(order.partyName || order.guestName);

  if (phone) {
    return {
      guestKey: `phone:${phone}`,
      method: "phone",
      phone,
      name: name || null,
      identified: true,
    };
  }

  if (name && !isGenericName(name)) {
    return {
      guestKey: `name:${name.toLowerCase()}`,
      method: "name",
      phone: null,
      name,
      identified: true,
    };
  }

  return {
    guestKey: `order:${String(order._id)}`,
    method: "unidentified",
    phone: null,
    name: name || "Walk-in",
    identified: false,
  };
}

export function isRevenueOrder(order) {
  return (
    order.paymentStatus === "PAID" &&
    order.status !== "CANCELLED" &&
    order.status !== "WAIVED" &&
    order.paymentStatus !== "REFUNDED" &&
    order.paymentStatus !== "PARTIAL"
  );
}

export function matchesPaymentMethod(order, filter) {
  if (!filter || filter === "ALL") return true;

  const method = String(order.paymentMethod || "");
  const gc = Number(order.giftcardUsedAmount) || 0;

  if (order.paymentStatus === "PAID") {
    const tenders = resolveTenders(order);
    if (filter === "CASH") return tenders.cash > 0;
    if (filter === "CARD") return tenders.card > 0;
    if (filter === "GIFT_CARD") return tenders.giftCard > 0 || gc > 0;
    return true;
  }

  if (filter === "CASH") return isCashPaymentMethod(method);
  if (filter === "CARD") return /card/i.test(method);
  if (filter === "GIFT_CARD") return /gift\s*card/i.test(method) || gc > 0;
  return false;
}

function restaurantDayKey(date, timeZone = DEFAULT_RESTAURANT_TIMEZONE) {
  if (!date) return null;
  return restaurantCalendarDate(new Date(date), timeZone)
    .toISOString()
    .slice(0, 10);
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
  return normalizePaymentTypeLabel(
    order.paymentMethod,
    order.giftcardUsedAmount
  );
}

function toHistoryRow(order, identity) {
  const items = itemSummary(order.items);
  return {
    orderId: String(order._id),
    orderNumber: order.orderNumber,
    createdAt: order.createdAt,
    guestKey: identity.guestKey,
    guestName: identity.name || "Walk-in",
    phone: identity.phone,
    tableNo: order.tableNo || "—",
    guestCount: order.guestCount ?? null,
    itemCount: items.itemCount,
    itemSummary: items.itemSummary,
    subTotal: r2(order.subTotal),
    discountTotal: r2(order.discountTotal),
    taxTotal: r2(order.taxTotal),
    totalAmount: r2(order.totalAmount),
    paymentMethod: order.paymentMethod || null,
    paymentLabel: paymentLabel(order),
    status: order.status,
    paymentStatus: order.paymentStatus,
    countsTowardRevenue: isRevenueOrder(order),
  };
}

function emptyGuest(identity) {
  return {
    guestKey: identity.guestKey,
    name: identity.name || "Walk-in",
    phone: identity.phone,
    email: null,
    identified: identity.identified,
    visitDays: new Set(),
    orders: 0,
    paidOrders: 0,
    firstVisit: null,
    lastVisit: null,
    subtotal: 0,
    discount: 0,
    tax: 0,
    totalSpent: 0,
    discountUsed: 0,
  };
}

function finalizeGuest(guest) {
  const visits = guest.visitDays.size;
  const aov = guest.paidOrders > 0 ? r2(guest.totalSpent / guest.paidOrders) : 0;
  return {
    guestKey: guest.guestKey,
    name: guest.name,
    phone: guest.phone,
    email: null,
    identified: guest.identified,
    visits,
    orders: guest.orders,
    paidOrders: guest.paidOrders,
    firstVisit: guest.firstVisit,
    lastVisit: guest.lastVisit,
    subtotal: r2(guest.subtotal),
    discount: r2(guest.discount),
    tax: r2(guest.tax),
    totalSpent: r2(guest.totalSpent),
    aov,
    discountUsed: r2(guest.discountUsed),
  };
}

function sortGuests(guests, sort) {
  const copy = [...guests];
  if (sort === "visits") {
    copy.sort(
      (a, b) => b.visits - a.visits || b.totalSpent - a.totalSpent || a.name.localeCompare(b.name)
    );
  } else if (sort === "orders") {
    copy.sort(
      (a, b) => b.orders - a.orders || b.totalSpent - a.totalSpent || a.name.localeCompare(b.name)
    );
  } else if (sort === "recent") {
    copy.sort((a, b) => {
      const aTime = a.lastVisit ? new Date(a.lastVisit).getTime() : 0;
      const bTime = b.lastVisit ? new Date(b.lastVisit).getTime() : 0;
      return bTime - aTime || b.totalSpent - a.totalSpent;
    });
  } else {
    copy.sort(
      (a, b) => b.totalSpent - a.totalSpent || b.orders - a.orders || a.name.localeCompare(b.name)
    );
  }
  return copy;
}

function dayCountInclusive(dateFrom, dateTo) {
  const start = new Date(`${dateFrom}T00:00:00Z`);
  const end = new Date(`${dateTo}T00:00:00Z`);
  return Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
}

function buildRevenueOverTime(orders, dateFrom, dateTo) {
  const paid = orders.filter(isRevenueOrder);
  const days = dayCountInclusive(dateFrom, dateTo);

  if (days <= 1) {
    const buckets = new Map();
    for (const order of paid) {
      const hour = restaurantHour(order.createdAt);
      const prev = buckets.get(hour) || 0;
      buckets.set(hour, r2(prev + (Number(order.totalAmount) || 0)));
    }
    const hours = [...buckets.keys()].sort((a, b) => a - b);
    const startHour = hours.length ? Math.min(hours[0], 8) : 8;
    const endHour = hours.length ? Math.max(hours[hours.length - 1], 20) : 20;
    const series = [];
    for (let hour = startHour; hour <= endHour; hour += 1) {
      const suffix = hour >= 12 ? "PM" : "AM";
      const display = hour % 12 === 0 ? 12 : hour % 12;
      series.push({
        label: `${display}${suffix}`,
        revenue: buckets.get(hour) || 0,
      });
    }
    return series;
  }

  if (days <= 60) {
    const buckets = new Map();
    for (const order of paid) {
      const key = restaurantDayKey(order.createdAt);
      if (!key) continue;
      buckets.set(key, r2((buckets.get(key) || 0) + (Number(order.totalAmount) || 0)));
    }
    const series = [];
    const cursor = new Date(`${dateFrom}T12:00:00Z`);
    const last = new Date(`${dateTo}T12:00:00Z`);
    while (cursor <= last) {
      const key = cursor.toISOString().slice(0, 10);
      series.push({ label: key.slice(5), revenue: buckets.get(key) || 0 });
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    return series;
  }

  const buckets = new Map();
  for (const order of paid) {
    const key = restaurantMonthKey(order.createdAt);
    buckets.set(key, r2((buckets.get(key) || 0) + (Number(order.totalAmount) || 0)));
  }
  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, revenue]) => ({ label, revenue }));
}

function buildGuestTimeSeries(orders) {
  const paid = [...orders].filter(isRevenueOrder).sort(
    (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
  );
  const byDay = new Map();
  for (const order of paid) {
    const key = restaurantDayKey(order.createdAt);
    if (!key) continue;
    const prev = byDay.get(key) || { revenue: 0, orders: 0 };
    prev.revenue = r2(prev.revenue + (Number(order.totalAmount) || 0));
    prev.orders += 1;
    byDay.set(key, prev);
  }
  return [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, row]) => ({
      label,
      revenue: row.revenue,
      orders: row.orders,
      aov: row.orders > 0 ? r2(row.revenue / row.orders) : 0,
    }));
}

function spendingBuckets(guests) {
  const identified = guests.filter((guest) => guest.identified && guest.totalSpent > 0);
  const ranges = [
    { label: "Under $25", min: 0, max: 25 },
    { label: "$25–50", min: 25, max: 50 },
    { label: "$50–100", min: 50, max: 100 },
    { label: "$100–250", min: 100, max: 250 },
    { label: "$250+", min: 250, max: Infinity },
  ];
  return ranges.map((range) => ({
    label: range.label,
    guests: identified.filter(
      (guest) => guest.totalSpent >= range.min && guest.totalSpent < range.max
    ).length,
  }));
}

function parseGuestKeyQuery(guestKey) {
  if (!guestKey || typeof guestKey !== "string") return null;
  if (guestKey.startsWith("phone:")) {
    return { type: "phone", value: guestKey.slice(6) };
  }
  if (guestKey.startsWith("name:")) {
    return { type: "name", value: guestKey.slice(5) };
  }
  if (guestKey.startsWith("order:")) {
    return { type: "order", value: guestKey.slice(6) };
  }
  return null;
}

function guestKeyMongoFilter(parsed, restaurantId) {
  const match = { restaurantId };
  if (parsed.type === "order" && mongoose.Types.ObjectId.isValid(parsed.value)) {
    match._id = new mongoose.Types.ObjectId(parsed.value);
    return match;
  }
  if (parsed.type === "phone") {
    const loose = parsed.value.split("").join("\\D*");
    match.contactNumber = { $regex: loose };
    return match;
  }
  if (parsed.type === "name") {
    const exact = new RegExp(`^${escapeRegex(parsed.value)}$`, "i");
    match.$or = [{ partyName: exact }, { guestName: exact }];
    return match;
  }
  return null;
}

export function parseGuestReportQuery(searchParams) {
  const today = todayBusinessDate();
  const dateFrom = isValidBusinessDate(searchParams.get("dateFrom"))
    ? searchParams.get("dateFrom")
    : today;
  const dateToRaw = isValidBusinessDate(searchParams.get("dateTo"))
    ? searchParams.get("dateTo")
    : today;
  const dateTo = dateToRaw < dateFrom ? dateFrom : dateToRaw;

  const status = String(searchParams.get("orderStatus") || "PAID").toUpperCase();
  const orderStatus = status === "ALL" || !status
    ? "ALL"
    : ORDER_STATUSES.includes(status)
      ? status
      : "PAID";

  const paymentRaw = String(searchParams.get("paymentMethod") || "ALL").toUpperCase();
  const paymentMethod = PAYMENT_FILTERS.includes(paymentRaw) ? paymentRaw : "ALL";

  const sortRaw = String(searchParams.get("sort") || "revenue").toLowerCase();
  const sort = SORT_OPTIONS.includes(sortRaw) ? sortRaw : "revenue";

  return {
    dateFrom,
    dateTo,
    search: String(searchParams.get("search") || "").trim(),
    paymentMethod,
    orderStatus,
    guestKey: String(searchParams.get("guestKey") || "").trim() || null,
    sort,
  };
}

export async function buildGuestDirectoryReport({
  restaurantId,
  dateFrom,
  dateTo,
  search = "",
  paymentMethod = "ALL",
  orderStatus = "PAID",
  guestKey = null,
  sort = "revenue",
}) {
  const rid = mongoose.Types.ObjectId.isValid(restaurantId)
    ? new mongoose.Types.ObjectId(restaurantId)
    : restaurantId;

  const parsedKey = parseGuestKeyQuery(guestKey);
  let match = { restaurantId: rid };

  if (parsedKey) {
    const keyMatch = guestKeyMongoFilter(parsedKey, rid);
    if (!keyMatch) {
      return emptyPayload(dateFrom, dateTo);
    }
    match = keyMatch;
  } else {
    const { start } = businessDateBounds(dateFrom);
    const { end } = businessDateBounds(dateTo);
    match.createdAt = { $gte: start, $lt: end };
    if (orderStatus !== "ALL") {
      match.status = orderStatus;
    }
  }

  const docs = await Order.find(match)
    .select(ORDER_SELECT)
    .sort({ createdAt: -1 })
    .limit(10000)
    .lean();

  const filtered = docs.filter((order) => {
    const identity = guestIdentity(order);
    if (guestKey && identity.guestKey !== guestKey) return false;
    if (!matchesPaymentMethod(order, paymentMethod)) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    const digits = q.replace(/\D/g, "");
    return (
      String(identity.name || "").toLowerCase().includes(q) ||
      (digits.length >= 3 && String(identity.phone || "").includes(digits)) ||
      String(order.contactNumber || "").toLowerCase().includes(q) ||
      String(order.orderNumber || "").toLowerCase().includes(q)
    );
  });

  const guestMap = new Map();
  const history = [];

  for (const order of filtered) {
    const identity = guestIdentity(order);
    history.push(toHistoryRow(order, identity));

    if (!guestMap.has(identity.guestKey)) {
      guestMap.set(identity.guestKey, emptyGuest(identity));
    }
    const guest = guestMap.get(identity.guestKey);
    if (identity.name && identity.name !== "Walk-in") guest.name = identity.name;
    if (identity.phone) guest.phone = identity.phone;

    guest.orders += 1;
    const createdAt = order.createdAt ? new Date(order.createdAt) : null;
    if (createdAt) {
      if (!guest.firstVisit || createdAt < new Date(guest.firstVisit)) {
        guest.firstVisit = createdAt.toISOString();
      }
      if (!guest.lastVisit || createdAt > new Date(guest.lastVisit)) {
        guest.lastVisit = createdAt.toISOString();
      }
      const dayKey = restaurantDayKey(createdAt);
      if (dayKey) guest.visitDays.add(dayKey);
    }

    if (isRevenueOrder(order)) {
      guest.paidOrders += 1;
      guest.subtotal += Number(order.subTotal) || 0;
      guest.discount += Number(order.discountTotal) || 0;
      guest.tax += Number(order.taxTotal) || 0;
      guest.totalSpent += Number(order.totalAmount) || 0;
      guest.discountUsed += Number(order.discountTotal) || 0;
    }
  }

  const guests = sortGuests(
    [...guestMap.values()].map(finalizeGuest),
    sort
  );

  const identifiedGuests = guests.filter((guest) => guest.identified).length;
  const unidentifiedOrders = history.filter((row) =>
    row.guestKey.startsWith("order:")
  ).length;
  const paidOrders = history.filter((row) => row.countsTowardRevenue).length;

  const charts = parsedKey
    ? guestChartsFromSeries(buildGuestTimeSeries(filtered))
    : {
        revenueOverTime: buildRevenueOverTime(filtered, dateFrom, dateTo),
        topGuests: guests
          .filter((guest) => guest.totalSpent > 0)
          .slice(0, 10)
          .map((guest) => ({
            label: guest.name,
            guestKey: guest.guestKey,
            revenue: guest.totalSpent,
            orders: guest.paidOrders,
          })),
        spendingDistribution: spendingBuckets(guests),
        repeatVsOneTime: repeatSplit(guests),
      };

  return {
    guests,
    history,
    charts,
    meta: {
      identifiedGuests,
      unidentifiedOrders,
      paidOrders,
      dateFrom,
      dateTo,
      guestKey: guestKey || null,
    },
  };
}

function repeatSplit(guests) {
  const identified = guests.filter((guest) => guest.identified);
  return {
    oneTime: identified.filter((guest) => guest.paidOrders <= 1).length,
    repeat: identified.filter((guest) => guest.paidOrders >= 2).length,
  };
}

function guestChartsFromSeries(series) {
  return {
    revenueOverTime: series.map((row) => ({
      label: row.label,
      revenue: row.revenue,
    })),
    ordersOverTime: series.map((row) => ({
      label: row.label,
      orders: row.orders,
    })),
    aovOverTime: series.map((row) => ({
      label: row.label,
      aov: row.aov,
    })),
  };
}

function emptyPayload(dateFrom, dateTo) {
  return {
    guests: [],
    history: [],
    charts: {
      revenueOverTime: [],
      topGuests: [],
      spendingDistribution: [],
      repeatVsOneTime: { oneTime: 0, repeat: 0 },
    },
    meta: {
      identifiedGuests: 0,
      unidentifiedOrders: 0,
      paidOrders: 0,
      dateFrom,
      dateTo,
      guestKey: null,
    },
  };
}
