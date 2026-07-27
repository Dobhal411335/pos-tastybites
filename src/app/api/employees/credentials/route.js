import connectDB from "@/lib/db";
import Employee from "@/models/employee/Employee";
import { sendError } from "@/utils/errorHandler";
import { withAuth } from '@/utils/auth';
import { logger } from "@/utils/logger";
import { sendSuccess } from '@/utils/apiResponse';

export const GET = withAuth(async (request) => {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return sendError(new Error("Missing ID"), "Employee ID is required", 400);
    }

    const employee = await Employee.findOne({ _id: id, restaurant: request.restaurant })
      .select("email plainPassword credentialGenerated");
    
    if (!employee) {
      return sendError(new Error("Not Found"), "Employee not found", 404);
    }

    if (!employee.plainPassword) {
      return sendError(
        new Error("No Password"),
        "No password found for this employee. Please approve or regenerate credentials.",
        404
      );
    }

    logger.info(`Credentials viewed for employee ${employee.email}`);

    return sendSuccess({ password: employee.plainPassword }, "Credentials retrieved successfully");
  } catch (error) {
    logger.error("Failed to fetch credentials", error);
    return sendError(error, "Failed to fetch credentials", 500);
  }
}, ["ADMIN", "MANAGER"]);
