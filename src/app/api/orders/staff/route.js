import { withAuth } from "@/utils/auth";
import Order from "@/models/Order";
import Employee from "@/models/employee/Employee";
import { sendSuccess } from "@/utils/apiResponse";
import { sendError } from "@/utils/errorHandler";
import { logger } from "@/utils/logger";

// POST - Create a new staff order
export const POST = withAuth(async (request) => {
  try {
    const data = await request.json();
    const { items, subTotal, taxTotal, discountTotal, discountCode, totalAmount, specialNote, staffId, orderNumber } = data;

    if (!items || items.length === 0) {
      return sendError(new Error("Empty cart"), "Cart cannot be empty", 400);
    }
    
    if (!staffId) {
      return sendError(new Error("Staff ID missing"), "Please select a staff member", 400);
    }

    const staffMember = await Employee.findById(staffId);
    if (!staffMember) {
      return sendError(new Error("Invalid Staff"), "Selected staff member not found", 404);
    }

    const newOrder = await Order.create({
      restaurantId: request.restaurant,
      orderNumber,
      items: items.map(item => ({
        menuItemId: item.id,
        name: item.name,
        size: item.size || "Standard",
        qty: item.qty,
        price: item.price,
        tax: item.tax || 0,
        options: item.options || []
      })),
      subTotal: Number(subTotal) || 0,
      taxTotal: Number(taxTotal) || 0,
      discountTotal: Number(discountTotal) || 0,
      discountCode: discountCode || null,
      totalAmount: Number(totalAmount) || 0,
      specialNote: specialNote,
      guestName: `${staffMember.firstName} ${staffMember.lastName} (Staff)`,
      status: "PENDING",
      source: "STAFF",
      processedBy: request.user.id
    });

    logger.info(`Staff Order created: ${orderNumber} for ${staffMember.firstName}`);
    return sendSuccess(newOrder, "Staff order placed successfully", 201);

  } catch (error) {
    logger.error("Failed to place staff order", error);
    return sendError(error, "Failed to place order", 500);
  }
}, ["ADMIN", "MANAGER"]);

// GET - List today's staff orders
export const GET = withAuth(async (request) => {
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const orders = await Order.find({
      restaurantId: request.restaurant,
      source: "STAFF",
      createdAt: { $gte: startOfToday }
    }).sort({ createdAt: -1 });

    return sendSuccess(orders, "Staff orders fetched successfully");
  } catch (error) {
    logger.error("Failed to fetch staff orders", error);
    return sendError(error, "Failed to fetch orders", 500);
  }
}, ["ADMIN", "MANAGER"]);
