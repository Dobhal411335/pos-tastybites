import mongoose from "mongoose";
import { withAuth } from "@/utils/auth";
import Order from "@/models/Order";
import Employee from "@/models/employee/Employee";
import Restaurant from "@/models/Restaurant";
import { sendSuccess } from "@/utils/apiResponse";
import { sendError } from "@/utils/errorHandler";
import { logger } from "@/utils/logger";

function formatPersonName(person) {
  if (!person) return null;
  return (
    person.name ||
    [person.firstName, person.lastName].filter(Boolean).join(" ") ||
    null
  );
}

// GET - Fetch a single order by MongoDB id or orderNumber (for receipts / history)
export const GET = withAuth(async (request, { params }) => {
  try {
    const { id } = await params;
    if (!id) {
      return sendError(new Error("Missing ID"), "Order ID is required", 400);
    }

    const restaurantId = request.restaurant;
    const query = { restaurantId };

    if (mongoose.Types.ObjectId.isValid(id) && String(new mongoose.Types.ObjectId(id)) === String(id)) {
      query._id = id;
    } else {
      query.orderNumber = String(id);
    }

    const order = await Order.findOne(query).lean();
    if (!order) {
      return sendError(new Error("Not Found"), "Order not found", 404);
    }

    let processedByName = null;
    if (order.processedBy) {
      const emp = await Employee.findById(order.processedBy)
        .select("firstName lastName name")
        .lean();
      processedByName = formatPersonName(emp);
    }

    const restaurant = await Restaurant.findById(restaurantId)
      .select("name phone address")
      .lean();

    return sendSuccess(
      {
        ...order,
        processedByName,
        restaurantDetails: restaurant
          ? {
              name: restaurant.name,
              phone: restaurant.phone,
              address: restaurant.address,
            }
          : null,
      },
      "Order fetched successfully"
    );
  } catch (error) {
    logger.error(`Failed to fetch order ${params?.id}`, error);
    return sendError(error, "Failed to fetch order", 500);
  }
}, ["ADMIN", "MANAGER", "STAFF"]);
