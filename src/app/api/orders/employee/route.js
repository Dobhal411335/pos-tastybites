import { withAuth } from "@/utils/auth";
import Order from "@/models/Order";
import Employee from "@/models/employee/Employee";
import TableSession from "@/models/floor/TableSession";
import { sendSuccess } from "@/utils/apiResponse";
import { sendError } from "@/utils/errorHandler";
import { logger } from "@/utils/logger";
import { getNextOrderNumber } from "@/utils/generateOrderNumber"; 
import OperationalAuditLog from "@/models/OperationalAuditLog";

// POST - Create or Update a POS/Employee order
export const POST = withAuth(async (request) => {
  try {
    const data = await request.json();
    const { items, subTotal, taxTotal, discountTotal, discountCode, totalAmount, specialNote, sessionId, guestName, orderType } = data;

    if (!items || items.length === 0) {
      return sendError(new Error("Empty cart"), "Cart cannot be empty", 400);
    }

    const employeeId = request.user.id;

    // Map items
    const formattedItems = items.map(item => ({
      menuItemId: item.id,
      name: item.name,
      category: item.category || "ITEMS",
      size: item.size || "Standard",
      qty: item.qty,
      price: item.price,
      tax: item.tax || 0,
      options: item.options || [],
      cartId: item.cartId || String(Date.now() + Math.random())
    }));

    // If no sessionId is provided, fallback to legacy behavior
    if (!sessionId) {
      const orderNumber = await getNextOrderNumber(request.restaurant);
      const newOrder = await Order.create({
        restaurantId: request.restaurant,
        orderNumber,
        items: formattedItems.map(item => ({ ...item, sentQty: item.qty })),
        subTotal: Number(subTotal) || 0,
        taxTotal: Number(taxTotal) || 0,
        discountTotal: Number(discountTotal) || 0,
        discountCode: discountCode || null,
        totalAmount: Number(totalAmount) || 0,
        specialNote: specialNote,
        tableNo: data.tableNo, // Legacy table string
        guestName: guestName || null,
        status: "PENDING",
        source: "POS",
        processedBy: employeeId
      });

      const kotPayload = formattedItems;

      logger.info(`Legacy POS Order created: ${orderNumber} by Employee ${employeeId}`);
      return sendSuccess({ ...newOrder.toObject(), kotPayload }, "Order sent to kitchen successfully", 201);
    }

    // Session-based Ordering
    const session = await TableSession.findById(sessionId).populate("primaryTable");
    if (!session || !session.isSessionOpen) {
      return sendError(new Error("Invalid Session"), "Table session is invalid or closed", 400);
    }

    // Check for existing active order in this session
    let order = await Order.findOne({
      tableSession: sessionId,
      status: { $in: ["PENDING", "CONFIRMED"] }
    });

    if (order) {
      // Calculate KOT Payload for Continue Order
      const kotPayload = [];
      
      const finalItems = formattedItems.map(incomingItem => {
        const existingItem = order.items.find(i => i.cartId === incomingItem.cartId || (i.menuItemId === incomingItem.menuItemId && JSON.stringify(i.options) === JSON.stringify(incomingItem.options) && i.size === incomingItem.size));
        const sentQty = existingItem ? (existingItem.sentQty || 0) : 0;
        const unprintedQty = incomingItem.qty - sentQty;
        
        if (unprintedQty > 0) {
          kotPayload.push({ ...incomingItem, qty: unprintedQty });
        }
        
        return { ...incomingItem, sentQty: incomingItem.qty };
      });

      // Continue Order: Update the existing draft
      order.items = finalItems;
      order.subTotal = Number(subTotal) || 0;
      order.taxTotal = Number(taxTotal) || 0;
      order.discountTotal = Number(discountTotal) || 0;
      order.discountCode = discountCode || null;
      order.totalAmount = Number(totalAmount) || 0;
      order.specialNote = specialNote;
      await order.save();
      
      if (global.io) global.io.to(`floor:${session.floor}`).emit('order:updated', { orderId: order._id, sessionId });

      // Audit Log
      await OperationalAuditLog.create({
        restaurantId: request.restaurant,
        actorId: request.user.id,
        actorType: request.user.role === 'Admin' || request.user.role === 'Super Admin' || request.user.role === 'Manager' ? 'Admin' : 'Employee',
        actorName: request.user.name || request.user.firstName,
        action: 'ORDER_UPDATED',
        floorId: session.floor,
        tableId: session.primaryTable._id,
        tableSessionId: sessionId,
        orderId: order._id
      });

      logger.info(`POS Order updated: ${order.orderNumber} for Session ${sessionId} by Employee ${employeeId}`);
      return sendSuccess({ ...order.toObject(), kotPayload }, "Order updated successfully", 200);
    } else {
      // Create New Order
      const orderNumber = await getNextOrderNumber(request.restaurant);
      const newOrder = await Order.create({
        restaurantId: request.restaurant,
        orderNumber,
        items: formattedItems.map(item => ({ ...item, sentQty: item.qty })),
        subTotal: Number(subTotal) || 0,
        taxTotal: Number(taxTotal) || 0,
        discountTotal: Number(discountTotal) || 0,
        discountCode: discountCode || null,
        totalAmount: Number(totalAmount) || 0,
        specialNote: specialNote,
        
        // Session links
        tableSession: sessionId,
        table: session.primaryTable._id,
        floor: session.floor,
        tableNo: session.primaryTable.tableNumber, // For legacy compatibility
        guestName: guestName || null,
        
        status: "PENDING",
        source: "POS",
        processedBy: employeeId
      });

      // Push to session
      session.activeOrders.push(newOrder._id);
      await session.save();

      if (global.io) global.io.to(`floor:${session.floor}`).emit('order:created', { orderId: newOrder._id, sessionId });

      // Audit Log
      await OperationalAuditLog.create({
        restaurantId: request.restaurant,
        actorId: request.user.id,
        actorType: request.user.role === 'Admin' || request.user.role === 'Super Admin' || request.user.role === 'Manager' ? 'Admin' : 'Employee',
        actorName: request.user.name || request.user.firstName,
        action: 'ORDER_CREATED',
        floorId: session.floor,
        tableId: session.primaryTable._id,
        tableSessionId: sessionId,
        orderId: newOrder._id
      });

      const kotPayload = formattedItems;

      logger.info(`POS Order created: ${orderNumber} for Session ${sessionId} by Employee ${employeeId}`);
      return sendSuccess({ ...newOrder.toObject(), kotPayload }, "Order sent to kitchen successfully", 201);
    }

  } catch (error) {
    logger.error("Failed to process POS order", error);
    return sendError(error, "Failed to process order", 500);
  }
}, ["EMPLOYEE", "MANAGER", "ADMIN", "SERVER", "BARTENDER"]);

// GET - Get orders placed by the current employee or for a specific session
export const GET = withAuth(async (request) => {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");
    const today = searchParams.get("today");
    
    if (sessionId) {
      // Fetch the active order for this session to load the cart
      const order = await Order.findOne({
        tableSession: sessionId,
        status: { $in: ["PENDING", "CONFIRMED"] }
      }).lean();
      
      return sendSuccess(order, "Session order retrieved");
    }

    // Default: Get recent employee orders
    const employeeId = request.user.id;
    const restaurantId = request.restaurant;
    
    let query = { restaurantId, processedBy: employeeId };
    
    if (today === "true") {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      query.createdAt = { $gte: start, $lte: end };
    }

    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .lean();

    return sendSuccess(orders, "Employee orders retrieved successfully");
  } catch (error) {
    logger.error("Failed to fetch employee orders", error);
    return sendError(error, "Failed to fetch orders", 500);
  }
}, ["EMPLOYEE", "MANAGER", "ADMIN", "SERVER", "BARTENDER"]);
