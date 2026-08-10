import { withAuth } from "@/utils/auth";
import Order from "@/models/Order";
import Employee from "@/models/employee/Employee";
import TableSession from "@/models/floor/TableSession";
import Restaurant from "@/models/Restaurant";
import { sendSuccess } from "@/utils/apiResponse";
import { sendError } from "@/utils/errorHandler";
import { logger } from "@/utils/logger";
import { getNextOrderNumber } from "@/utils/generateOrderNumber"; 
import OperationalAuditLog from "@/models/OperationalAuditLog";
import { createKotPrintJob } from "@/lib/printing/printJobService";
import { createNotification } from "@/lib/notifications/notificationService";
import Table from "@/models/floor/Table";

function formatPersonName(person) {
  if (!person) return null;
  return person.name || [person.firstName, person.lastName].filter(Boolean).join(" ") || null;
}

async function resolveServerName(employeeId) {
  if (!employeeId) return null;
  const emp = await Employee.findById(employeeId).select("firstName lastName name").lean();
  if (!emp) return null;
  return formatPersonName(emp);
}

async function enrichOrdersWithProcessedBy(orders) {
  if (!orders?.length) return orders;

  const ids = [
    ...new Set(
      orders
        .map((o) => o.processedBy)
        .filter(Boolean)
        .map((id) => String(id?._id || id))
    ),
  ];

  if (ids.length === 0) {
    return orders.map((order) => ({
      ...order,
      processedByName: null,
      processedByRole: null,
    }));
  }

  const employees = await Employee.find({ _id: { $in: ids } })
    .select("firstName lastName name role")
    .lean();
  const empMap = new Map(employees.map((e) => [String(e._id), e]));

  return orders.map((order) => {
    const rawId = order.processedBy ? String(order.processedBy._id || order.processedBy) : null;
    const emp = rawId ? empMap.get(rawId) : null;

    return {
      ...order,
      processedByName: formatPersonName(emp),
      processedByRole: emp?.role || null,
    };
  });
}

async function notifyOrderEvent({
  type,
  order,
  employeeId,
  floorId,
  tableId,
  tableSessionId,
  tableNo,
  serverName,
}) {
  const label = tableNo ? `Table ${tableNo}` : "no table";
  const titles = {
    NEW_ORDER: "New Order",
    ORDER_UPDATED: "Order Updated",
    KOT_CREATED: "KOT Created",
  };
  const messages = {
    NEW_ORDER: `Order #${order.orderNumber} has been created for ${label}`,
    ORDER_UPDATED: `Order #${order.orderNumber} was updated for ${label}`,
    KOT_CREATED: `Kitchen ticket created for Order #${order.orderNumber}`,
  };

  await createNotification({
    restaurantId: order.restaurantId,
    type,
    title: titles[type] || type,
    message: messages[type] || `Order #${order.orderNumber}`,
    orderId: order._id,
    tableId: tableId || order.table || null,
    tableSessionId: tableSessionId || order.tableSession || null,
    employeeId,
    floorId,
    metadata: {
      orderNumber: order.orderNumber,
      tableNo: tableNo || order.tableNo || null,
      actorName: serverName || null,
    },
  });
}

async function enqueueKotPrintJob({ order, kotItems, employeeId, guestCount }) {
  if (!kotItems?.length) return null;
  try {
    const [serverName, restaurant] = await Promise.all([
      resolveServerName(employeeId),
      Restaurant.findById(order.restaurantId).select("name").lean(),
    ]);
    const { job } = await createKotPrintJob({
      order,
      kotItems,
      requestedBy: employeeId,
      guestCount,
      serverName,
      restaurantName: restaurant?.name || null,
      specialNote: order.specialNote,
    });
    return job;
  } catch (err) {
    logger.error("Failed to create KOT PrintJob (order still saved)", err);
    return null;
  }
}

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
      productCode: item.productCode || "",
      category: item.category || "ITEMS",
      size: item.size || "Standard",
      qty: item.qty,
      price: item.price,
      tax: item.tax || 0,
      options: item.options || [],
      preparationStyle: item.preparationStyle || null,
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
      const printJob = await enqueueKotPrintJob({
        order: newOrder,
        kotItems: kotPayload,
        employeeId,
        guestCount: null,
      });

      const serverName = await resolveServerName(employeeId);
      await notifyOrderEvent({
        type: "NEW_ORDER",
        order: newOrder,
        employeeId,
        tableNo: data.tableNo,
        serverName,
      });
      if (printJob && kotPayload.length > 0) {
        await notifyOrderEvent({
          type: "KOT_CREATED",
          order: newOrder,
          employeeId,
          tableNo: data.tableNo,
          serverName,
        });
      }

      logger.info(`Legacy POS Order created: ${orderNumber} by Employee ${employeeId}`);
      return sendSuccess(
        { ...newOrder.toObject(), kotPayload, printJobId: printJob?._id || null },
        "Order sent to kitchen successfully",
        201
      );
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

      const printJob = await enqueueKotPrintJob({
        order,
        kotItems: kotPayload,
        employeeId,
        guestCount: session.guestCount,
      });

      const serverName = await resolveServerName(employeeId);
      const tableNo = session.primaryTable?.tableNumber;
      if (kotPayload.length > 0) {
        await notifyOrderEvent({
          type: "ORDER_UPDATED",
          order,
          employeeId,
          floorId: session.floor,
          tableId: session.primaryTable._id,
          tableSessionId: sessionId,
          tableNo,
          serverName,
        });
        if (printJob) {
          await notifyOrderEvent({
            type: "KOT_CREATED",
            order,
            employeeId,
            floorId: session.floor,
            tableId: session.primaryTable._id,
            tableSessionId: sessionId,
            tableNo,
            serverName,
          });
        }
      }

      logger.info(`POS Order updated: ${order.orderNumber} for Session ${sessionId} by Employee ${employeeId}`);
      return sendSuccess(
        { ...order.toObject(), kotPayload, printJobId: printJob?._id || null },
        "Order updated successfully",
        200
      );
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
      const printJob = await enqueueKotPrintJob({
        order: newOrder,
        kotItems: kotPayload,
        employeeId,
        guestCount: session.guestCount,
      });

      const serverName = await resolveServerName(employeeId);
      const tableNo = session.primaryTable?.tableNumber;
      await notifyOrderEvent({
        type: "NEW_ORDER",
        order: newOrder,
        employeeId,
        floorId: session.floor,
        tableId: session.primaryTable._id,
        tableSessionId: sessionId,
        tableNo,
        serverName,
      });
      if (printJob && kotPayload.length > 0) {
        await notifyOrderEvent({
          type: "KOT_CREATED",
          order: newOrder,
          employeeId,
          floorId: session.floor,
          tableId: session.primaryTable._id,
          tableSessionId: sessionId,
          tableNo,
          serverName,
        });
      }

      logger.info(`POS Order created: ${orderNumber} for Session ${sessionId} by Employee ${employeeId}`);
      return sendSuccess(
        { ...newOrder.toObject(), kotPayload, printJobId: printJob?._id || null },
        "Order sent to kitchen successfully",
        201
      );
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

    // Default: Get recent employee orders; today=true returns all restaurant orders for the day
    const employeeId = request.user.id;
    const restaurantId = request.restaurant;
    
    let query = { restaurantId };
    
    if (today === "true") {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      query.createdAt = { $gte: start, $lte: end };
    } else {
      query.processedBy = employeeId;
    }

    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .lean();

    const enriched = await enrichOrdersWithProcessedBy(orders);

    return sendSuccess(enriched, "Employee orders retrieved successfully");
  } catch (error) {
    logger.error("Failed to fetch employee orders", error);
    return sendError(error, "Failed to fetch orders", 500);
  }
}, ["EMPLOYEE", "MANAGER", "ADMIN", "SERVER", "BARTENDER"]);
