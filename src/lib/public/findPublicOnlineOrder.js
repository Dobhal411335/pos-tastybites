import connectDB from "@/lib/db";
import Order from "@/models/Order";

/**
 * Resolve an online order by ticket number for the public tracker.
 * Accepts "32", "0032", "#0032".
 */
export function normalizePublicOrderTicket(raw) {
  return String(raw || "")
    .trim()
    .replace(/^#/, "")
    .trim();
}

export function publicOrderNumberCandidates(raw) {
  const ticket = normalizePublicOrderTicket(raw);
  if (!ticket) return [];

  const candidates = new Set([ticket]);
  if (/^\d+$/.test(ticket)) {
    candidates.add(ticket.padStart(4, "0"));
    const stripped = ticket.replace(/^0+/, "");
    if (stripped) candidates.add(stripped);
  }
  return [...candidates];
}

export async function findPublicOnlineOrder({ restaurantId, orderNumber }) {
  const candidates = publicOrderNumberCandidates(orderNumber);
  if (!restaurantId || !candidates.length) return null;

  await connectDB();

  return Order.findOne({
    restaurantId,
    orderNumber: { $in: candidates },
    source: "ONLINE",
    isActive: { $ne: false },
  }).lean();
}
