import { NextResponse } from "next/server";
import { withEmployeeAuth } from "@/utils/employeeAuth";
import Employee from "@/models/employee/Employee";
import EmployeeShift from "@/models/employee/EmployeeShift";
import Order from "@/models/Order";
import Floor from "@/models/floor/Floor";
import Table from "@/models/floor/Table";
import { logger } from "@/utils/logger";
import { sendSuccess } from "@/utils/apiResponse";
import {sendError} from "@/utils/errorHandler"
export const GET = withEmployeeAuth(async (request) => {
  try {
    const employeeId = request.employee._id; // Extracted from employee document
    const restaurantId = request.employee.restaurant; // Restaurant ID

    if (!employeeId) {
      return sendError(new Error("Unauthorized"), "Missing employee context", 401);
    }

    // 1. Fetch Employee Profile
    const employee = await Employee.findOne({ _id: employeeId, restaurant: restaurantId })
      .populate("assignedFloor")
      .populate("assignedTables")
      .lean();

    if (!employee) {
      return sendError(new Error("Not Found"), "Employee not found", 404);
    }

    // 2. Fetch Active Shift
    const now = new Date();
    const windowStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const windowEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const recentShifts = await EmployeeShift.find({ 
      employee: employeeId, 
      restaurant: restaurantId,
      startTime: { $gte: windowStart, $lte: windowEnd }
    })
    .populate("assignedFloor")
    .populate("assignedTables")
    .lean();

    let activeShift = null;
    for (const shift of recentShifts) {
      if (['Leave', 'Sick Leave', 'Vacation', 'Holiday'].includes(shift.shiftType)) continue;

      const shiftStart = new Date(shift.startTime.getTime() - 15 * 60000);
      const shiftEnd = shift.endTime ? new Date(shift.endTime.getTime()) : null;

      if (now >= shiftStart && (!shiftEnd || now <= shiftEnd)) {
        activeShift = shift;
        break;
      }
    }

    // 3. Fetch Orders (for stats and active tickets)
    // "Today" for orders logic (00:00 to 23:59 local, approximated using -12h/+12h or startOfDay UTC)
    // We'll just fetch orders processed by this employee in the last 24 hours
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const recentOrders = await Order.find({
      restaurantId,
      processedBy: employeeId,
      createdAt: { $gte: oneDayAgo }
    }).sort({ createdAt: -1 }).lean();

    const todayOrders = recentOrders.length;
    const pendingOrders = recentOrders.filter(o => o.status === 'PENDING');
    const completedOrders = recentOrders.filter(o => o.status === 'CONFIRMED');

    // Calculate approximate sales total for "tips" or "sales" stat
    const totalSales = completedOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);

    // 4. Assemble payload
    // Prefer shift assignments, fallback to employee default assignments
    const tables = activeShift?.assignedTables?.length > 0 
      ? activeShift.assignedTables 
      : (employee.assignedTables || []);

    const floor = activeShift?.assignedFloor?.name || employee.assignedFloor?.name || "Main Floor";

    const payload = {
      profile: {
        id: employee._id,
        firstName: employee.firstName,
        lastName: employee.lastName,
        role: employee.role,
        color: employee.employeeColor || "#4ade80",
      },
      shift: {
        isActive: !!activeShift,
        startTime: activeShift ? new Date(activeShift.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "N/A",
        endTime: activeShift?.endTime ? new Date(activeShift.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "N/A",
        floor: floor,
        section: "Main Section" // Hardcoded for now unless Section model is fetched
      },
      tables: tables.map(t => t.tableNumber || t), // Simplified array of table numbers
      stats: {
        todayOrders: todayOrders,
        pendingOrdersCount: pendingOrders.length,
        completedOrdersCount: completedOrders.length,
        totalSales: totalSales.toFixed(2)
      },
      activeOrders: pendingOrders.map(o => ({
        id: o.orderNumber || o._id,
        table: o.tableNo || "Takeaway",
        items: o.items?.length || 0,
        timeElapsed: Math.floor((now - new Date(o.createdAt)) / 60000) + " mins",
        status: o.status
      }))
    };

    return sendSuccess(payload, "Dashboard data retrieved successfully");

  } catch (error) {
    logger.error("Employee Dashboard API Error:", error);
    return sendError(error, "Failed to load dashboard data", 500);
  }
});
