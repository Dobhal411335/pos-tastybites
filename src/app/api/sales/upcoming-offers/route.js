import { withAuth } from "@/utils/auth";
import { sendSuccess } from "@/utils/apiResponse";
import { sendError } from "@/utils/errorHandler";
import connectDB from "@/lib/db";
import Order from "@/models/Order";
import { todayBusinessDate } from "@/lib/eod/eodHelpers";
import {
  parsePickupFromSpecialNote,
  stripPickupPrefix,
} from "@/lib/public/pickup";
import { logger } from "@/utils/logger";

const STAFF_ROLES = [
  "EMPLOYEE",
  "MANAGER",
  "ADMIN",
  "SERVER",
  "BARTENDER",
  "STAFF",
];

const OPEN_STATUSES = ["PENDING", "CONFIRMED", "COMPLETED"];

function serializeUpcoming(order) {
  const pickup = parsePickupFromSpecialNote(order.specialNote);
  return {
    id: String(order._id),
    _id: order._id,
    orderNumber: order.orderNumber,
    status: order.status,
    paymentStatus: order.paymentStatus,
    source: order.source,
    partyName: order.partyName || order.guestName || "",
    contactNumber: order.contactNumber || "",
    guestEmail: order.guestEmail || null,
    offerFulfillmentDate: order.offerFulfillmentDate || null,
    pickup,
    specialNote: stripPickupPrefix(order.specialNote) || null,
    totalAmount: order.totalAmount,
    items: (order.items || []).map((item) => ({
      name: item.name,
      qty: item.qty,
      price: item.price,
      isOffer: Boolean(item.isOffer),
      inclusions: item.inclusions || [],
      choices: item.choices || [],
      drinks: item.drinks || [],
      notes: item.notes || "",
    })),
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
}

export const GET = withAuth(async (request) => {
  try {
    await connectDB();
    const restaurantId = request.restaurant;
    const { searchParams } = new URL(request.url);
    const today = todayBusinessDate();

    const baseQuery = {
      restaurantId,
      isActive: { $ne: false },
      source: "ONLINE",
      offerFulfillmentDate: { $gt: today },
    };

    if (searchParams.get("pendingCount") === "true") {
      // Count all open future-dated offer bookings (paid or unpaid).
      const pendingCount = await Order.countDocuments({
        ...baseQuery,
        status: { $in: OPEN_STATUSES },
      });
      return sendSuccess({ pendingCount }, "Upcoming offer count");
    }

    const rows = await Order.find(baseQuery)
      .sort({ offerFulfillmentDate: 1, createdAt: -1 })
      .limit(200)
      .lean();

    return sendSuccess(
      rows.map(serializeUpcoming),
      "Upcoming offer orders retrieved",
    );
  } catch (error) {
    logger.error("Failed to list upcoming offers", error);
    return sendError(error, "Failed to load upcoming offers", 500);
  }
}, STAFF_ROLES);
