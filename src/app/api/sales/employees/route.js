import { withAuth } from "@/utils/auth";
import Employee from "@/models/employee/Employee";
import { sendSuccess } from "@/utils/apiResponse";
import { sendError } from "@/utils/errorHandler";
import { logger } from "@/utils/logger";

// GET - List active employees eligible for table transfers
export const GET = withAuth(async (request) => {
  try {
    // Only return employees that are active and typically work the floor
    const employees = await Employee.find({ 
      restaurant: request.restaurant,           // ← correct field name (was restaurantId)
      isActive: true,
      status: { $in: ["Active", "Approved"] },  // ← correct field (Employee has no isVerified)
      role: { $in: ["Server", "Bartender", "Manager", "Wait Staff", "Staff", "Employee", "Admin", "Super Admin"] }
    })
      .select("_id firstName lastName role employeeColor")
      .lean();

    const formatted = employees.map(emp => ({
      id: emp._id,
      name: `${emp.firstName} ${emp.lastName || ''}`.trim(),
      role: emp.role,
      color: emp.employeeColor
    }));

    return sendSuccess(formatted, "Eligible employees retrieved successfully");
  } catch (error) {
    logger.error("Failed to retrieve eligible employees", error);
    return sendError(error, "Failed to retrieve eligible employees", 500);
  }
}, ["ADMIN", "MANAGER", "SERVER", "EMPLOYEE","STAFF"]);
