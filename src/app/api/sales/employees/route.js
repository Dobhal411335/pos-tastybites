import { withAuth } from "@/utils/auth";
import Employee from "@/models/employee/Employee";
import { sendSuccess } from "@/utils/apiResponse";
import { sendError } from "@/utils/errorHandler";
import { logger } from "@/utils/logger";

// GET - List all active employees (staff meals, transfers, pickers)
// Includes Master Terminal, Manager Terminal, Super Admin, and Staff.
export const GET = withAuth(async (request) => {
  try {
    const employees = await Employee.find({
      restaurant: request.restaurant,
      isActive: true,
      status: { $in: ["Active", "Approved"] },
    })
      .select("_id firstName lastName role employeeColor staffDiscount")
      .sort({ firstName: 1, lastName: 1 })
      .lean();

    const formatted = employees.map((emp) => ({
      id: emp._id,
      name: `${emp.firstName} ${emp.lastName || ""}`.trim(),
      role: emp.role,
      color: emp.employeeColor,
      staffDiscount: Number(emp.staffDiscount) || 0,
    }));

    return sendSuccess(formatted, "Eligible employees retrieved successfully");
  } catch (error) {
    logger.error("Failed to retrieve eligible employees", error);
    return sendError(error, "Failed to retrieve eligible employees", 500);
  }
}, ["ADMIN", "MANAGER", "SERVER", "EMPLOYEE", "STAFF"]);
