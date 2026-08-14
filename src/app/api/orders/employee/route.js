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
import { createKotPrintJob, createBarReceiptPrintJob } from "@/lib/printing/printJobService";
import { createNotification } from "@/lib/notifications/notificationService";
import Table from "@/models/floor/Table";
import { repricePosCartItems } from "@/lib/orders/repricePosCartItems";

function normalizeProductType(value) {
  return String(value || "").toUpperCase() === "BAR" ? "BAR" : "KITCHEN";
}

function cartHasKitchenItem(items = []) {
  return items.some((item) => normalizeProductType(item.productType) !== "BAR");
}

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

async function enqueueOrderTicketPrintJob({
  order,
  ticketItems,
  employeeId,
  guestCount,
  routeToKitchen,
}) {
  if (!ticketItems?.length) return { job: null, ticketType: routeToKitchen ? "KOT" : "BAR_RECEIPT" };
  try {
    const [serverName, restaurant] = await Promise.all([
      resolveServerName(employeeId),
      Restaurant.findById(order.restaurantId).select("name").lean(),
    ]);
    const common = {
      order,
      requestedBy: employeeId,
      guestCount,
      serverName,
      restaurantName: restaurant?.name || null,
      specialNote: order.specialNote,
    };

    if (routeToKitchen) {
      const { job } = await createKotPrintJob({
        ...common,
        kotItems: ticketItems,
      });
      return { job, ticketType: "KOT" };
    }

    const { job } = await createBarReceiptPrintJob({
      ...common,
      barItems: ticketItems,
    });
    return { job, ticketType: "BAR_RECEIPT" };
  } catch (err) {
    logger.error("Failed to create ticket PrintJob (order still saved)", err);
    return { job: null, ticketType: routeToKitchen ? "KOT" : "BAR_RECEIPT" };
  }
}

// POST - Create or Update a POS/Employee order
export const POST = withAuth(async (request) => {
  try {
    const data = await request.json();
    const { items, specialNote, sessionId, guestName, partyName, guestCount, orderType } = data;
    const resolvedPartyName = (partyName || guestName || "").trim() || null;
    const resolvedGuestCount =
      guestCount !== undefined && guestCount !== null && guestCount !== ""
        ? Number(guestCount)
        : null;

    if (!items || items.length === 0) {
      return sendError(new Error("Empty cart"), "Cart cannot be empty", 400);
    }

    const employeeId = request.user.id;

    let priced;
    try {
      priced = await repricePosCartItems({
        restaurantId: request.restaurant,
        items,
        discountCode: data.discountCode || null,
      });
    } catch (priceErr) {
      return sendError(
        priceErr,
        priceErr.message || "Failed to price order",
        priceErr.status || 400,
      );
    }

    const {
      formattedItems,
      subTotal,
      taxTotal,
      serviceChargeTotal,
      serviceChargeName,
      discountTotal,
      discountCode,
      totalAmount,
    } = priced;

    const routeToKitchen = cartHasKitchenItem(formattedItems);

    // If no sessionId is provided — direct sale (walk-in, staff, or legacy takeaway)
    if (!sessionId) {
      const orderSource = ["WALK_IN", "STAFF", "POS", "ONLINE"].includes(data.source)
        ? data.source
        : "POS";

      let directPartyName = resolvedPartyName;
      let staffFor = null;
      let staffOrderReason = data.staffOrderReason?.trim() || null;

      if (orderSource === "WALK_IN") {
        directPartyName = (partyName || guestName || "").trim() || "Walk-in";
      } else if (orderSource === "STAFF") {
        const staffForId = data.staffForId;
        if (!staffForId) {
          return sendError(new Error("Staff ID missing"), "Please select a staff member", 400);
        }
        const staffMember = await Employee.findOne({
          _id: staffForId,
          restaurant: request.restaurant,
        });
        if (!staffMember) {
          return sendError(new Error("Invalid Staff"), "Selected staff member not found", 404);
        }
        staffFor = staffMember._id;
        directPartyName = formatPersonName(staffMember);
      }

      const orderId = data.orderId;

      // Update existing direct order
      if (orderId) {
        const order = await Order.findOne({
          _id: orderId,
          restaurantId: request.restaurant,
          source: orderSource,
          status: { $in: ["PENDING", "CONFIRMED"] },
        });

        if (!order) {
          return sendError(new Error("Not Found"), "Active order not found", 404);
        }

        const kotPayload = [];
        const finalItems = formattedItems.map((incomingItem) => {
          const existingItem = order.items.find(
            (i) =>
              i.cartId === incomingItem.cartId ||
              (i.menuItemId === incomingItem.menuItemId &&
                JSON.stringify(i.options) === JSON.stringify(incomingItem.options) &&
                i.size === incomingItem.size),
          );
          const sentQty = existingItem ? existingItem.sentQty || 0 : 0;
          const unprintedQty = incomingItem.qty - sentQty;

          if (unprintedQty > 0) {
            kotPayload.push({ ...incomingItem, qty: unprintedQty });
          }

          return { ...incomingItem, sentQty: incomingItem.qty };
        });

        order.items = finalItems;
        order.subTotal = subTotal;
        order.taxTotal = taxTotal;
        order.serviceChargeTotal = serviceChargeTotal;
        order.serviceChargeName = serviceChargeName || null;
        order.discountTotal = discountTotal;
        order.discountCode = discountCode || null;
        order.totalAmount = totalAmount;
        order.specialNote = specialNote;
        order.guestName = directPartyName;
        order.partyName = directPartyName;
        if (orderSource === "STAFF") {
          order.staffFor = staffFor;
          order.staffOrderReason = staffOrderReason;
        }
        await order.save();

        const { job: printJob, ticketType } = await enqueueOrderTicketPrintJob({
          order,
          ticketItems: kotPayload,
          employeeId,
          guestCount: Number.isFinite(resolvedGuestCount) ? resolvedGuestCount : null,
          routeToKitchen,
        });

        const serverName = await resolveServerName(employeeId);
        if (kotPayload.length > 0) {
          await notifyOrderEvent({
            type: "ORDER_UPDATED",
            order,
            employeeId,
            serverName,
          });
          if (printJob) {
            await notifyOrderEvent({
              type: "KOT_CREATED",
              order,
              employeeId,
              serverName,
            });
          }
        }

        logger.info(`Direct ${orderSource} order updated: ${order.orderNumber} by Employee ${employeeId} ticket=${ticketType}`);
        return sendSuccess(
          {
            ...order.toObject(),
            kotPayload,
            printJobId: printJob?._id || null,
            ticketType,
          },
          routeToKitchen ? "Order updated successfully" : "Bar ticket updated successfully",
          200,
        );
      }

      // Create new direct order
      const orderNumber = await getNextOrderNumber(request.restaurant);
      const createPayload = {
        restaurantId: request.restaurant,
        orderNumber,
        items: formattedItems.map((item) => ({ ...item, sentQty: item.qty })),
        subTotal,
        taxTotal,
        serviceChargeTotal,
        serviceChargeName: serviceChargeName || null,
        discountTotal,
        discountCode: discountCode || null,
        totalAmount,
        specialNote: specialNote,
        guestName: directPartyName,
        partyName: directPartyName,
        guestCount: Number.isFinite(resolvedGuestCount) ? resolvedGuestCount : null,
        status: "PENDING",
        source: orderSource,
        processedBy: employeeId,
      };

      if (orderSource === "POS") {
        createPayload.tableNo = data.tableNo;
      }
      if (orderSource === "STAFF") {
        createPayload.staffFor = staffFor;
        createPayload.staffOrderReason = staffOrderReason;
      }

      const newOrder = await Order.create(createPayload);

      const kotPayload = formattedItems;
      const { job: printJob, ticketType } = await enqueueOrderTicketPrintJob({
        order: newOrder,
        ticketItems: kotPayload,
        employeeId,
        guestCount: Number.isFinite(resolvedGuestCount) ? resolvedGuestCount : null,
        routeToKitchen,
      });

      const serverName = await resolveServerName(employeeId);
      await notifyOrderEvent({
        type: "NEW_ORDER",
        order: newOrder,
        employeeId,
        tableNo: orderSource === "POS" ? data.tableNo : null,
        serverName,
      });
      if (printJob && kotPayload.length > 0) {
        await notifyOrderEvent({
          type: "KOT_CREATED",
          order: newOrder,
          employeeId,
          tableNo: orderSource === "POS" ? data.tableNo : null,
          serverName,
        });
      }

      logger.info(`Direct ${orderSource} order created: ${orderNumber} by Employee ${employeeId} ticket=${ticketType}`);
      return sendSuccess(
        {
          ...newOrder.toObject(),
          kotPayload,
          printJobId: printJob?._id || null,
          ticketType,
        },
        routeToKitchen
          ? "Order sent to kitchen successfully"
          : "Bar ticket created successfully",
        201,
      );
    }

    // Session-based Ordering — always scope to authenticated restaurant
    const session = await TableSession.findOne({
      _id: sessionId,
      restaurant: request.restaurant,
    }).populate("primaryTable");
    if (!session || !session.isSessionOpen) {
      return sendError(new Error("Invalid Session"), "Table session is invalid or closed", 400);
    }

    // Check for existing active order in this session
    let order = await Order.findOne({
      tableSession: sessionId,
      restaurantId: request.restaurant,
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
      order.subTotal = subTotal;
      order.taxTotal = taxTotal;
      order.serviceChargeTotal = serviceChargeTotal;
      order.serviceChargeName = serviceChargeName || null;
      order.discountTotal = discountTotal;
      order.discountCode = discountCode || null;
      order.totalAmount = totalAmount;
      order.specialNote = specialNote;
      if (resolvedPartyName !== null || partyName !== undefined || guestName !== undefined) {
        order.guestName = resolvedPartyName;
        order.partyName = resolvedPartyName;
      }
      if (guestCount !== undefined) {
        order.guestCount = Number.isFinite(resolvedGuestCount)
          ? resolvedGuestCount
          : (session.guestCount ?? null);
      } else if (order.guestCount == null && session.guestCount != null) {
        order.guestCount = session.guestCount;
      }
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

      const { job: printJob, ticketType } = await enqueueOrderTicketPrintJob({
        order,
        ticketItems: kotPayload,
        employeeId,
        guestCount: session.guestCount,
        routeToKitchen,
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

      logger.info(`POS Order updated: ${order.orderNumber} for Session ${sessionId} by Employee ${employeeId} ticket=${ticketType}`);
      return sendSuccess(
        {
          ...order.toObject(),
          kotPayload,
          printJobId: printJob?._id || null,
          ticketType,
        },
        routeToKitchen
          ? "Order updated successfully"
          : "Bar ticket updated successfully",
        200
      );
    } else {
      // Create New Order
      const orderNumber = await getNextOrderNumber(request.restaurant);
      const newOrder = await Order.create({
        restaurantId: request.restaurant,
        orderNumber,
        items: formattedItems.map(item => ({ ...item, sentQty: item.qty })),
        subTotal,
        taxTotal,
        serviceChargeTotal,
        serviceChargeName: serviceChargeName || null,
        discountTotal,
        discountCode: discountCode || null,
        totalAmount,
        specialNote: specialNote,
        
        // Session links
        tableSession: sessionId,
        table: session.primaryTable._id,
        floor: session.floor,
        tableNo: session.primaryTable.tableNumber, // For legacy compatibility
        guestName: resolvedPartyName,
        partyName: resolvedPartyName,
        guestCount: Number.isFinite(resolvedGuestCount)
          ? resolvedGuestCount
          : (session.guestCount ?? null),
        
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
      const { job: printJob, ticketType } = await enqueueOrderTicketPrintJob({
        order: newOrder,
        ticketItems: kotPayload,
        employeeId,
        guestCount: session.guestCount,
        routeToKitchen,
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

      logger.info(`POS Order created: ${orderNumber} for Session ${sessionId} by Employee ${employeeId} ticket=${ticketType}`);
      return sendSuccess(
        {
          ...newOrder.toObject(),
          kotPayload,
          printJobId: printJob?._id || null,
          ticketType,
        },
        routeToKitchen
          ? "Order sent to kitchen successfully"
          : "Bar ticket created successfully",
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
    const orderId = searchParams.get("orderId");
    const today = searchParams.get("today");
    
    if (orderId) {
      const order = await Order.findOne({
        _id: orderId,
        restaurantId: request.restaurant,
        source: { $in: ["WALK_IN", "STAFF", "POS"] },
        status: { $in: ["PENDING", "CONFIRMED"] },
      }).lean();

      return sendSuccess(order, "Direct order retrieved");
    }

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

// PATCH - Waive off an unpaid POS bill (e.g. customer refused payment after KOT)
export const PATCH = withAuth(async (request) => {
  try {
    const employeeId = request.user.id;
    const restaurantId = request.restaurant;
    const body = await request.json();
    const { orderId, action, reason } = body || {};

    if (action !== "waive") {
      return sendError(new Error("Invalid action"), "Unsupported action", 400);
    }

    if (!orderId) {
      return sendError(new Error("Missing orderId"), "orderId is required", 400);
    }

    const waiveReason = String(reason || "").trim();
    if (!waiveReason) {
      return sendError(new Error("Missing reason"), "A waive reason is required", 400);
    }

    const order = await Order.findOne({ _id: orderId, restaurantId });
    if (!order) {
      return sendError(new Error("Not Found"), "Order not found", 404);
    }

    if (order.paymentStatus === "PAID" || order.status === "PAID") {
      return sendError(new Error("Already Paid"), "Cannot waive a paid order", 400);
    }

    if (["WAIVED", "CANCELLED"].includes(order.status)) {
      return sendError(new Error("Already Closed"), `Order is already ${order.status}`, 400);
    }

    if (!["PENDING", "CONFIRMED"].includes(order.status)) {
      return sendError(new Error("Invalid Status"), "Only pending or confirmed orders can be waived", 400);
    }

    order.status = "WAIVED";
    order.waiveReason = waiveReason;
    order.waivedAt = new Date();
    order.waivedBy = employeeId;
    await order.save();

    let sessionReleased = false;
    if (order.tableSession) {
      const session = await TableSession.findOne({
        _id: order.tableSession,
        restaurant: restaurantId,
      });

      if (session?.isSessionOpen) {
        const blockingOrders = await Order.countDocuments({
          _id: { $in: session.activeOrders },
          paymentStatus: { $ne: "PAID" },
          status: { $nin: ["CANCELLED", "WAIVED"] },
        });

        if (blockingOrders === 0) {
          session.status = "RELEASED";
          session.isSessionOpen = false;
          session.closedAt = new Date();
          await session.save();

          if (session.primaryTable) {
            await Table.findByIdAndUpdate(session.primaryTable, { status: "Available" });
          }

          sessionReleased = true;

          try {
            await OperationalAuditLog.create({
              restaurantId,
              actorId: employeeId,
              actorType: "Employee",
              actorName: request.user.name || request.user.firstName,
              action: "TABLE_RELEASED",
              floorId: session.floor,
              tableId: session.primaryTable,
              tableSessionId: session._id,
              reason: waiveReason,
            });
          } catch (auditErr) {
            logger.error("Failed to write waive table-release audit log", auditErr);
          }

          if (global.io) {
            global.io.to(`floor:${session.floor}`).emit("table:released", {
              sessionId: session._id,
              tableId: session.primaryTable,
            });
          }

          try {
            const releasedTable = await Table.findById(session.primaryTable).select("tableNumber").lean();
            await createNotification({
              restaurantId,
              type: "TABLE_RELEASED",
              title: "Table Released",
              message: `Table ${releasedTable?.tableNumber || ""} was released after bill waive`,
              tableId: session.primaryTable,
              tableSessionId: session._id,
              employeeId,
              floorId: session.floor,
              priority: "low",
              metadata: { tableNo: releasedTable?.tableNumber || null, waivedOrderId: order._id },
            });
          } catch (notifErr) {
            logger.error("Failed to create TABLE_RELEASED notification after waive", notifErr);
          }
        }
      }
    }

    try {
      await OperationalAuditLog.create({
        restaurantId,
        actorId: employeeId,
        actorType: "Employee",
        actorName: request.user.name || request.user.firstName,
        action: "ORDER_CANCELLED",
        floorId: order.floor,
        tableId: order.table,
        tableSessionId: order.tableSession,
        reason: waiveReason,
        newValue: { status: "WAIVED", orderId: order._id, orderNumber: order.orderNumber },
      });
    } catch (auditErr) {
      logger.error("Failed to write waive order audit log", auditErr);
    }

    logger.info(`Order ${order.orderNumber} waived by Employee ${employeeId}: ${waiveReason}`);

    const [enriched] = await enrichOrdersWithProcessedBy([order.toObject()]);
    return sendSuccess(
      { ...enriched, sessionReleased },
      sessionReleased ? "Bill waived and table released" : "Bill waived successfully"
    );
  } catch (error) {
    logger.error("Failed to waive order", error);
    return sendError(error, "Failed to waive order", 500);
  }
}, ["EMPLOYEE", "MANAGER", "ADMIN", "SERVER", "BARTENDER", "STAFF"]);
