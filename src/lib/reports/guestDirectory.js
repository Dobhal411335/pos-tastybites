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
} from "@/lib/eod/eodHelpers";

const GENERIC_NAMES = new Set([
  "",
  "walk-in",
  "walkin",
  "walk in",
  "guest",
  "walk-in guest",
]);

const PLACEHOLDER_NAME = /^(walk[\s-]*in|table)\b/i;

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
const ORDER_SCAN_LIMIT = 10000;

const LIST_SELECT = [
  "orderNumber",
  "createdAt",
  "partyName",
  "guestName",
  "contactNumber",
  "guestCountryCode",
  "guestEmail",
  "tableNo",
  "subTotal",
  "discountTotal",
  "taxTotal",
  "totalAmount",
  "paymentMethod",
  "cashAmount",
  "cardAmount",
  "giftcardCode",
  "giftcardUsedAmount",
  "tipAmount",
  "status",
  "paymentStatus",
  "guestCount",
  "source",
].join(" ");

const DETAIL_SELECT = `${LIST_SELECT} items.name items.qty`;

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

function isPlaceholderGuestName(name) {
  const value = normalizeName(name);
  if (!value || isGenericName(value)) return true;
  return PLACEHOLDER_NAME.test(value);
}

function orderGuestDisplayName(order) {
  return normalizeName(order.partyName || order.guestName);
}

export function isGuestDirectoryOrder(order) {
  if (String(order.source || "").toUpperCase() === "STAFF") return false;
  if (normalizeName(order.partyName) && isPlaceholderGuestName(order.partyName)) {
    return false;
  }
  const name = orderGuestDisplayName(order);
  return Boolean(name) && !isPlaceholderGuestName(name);
}

function normalizeEmail(email) {
  const value = String(email || "").trim().toLowerCase();
  if (!value || !value.includes("@")) return null;
  return value;
}

export function guestIdentity(order) {
  const phone = normalizePhone(order.contactNumber);
  const email = normalizeEmail(order.guestEmail);
  const name = orderGuestDisplayName(order);
  const realName = name && !isPlaceholderGuestName(name) ? name : null;

  if (phone) {
    return {
      guestKey: `phone:${phone}`,
      method: "phone",
      phone,
      countryCode: order.guestCountryCode || null,
      email,
      name: realName,
      identified: true,
    };
  }

  if (email) {
    return {
      guestKey: `email:${email}`,
      method: "email",
      phone: null,
      countryCode: order.guestCountryCode || null,
      email,
      name: realName,
      identified: true,
    };
  }

  if (realName) {
    return {
      guestKey: `name:${realName.toLowerCase()}`,
      method: "name",
      phone: null,
      countryCode: order.guestCountryCode || null,
      email,
      name: realName,
      identified: true,
    };
  }

  return {
    guestKey: `order:${String(order._id)}`,
    method: "unidentified",
    phone: null,
    countryCode: order.guestCountryCode || null,
    email,
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

function orderTenders(order) {
  if (order.paymentStatus !== "PAID") {
    return { cash: 0, card: 0, giftCard: 0, tip: 0 };
  }
  return resolveTenders(order);
}

function toHistoryRow(order, identity) {
  const items = itemSummary(order.items);
  const tenders = orderTenders(order);
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
    cash: tenders.cash,
    card: tenders.card,
    giftCard: tenders.giftCard,
    giftcardCode: order.giftcardCode || null,
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
    countryCode: identity.countryCode || null,
    email: identity.email || null,
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
    paymentMix: { cash: 0, card: 0, giftCard: 0 },
    giftCardsUsed: [],
  };
}

function laterIso(a, b) {
  if (!a) return b;
  if (!b) return a;
  return new Date(a) >= new Date(b) ? a : b;
}

function earlierIso(a, b) {
  if (!a) return b;
  if (!b) return a;
  return new Date(a) <= new Date(b) ? a : b;
}

function finalizeGuest(guest) {
  const visits = guest.visitDays.size;
  const aov = guest.paidOrders > 0 ? r2(guest.totalSpent / guest.paidOrders) : 0;
  return {
    guestKey: guest.guestKey,
    name: guest.name,
    phone: guest.phone,
    countryCode: guest.countryCode || null,
    email: guest.email || null,
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
    paymentMix: {
      cash: r2(guest.paymentMix.cash),
      card: r2(guest.paymentMix.card),
      giftCard: r2(guest.paymentMix.giftCard),
    },
    giftCardsUsed: guest.giftCardsUsed,
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

function summarizeUnidentified(guests) {
  if (guests.length === 0) {
    return {
      count: 0,
      orders: 0,
      paidOrders: 0,
      visits: 0,
      totalSpent: 0,
      lastVisit: null,
      guests: [],
    };
  }

  return {
    count: guests.length,
    orders: guests.reduce((sum, guest) => sum + guest.orders, 0),
    paidOrders: guests.reduce((sum, guest) => sum + guest.paidOrders, 0),
    visits: guests.reduce((sum, guest) => sum + guest.visits, 0),
    totalSpent: r2(guests.reduce((sum, guest) => sum + guest.totalSpent, 0)),
    lastVisit: guests.reduce((latest, guest) => laterIso(latest, guest.lastVisit), null),
    guests,
  };
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

function parseGuestKeyQuery(guestKey) {
  if (!guestKey || typeof guestKey !== "string") return null;
  if (guestKey.startsWith("phone:")) {
    return { type: "phone", value: guestKey.slice(6) };
  }
  if (guestKey.startsWith("email:")) {
    return { type: "email", value: guestKey.slice(6) };
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
  const match = { restaurantId, source: { $ne: "STAFF" } };
  if (parsed.type === "order" && mongoose.Types.ObjectId.isValid(parsed.value)) {
    match._id = new mongoose.Types.ObjectId(parsed.value);
    return match;
  }
  if (parsed.type === "phone") {
    const loose = parsed.value.split("").join("\\D*");
    match.contactNumber = { $regex: loose };
    return match;
  }
  if (parsed.type === "email") {
    match.guestEmail = new RegExp(`^${escapeRegex(parsed.value)}$`, "i");
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
  const dateFromRaw = searchParams.get("dateFrom");
  const dateToRaw = searchParams.get("dateTo");
  const dateFrom = isValidBusinessDate(dateFromRaw) ? dateFromRaw : null;
  const dateToValue = isValidBusinessDate(dateToRaw) ? dateToRaw : null;
  const dateTo =
    dateFrom && dateToValue && dateToValue < dateFrom ? dateFrom : dateToValue;

  const status = String(searchParams.get("orderStatus") || "ALL").toUpperCase();
  const orderStatus = status === "ALL" || !status
    ? "ALL"
    : ORDER_STATUSES.includes(status)
      ? status
      : "ALL";

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

function accumulateGuest(guestMap, order, identity) {
  if (!guestMap.has(identity.guestKey)) {
    guestMap.set(identity.guestKey, emptyGuest(identity));
  }
  const guest = guestMap.get(identity.guestKey);
  if (identity.name && identity.name !== "Walk-in") guest.name = identity.name;
  if (identity.phone) guest.phone = identity.phone;
  if (identity.countryCode) guest.countryCode = identity.countryCode;
  if (identity.email) guest.email = identity.email;

  guest.orders += 1;
  const createdAt = order.createdAt ? new Date(order.createdAt) : null;
  if (createdAt) {
    const iso = createdAt.toISOString();
    guest.firstVisit = earlierIso(guest.firstVisit, iso);
    guest.lastVisit = laterIso(guest.lastVisit, iso);
    const dayKey = restaurantDayKey(createdAt);
    if (dayKey) guest.visitDays.add(dayKey);
  }

  if (!isRevenueOrder(order)) return;

  const tenders = resolveTenders(order);
  guest.paidOrders += 1;
  guest.subtotal += Number(order.subTotal) || 0;
  guest.discount += Number(order.discountTotal) || 0;
  guest.tax += Number(order.taxTotal) || 0;
  guest.totalSpent += Number(order.totalAmount) || 0;
  guest.discountUsed += Number(order.discountTotal) || 0;
  guest.paymentMix.cash += tenders.cash;
  guest.paymentMix.card += tenders.card;
  guest.paymentMix.giftCard += tenders.giftCard;

  if (tenders.giftCard > 0 || order.giftcardCode) {
    guest.giftCardsUsed.push({
      code: order.giftcardCode || null,
      amount: r2(tenders.giftCard),
      orderId: String(order._id),
      orderNumber: order.orderNumber,
      createdAt: order.createdAt,
    });
  }
}

export async function buildGuestDirectoryReport({
  restaurantId,
  dateFrom = null,
  dateTo = null,
  search = "",
  paymentMethod = "ALL",
  orderStatus = "ALL",
  guestKey = null,
  sort = "revenue",
}) {
  const rid = mongoose.Types.ObjectId.isValid(restaurantId)
    ? new mongoose.Types.ObjectId(restaurantId)
    : restaurantId;

  const parsedKey = parseGuestKeyQuery(guestKey);
  let match = {
    restaurantId: rid,
    source: { $ne: "STAFF" },
  };

  if (parsedKey) {
    const keyMatch = guestKeyMongoFilter(parsedKey, rid);
    if (!keyMatch) {
      return emptyPayload(dateFrom, dateTo);
    }
    match = keyMatch;
  } else {
    if (dateFrom && dateTo) {
      const { start } = businessDateBounds(dateFrom);
      const { end } = businessDateBounds(dateTo);
      match.createdAt = { $gte: start, $lt: end };
    }
    if (orderStatus !== "ALL") {
      match.status = orderStatus;
    }
  }

  const docs = await Order.find(match)
    .select(parsedKey ? DETAIL_SELECT : LIST_SELECT)
    .sort({ createdAt: -1 })
    .limit(ORDER_SCAN_LIMIT)
    .lean();

  const truncated = docs.length >= ORDER_SCAN_LIMIT;

  const filtered = docs.filter((order) => {
    if (!isGuestDirectoryOrder(order)) return false;
    const identity = guestIdentity(order);
    if (!identity.identified) return false;
    if (guestKey && identity.guestKey !== guestKey) return false;
    if (!matchesPaymentMethod(order, paymentMethod)) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    const digits = q.replace(/\D/g, "");
    return (
      String(identity.name || "").toLowerCase().includes(q) ||
      String(identity.email || "").toLowerCase().includes(q) ||
      (digits.length >= 3 && String(identity.phone || "").includes(digits)) ||
      String(order.contactNumber || "").toLowerCase().includes(q) ||
      String(order.guestEmail || "").toLowerCase().includes(q) ||
      String(order.orderNumber || "").toLowerCase().includes(q)
    );
  });

  const guestMap = new Map();
  const history = [];

  for (const order of filtered) {
    const identity = guestIdentity(order);
    if (parsedKey) {
      history.push(toHistoryRow(order, identity));
    }
    accumulateGuest(guestMap, order, identity);
  }

  const allGuests = sortGuests(
    [...guestMap.values()].map(finalizeGuest),
    sort
  );
  const identified = allGuests.filter((guest) => guest.identified);
  const unidentified = summarizeUnidentified([]);

  const paidOrders = filtered.filter(isRevenueOrder).length;
  const totalRevenue = r2(
    allGuests.reduce((sum, guest) => sum + guest.totalSpent, 0)
  );
  const repeat = repeatSplit(identified);

  const avgGuestSpend =
    identified.length > 0 ? r2(totalRevenue / identified.length) : 0;
  const returningPercent =
    identified.length > 0
      ? Math.round((repeat.repeat / identified.length) * 100)
      : 0;

  const charts = parsedKey
    ? guestChartsFromSeries(buildGuestTimeSeries(filtered))
    : { topGuests: [] };

  return {
    guests: identified,
    unidentified,
    history,
    mostOrderedItems: parsedKey ? buildMostOrderedItems(filtered) : [],
    charts,
    meta: {
      identifiedGuests: identified.length,
      unidentifiedGuests: unidentified.count,
      unidentifiedOrders: unidentified.orders,
      paidOrders,
      totalOrders: filtered.length,
      totalRevenue,
      avgGuestSpend,
      repeatGuests: repeat.repeat,
      oneTimeGuests: repeat.oneTime,
      returningPercent,
      dateFrom: dateFrom || null,
      dateTo: dateTo || null,
      guestKey: guestKey || null,
      truncated,
      scannedOrders: docs.length,
    },
  };
}

function repeatSplit(guests) {
  return {
    oneTime: guests.filter((guest) => guest.paidOrders <= 1).length,
    repeat: guests.filter((guest) => guest.paidOrders >= 2).length,
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

function buildMostOrderedItems(orders, limit = 5) {
  const counts = new Map();
  for (const order of orders) {
    for (const item of order.items || []) {
      const name = String(item?.name || "").trim();
      if (!name) continue;
      counts.set(name, (counts.get(name) || 0) + (Number(item.qty) || 0));
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([name, qty]) => ({ name, qty }));
}

function emptyPayload(dateFrom, dateTo) {
  return {
    guests: [],
    unidentified: {
      count: 0,
      orders: 0,
      paidOrders: 0,
      visits: 0,
      totalSpent: 0,
      lastVisit: null,
      guests: [],
    },
    history: [],
    mostOrderedItems: [],
    charts: { topGuests: [] },
    meta: {
      identifiedGuests: 0,
      unidentifiedGuests: 0,
      unidentifiedOrders: 0,
      paidOrders: 0,
      totalOrders: 0,
      totalRevenue: 0,
      avgGuestSpend: 0,
      repeatGuests: 0,
      oneTimeGuests: 0,
      returningPercent: 0,
      dateFrom: dateFrom || null,
      dateTo: dateTo || null,
      guestKey: null,
      truncated: false,
      scannedOrders: 0,
    },
  };
}
