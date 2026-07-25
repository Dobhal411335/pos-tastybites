import { withAuth } from "@/utils/auth";
import Order from "@/models/Order";
import Employee from "@/models/employee/Employee";
import { sendSuccess } from "@/utils/apiResponse";
import { sendError } from "@/utils/errorHandler";
import { logger } from "@/utils/logger";
import { generateStaffOrderNumber } from "@/utils/generateOrderNumber"; // use the standard order number generator

// POST - Create a new POS/Employee order
export const POST = withAuth(async (request) => {
  try {
    const data = await request.json();
    const { items, subTotal, taxTotal, discountTotal, discountCode, totalAmount, specialNote, tableNo, orderType, guestName } = data;

    if (!items || items.length === 0) {
      return sendError(new Error("Empty cart"), "Cart cannot be empty", 400);
    }

    // The user creating this order is the employee using the POS
    const employeeId = request.user.id;

    // Generate a unique order number for POS
    const orderNumber = generateStaffOrderNumber();

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
      tableNo: tableNo,
      guestName: guestName || null,
      status: "PENDING",
      source: "POS",
      processedBy: employeeId
    });

    logger.info(`POS Order created: ${orderNumber} for Table ${tableNo} by Employee ${employeeId}`);
    return sendSuccess(newOrder, "Order sent to kitchen successfully", 201);

  } catch (error) {
    logger.error("Failed to place POS order", error);
    return sendError(error, "Failed to place order", 500);
  }
}, ["EMPLOYEE", "MANAGER", "ADMIN"]); // Ensure Employee can access this

// GET - Get orders placed by the current employee
export const GET = withAuth(async (request) => {
  try {
    const employeeId = request.user.id;
    const restaurantId = request.restaurant;

    const orders = await Order.find({ restaurantId, processedBy: employeeId })
      .sort({ createdAt: -1 })
      .lean();

    return sendSuccess(orders, "Employee orders retrieved successfully");
  } catch (error) {
    logger.error("Failed to fetch employee orders", error);
    return sendError(error, "Failed to fetch orders", 500);
  }
}, ["EMPLOYEE", "MANAGER", "ADMIN"]);
